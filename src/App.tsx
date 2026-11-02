/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  query,
  where,
  writeBatch,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { motion, useScroll, useSpring } from 'motion/react';
import { Menu, X } from 'lucide-react';

import {
  auth,
  db,
  BOOTSTRAPPED_ADMIN_EMAIL,
  signInWithGoogle,
  logOutUser,
  handleFirestoreError,
  OperationType,
  recordSecurityAudit,
  sanitizeId,
  sanitizeText,
  normalizeEmailKey,
  formatFirebaseAuthError,
} from './firebase';
import {
  AdminRole,
  AnalyticsDaily,
  Aspiration,
  AspirationCategory,
  AspirationUrgency,
  AuditLog,
  BoardDivision,
  BoardMember,
  GalleryItem,
  NewsArticle,
  PublicSectionKey,
  RegisteredAccount,
  SiteSetting,
  WorkProgram,
} from './types';
import {
  DEFAULT_ANALYTICS_DAILY,
  DEFAULT_ARTICLES,
  DEFAULT_BOARD_MEMBERS,
  DEFAULT_GALLERY_ITEMS,
  DEFAULT_PROGRAMS,
  DEFAULT_SITE_SETTINGS,
  P2UWM_LOGO_URL,
} from './data/seedData';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PublicPortal } from './components/PublicPortal';
import { AdminWorkspace } from './components/AdminWorkspace';

