/**
 * P2UWM Zero-Trust Security Rules Adversarial Test Suite
 * Verifies all "Dirty Dozen" payloads from security_spec.md return PERMISSION_DENIED.
 */
import {
  initializeTestEnvironment,
  assertFails,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'node:fs';
import { doc, setDoc, getDoc, getDocs, collection, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export async function runDirtyDozenSecuritySuite() {
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: 'p2uwm-security-test',
    firestore: {
      rules: readFileSync('firestore.rules', 'utf8'),
    },
  });

  try {
    const attackerCtx = testEnv.authenticatedContext('uid_attacker', {
      email: 'attacker@example.com',
      email_verified: true,
    });
    const spoofAdminCtx = testEnv.authenticatedContext('uid_spoof', {
      email: 'adryanbejo@gmail.com',
      email_verified: false,
    });
    const adminCtx = testEnv.authenticatedContext('uid_super_admin', {
      email: 'adryanbejo@gmail.com',
      email_verified: true,
    });

    const attackerDb = attackerCtx.firestore();
    const spoofDb = spoofAdminCtx.firestore();
    const adminDb = adminCtx.firestore();

    // 1. Self-Assigned Admin Escalation
    await assertFails(
      setDoc(doc(attackerDb, 'admins', 'uid_attacker'), {
        uid: 'uid_attacker',
        email: 'attacker@example.com',
        name: 'Attacker',
        roleTitle: 'Ketua',
        addedBy: 'uid_attacker',
        createdAt: serverTimestamp(),
      })
    );

    // 2. Unverified Email Spoofing
    await assertFails(
      setDoc(doc(spoofDb, 'articles', 'art_spoof'), {
        title: 'Spoofed Article Title',
        excerpt: 'Spoofed excerpt text for testing',
        content: 'Spoofed full content body longer than twenty characters.',
        category: 'Pengumuman',
        authorName: 'Spoofer',
        publishDate: '01 Nov 2026',
        readMinutes: 3,
        imageUrl: '/test.jpg',
        featured: false,
        status: 'published',
        authorId: 'uid_spoof',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 3. Shadow / Ghost Field Injection
    await assertFails(
      setDoc(doc(adminDb, 'gallery_items', 'gal_ghost'), {
        title: 'Gorong-Gorong Blok 4',
        caption: 'Pembangunan gorong-gorong main inlet Blok 4.',
        category: 'Infrastruktur',
        locationBlock: 'Blok 4',
        eventDate: 'Nov 2026',
        imageUrl: '/test.jpg',
        status: 'published',
        authorId: 'uid_super_admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isShadowAdmin: true,
      })
    );

    // 4. Identity Spoofing on Aspiration
    await assertFails(
      setDoc(doc(attackerDb, 'aspirations', 'asp_spoof'), {
        senderName: 'Budi Petambak',
        pondBlock: 'Blok 2',
        category: 'Infrastruktur & Kanal',
        urgency: 'Normal',
        subject: 'Perbaikan Pintu Air Sekunder',
        message: 'Mohon dilakukan pengerukan sedimen di saluran sekunder blok 2.',
        status: 'Diajukan',
        adminResponse: '',
        authorId: 'uid_someone_else',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 5. Orphaned Aspiration Without Atomic PII Vault
    await assertFails(
      setDoc(doc(attackerDb, 'aspirations', 'asp_orphan'), {
        senderName: 'Budi Petambak',
        pondBlock: 'Blok 2',
        category: 'Infrastruktur & Kanal',
        urgency: 'Normal',
        subject: 'Perbaikan Pintu Air Sekunder',
        message: 'Mohon dilakukan pengerukan sedimen di saluran sekunder blok 2.',
        status: 'Diajukan',
        adminResponse: '',
        authorId: 'uid_attacker',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // Seed victim PII & Audit Log for read/tamper tests
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      const sysDb = ctx.firestore();
      await setDoc(doc(sysDb, 'aspirations_pii', 'asp_victim'), {
        aspirationId: 'asp_victim',
        authorId: 'uid_victim',
        email: 'victim@mandira.id',
        phone: '081234567890',
        memberIdCode: 'P2UWM-0412',
        createdAt: new Date(),
      });
      await setDoc(doc(sysDb, 'audit_logs', 'log_immutable'), {
        actorUid: 'uid_super_admin',
        actorEmail: 'adryanbejo@gmail.com',
        action: 'CREATE',
        targetCollection: 'articles',
        targetId: 'art_1',
        summary: 'Created official announcement',
        severity: 'INFO',
        scope: 'p2uwm_audit',
        createdAt: new Date(),
      });
    });

    // 6. PII Vault Lateral Read by non-owner
    await assertFails(getDoc(doc(attackerDb, 'aspirations_pii', 'asp_victim')));

    // 7. PII Bulk Enumeration (even by admin)
    await assertFails(getDocs(collection(adminDb, 'aspirations_pii')));

    // 8. ID Poisoning Attack
    await assertFails(getDoc(doc(attackerDb, 'articles', 'bad$id!spaces')));

    // 9. Client-Forged Timestamp
    await assertFails(
      setDoc(doc(adminDb, 'audit_logs', 'log_forged_time'), {
        actorUid: 'uid_super_admin',
        actorEmail: 'adryanbejo@gmail.com',
        action: 'SECURITY_CHECK',
        targetCollection: 'system',
        targetId: 'check_1',
        summary: 'Forged past timestamp attempt',
        severity: 'INFO',
        scope: 'p2uwm_audit',
        createdAt: new Date('2020-01-01T00:00:00Z'),
      })
    );

    // 10. Self-Approving Aspiration Status
    await assertFails(
      setDoc(doc(attackerDb, 'aspirations', 'asp_skip'), {
        senderName: 'Attacker',
        pondBlock: 'Blok 1',
        category: 'Infrastruktur & Kanal',
        urgency: 'Mendesak',
        subject: 'Bypass Status Check',
        message: 'Attempting to directly create aspiration in Selesai status.',
        status: 'Selesai',
        adminResponse: 'Approved by self',
        authorId: 'uid_attacker',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 11. Value Poisoning on WorkProgram progressPercent > 100
    await assertFails(
      setDoc(doc(adminDb, 'programs', 'prog_invalid'), {
        code: 'BID-01',
        title: 'Program Kerja Invalid',
        fieldCategory: 'Infrastruktur & Pengelolaan Kawasan Pertambakan',
        summary: 'Ringkasan program kerja valid panjang cukup.',
        details: 'Detail program kerja valid dengan panjang karakter memadai.',
        highlights: ['Target 1'],
        progressPercent: 500,
        targetMetric: '100% Kanal',
        imageKey: 'infrastruktur',
        orderIndex: 1,
        status: 'published',
        authorId: 'uid_super_admin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );

    // 12. Audit Log Tampering (Delete / Update by Admin)
    await assertFails(deleteDoc(doc(adminDb, 'audit_logs', 'log_immutable')));
    await assertFails(updateDoc(doc(adminDb, 'audit_logs', 'log_immutable'), { summary: 'Erased' }));

    // 13. Unregistered Account Whitelist Escalation & Unregistered Aspiration Submission
    await assertFails(
      setDoc(doc(attackerDb, 'registered_accounts', 'attacker@example.com'), {
        email: 'attacker@example.com',
        name: 'Attacker Self Register',
        role: 'admin',
        roleTitle: 'Admin Palsu',
        pondBlock: 'Blok 1',
        active: true,
        scope: 'p2uwm_auth',
        addedBy: 'uid_attacker',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    );
  } finally {
    await testEnv.cleanup();
  }
}

