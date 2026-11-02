import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { AuditActionType } from './types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const BOOTSTRAPPED_ADMIN_EMAIL = 'adryanbejo@gmail.com';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot per skill mandate
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'site_settings', 'main'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

/**
 * Defensive Input Sanitizer & Blueprint Constraint Enforcer
 * Strips HTML/script angle brackets, control characters, and truncates strictly to maxLength.
 */
export function sanitizeText(input: string, maxLength: number): string {
  const cleaned = input
    .replace(/[<>]/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim();
  return cleaned.slice(0, maxLength);
}

export function sanitizeId(raw?: string): string {
  if (raw) {
    const clean = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 120);
    if (clean.length >= 1) return clean;
  }
  return `p2uwm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function normalizeEmailKey(email: string): string {
  return email
    .replace(/[\u0000-\u001F<>\s]/g, '')
    .toLowerCase()
    .slice(0, 160);
}

export function isValidEmailFormat(email: string): boolean {
  const clean = normalizeEmailKey(email);
  return clean.length >= 5 && clean.length <= 160 && /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(clean);
}

export function formatFirebaseAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code)
      : '';

  if (code === 'auth/unauthorized-domain' || raw.includes('auth/unauthorized-domain')) {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'domain-anda.com';
    return `Domain "${host}" belum diotorisasi di Firebase Authentication. Tambahkan "${host}" pada menu Firebase Console → Authentication → Settings → Authorized domains (Project: ${firebaseConfig.projectId}).`;
  }
  if (code === 'auth/popup-blocked' || raw.includes('auth/popup-blocked')) {
    return 'Jendela pop-up login Google diblokir oleh peramban Anda. Silakan izinkan pop-up untuk situs ini lalu klik tombol Masuk kembali.';
  }
  if (
    code === 'auth/popup-closed-by-user' ||
    code === 'auth/cancelled-popup-request' ||
    raw.includes('popup-closed-by-user')
  ) {
    return 'Jendela autentikasi ditutup sebelum proses verifikasi akun selesai.';
  }
  if (code === 'auth/network-request-failed' || raw.includes('network-request-failed')) {
    return 'Koneksi jaringan terputus saat menghubungi server autentikasi. Periksa koneksi internet Anda.';
  }
  return 'Gagal memproses autentikasi akun. Pastikan Anda memilih akun resmi yang telah terdaftar di sistem P2UWM.';
}

export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const FIRESTORE_DATABASE_ID = firebaseConfig.firestoreDatabaseId;

export async function signInWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function logOutUser() {
  return signOut(auth);
}

export async function recordSecurityAudit(params: {
  action: AuditActionType;
  targetCollection: string;
  targetId: string;
  summary: string;
  severity?: 'INFO' | 'WARNING' | 'CRITICAL';
}) {
  const user = auth.currentUser;
  if (!user || !user.email) return;
  const logId = sanitizeId(`log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
  const path = `audit_logs/${logId}`;
  try {
    await setDoc(doc(db, 'audit_logs', logId), {
      actorUid: sanitizeId(user.uid),
      actorEmail: sanitizeText(user.email, 160),
      action: params.action,
      targetCollection: sanitizeText(params.targetCollection, 60),
      targetId: sanitizeId(params.targetId),
      summary: sanitizeText(params.summary, 300),
      severity: params.severity || 'INFO',
      scope: 'p2uwm_audit',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    // Non-blocking if non-admin user; only throw structured error if admin mutation failed unexpectedly
    console.warn('Audit log skipped or restricted:', path, error);
  }
}

export function formatTimestamp(ts: unknown): string {
  if (!ts) return 'Baru saja';
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts && typeof (ts as { toDate: () => Date }).toDate === 'function') {
    const d = (ts as { toDate: () => Date }).toDate();
    return d.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  if (ts instanceof Date) {
    return ts.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
  return String(ts);
}