export default function App() {
  const [viewMode, setViewMode] = useState<'public' | 'admin'>('public');
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const { scrollYProgress } = useScroll();
  const smoothScrollProgress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    restDelta: 0.001,
  });

  // Strict Whitelisted Auth & RBAC State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(false);
  const [authChecking, setAuthChecking] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isDelegatedAdmin, setIsDelegatedAdmin] = useState<boolean>(false);
  const [registeredAccount, setRegisteredAccount] = useState<RegisteredAccount | null>(null);

  // Live CMS & Operational State (with instant canonical fallback before Cloud seed)
  const [siteSettings, setSiteSettings] = useState<SiteSetting>(DEFAULT_SITE_SETTINGS);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>(DEFAULT_BOARD_MEMBERS);
  const [programs, setPrograms] = useState<WorkProgram[]>(DEFAULT_PROGRAMS);
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(DEFAULT_GALLERY_ITEMS);
  const [articles, setArticles] = useState<NewsArticle[]>(DEFAULT_ARTICLES);
  const [hasCloudSeeded, setHasCloudSeeded] = useState<boolean>(false);

  // Authenticated Registered User & Admin Data
  const [myAspirations, setMyAspirations] = useState<Aspiration[]>([]);
  const [allAspirations, setAllAspirations] = useState<Aspiration[]>([]);
  const [analyticsDaily, setAnalyticsDaily] = useState<AnalyticsDaily[]>(DEFAULT_ANALYTICS_DAILY);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [delegatedAdmins, setDelegatedAdmins] = useState<AdminRole[]>([]);
  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>([]);

  const sessionCountedRef = useRef<boolean>(false);

  const isBootstrappedAdmin = Boolean(
    currentUser?.emailVerified &&
      currentUser?.email &&
      normalizeEmailKey(currentUser.email) === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
  const isAdmin = isBootstrappedAdmin || isDelegatedAdmin;

  // Sync Dark Mode class with <html>
  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // 1. Strict Registered-Accounts-Only Gatekeeper (Whitelisted Emails + Super Admin)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCurrentUser(null);
        setRegisteredAccount(null);
        setIsDelegatedAdmin(false);
        setAuthChecking(false);
        setAuthReady(true);
        return;
      }

      setAuthChecking(true);

      if (!user.emailVerified || !user.email) {
        await logOutUser();
        setCurrentUser(null);
        setRegisteredAccount(null);
        setIsDelegatedAdmin(false);
        setAuthError(
          'Akses masuk ditolak: Akun harus memiliki alamat email terverifikasi dan terdaftar resmi di sistem P2UWM.'
        );
        setAuthChecking(false);
        setAuthReady(true);
        return;
      }

      const emailKey = normalizeEmailKey(user.email);

      // 1A. Primary Super Administrator (Always Whitelisted)
      if (emailKey === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
        setCurrentUser(user);
        setRegisteredAccount(null);
        setIsDelegatedAdmin(false);
        setAuthError(null);
        setAuthChecking(false);
        setAuthReady(true);
        return;
      }

      // 1B. Check Registered Accounts Directory (/registered_accounts/{emailKey})
      try {
        let regSnap;
        try {
          regSnap = await getDocFromServer(doc(db, 'registered_accounts', emailKey));
        } catch {
          regSnap = await getDoc(doc(db, 'registered_accounts', emailKey));
        }

        if (regSnap.exists()) {
          const accData = regSnap.data() as RegisteredAccount;
          if (accData.active) {
            setRegisteredAccount(accData);
            setIsDelegatedAdmin(accData.role === 'admin');
            setCurrentUser(user);
            setAuthError(null);
            setAuthChecking(false);
            setAuthReady(true);
            return;
          } else {
            const suspendedEmail = user.email;
            await logOutUser();
            setCurrentUser(null);
            setRegisteredAccount(null);
            setIsDelegatedAdmin(false);
            setAuthError(
              `Akses dibekukan: Akun "${suspendedEmail}" saat ini berstatus Nonaktif pada Direktori Otorisasi P2UWM. Hubungi Administrator Utama untuk mengaktifkan kembali.`
            );
            setAuthChecking(false);
            setAuthReady(true);
            return;
          }
        }

        // 1C. Fallback Check on Legacy UID-based Admin Registry (/admins/{uid})
        const adminSnap = await getDoc(doc(db, 'admins', sanitizeId(user.uid)));
        if (adminSnap.exists()) {
          setRegisteredAccount(null);
          setIsDelegatedAdmin(true);
          setCurrentUser(user);
          setAuthError(null);
          setAuthChecking(false);
          setAuthReady(true);
          return;
        }

        // 1D. Reject Unregistered Account Immediately & Terminate Session
        const rejectedEmail = user.email;
        await logOutUser();
        setCurrentUser(null);
        setRegisteredAccount(null);
        setIsDelegatedAdmin(false);
        setAuthError(
          `Akses ditolak: Akun "${rejectedEmail}" tidak terdaftar dalam sistem otorisasi P2UWM Bumi Pratama Mandira. Hanya akun resmi yang telah didaftarkan oleh Administrator Utama yang diizinkan masuk.`
        );
      } catch (err) {
        console.warn('Registered account verification error:', err);
        await logOutUser();
        setCurrentUser(null);
        setRegisteredAccount(null);
        setIsDelegatedAdmin(false);
        setAuthError(
          'Gagal memverifikasi status pendaftaran akun ke basis data keamanan. Pastikan koneksi stabil dan gunakan akun resmi terdaftar.'
        );
      } finally {
        setAuthChecking(false);
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Public Real-Time Listeners (Published Content & Singleton Site Settings)
  useEffect(() => {
    const unsubSettings = onSnapshot(
      doc(db, 'site_settings', 'main'),
      (snap) => {
        if (snap.exists()) {
          setSiteSettings(snap.data() as SiteSetting);
          setHasCloudSeeded(true);
        }
      },
      (err) => {
        console.warn('Public site_settings listener info:', err);
      }
    );

    const defaultBoardMap = new Map(DEFAULT_BOARD_MEMBERS.map((m) => [m.id, m]));
    const legacyPortraitSeeds: Record<string, string[]> = {
      pengurus_wakil_suaidi: ['musyawarah'],
      pengurus_sekretaris_komarudin: ['musyawarah'],
      pengurus_sekretaris_ribut: ['musyawarah'],
      pengurus_bendahara_cecep: ['musyawarah'],
      pengawas_01_ketua: ['logo_p2uwm'],
      pengawas_02_keuangan: ['musyawarah'],
      pengawas_03_lapangan: ['gorong_gorong'],
      demisioner_01_ketua_pendahulu: ['logo_p2uwm'],
      demisioner_02_wakil_pendahulu: ['musyawarah'],
      demisioner_03_perintis: ['hero_tambak'],
    };

    const legacyPositionSeeds: Record<string, string[]> = {
      demisioner_01_ketua_pendahulu: [
        'Demisioner Ketua Pusat · Dewan Kehormatan',
        'Demisioner Ketua P2UWM · Periode Sebelumnya',
      ],
      demisioner_02_wakil_pendahulu: [
        'Demisioner Wakil Ketua · Penasihat Senior',
        'Demisioner Wakil Ketua P2UWM · Periode Sebelumnya',
      ],
      demisioner_03_perintis: [
        'Demisioner Kepemimpinan Perintis · Tokoh Pendiri',
        'Demisioner Ketua Perintis · Periode Awal',
      ],
      demisioner_04_wakil_perintis: ['Demisioner Wakil Ketua Perintis · Periode Awal'],
    };

    const legacyGenericNames = new Set([
      'Ketua Badan Pengawas P2UWM',
      'Sekretaris & Pengawas Akuntabilitas Kas',
      'Anggota Pengawas Fisik & Kawasan',
      'Demisioner Ketua P2UWM (Periode Terdahulu)',
      'Demisioner Wakil Ketua P2UWM (Periode Terdahulu)',
      'Jajaran Ketua & Wakil Ketua Perintis Awal',
    ]);

    const getDeletedDefaultBoardIds = (): Set<string> => {
      try {
        const raw = localStorage.getItem('p2uwm_deleted_board_ids');
        return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
      } catch {
        return new Set();
      }
    };

    const boardQuery = isBootstrappedAdmin
      ? collection(db, 'board_members')
      : query(collection(db, 'board_members'), where('status', '==', 'published'));
    const unsubBoard = onSnapshot(
      boardQuery,
      (snap) => {
        const deletedIds = getDeletedDefaultBoardIds();
        if (!snap.empty) {
          const cloudItems = snap.docs.map((d) => {
            const raw = {
              id: d.id,
              ...(d.data() as Omit<BoardMember, 'id'>),
            };
            const def = defaultBoardMap.get(d.id);
            if (!def) return raw;
            const oldKeys = legacyPortraitSeeds[d.id];
            const oldPositions = legacyPositionSeeds[d.id];
            const shouldUpgradePhoto = Boolean(oldKeys && oldKeys.includes(raw.photoKey));
            const shouldUpgradePosition = Boolean(
              oldPositions && oldPositions.includes(raw.position)
            );
            const shouldUpgradeName = legacyGenericNames.has(raw.name);
            if (shouldUpgradePhoto || shouldUpgradePosition || shouldUpgradeName) {
              return {
                ...raw,
                name: shouldUpgradeName ? def.name : raw.name,
                position: shouldUpgradePosition ? def.position : raw.position,
                orderIndex: shouldUpgradePosition ? def.orderIndex : raw.orderIndex,
                photoKey: shouldUpgradePhoto ? def.photoKey : raw.photoKey,
              };
            }
            return raw;
          });
          const existingIds = new Set(cloudItems.map((m) => m.id));
          const extraDefaults = DEFAULT_BOARD_MEMBERS.filter(
            (def) => !existingIds.has(def.id) && !deletedIds.has(def.id)
          );
          const merged = [...cloudItems, ...extraDefaults];
          merged.sort((a, b) => a.orderIndex - b.orderIndex);
          setBoardMembers(merged);
        } else if (deletedIds.size > 0) {
          setBoardMembers(DEFAULT_BOARD_MEMBERS.filter((def) => !deletedIds.has(def.id)));
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'board_members')
    );

    const progQuery = isBootstrappedAdmin
      ? collection(db, 'programs')
      : query(collection(db, 'programs'), where('status', '==', 'published'));
    const unsubPrograms = onSnapshot(
      progQuery,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<WorkProgram, 'id'>),
          }));
          items.sort((a, b) => a.orderIndex - b.orderIndex);
          setPrograms(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'programs')
    );

    const galQuery = isBootstrappedAdmin
      ? collection(db, 'gallery_items')
      : query(collection(db, 'gallery_items'), where('status', '==', 'published'));
    const unsubGallery = onSnapshot(
      galQuery,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<GalleryItem, 'id'>),
          }));
          setGalleryItems(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'gallery_items')
    );

    const artQuery = isBootstrappedAdmin
      ? collection(db, 'articles')
      : query(collection(db, 'articles'), where('status', '==', 'published'));
    const unsubArticles = onSnapshot(
      artQuery,
      (snap) => {
        if (!snap.empty) {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<NewsArticle, 'id'>),
          }));
          setArticles(items);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'articles')
    );

    return () => {
      unsubSettings();
      unsubBoard();
      unsubPrograms();
      unsubGallery();
      unsubArticles();
    };
  }, [isBootstrappedAdmin]);

  // 3. Authenticated Registered Member Listener (My Aspirations)
  useEffect(() => {
    if (!authReady || !currentUser || !currentUser.emailVerified) {
      setMyAspirations([]);
      return;
    }

    const q = query(collection(db, 'aspirations'), where('authorId', '==', currentUser.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Aspiration, 'id'>),
        }));
        setMyAspirations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'aspirations')
    );
    return () => unsub();
  }, [authReady, currentUser]);

  // 4. Bootstrapped Super Admin Listeners (All Aspirations, Real-Time Analytics, Audit Logs, Registered Accounts)
  useEffect(() => {
    if (!authReady || !currentUser || !isBootstrappedAdmin) {
      setAllAspirations([]);
      setAuditLogs([]);
      setDelegatedAdmins([]);
      setRegisteredAccounts([]);
      return;
    }

    const unsubAllAsp = onSnapshot(
      collection(db, 'aspirations'),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Aspiration, 'id'>),
        }));
        setAllAspirations(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'aspirations')
    );

    const unsubAnalytics = onSnapshot(
      query(collection(db, 'analytics_daily'), where('ownerScope', '==', 'p2uwm_analytics')),
      (snap) => {
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as AnalyticsDaily);
          setAnalyticsDaily(list);
        }
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'analytics_daily')
    );

    const unsubAudit = onSnapshot(
      query(collection(db, 'audit_logs'), where('scope', '==', 'p2uwm_audit')),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AuditLog, 'id'>),
        }));
        setAuditLogs(list.reverse());
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'audit_logs')
    );

    const unsubAdmins = onSnapshot(
      query(collection(db, 'admins'), where('addedBy', '==', currentUser.uid)),
      (snap) => {
        setDelegatedAdmins(snap.docs.map((d) => d.data() as AdminRole));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'admins')
    );

    const unsubRegistered = onSnapshot(
      query(collection(db, 'registered_accounts'), where('scope', '==', 'p2uwm_auth')),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as RegisteredAccount);
        list.sort((a, b) => a.email.localeCompare(b.email));
        setRegisteredAccounts(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'registered_accounts')
    );

    return () => {
      unsubAllAsp();
      unsubAnalytics();
      unsubAudit();
      unsubAdmins();
      unsubRegistered();
    };
  }, [authReady, currentUser, isBootstrappedAdmin]);

  // 5. Real-Time Visitor Telemetry Incrementer (Step-bounded +1 per Firestore Rules)
  const recordSectionVisit = useCallback(
    async (section: PublicSectionKey, forceNewVisitor = false) => {
      const now = new Date();
      const dateKey = now.toISOString().slice(0, 10);
      const label = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
      const isMobile = window.innerWidth < 768;
      const isFirstSessionHit = !sessionCountedRef.current || forceNewVisitor;
      sessionCountedRef.current = true;

      setAnalyticsDaily((prev) => {
        const idx = prev.findIndex((d) => d.dateKey === dateKey);
        if (idx >= 0) {
          const cur = prev[idx];
          const updated: AnalyticsDaily = {
            ...cur,
            visitors: cur.visitors + (isFirstSessionHit ? 1 : 0),
            pageViews: cur.pageViews + 1,
            mobileUsers: cur.mobileUsers + (isFirstSessionHit && isMobile ? 1 : 0),
            desktopUsers: cur.desktopUsers + (isFirstSessionHit && !isMobile ? 1 : 0),
            berandaViews: cur.berandaViews + (section === 'beranda' ? 1 : 0),
            profilViews: cur.profilViews + (section === 'profil' ? 1 : 0),
            programViews: cur.programViews + (section === 'program' ? 1 : 0),
            galeriViews: cur.galeriViews + (section === 'galeri' ? 1 : 0),
            beritaViews: cur.beritaViews + (section === 'berita' ? 1 : 0),
            aspirasiViews: cur.aspirasiViews + (section === 'aspirasi' ? 1 : 0),
          };
          const copy = [...prev];
          copy[idx] = updated;
          return copy;
        }
        return [
          ...prev,
          {
            dateKey,
            label,
            visitors: 1,
            pageViews: 1,
            mobileUsers: isMobile ? 1 : 0,
            desktopUsers: isMobile ? 0 : 1,
            berandaViews: section === 'beranda' ? 1 : 0,
            profilViews: section === 'profil' ? 1 : 0,
            programViews: section === 'program' ? 1 : 0,
            galeriViews: section === 'galeri' ? 1 : 0,
            beritaViews: section === 'berita' ? 1 : 0,
            aspirasiViews: section === 'aspirasi' ? 1 : 0,
            ownerScope: 'p2uwm_analytics',
          },
        ];
      });

      // Persist step-increment to Cloud Firestore only when an authorized registered user is active
      if (!currentUser || !currentUser.emailVerified) return;
      try {
        const ref = doc(db, 'analytics_daily', dateKey);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const cur = snap.data() as AnalyticsDaily;
          await updateDoc(ref, {
            visitors: cur.visitors + (isFirstSessionHit ? 1 : 0),
            pageViews: cur.pageViews + 1,
            mobileUsers: cur.mobileUsers + (isFirstSessionHit && isMobile ? 1 : 0),
            desktopUsers: cur.desktopUsers + (isFirstSessionHit && !isMobile ? 1 : 0),
            berandaViews: cur.berandaViews + (section === 'beranda' ? 1 : 0),
            profilViews: cur.profilViews + (section === 'profil' ? 1 : 0),
            programViews: cur.programViews + (section === 'program' ? 1 : 0),
            galeriViews: cur.galeriViews + (section === 'galeri' ? 1 : 0),
            beritaViews: cur.beritaViews + (section === 'berita' ? 1 : 0),
            aspirasiViews: cur.aspirasiViews + (section === 'aspirasi' ? 1 : 0),
            updatedAt: serverTimestamp(),
          });
        } else {
          await setDoc(ref, {
            dateKey,
            label: sanitizeText(label, 30),
            visitors: 1,
            pageViews: 1,
            mobileUsers: isMobile ? 1 : 0,
            desktopUsers: isMobile ? 0 : 1,
            berandaViews: section === 'beranda' ? 1 : 0,
            profilViews: section === 'profil' ? 1 : 0,
            programViews: section === 'program' ? 1 : 0,
            galeriViews: section === 'galeri' ? 1 : 0,
            beritaViews: section === 'berita' ? 1 : 0,
            aspirasiViews: section === 'aspirasi' ? 1 : 0,
            ownerScope: 'p2uwm_analytics',
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.warn('Analytics persistence skipped:', err);
      }
    },
    [currentUser]
  );

  // Trigger initial arrival telemetry once auth state resolves
  useEffect(() => {
    if (authReady && !sessionCountedRef.current) {
      recordSectionVisit('beranda');
    }
  }, [authReady, recordSectionVisit]);

  const handleLoginGoogle = async () => {
    setAuthError(null);
    setAuthChecking(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthChecking(false);
      setAuthError(formatFirebaseAuthError(err));
    }
  };

  const handleLogout = async () => {
    setAuthError(null);
    await logOutUser();
    setViewMode('public');
  };

  // Atomic Submission of Operational Aspiration + Isolated PII Vault (Registered Accounts Only)
  const handleSubmitAspiration = async (payload: {
    senderName: string;
    pondBlock: string;
    category: AspirationCategory;
    urgency: AspirationUrgency;
    subject: string;
    message: string;
    phone: string;
    memberIdCode: string;
  }) => {
    if (!currentUser || !currentUser.email) {
      throw new Error('Silakan masuk menggunakan akun resmi yang terdaftar terlebih dahulu.');
    }

    const aspirationId = sanitizeId(`asp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const uid = sanitizeId(currentUser.uid);

    try {
      const batch = writeBatch(db);

      batch.set(doc(db, 'aspirations', aspirationId), {
        senderName: sanitizeText(payload.senderName, 100),
        pondBlock: sanitizeText(payload.pondBlock, 60),
        category: payload.category,
        urgency: payload.urgency,
        subject: sanitizeText(payload.subject, 160),
        message: sanitizeText(payload.message, 2500),
        status: 'Diajukan',
        adminResponse: '',
        authorId: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      batch.set(doc(db, 'aspirations_pii', aspirationId), {
        aspirationId,
        authorId: uid,
        email: sanitizeText(currentUser.email, 160),
        phone: sanitizeText(payload.phone, 30),
        memberIdCode: sanitizeText(payload.memberIdCode, 50),
        createdAt: serverTimestamp(),
      });

      await batch.commit();
      await recordSectionVisit('aspirasi');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `aspirations/${aspirationId}`);
    }
  };

  const handleSaveBoardMember = async (payload: {
    id?: string;
    name: string;
    position: string;
    division: BoardDivision;
    bio: string;
    orderIndex: number;
    photoKey: string;
    status?: 'published' | 'archived';
  }) => {
    if (!currentUser || !isAdmin) {
      throw new Error(
        'Hanya Pengurus / Administrator terdaftar yang dapat menyimpan perubahan struktur.'
      );
    }

    const cleanId = payload.id
      ? sanitizeId(payload.id)
      : sanitizeId(`mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`);

    const baseFields = {
      name: sanitizeText(payload.name, 100),
      position: sanitizeText(payload.position, 100),
      division: payload.division,
      bio: sanitizeText(payload.bio, 500),
      orderIndex: Math.max(1, Math.min(100, Math.round(Number(payload.orderIndex) || 1))),
      photoKey: sanitizeText(payload.photoKey, 500),
      status: payload.status || ('published' as const),
      updatedAt: serverTimestamp(),
    };

    try {
      try {
        const raw = localStorage.getItem('p2uwm_deleted_board_ids');
        if (raw) {
          const list = (JSON.parse(raw) as string[]).filter((x) => x !== cleanId);
          localStorage.setItem('p2uwm_deleted_board_ids', JSON.stringify(list));
        }
      } catch {
        // Ignore storage errors
      }

      const ref = doc(db, 'board_members', cleanId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, baseFields);
        await recordSecurityAudit({
          action: 'UPDATE',
          targetCollection: 'board_members',
          targetId: cleanId,
          summary: `Memperbarui struktur organisasi: ${baseFields.name} (${baseFields.position})`,
        });
      } else {
        await setDoc(ref, {
          ...baseFields,
          authorId: sanitizeId(currentUser.uid),
          createdAt: serverTimestamp(),
        });
        await recordSecurityAudit({
          action: 'CREATE',
          targetCollection: 'board_members',
          targetId: cleanId,
          summary: `Menambahkan anggota struktur: ${baseFields.name} (${baseFields.division})`,
        });
      }

      setBoardMembers((prev) => {
        const idx = prev.findIndex((m) => m.id === cleanId);
        const nextItem: BoardMember = {
          id: cleanId,
          name: baseFields.name,
          position: baseFields.position,
          division: baseFields.division,
          bio: baseFields.bio,
          orderIndex: baseFields.orderIndex,
          photoKey: baseFields.photoKey,
          status: baseFields.status,
          authorId: idx >= 0 ? prev[idx].authorId : sanitizeId(currentUser.uid),
        };
        const nextList =
          idx >= 0 ? prev.map((m, i) => (i === idx ? nextItem : m)) : [...prev, nextItem];
        return [...nextList].sort((a, b) => a.orderIndex - b.orderIndex);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `board_members/${cleanId}`);
    }
  };

  const handleDeleteBoardMember = async (id: string, name: string) => {
    if (!currentUser || !isAdmin) {
      throw new Error(
        'Hanya Pengurus / Administrator terdaftar yang dapat menghapus data struktur.'
      );
    }
    const cleanId = sanitizeId(id);
    try {
      try {
        const raw = localStorage.getItem('p2uwm_deleted_board_ids');
        const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
        set.add(cleanId);
        localStorage.setItem('p2uwm_deleted_board_ids', JSON.stringify(Array.from(set)));
      } catch {
        // Ignore storage errors
      }

      const ref = doc(db, 'board_members', cleanId);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await deleteDoc(ref);
        await recordSecurityAudit({
          action: 'DELETE',
          targetCollection: 'board_members',
          targetId: cleanId,
          summary: `Menghapus anggota struktur organisasi: ${name}`,
          severity: 'WARNING',
        });
      }

      setBoardMembers((prev) => prev.filter((m) => m.id !== cleanId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `board_members/${cleanId}`);
    }
  };

  const handleNavClick = (section: PublicSectionKey, targetId: string) => {
    setMobileMenuOpen(false);
    if (viewMode !== 'public') {
      setViewMode('public');
      setTimeout(() => {
        const el = document.getElementById(targetId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    } else {
      const el = document.getElementById(targetId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
    recordSectionVisit(section);
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-[#071318] dark:text-slate-100">
        {/* ===================================================================
            STRICT 3-ZONE TOP BAR CONTRACT (Public Mode Only)
        ==================================================================== */}
        {viewMode === 'public' && (
          <header className="no-print sticky top-0 z-40 bg-white/90 dark:bg-[#051116]/90 backdrop-blur-md border-b border-emerald-900/10 dark:border-teal-500/20 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-teal-400 via-amber-400 to-cyan-500" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
              {/* Zone 1: Official P2UWM Crest + Single-Line Brand Wordmark */}
              <a
                href="#section-beranda"
                onClick={(e) => {
                  e.preventDefault();
                  handleNavClick('beranda', 'section-beranda');
                }}
                className="group flex items-center gap-3 whitespace-nowrap shrink-0"
              >
                <img
                  src={P2UWM_LOGO_URL}
                  alt="Lambang Resmi P2UWM"
                  referrerPolicy="no-referrer"
                  className="h-9 w-11 sm:h-10 sm:w-12 rounded-lg bg-white p-0.5 object-contain ring-1 ring-amber-400/70 shadow-xs transition-transform duration-200 group-hover:scale-105 shrink-0"
                />
                <span className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-emerald-800 to-teal-700 dark:from-white dark:via-emerald-200 dark:to-amber-200 bg-clip-text text-transparent">
                  {siteSettings.orgShortName} Mandira
                </span>
              </a>

              {/* Zone 2: 5 Clean Single-Line Navigation Links */}
              <nav className="hidden lg:flex items-center gap-7 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <a
                  href="#section-beranda"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('beranda', 'section-beranda');
                  }}
                  className="hover:text-emerald-700 dark:hover:text-amber-300 hover:underline underline-offset-8 decoration-amber-400 decoration-2 transition-colors whitespace-nowrap shrink-0"
                >
                  Beranda
                </a>
                <a
                  href="#section-profil"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('profil', 'section-profil');
                  }}
                  className="hover:text-emerald-700 dark:hover:text-amber-300 hover:underline underline-offset-8 decoration-amber-400 decoration-2 transition-colors whitespace-nowrap shrink-0"
                >
                  Profil &amp; Pengurus
                </a>
                <a
                  href="#section-program"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('program', 'section-program');
                  }}
                  className="hover:text-emerald-700 dark:hover:text-amber-300 hover:underline underline-offset-8 decoration-amber-400 decoration-2 transition-colors whitespace-nowrap shrink-0"
                >
                  Program Kerja
                </a>
                <a
                  href="#section-galeri"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('galeri', 'section-galeri');
                  }}
                  className="hover:text-emerald-700 dark:hover:text-amber-300 hover:underline underline-offset-8 decoration-amber-400 decoration-2 transition-colors whitespace-nowrap shrink-0"
                >
                  Galeri &amp; Berita
                </a>
                <a
                  href="#section-aspirasi"
                  onClick={(e) => {
                    e.preventDefault();
                    handleNavClick('aspirasi', 'section-aspirasi');
                  }}
                  className="hover:text-emerald-700 dark:hover:text-amber-300 hover:underline underline-offset-8 decoration-amber-400 decoration-2 transition-colors whitespace-nowrap shrink-0"
                >
                  Kirim Aspirasi
                </a>
              </nav>

              {/* Zone 3: 1 Primary Action (+ Mobile Menu Button on Small Screens) */}
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuthError(null);
                    setViewMode('admin');
                  }}
                  className="luxury-sheen-btn px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white text-xs sm:text-sm font-semibold ring-1 ring-amber-300/50 shadow-sm transition-transform duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isAdmin ? 'Dashboard Admin' : currentUser ? 'Akun Terdaftar' : 'Login Pengurus'}
                </button>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((v) => !v)}
                  className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-200 cursor-pointer"
                  aria-label="Buka Menu Navigasi"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.div
              style={{ scaleX: smoothScrollProgress }}
              className="origin-left h-[2px] w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500"
            />

            {mobileMenuOpen && (
              <div className="lg:hidden border-t border-slate-200 dark:border-teal-900/50 bg-white/95 dark:bg-[#08161C]/95 backdrop-blur-md px-4 py-4 space-y-1.5">
                <button
                  type="button"
                  onClick={() => handleNavClick('beranda', 'section-beranda')}
                  className="block w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-teal-950/60"
                >
                  Beranda
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('profil', 'section-profil')}
                  className="block w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-teal-950/60"
                >
                  Profil &amp; Pengurus
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('program', 'section-program')}
                  className="block w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-teal-950/60"
                >
                  Program Kerja
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('galeri', 'section-galeri')}
                  className="block w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-teal-950/60"
                >
                  Galeri Foto
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('berita', 'section-berita')}
                  className="block w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-teal-950/60"
                >
                  Berita &amp; Kegiatan
                </button>
                <button
                  type="button"
                  onClick={() => handleNavClick('aspirasi', 'section-aspirasi')}
                  className="block w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-semibold text-slate-800 dark:text-slate-100 hover:bg-emerald-50 dark:hover:bg-teal-950/60"
                >
                  Kirim Aspirasi
                </button>
              </div>
            )}
          </header>
        )}

        {/* ===================================================================
            VIEW ROUTING: PUBLIC PORTAL VS ADMIN WORKSPACE
        ==================================================================== */}
        {viewMode === 'public' ? (
          <PublicPortal
            siteSettings={siteSettings}
            boardMembers={boardMembers}
            programs={programs}
            galleryItems={galleryItems}
            articles={articles}
            myAspirations={myAspirations}
            currentUser={currentUser}
            registeredAccount={registeredAccount}
            isAdmin={isAdmin}
            authChecking={authChecking}
            authError={authError}
            onClearAuthError={() => setAuthError(null)}
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode((d) => !d)}
            onSectionVisit={(sec) => recordSectionVisit(sec)}
            onLoginGoogle={handleLoginGoogle}
            onLogout={handleLogout}
            onOpenAdmin={() => {
              setAuthError(null);
              setViewMode('admin');
            }}
            onSubmitAspiration={handleSubmitAspiration}
            onSaveBoardMember={handleSaveBoardMember}
            onDeleteBoardMember={handleDeleteBoardMember}
          />
        ) : (
          <AdminWorkspace
            currentUser={currentUser}
            registeredAccount={registeredAccount}
            isAdmin={isAdmin}
            isBootstrappedAdmin={isBootstrappedAdmin}
            authChecking={authChecking}
            authError={authError}
            onClearAuthError={() => setAuthError(null)}
            siteSettings={siteSettings}
            boardMembers={boardMembers}
            programs={programs}
            galleryItems={galleryItems}
            articles={articles}
            allAspirations={allAspirations}
            analyticsDaily={analyticsDaily}
            auditLogs={auditLogs}
            delegatedAdmins={delegatedAdmins}
            registeredAccounts={registeredAccounts}
            hasCloudSeeded={hasCloudSeeded}
            onBackToPublic={() => {
              setAuthError(null);
              setViewMode('public');
            }}
            onLoginGoogle={handleLoginGoogle}
            onLogout={handleLogout}
            onRecordSimulatedVisit={() => recordSectionVisit('beranda', true)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
