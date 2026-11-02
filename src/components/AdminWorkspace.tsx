import React, { useState, useMemo } from 'react';
import { User } from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  BarChart3,
  FileEdit,
  Inbox,
  FileSpreadsheet,
  ShieldAlert,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Download,
  Printer,
  Lock,
  Eye,
  CheckCircle2,
  CloudUpload,
  LogIn,
  LogOut,
  Menu,
  X,
  UserPlus,
  Activity,
  Server,
  ShieldCheck,
  Copy,
  Database,
  Globe,
} from 'lucide-react';
import {
  AdminRole,
  AnalyticsDaily,
  ArticleCategory,
  Aspiration,
  AspirationPii,
  AspirationStatus,
  AspirationUrgency,
  AuditLog,
  BoardDivision,
  BoardMember,
  GalleryCategory,
  GalleryItem,
  NewsArticle,
  ProgramFieldCategory,
  RegisteredAccount,
  RegisteredAccountRole,
  SiteSetting,
  WorkProgram,
} from '../types';
import {
  BOOTSTRAPPED_ADMIN_EMAIL,
  FIREBASE_PROJECT_ID,
  FIRESTORE_DATABASE_ID,
  db,
  OperationType,
  handleFirestoreError,
  sanitizeId,
  sanitizeText,
  normalizeEmailKey,
  isValidEmailFormat,
  recordSecurityAudit,
  formatTimestamp,
} from '../firebase';
import {
  ASSET_PRESETS,
  DEFAULT_ANALYTICS_DAILY,
  DEFAULT_ARTICLES,
  DEFAULT_BOARD_MEMBERS,
  DEFAULT_GALLERY_ITEMS,
  DEFAULT_PROGRAMS,
  DEFAULT_SITE_SETTINGS,
  P2UWM_LOGO_URL,
  resolveImageAsset,
} from '../data/seedData';
import { ResilientImage } from './ResilientImage';

interface AdminWorkspaceProps {
  currentUser: User | null;
  registeredAccount: RegisteredAccount | null;
  isAdmin: boolean;
  isBootstrappedAdmin: boolean;
  authChecking: boolean;
  authError: string | null;
  onClearAuthError: () => void;
  siteSettings: SiteSetting;
  boardMembers: BoardMember[];
  programs: WorkProgram[];
  galleryItems: GalleryItem[];
  articles: NewsArticle[];
  allAspirations: Aspiration[];
  analyticsDaily: AnalyticsDaily[];
  auditLogs: AuditLog[];
  delegatedAdmins: AdminRole[];
  registeredAccounts: RegisteredAccount[];
  hasCloudSeeded: boolean;
  onBackToPublic: () => void;
  onLoginGoogle: () => Promise<void>;
  onLogout: () => Promise<void>;
  onRecordSimulatedVisit: () => Promise<void>;
}

type AdminTab = 'analytics' | 'cms' | 'aspirations' | 'reports' | 'security' | 'hosting';
type CmsSubTab = 'profil' | 'berita' | 'galeri' | 'program' | 'pengurus';

const RUMAHWEB_HTACCESS_CONTENT = `# =============================================================================
# Konfigurasi Produksi Portal Resmi P2UWM Bumi Pratama Mandira
# Kompatibel Penuh untuk Rumahweb Indonesia (cPanel Apache 2.4 & LiteSpeed)
# Unggah seluruh isi folder hasil build (dist/) termasuk file .htaccess ini
# ke direktori public_html pada File Manager cPanel Rumahweb.
# =============================================================================

Options -Indexes -MultiViews

<IfModule mod_rewrite.c>
  RewriteEngine On

  # 1. Paksa Protokol Aman HTTPS SSL di Domain Produksi Rumahweb
  RewriteCond %{HTTPS} !=on
  RewriteCond %{HTTP_HOST} !^localhost [NC]
  RewriteCond %{HTTP_HOST} !^127\\.0\\.0\\.1
  RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

  # 2. Izinkan akses langsung untuk file aset fisik (gambar, css, js, webmanifest)
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # 3. Single Page Application (SPA) Fallback ke index.html
  RewriteRule ^ index.html [QSA,L]
</IfModule>

<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set X-XSS-Protection "1; mode=block"

  <FilesMatch "^index\\.html$">
    Header set Cache-Control "no-cache, no-store, must-revalidate"
  </FilesMatch>

  <FilesMatch "\\.(js|css|png|jpg|jpeg|webp|svg|ico|woff2)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
</IfModule>

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/plain text/css text/javascript application/javascript application/json image/svg+xml application/manifest+json
</IfModule>
`;

export const AdminWorkspace: React.FC<AdminWorkspaceProps> = ({
  currentUser,
  registeredAccount,
  isAdmin,
  isBootstrappedAdmin,
  authChecking,
  authError,
  onClearAuthError,
  siteSettings,
  boardMembers,
  programs,
  galleryItems,
  articles,
  allAspirations,
  analyticsDaily,
  auditLogs,
  delegatedAdmins,
  registeredAccounts,
  hasCloudSeeded,
  onBackToPublic,
  onLoginGoogle,
  onLogout,
  onRecordSimulatedVisit,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('analytics');
  const [cmsSubTab, setCmsSubTab] = useState<CmsSubTab>('berita');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  // Analytics range state
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '3d' | '1d'>('7d');

  // CMS Site Profile Form State
  const [profileForm, setProfileForm] = useState<SiteSetting>(siteSettings);

  // CMS Article Editor State
  const [editingArticleId, setEditingArticleId] = useState<string | null>(null);
  const [artTitle, setArtTitle] = useState('');
  const [artExcerpt, setArtExcerpt] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artCategory, setArtCategory] = useState<ArticleCategory>('Pengumuman');
  const [artAuthorName, setArtAuthorName] = useState('Sekretariat Pusat P2UWM');
  const [artPublishDate, setArtPublishDate] = useState('01 November 2026');
  const [artReadMinutes, setArtReadMinutes] = useState(4);
  const [artImageUrl, setArtImageUrl] = useState('gorong_gorong');
  const [artFeatured, setArtFeatured] = useState(false);
  const [artStatus, setArtStatus] = useState<'published' | 'draft'>('published');

  // CMS Gallery Editor State
  const [editingGalleryId, setEditingGalleryId] = useState<string | null>(null);
  const [galTitle, setGalTitle] = useState('');
  const [galCaption, setGalCaption] = useState('');
  const [galCategory, setGalCategory] = useState<GalleryCategory>('Infrastruktur');
  const [galLocation, setGalLocation] = useState('Blok 4 · Bumi Pratama Mandira');
  const [galDate, setGalDate] = useState('November 2026');
  const [galImageUrl, setGalImageUrl] = useState('gorong_gorong');
  const [galStatus, setGalStatus] = useState<'published' | 'draft'>('published');

  // CMS Program Editor State
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [progCode, setProgCode] = useState('BIDANG 06');
  const [progTitle, setProgTitle] = useState('');
  const [progFieldCat, setProgFieldCat] = useState<ProgramFieldCategory>(
    'Infrastruktur & Pengelolaan Kawasan Pertambakan'
  );
  const [progSummary, setProgSummary] = useState('');
  const [progDetails, setProgDetails] = useState('');
  const [progHighlightsRaw, setProgHighlightsRaw] = useState('');
  const [progProgress, setProgProgress] = useState(85);
  const [progMetric, setProgMetric] = useState('100% Target Terukur');
  const [progImageKey, setProgImageKey] = useState('gorong_gorong');
  const [progOrder, setProgOrder] = useState(6);
  const [progStatus, setProgStatus] = useState<'published' | 'draft'>('published');

  // CMS Board Member Editor State
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [memName, setMemName] = useState('');
  const [memPosition, setMemPosition] = useState('');
  const [memDivision, setMemDivision] = useState<BoardDivision>('Inti');
  const [memBio, setMemBio] = useState('');
  const [memOrder, setMemOrder] = useState(8);
  const [memPhotoKey, setMemPhotoKey] = useState('musyawarah');
  const [memStatus, setMemStatus] = useState<'published' | 'archived'>('published');
  const [cmsDemRole, setCmsDemRole] = useState<'Ketua Demisioner' | 'Wakil Ketua Demisioner'>(
    'Ketua Demisioner'
  );
  const [cmsDemPeriod, setCmsDemPeriod] = useState<string>('Periode III (2024–2028)');

  // Aspirations Inbox State
  const [aspFilterStatus, setAspFilterStatus] = useState<'Semua' | AspirationStatus>('Semua');
  const [revealedPii, setRevealedPii] = useState<Record<string, AspirationPii>>({});
  const [responseDrafts, setResponseDrafts] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, AspirationStatus>>({});

  // Security Center & Whitelisted Registered Accounts State
  const [auditFilter, setAuditFilter] = useState<string>('ALL');
  const [regEmail, setRegEmail] = useState('');
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState<RegisteredAccountRole>('admin');
  const [regRoleTitle, setRegRoleTitle] = useState('Pengurus Pusat P2UWM');
  const [regSearch, setRegSearch] = useState('');
  const [confirmRevokeEmail, setConfirmRevokeEmail] = useState<string | null>(null);
  const [newAdminUid, setNewAdminUid] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminRoleTitle, setNewAdminRoleTitle] = useState('Pengurus Pusat P2UWM');

  const notify = (msg: string) => {
    setBannerNotice(msg);
    setTimeout(() => setBannerNotice(null), 4500);
  };

  // Sync initial Cloud Seed for CMS & Analytics
  const handleSeedCloudData = async () => {
    if (!currentUser) return;
    setBusyAction(true);
    try {
      const batch = writeBatch(db);
      const uid = sanitizeId(currentUser.uid);

      batch.set(doc(db, 'site_settings', 'main'), {
        ...DEFAULT_SITE_SETTINGS,
        updatedBy: uid,
        updatedAt: serverTimestamp(),
      });

      for (const m of DEFAULT_BOARD_MEMBERS) {
        batch.set(doc(db, 'board_members', sanitizeId(m.id)), {
          name: m.name,
          position: m.position,
          division: m.division,
          bio: m.bio,
          orderIndex: m.orderIndex,
          photoKey: m.photoKey,
          status: m.status,
          authorId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const p of DEFAULT_PROGRAMS) {
        batch.set(doc(db, 'programs', sanitizeId(p.id)), {
          code: p.code,
          title: p.title,
          fieldCategory: p.fieldCategory,
          summary: p.summary,
          details: p.details,
          highlights: p.highlights,
          progressPercent: p.progressPercent,
          targetMetric: p.targetMetric,
          imageKey: p.imageKey,
          orderIndex: p.orderIndex,
          status: p.status,
          authorId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const g of DEFAULT_GALLERY_ITEMS) {
        batch.set(doc(db, 'gallery_items', sanitizeId(g.id)), {
          title: g.title,
          caption: g.caption,
          category: g.category,
          locationBlock: g.locationBlock,
          eventDate: g.eventDate,
          imageUrl: g.imageUrl,
          status: g.status,
          authorId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const a of DEFAULT_ARTICLES) {
        batch.set(doc(db, 'articles', sanitizeId(a.id)), {
          title: a.title,
          excerpt: a.excerpt,
          content: a.content,
          category: a.category,
          authorName: a.authorName,
          publishDate: a.publishDate,
          readMinutes: a.readMinutes,
          imageUrl: a.imageUrl,
          featured: a.featured,
          status: a.status,
          authorId: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      for (const d of DEFAULT_ANALYTICS_DAILY) {
        batch.set(doc(db, 'analytics_daily', sanitizeId(d.dateKey)), {
          ...d,
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      await recordSecurityAudit({
        action: 'SEED_DATA',
        targetCollection: 'all_cms_collections',
        targetId: 'initial_baseline',
        summary: 'Sinkronisasi data awal profil, pengurus, 5 bidang kerja, galeri, berita & analitik ke Firestore.',
      });
      notify('Seluruh data master P2UWM berhasil disinkronkan ke basis data Cloud Firestore.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'batch_seed');
    } finally {
      setBusyAction(false);
    }
  };

  // =========================================================================
  // CMS CRUD HANDLERS
  // =========================================================================
  const handleSaveSiteProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setBusyAction(true);
    const uid = sanitizeId(currentUser.uid);
    const cleanMissions = profileForm.missionList
      .map((m) => sanitizeText(m, 300))
      .filter((m) => m.length >= 3)
      .slice(0, 8);

    const payload = {
      orgName: sanitizeText(profileForm.orgName, 120),
      orgShortName: sanitizeText(profileForm.orgShortName, 30),
      tagline: sanitizeText(profileForm.tagline, 240),
      locationText: sanitizeText(profileForm.locationText, 200),
      vision: sanitizeText(profileForm.vision, 800),
      missionList: cleanMissions.length > 0 ? cleanMissions : DEFAULT_SITE_SETTINGS.missionList,
      historyText: sanitizeText(profileForm.historyText, 2500),
      chairmanName: sanitizeText(profileForm.chairmanName, 100),
      chairmanTitle: sanitizeText(profileForm.chairmanTitle, 100),
      chairmanQuote: sanitizeText(profileForm.chairmanQuote, 1200),
      totalMembers: Math.max(0, Math.min(1000000, Math.round(Number(profileForm.totalMembers) || 0))),
      totalPonds: Math.max(0, Math.min(1000000, Math.round(Number(profileForm.totalPonds) || 0))),
      activeBlocks: Math.max(0, Math.min(1000, Math.round(Number(profileForm.activeBlocks) || 0))),
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    };

    try {
      await setDoc(doc(db, 'site_settings', 'main'), payload);
      await recordSecurityAudit({
        action: 'UPDATE',
        targetCollection: 'site_settings',
        targetId: 'main',
        summary: `Memperbarui profil organisasi & sambutan Ketua (${payload.chairmanName}).`,
      });
      notify('Profil & Identitas Organisasi P2UWM berhasil disimpan.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'site_settings/main');
    } finally {
      setBusyAction(false);
    }
  };

  const resetArticleForm = () => {
    setEditingArticleId(null);
    setArtTitle('');
    setArtExcerpt('');
    setArtContent('');
    setArtCategory('Pengumuman');
    setArtAuthorName('Sekretariat Pusat P2UWM');
    setArtPublishDate('01 November 2026');
    setArtReadMinutes(4);
    setArtImageUrl('gorong_gorong');
    setArtFeatured(false);
    setArtStatus('published');
  };

  const handleSaveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setBusyAction(true);
    const id = editingArticleId ? sanitizeId(editingArticleId) : sanitizeId(`art_${Date.now()}`);
    const baseFields = {
      title: sanitizeText(artTitle, 180),
      excerpt: sanitizeText(artExcerpt, 360),
      content: sanitizeText(artContent, 8000),
      category: artCategory,
      authorName: sanitizeText(artAuthorName, 100),
      publishDate: sanitizeText(artPublishDate, 40),
      readMinutes: Math.max(1, Math.min(60, Math.round(Number(artReadMinutes) || 3))),
      imageUrl: sanitizeText(artImageUrl, 500),
      featured: Boolean(artFeatured),
      status: artStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      const existingRef = doc(db, 'articles', id);
      const snap = await getDoc(existingRef);
      if (snap.exists()) {
        await updateDoc(existingRef, baseFields);
        await recordSecurityAudit({
          action: 'UPDATE',
          targetCollection: 'articles',
          targetId: id,
          summary: `Memperbarui berita: ${baseFields.title}`,
        });
      } else {
        await setDoc(existingRef, {
          ...baseFields,
          authorId: sanitizeId(currentUser.uid),
          createdAt: serverTimestamp(),
        });
        await recordSecurityAudit({
          action: 'CREATE',
          targetCollection: 'articles',
          targetId: id,
          summary: `Menerbitkan berita baru: ${baseFields.title}`,
        });
      }
      resetArticleForm();
      notify('Artikel berita berhasil disimpan ke sistem CMS.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `articles/${id}`);
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteDoc = async (colName: string, id: string, label: string) => {
    setBusyAction(true);
    const cleanId = sanitizeId(id);
    try {
      await deleteDoc(doc(db, colName, cleanId));
      await recordSecurityAudit({
        action: 'DELETE',
        targetCollection: colName,
        targetId: cleanId,
        summary: `Menghapus data ${colName}: ${label}`,
        severity: 'WARNING',
      });
      notify(`Item "${label}" telah dihapus dari Cloud Firestore.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${colName}/${cleanId}`);
    } finally {
      setBusyAction(false);
    }
  };

  const resetGalleryForm = () => {
    setEditingGalleryId(null);
    setGalTitle('');
    setGalCaption('');
    setGalCategory('Infrastruktur');
    setGalLocation('Blok 4 · Bumi Pratama Mandira');
    setGalDate('November 2026');
    setGalImageUrl('gorong_gorong');
    setGalStatus('published');
  };

  const handleSaveGallery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setBusyAction(true);
    const id = editingGalleryId ? sanitizeId(editingGalleryId) : sanitizeId(`gal_${Date.now()}`);
    const baseFields = {
      title: sanitizeText(galTitle, 160),
      caption: sanitizeText(galCaption, 600),
      category: galCategory,
      locationBlock: sanitizeText(galLocation, 80),
      eventDate: sanitizeText(galDate, 40),
      imageUrl: sanitizeText(galImageUrl, 500),
      status: galStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      const ref = doc(db, 'gallery_items', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, baseFields);
        await recordSecurityAudit({
          action: 'UPDATE',
          targetCollection: 'gallery_items',
          targetId: id,
          summary: `Memperbarui galeri foto: ${baseFields.title}`,
        });
      } else {
        await setDoc(ref, {
          ...baseFields,
          authorId: sanitizeId(currentUser.uid),
          createdAt: serverTimestamp(),
        });
        await recordSecurityAudit({
          action: 'CREATE',
          targetCollection: 'gallery_items',
          targetId: id,
          summary: `Menambahkan dokumentasi galeri: ${baseFields.title}`,
        });
      }
      resetGalleryForm();
      notify('Dokumentasi galeri foto berhasil disimpan.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `gallery_items/${id}`);
    } finally {
      setBusyAction(false);
    }
  };

  const resetProgramForm = () => {
    setEditingProgramId(null);
    setProgCode('BIDANG 06');
    setProgTitle('');
    setProgSummary('');
    setProgDetails('');
    setProgHighlightsRaw('');
    setProgProgress(85);
    setProgMetric('100% Target Terukur');
    setProgImageKey('gorong_gorong');
    setProgOrder(programs.length + 1);
    setProgStatus('published');
  };

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setBusyAction(true);
    const id = editingProgramId ? sanitizeId(editingProgramId) : sanitizeId(`prog_${Date.now()}`);
    const highlights = progHighlightsRaw
      .split('\n')
      .map((s) => sanitizeText(s, 200))
      .filter((s) => s.length >= 2)
      .slice(0, 8);

    const baseFields = {
      code: sanitizeText(progCode, 20),
      title: sanitizeText(progTitle, 160),
      fieldCategory: progFieldCat,
      summary: sanitizeText(progSummary, 400),
      details: sanitizeText(progDetails, 2500),
      highlights: highlights.length > 0 ? highlights : ['Pelaksanaan terukur di tingkat blok tambak'],
      progressPercent: Math.max(0, Math.min(100, Math.round(Number(progProgress) || 0))),
      targetMetric: sanitizeText(progMetric, 120),
      imageKey: sanitizeText(progImageKey, 300),
      orderIndex: Math.max(1, Math.min(50, Math.round(Number(progOrder) || 1))),
      status: progStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      const ref = doc(db, 'programs', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, baseFields);
        await recordSecurityAudit({
          action: 'UPDATE',
          targetCollection: 'programs',
          targetId: id,
          summary: `Memperbarui program kerja: ${baseFields.title} (${baseFields.progressPercent}%)`,
        });
      } else {
        await setDoc(ref, {
          ...baseFields,
          authorId: sanitizeId(currentUser.uid),
          createdAt: serverTimestamp(),
        });
        await recordSecurityAudit({
          action: 'CREATE',
          targetCollection: 'programs',
          targetId: id,
          summary: `Menambahkan program kerja: ${baseFields.title}`,
        });
      }
      resetProgramForm();
      notify('Program kerja berhasil disimpan.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `programs/${id}`);
    } finally {
      setBusyAction(false);
    }
  };

  const resetMemberForm = () => {
    setEditingMemberId(null);
    setMemName('');
    setMemPosition('');
    setMemDivision('Inti');
    setMemBio('');
    setMemOrder(boardMembers.length + 1);
    setMemPhotoKey('ketua_portrait');
    setMemStatus('published');
    setCmsDemRole('Ketua Demisioner');
    setCmsDemPeriod('Periode III (2024–2028)');
  };

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setBusyAction(true);
    const id = editingMemberId ? sanitizeId(editingMemberId) : sanitizeId(`mem_${Date.now()}`);
    const resolvedPos =
      memDivision === 'Demisioner'
        ? `${cmsDemRole} · ${sanitizeText(cmsDemPeriod, 65) || 'Periode Terdahulu'}`
        : memPosition;
    const baseFields = {
      name: sanitizeText(memName, 100),
      position: sanitizeText(resolvedPos, 100),
      division: memDivision,
      bio: sanitizeText(memBio, 500),
      orderIndex: Math.max(1, Math.min(100, Math.round(Number(memOrder) || 1))),
      photoKey: sanitizeText(memPhotoKey, 500),
      status: memStatus,
      updatedAt: serverTimestamp(),
    };

    try {
      const ref = doc(db, 'board_members', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        await updateDoc(ref, baseFields);
        await recordSecurityAudit({
          action: 'UPDATE',
          targetCollection: 'board_members',
          targetId: id,
          summary: `Memperbarui data pengurus: ${baseFields.name} (${baseFields.position})`,
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
          targetId: id,
          summary: `Menambahkan pengurus pusat: ${baseFields.name}`,
        });
      }
      resetMemberForm();
      notify('Data jajaran pengurus pusat berhasil disimpan.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `board_members/${id}`);
    } finally {
      setBusyAction(false);
    }
  };

  // =========================================================================
  // ASPIRATIONS & PII VAULT HANDLERS
  // =========================================================================
  const handleRevealPii = async (aspirationId: string) => {
    const cleanId = sanitizeId(aspirationId);
    try {
      const snap = await getDoc(doc(db, 'aspirations_pii', cleanId));
      if (snap.exists()) {
        setRevealedPii((prev) => ({
          ...prev,
          [aspirationId]: snap.data() as AspirationPii,
        }));
        await recordSecurityAudit({
          action: 'SECURITY_CHECK',
          targetCollection: 'aspirations_pii',
          targetId: cleanId,
          summary: `Membuka akses brankas PII terisolasi untuk aspirasi ID ${cleanId}.`,
          severity: 'WARNING',
        });
      } else {
        notify('Data kontak PII tidak ditemukan pada brankas dokumen ini.');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `aspirations_pii/${cleanId}`);
    }
  };

  const handleUpdateAspirationStatus = async (asp: Aspiration) => {
    const nextStatus = statusDrafts[asp.id] || asp.status;
    const nextResponse =
      responseDrafts[asp.id] !== undefined ? responseDrafts[asp.id] : asp.adminResponse;
    const cleanId = sanitizeId(asp.id);
    setBusyAction(true);
    try {
      await updateDoc(doc(db, 'aspirations', cleanId), {
        status: nextStatus,
        adminResponse: sanitizeText(nextResponse, 1500),
        urgency: asp.urgency as AspirationUrgency,
        updatedAt: serverTimestamp(),
      });
      await recordSecurityAudit({
        action: 'STATUS_CHANGE',
        targetCollection: 'aspirations',
        targetId: cleanId,
        summary: `Mengubah status aspirasi "${asp.subject}" menjadi ${nextStatus}.`,
      });
      notify(`Status aspirasi "${asp.subject}" diperbarui ke ${nextStatus}.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `aspirations/${cleanId}`);
    } finally {
      setBusyAction(false);
    }
  };

  // =========================================================================
  // WHITELISTED REGISTERED ACCOUNTS & RBAC HANDLERS
  // =========================================================================
  const handleSaveRegisteredAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isBootstrappedAdmin) return;
    const emailKey = normalizeEmailKey(regEmail);
    if (!isValidEmailFormat(emailKey)) {
      notify('Format alamat email tidak valid. Masukkan alamat email resmi yang benar.');
      return;
    }
    if (emailKey === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
      notify('Email Super Administrator Utama sudah terdaftar secara permanen.');
      return;
    }

    setBusyAction(true);
    try {
      const ref = doc(db, 'registered_accounts', emailKey);
      const snap = await getDoc(ref);
      const cleanName = sanitizeText(regName, 100);
      const cleanRoleTitle = sanitizeText(regRoleTitle, 80);

      if (snap.exists()) {
        await updateDoc(ref, {
          name: cleanName,
          role: regRole,
          roleTitle: cleanRoleTitle,
          active: true,
          updatedAt: serverTimestamp(),
        });
        await recordSecurityAudit({
          action: 'UPDATE',
          targetCollection: 'registered_accounts',
          targetId: sanitizeId(emailKey),
          summary: `Memperbarui otorisasi akun terdaftar: ${cleanName} (${emailKey}) sebagai ${regRole}.`,
          severity: 'WARNING',
        });
        notify(`Otorisasi akun "${emailKey}" berhasil diperbarui.`);
      } else {
        await setDoc(ref, {
          email: emailKey,
          name: cleanName,
          role: regRole,
          roleTitle: cleanRoleTitle,
          active: true,
          scope: 'p2uwm_auth',
          addedBy: sanitizeId(currentUser.uid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await recordSecurityAudit({
          action: 'CREATE',
          targetCollection: 'registered_accounts',
          targetId: sanitizeId(emailKey),
          summary: `Mendaftarkan akun login resmi: ${cleanName} (${emailKey}) · Level: ${regRole}.`,
          severity: 'CRITICAL',
        });
        notify(`Akun "${emailKey}" resmi didaftarkan dan kini diizinkan login.`);
      }

      setRegEmail('');
      setRegName('');
      setRegRoleTitle(regRole === 'admin' ? 'Pengurus Pusat P2UWM' : 'Anggota Petambak Mandira');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `registered_accounts/${emailKey}`);
    } finally {
      setBusyAction(false);
    }
  };

  const handleToggleRegisteredAccount = async (acc: RegisteredAccount) => {
    if (!currentUser || !isBootstrappedAdmin) return;
    const emailKey = normalizeEmailKey(acc.email);
    const nextActive = !acc.active;
    setBusyAction(true);
    try {
      await updateDoc(doc(db, 'registered_accounts', emailKey), {
        name: sanitizeText(acc.name, 100),
        role: acc.role,
        roleTitle: sanitizeText(acc.roleTitle, 80),
        active: nextActive,
        updatedAt: serverTimestamp(),
      });
      await recordSecurityAudit({
        action: 'STATUS_CHANGE',
        targetCollection: 'registered_accounts',
        targetId: sanitizeId(emailKey),
        summary: `${nextActive ? 'Mengaktifkan kembali' : 'Membekukan sementara'} akses login akun: ${emailKey}.`,
        severity: 'WARNING',
      });
      notify(
        nextActive
          ? `Akses login "${emailKey}" telah diaktifkan kembali.`
          : `Akses login "${emailKey}" telah dibekukan sementara.`
      );
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `registered_accounts/${emailKey}`);
    } finally {
      setBusyAction(false);
    }
  };

  const handleDeleteRegisteredAccount = async (email: string, name: string) => {
    if (!currentUser || !isBootstrappedAdmin) return;
    const emailKey = normalizeEmailKey(email);
    setBusyAction(true);
    try {
      await deleteDoc(doc(db, 'registered_accounts', emailKey));
      await recordSecurityAudit({
        action: 'DELETE',
        targetCollection: 'registered_accounts',
        targetId: sanitizeId(emailKey),
        summary: `Mencabut permanen akun dari daftar login terdaftar: ${name} (${emailKey}).`,
        severity: 'CRITICAL',
      });
      setConfirmRevokeEmail(null);
      notify(`Akun "${emailKey}" telah dihapus dari daftar akun terdaftar.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `registered_accounts/${emailKey}`);
    } finally {
      setBusyAction(false);
    }
  };

  const handleAddDelegatedAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isBootstrappedAdmin) return;
    const cleanUid = sanitizeId(newAdminUid);
    setBusyAction(true);
    try {
      await setDoc(doc(db, 'admins', cleanUid), {
        uid: cleanUid,
        email: sanitizeText(newAdminEmail, 160),
        name: sanitizeText(newAdminName, 100),
        roleTitle: sanitizeText(newAdminRoleTitle, 80),
        addedBy: sanitizeId(currentUser.uid),
        createdAt: serverTimestamp(),
      });
      await recordSecurityAudit({
        action: 'CREATE',
        targetCollection: 'admins',
        targetId: cleanUid,
        summary: `Menambahkan hak akses Administrator RBAC untuk ${newAdminName} (${newAdminEmail}).`,
        severity: 'CRITICAL',
      });
      setNewAdminUid('');
      setNewAdminEmail('');
      setNewAdminName('');
      notify('Administrator baru berhasil diberikan otorisasi RBAC.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `admins/${cleanUid}`);
    } finally {
      setBusyAction(false);
    }
  };

  const filteredRegisteredAccounts = useMemo(() => {
    const q = regSearch.trim().toLowerCase();
    if (!q) return registeredAccounts;
    return registeredAccounts.filter(
      (a) =>
        a.email.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.roleTitle.toLowerCase().includes(q)
    );
  }, [registeredAccounts, regSearch]);

  const downloadTextFile = (filename: string, content: string, mime = 'text/plain;charset=utf-8;') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadFullBackupJson = () => {
    const snapshot = {
      exportedAt: new Date().toISOString(),
      organization: siteSettings.orgName,
      firebaseProjectId: FIREBASE_PROJECT_ID,
      firestoreDatabaseId: FIRESTORE_DATABASE_ID,
      siteSettings,
      boardMembers,
      programs,
      galleryItems,
      articles,
      registeredAccounts,
      analyticsDaily,
    };
    const dateStamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(
      `backup_master_p2uwm_${dateStamp}.json`,
      JSON.stringify(snapshot, null, 2),
      'application/json;charset=utf-8;'
    );
    notify('Cadangan penuh (Full Backup JSON) berhasil diunduh ke perangkat Anda.');
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      notify(`${label} berhasil disalin ke papan klip.`);
    } catch {
      notify(`Gagal menyalin otomatis. Silakan salin teks ${label} secara manual.`);
    }
  };

  // =========================================================================
  // ANALYTICS & EXPORT COMPUTATIONS
  // =========================================================================
  const sortedAnalytics = useMemo(() => {
    const base = analyticsDaily.length > 0 ? analyticsDaily : DEFAULT_ANALYTICS_DAILY;
    const sorted = [...base].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    if (analyticsRange === '1d') return sorted.slice(-1);
    if (analyticsRange === '3d') return sorted.slice(-3);
    return sorted.slice(-7);
  }, [analyticsDaily, analyticsRange]);

  const analyticsSummary = useMemo(() => {
    let visitors = 0;
    let pageViews = 0;
    let mobile = 0;
    let desktop = 0;
    let beranda = 0;
    let profil = 0;
    let program = 0;
    let galeri = 0;
    let berita = 0;
    let aspirasi = 0;

    for (const d of sortedAnalytics) {
      visitors += d.visitors;
      pageViews += d.pageViews;
      mobile += d.mobileUsers;
      desktop += d.desktopUsers;
      beranda += d.berandaViews;
      profil += d.profilViews;
      program += d.programViews;
      galeri += d.galeriViews;
      berita += d.beritaViews;
      aspirasi += d.aspirasiViews;
    }

    const totalDevices = mobile + desktop || 1;
    const mobilePct = Math.round((mobile / totalDevices) * 100);

    return {
      visitors,
      pageViews,
      mobilePct,
      sectionBars: [
        { menu: 'Beranda', views: beranda },
        { menu: 'Galeri', views: galeri },
        { menu: 'Berita', views: berita },
        { menu: 'Program', views: program },
        { menu: 'Profil', views: profil },
        { menu: 'Aspirasi', views: aspirasi },
      ],
    };
  }, [sortedAnalytics]);

  const filteredAspirations = useMemo(
    () =>
      allAspirations.filter((a) =>
        aspFilterStatus === 'Semua' ? true : a.status === aspFilterStatus
      ),
    [allAspirations, aspFilterStatus]
  );

  const filteredAuditLogs = useMemo(
    () => (auditFilter === 'ALL' ? auditLogs : auditLogs.filter((l) => l.action === auditFilter)),
    [auditLogs, auditFilter]
  );

  const downloadCsv = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const escapeCell = (val: string | number) => {
      const str = String(val ?? '').replace(/"/g, '""');
      return `"${str}"`;
    };
    const csvContent = [
      headers.map(escapeCell).join(','),
      ...rows.map((r) => r.map(escapeCell).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // =========================================================================
  // STRICT WHITELIST AUTH GATE (REGISTERED ACCOUNTS ONLY)
  // =========================================================================
  if (!currentUser || !isAdmin) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center p-6 luxury-aurora-hero">
        <div className="relative overflow-hidden max-w-lg w-full rounded-2xl bg-white dark:bg-[#0D1F26] border border-amber-400/50 dark:border-teal-800 p-8 shadow-xl">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500" />
          <div className="flex items-center justify-between gap-3.5 mb-5">
            <div className="flex items-center gap-3">
              <div className="p-1.5 rounded-xl bg-white ring-1 ring-amber-400/70 shadow-xs shrink-0">
                <img
                  src={P2UWM_LOGO_URL}
                  alt="Lambang Resmi P2UWM"
                  referrerPolicy="no-referrer"
                  className="h-10 w-12 object-contain"
                />
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600/15 text-emerald-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
            </div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-amber-300 text-right">
              Akses Terbatas · Akun Terdaftar
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-2">
            Login Portal Resmi &amp; CMS P2UWM
          </h1>
          {!currentUser ? (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                Sistem autentikasi P2UWM menerapkan proteksi <strong>Whitelist Akun Terdaftar</strong>.
                Hanya akun email pengurus &amp; anggota resmi yang telah didaftarkan oleh
                Administrator Utama yang diizinkan masuk. Akun yang tidak terdaftar akan otomatis
                ditolak.
              </p>

              {authError && (
                <section
                  role="alert"
                  className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 text-xs text-red-700 dark:text-red-300 space-y-1.5"
                >
                  <header className="flex items-center justify-between gap-2">
                    <strong className="font-bold text-red-800 dark:text-red-200">
                      Otorisasi Login Ditolak
                    </strong>
                    <button
                      type="button"
                      onClick={onClearAuthError}
                      className="text-red-700 dark:text-red-300 hover:underline font-semibold cursor-pointer"
                    >
                      Tutup
                    </button>
                  </header>
                  <p className="leading-relaxed">{authError}</p>
                </section>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  disabled={authChecking}
                  onClick={onLoginGoogle}
                  className="luxury-sheen-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-60 text-white text-sm font-semibold ring-1 ring-amber-300/50 shadow-sm cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>
                    {authChecking
                      ? 'Memverifikasi Akun Terdaftar...'
                      : 'Masuk (Khusus Akun Terdaftar)'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={onBackToPublic}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-teal-800 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Kembali ke Beranda</span>
                </button>
              </div>

              <footer className="mt-6 pt-4 border-t border-slate-200/80 dark:border-teal-900/50 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Proteksi Zero-Trust ABAC · Verifikasi Direktori Email Resmi · Siap Produksi Rumahweb
              </footer>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                Akun Anda (<strong>{currentUser.email}</strong>) berhasil masuk sebagai{' '}
                <strong>{registeredAccount?.roleTitle || 'Anggota Terdaftar'}</strong>. Anda
                diizinkan mengirim serta memantau aspirasi resmi di Portal Publik, namun ruang kerja
                <strong> Dashboard CMS &amp; Analitik Pusat</strong> dikhususkan bagi akun berlevel
                Pengurus / Administrator.
              </p>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50 mb-6 text-xs space-y-1">
                <div className="text-slate-500 dark:text-slate-400">
                  Status Otorisasi Akun Saat Ini:
                </div>
                <div className="font-semibold text-emerald-700 dark:text-teal-300">
                  Terdaftar Aktif · Level Akses: Anggota Petambak ({currentUser.email})
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={onBackToPublic}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Buka Portal &amp; Kirim Aspirasi</span>
                </button>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-teal-800 text-sm font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar / Ganti Akun</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const navItems: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'analytics', label: 'Analitik Real-Time', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'cms', label: 'Manajemen Konten (CMS)', icon: <FileEdit className="w-4 h-4" /> },
    {
      id: 'aspirations',
      label: `Kotak Aspirasi (${allAspirations.length})`,
      icon: <Inbox className="w-4 h-4" />,
    },
    { id: 'reports', label: 'Sistem Pelaporan', icon: <FileSpreadsheet className="w-4 h-4" /> },
    {
      id: 'security',
      label: `Akun Terdaftar (${registeredAccounts.length + 1})`,
      icon: <ShieldAlert className="w-4 h-4" />,
    },
    {
      id: 'hosting',
      label: 'Hosting Rumahweb & Backup',
      icon: <Server className="w-4 h-4" />,
    },
  ];

  const tabTitles: Record<AdminTab, string> = {
    analytics: 'Analitik Trafik Pengunjung Real-Time',
    cms: 'Sistem Manajemen Konten (CMS) Terpadu',
    aspirations: 'Manajemen Aspirasi & Brankas PII Petambak',
    reports: 'Sistem Pelaporan Eksekutif & Ekspor Data',
    security: 'Manajemen Akun Terdaftar (Whitelist Login) & Audit Keamanan',
    hosting: 'Kesiapan Hosting Rumahweb (cPanel) & Backup Penuh',
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#071318] flex flex-col lg:flex-row">
      {/* =====================================================================
          SIDEBAR NAVIGATION (260px Desktop + Responsive Drawer Mobile)
      ====================================================================== */}
      <aside
        className={`no-print fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-[#0B1A20] border-r border-slate-200 dark:border-teal-900/50 flex flex-col justify-between transition-transform duration-200 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-5">
          <div className="flex items-center justify-between pb-5 mb-5 border-b border-slate-200 dark:border-teal-900/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={P2UWM_LOGO_URL}
                alt="Lambang P2UWM"
                referrerPolicy="no-referrer"
                className="h-9 w-11 rounded-lg bg-white p-0.5 object-contain ring-1 ring-amber-400/70 shrink-0"
              />
              <div className="min-w-0">
                <div className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  Admin P2UWM
                </div>
                <div className="text-xs text-emerald-700 dark:text-amber-300 font-medium truncate">
                  Pusat Kendali Operasional
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <nav className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-teal-950/40'
                }`}
              >
                {item.icon}
                <span className="truncate">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-5 border-t border-slate-200 dark:border-teal-900/50 space-y-3">
          <div className="text-xs">
            <div className="font-semibold text-slate-900 dark:text-white truncate">
              {currentUser.displayName || 'Administrator'}
            </div>
            <div className="text-slate-500 dark:text-slate-400 truncate">{currentUser.email}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onBackToPublic}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 dark:bg-teal-950/60 hover:bg-slate-200 text-xs font-semibold text-slate-800 dark:text-teal-200 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Portal</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-teal-900/60 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-red-600 cursor-pointer"
              title="Keluar"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* =====================================================================
          MAIN WORKSPACE VIEWPORT
      ====================================================================== */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Breadcrumb Bar */}
        <header className="no-print sticky top-0 z-30 bg-white/95 dark:bg-[#0B1A20]/95 backdrop-blur-md border-b border-slate-200 dark:border-teal-900/50">
          <div className="h-[3px] w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500" />
          <div className="px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-teal-800 text-slate-700 dark:text-slate-200"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
              <span>Workspace P2UWM</span>
              <span className="mx-2">/</span>
              <strong className="text-slate-900 dark:text-white">{tabTitles[activeTab]}</strong>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {!hasCloudSeeded && (
              <button
                type="button"
                disabled={busyAction}
                onClick={handleSeedCloudData}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CloudUpload className="w-3.5 h-3.5" />
                <span>Inisialisasi Data Cloud</span>
              </button>
            )}
            <button
              type="button"
              onClick={onBackToPublic}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-teal-800 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Lihat Website Publik</span>
            </button>
          </div>
          </div>
        </header>

        {bannerNotice && (
          <div className="no-print mx-4 sm:mx-8 mt-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {bannerNotice}
            </span>
            <button onClick={() => setBannerNotice(null)} className="text-emerald-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <main className="p-4 sm:p-8 flex-1 space-y-8">
          {/* =================================================================
              TAB 1: REAL-TIME VISITOR ANALYTICS DASHBOARD
          ================================================================== */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Pemantauan Trafik Pengunjung Real-Time
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Data interaksi langsung portal P2UWM Bumi Pratama Mandira dari perangkat seluler
                    dan desktop.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                    {(
                      [
                        { id: '7d', label: '7 Hari' },
                        { id: '3d', label: '3 Hari' },
                        { id: '1d', label: 'Hari Ini' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setAnalyticsRange(opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          analyticsRange === opt.id
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={onRecordSimulatedVisit}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Catat Ping Real-Time (+1)</span>
                  </button>
                </div>
              </div>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Pengunjung Unik Periode Ini
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white mt-1">
                    {analyticsSummary.visitors.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                    Tersinkronisasi Cloud Firestore
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Total Tayangan Halaman
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-cyan-700 dark:text-cyan-400 mt-1">
                    {analyticsSummary.pageViews.toLocaleString('id-ID')}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Seluruh menu informasi publik
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Akses Perangkat Seluler
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-1">
                    {analyticsSummary.mobilePct}%
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Optimal di ponsel petambak lapangan
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Total Aspirasi Terdata
                  </div>
                  <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                    {allAspirations.length}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Dilindungi Brankas PII Terisolasi
                  </div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    Tren Trafik Harian (Pengunjung &amp; Tayangan Halaman)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Perbandingan jumlah pengunjung unik dan tayangan halaman harian secara
                    real-time.
                  </p>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sortedAnalytics}>
                        <defs>
                          <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0D9488" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                          </linearGradient>
                          <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="#64748b" />
                        <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                        <Tooltip />
                        <Area
                          type="monotone"
                          dataKey="pageViews"
                          name="Tayangan Halaman"
                          stroke="#0D9488"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#gradViews)"
                        />
                        <Area
                          type="monotone"
                          dataKey="visitors"
                          name="Pengunjung Unik"
                          stroke="#F59E0B"
                          strokeWidth={2.5}
                          fillOpacity={1}
                          fill="url(#gradVisitors)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    Distribusi Kunjungan per Menu Utama
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
                    Minat informasi anggota terhadap program, galeri infrastruktur, dan berita.
                  </p>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analyticsSummary.sectionBars} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.2} />
                        <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
                        <YAxis
                          dataKey="menu"
                          type="category"
                          width={75}
                          tick={{ fontSize: 12 }}
                          stroke="#64748b"
                        />
                        <Tooltip />
                        <Bar
                          dataKey="views"
                          name="Kunjungan"
                          fill="#0891B2"
                          radius={[0, 6, 6, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 2: SISTEM MANAJEMEN KONTEN (CMS) INTUITIF
          ================================================================== */}
          {activeTab === 'cms' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Sistem Manajemen Konten (CMS) P2UWM
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Kelola seluruh konten publik secara langsung tanpa menyentuh kode.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  {(
                    [
                      { id: 'berita', label: `Berita (${articles.length})` },
                      { id: 'galeri', label: `Galeri (${galleryItems.length})` },
                      { id: 'program', label: `Program (${programs.length})` },
                      { id: 'pengurus', label: `Pengurus (${boardMembers.length})` },
                      { id: 'profil', label: 'Profil & Visi-Misi' },
                    ] as const
                  ).map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setCmsSubTab(sub.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                        cmsSubTab === sub.id
                          ? 'bg-teal-600 text-white'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* SUBTAB: BERITA */}
              {cmsSubTab === 'berita' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <form
                    onSubmit={handleSaveArticle}
                    className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4 h-fit"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {editingArticleId ? 'Edit Artikel Berita' : 'Tambah Berita / Pengumuman'}
                      </h2>
                      {editingArticleId && (
                        <button
                          type="button"
                          onClick={resetArticleForm}
                          className="text-xs text-teal-600 font-semibold cursor-pointer"
                        >
                          Batal Edit
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Judul Berita</label>
                      <input
                        type="text"
                        required
                        minLength={5}
                        maxLength={180}
                        value={artTitle}
                        onChange={(e) => setArtTitle(e.target.value)}
                        placeholder="Judul kabar atau capaian terbaru..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Kategori</label>
                        <select
                          value={artCategory}
                          onChange={(e) => setArtCategory(e.target.value as ArticleCategory)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                        >
                          <option value="Pengumuman">Pengumuman</option>
                          <option value="Infrastruktur">Infrastruktur</option>
                          <option value="Budidaya Udang">Budidaya Udang</option>
                          <option value="Kegiatan Organisasi">Kegiatan Organisasi</option>
                          <option value="Ekonomi Tambak">Ekonomi Tambak</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Status Publikasi</label>
                        <select
                          value={artStatus}
                          onChange={(e) => setArtStatus(e.target.value as 'published' | 'draft')}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                        >
                          <option value="published">Terbit (Published)</option>
                          <option value="draft">Draf Internal</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Penulis / Bidang</label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={artAuthorName}
                          onChange={(e) => setArtAuthorName(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Tanggal Tampil</label>
                        <input
                          type="text"
                          required
                          maxLength={40}
                          value={artPublishDate}
                          onChange={(e) => setArtPublishDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Pilih Visual Dokumentasi / URL Gambar
                      </label>
                      <select
                        value={ASSET_PRESETS[artImageUrl] ? artImageUrl : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') setArtImageUrl(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm mb-2"
                      >
                        {Object.entries(ASSET_PRESETS).map(([k, v]) => (
                          <option key={k} value={k}>
                            Preset: {v.label}
                          </option>
                        ))}
                        <option value="custom">URL Gambar Kustom</option>
                      </select>
                      <input
                        type="text"
                        required
                        maxLength={500}
                        value={artImageUrl}
                        onChange={(e) => setArtImageUrl(e.target.value)}
                        placeholder="Kode preset atau https://..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Ringkasan Singkat (10–360 karakter)
                      </label>
                      <textarea
                        rows={2}
                        required
                        minLength={10}
                        maxLength={360}
                        value={artExcerpt}
                        onChange={(e) => setArtExcerpt(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Isi Lengkap Artikel Berita
                      </label>
                      <textarea
                        rows={5}
                        required
                        minLength={20}
                        maxLength={8000}
                        value={artContent}
                        onChange={(e) => setArtContent(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busyAction}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingArticleId ? 'Simpan Perubahan' : 'Terbitkan Artikel'}</span>
                    </button>
                  </form>

                  <div className="lg:col-span-7 space-y-3">
                    {articles.map((art) => (
                      <div
                        key={art.id}
                        className="p-4 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0">
                            <ResilientImage
                              src={resolveImageAsset(art.imageUrl)}
                              alt={art.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {art.category} · {art.publishDate} · Status:{' '}
                              <strong className="text-teal-700 dark:text-teal-400">
                                {art.status}
                              </strong>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {art.title}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingArticleId(art.id);
                              setArtTitle(art.title);
                              setArtExcerpt(art.excerpt);
                              setArtContent(art.content);
                              setArtCategory(art.category);
                              setArtAuthorName(art.authorName);
                              setArtPublishDate(art.publishDate);
                              setArtReadMinutes(art.readMinutes);
                              setArtImageUrl(art.imageUrl);
                              setArtFeatured(art.featured);
                              setArtStatus(art.status);
                            }}
                            className="p-2 rounded-lg border border-slate-200 dark:border-teal-800 text-slate-600 dark:text-slate-300 hover:border-teal-500 cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc('articles', art.id, art.title)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-teal-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB: GALERI FOTO */}
              {cmsSubTab === 'galeri' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <form
                    onSubmit={handleSaveGallery}
                    className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4 h-fit"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {editingGalleryId ? 'Edit Dokumentasi Foto' : 'Tambah Dokumentasi Galeri'}
                      </h2>
                      {editingGalleryId && (
                        <button
                          type="button"
                          onClick={resetGalleryForm}
                          className="text-xs text-teal-600 font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Judul Dokumentasi</label>
                      <input
                        type="text"
                        required
                        minLength={4}
                        maxLength={160}
                        value={galTitle}
                        onChange={(e) => setGalTitle(e.target.value)}
                        placeholder="Contoh: Pengecoran Gorong-Gorong Main Inlet Blok 4"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Kategori</label>
                        <select
                          value={galCategory}
                          onChange={(e) => setGalCategory(e.target.value as GalleryCategory)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                        >
                          <option value="Infrastruktur">Infrastruktur</option>
                          <option value="Budidaya & Teknis">Budidaya &amp; Teknis</option>
                          <option value="Musyawarah & Organisasi">
                            Musyawarah &amp; Organisasi
                          </option>
                          <option value="Sosial & Ekonomi">Sosial &amp; Ekonomi</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Waktu Kegiatan</label>
                        <input
                          type="text"
                          required
                          maxLength={40}
                          value={galDate}
                          onChange={(e) => setGalDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Titik Blok / Lokasi</label>
                      <input
                        type="text"
                        required
                        maxLength={80}
                        value={galLocation}
                        onChange={(e) => setGalLocation(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Pilih Aset Foto / URL Gambar
                      </label>
                      <select
                        value={ASSET_PRESETS[galImageUrl] ? galImageUrl : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') setGalImageUrl(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm mb-2"
                      >
                        {Object.entries(ASSET_PRESETS).map(([k, v]) => (
                          <option key={k} value={k}>
                            Preset: {v.label}
                          </option>
                        ))}
                        <option value="custom">URL Gambar Kustom</option>
                      </select>
                      <input
                        type="text"
                        required
                        maxLength={500}
                        value={galImageUrl}
                        onChange={(e) => setGalImageUrl(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Keterangan Dokumentasi
                      </label>
                      <textarea
                        rows={3}
                        required
                        minLength={10}
                        maxLength={600}
                        value={galCaption}
                        onChange={(e) => setGalCaption(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busyAction}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingGalleryId ? 'Simpan Galeri' : 'Tambahkan ke Galeri'}</span>
                    </button>
                  </form>

                  <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4 h-fit">
                    {galleryItems.map((g) => (
                      <div
                        key={g.id}
                        className="rounded-xl overflow-hidden bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 flex flex-col justify-between"
                      >
                        <div>
                          <div className="aspect-[16/10] w-full overflow-hidden">
                            <ResilientImage
                              src={resolveImageAsset(g.imageUrl)}
                              alt={g.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-4">
                            <div className="text-xs text-teal-700 dark:text-teal-400">
                              {g.category} · {g.eventDate}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 line-clamp-1">
                              {g.title}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{g.caption}</p>
                          </div>
                        </div>
                        <div className="px-4 py-3 border-t border-slate-100 dark:border-teal-900/40 flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGalleryId(g.id);
                              setGalTitle(g.title);
                              setGalCaption(g.caption);
                              setGalCategory(g.category);
                              setGalLocation(g.locationBlock);
                              setGalDate(g.eventDate);
                              setGalImageUrl(g.imageUrl);
                              setGalStatus(g.status);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-teal-800 text-xs font-semibold cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc('gallery_items', g.id, g.title)}
                            className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 text-xs font-semibold cursor-pointer"
                          >
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB: PROGRAM KERJA */}
              {cmsSubTab === 'program' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <form
                    onSubmit={handleSaveProgram}
                    className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4 h-fit"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {editingProgramId ? 'Edit Program Bidang' : 'Tambah Program Kerja'}
                      </h2>
                      {editingProgramId && (
                        <button
                          type="button"
                          onClick={resetProgramForm}
                          className="text-xs text-teal-600 font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Kode</label>
                        <input
                          type="text"
                          required
                          maxLength={20}
                          value={progCode}
                          onChange={(e) => setProgCode(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold mb-1">Bidang Induk</label>
                        <select
                          value={progFieldCat}
                          onChange={(e) => setProgFieldCat(e.target.value as ProgramFieldCategory)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs"
                        >
                          <option value="Keanggotaan, Sosial, & Keagamaan">
                            Keanggotaan, Sosial, &amp; Keagamaan
                          </option>
                          <option value="Humas, Komunikasi, & Advokasi">
                            Humas, Komunikasi, &amp; Advokasi
                          </option>
                          <option value="Penguatan Ekonomi & Usaha Anggota">
                            Penguatan Ekonomi &amp; Usaha Anggota
                          </option>
                          <option value="Pendampingan Teknis Budidaya & Kesehatan Udang">
                            Pendampingan Teknis Budidaya &amp; Kesehatan Udang
                          </option>
                          <option value="Infrastruktur & Pengelolaan Kawasan Pertambakan">
                            Infrastruktur &amp; Pengelolaan Kawasan Pertambakan
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Nama Program Kerja</label>
                      <input
                        type="text"
                        required
                        minLength={5}
                        maxLength={160}
                        value={progTitle}
                        onChange={(e) => setProgTitle(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Progres Realisasi ({progProgress}%)
                        </label>
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={progProgress}
                          onChange={(e) => setProgProgress(Number(e.target.value))}
                          className="w-full accent-teal-600"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Target Terukur</label>
                        <input
                          type="text"
                          required
                          maxLength={120}
                          value={progMetric}
                          onChange={(e) => setProgMetric(e.target.value)}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Ringkasan Bidang</label>
                      <textarea
                        rows={2}
                        required
                        minLength={10}
                        maxLength={400}
                        value={progSummary}
                        onChange={(e) => setProgSummary(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Penjelasan Detail</label>
                      <textarea
                        rows={3}
                        required
                        minLength={10}
                        maxLength={2500}
                        value={progDetails}
                        onChange={(e) => setProgDetails(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Poin Capaian Utama (1 baris per poin, maks 8)
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={progHighlightsRaw}
                        onChange={(e) => setProgHighlightsRaw(e.target.value)}
                        placeholder="Pembangunan gorong-gorong Blok 4&#10;Normalisasi lumpur kanal"
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busyAction}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingProgramId ? 'Perbarui Program' : 'Simpan Program Kerja'}</span>
                    </button>
                  </form>

                  <div className="lg:col-span-7 space-y-3">
                    {programs.map((p) => (
                      <div
                        key={p.id}
                        className="p-4 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-mono text-teal-700 dark:text-teal-400">
                            {p.code} · Progres {p.progressPercent}% · {p.targetMetric}
                          </div>
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {p.title}
                          </h3>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{p.summary}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProgramId(p.id);
                              setProgCode(p.code);
                              setProgTitle(p.title);
                              setProgFieldCat(p.fieldCategory);
                              setProgSummary(p.summary);
                              setProgDetails(p.details);
                              setProgHighlightsRaw(p.highlights.join('\n'));
                              setProgProgress(p.progressPercent);
                              setProgMetric(p.targetMetric);
                              setProgImageKey(p.imageKey);
                              setProgOrder(p.orderIndex);
                              setProgStatus(p.status);
                            }}
                            className="p-2 rounded-lg border border-slate-200 dark:border-teal-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc('programs', p.id, p.title)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-teal-800 text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB: STRUKTUR PENGURUS */}
              {cmsSubTab === 'pengurus' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <form
                    onSubmit={handleSaveMember}
                    className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4 h-fit"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        {editingMemberId ? 'Edit Pengurus Pusat' : 'Tambah Pengurus P2UWM'}
                      </h2>
                      {editingMemberId && (
                        <button
                          type="button"
                          onClick={resetMemberForm}
                          className="text-xs text-teal-600 font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Nama Lengkap</label>
                      <input
                        type="text"
                        required
                        minLength={2}
                        maxLength={100}
                        value={memName}
                        onChange={(e) => setMemName(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">Bidang Struktur</label>
                      <select
                        value={memDivision}
                        onChange={(e) => {
                          const nextDiv = e.target.value as BoardDivision;
                          setMemDivision(nextDiv);
                          if (nextDiv === 'Demisioner' && !editingMemberId) {
                            setMemPhotoKey('demisioner_ketua_portrait');
                          }
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      >
                        <option value="Inti">Inti</option>
                        <option value="Badan Pengawas">Badan Pengawas</option>
                        <option value="Demisioner">Demisioner (Dipisah per Periode)</option>
                        <option value="Keanggotaan & Sosial">Keanggotaan &amp; Sosial</option>
                        <option value="Humas & Advokasi">Humas &amp; Advokasi</option>
                        <option value="Ekonomi & Usaha">Ekonomi &amp; Usaha</option>
                        <option value="Teknis Budidaya">Teknis Budidaya</option>
                        <option value="Infrastruktur Kawasan">Infrastruktur Kawasan</option>
                      </select>
                    </div>

                    {memDivision === 'Demisioner' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/60 dark:border-amber-800/50">
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Jabatan dalam Periode
                          </label>
                          <select
                            value={cmsDemRole}
                            onChange={(e) => {
                              const r = e.target.value as
                                | 'Ketua Demisioner'
                                | 'Wakil Ketua Demisioner';
                              setCmsDemRole(r);
                              if (!editingMemberId) {
                                setMemPhotoKey(
                                  r === 'Wakil Ketua Demisioner'
                                    ? 'demisioner_wakil_portrait'
                                    : 'demisioner_ketua_portrait'
                                );
                              }
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#071318] border border-amber-300/70 dark:border-teal-900/60 text-xs font-semibold"
                          >
                            <option value="Ketua Demisioner">Ketua Demisioner</option>
                            <option value="Wakil Ketua Demisioner">Wakil Ketua Demisioner</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Periode Masa Bakti
                          </label>
                          <input
                            type="text"
                            required
                            minLength={3}
                            maxLength={65}
                            value={cmsDemPeriod}
                            onChange={(e) => setCmsDemPeriod(e.target.value)}
                            placeholder="Periode II (2020–2024)"
                            className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#071318] border border-amber-300/70 dark:border-teal-900/60 text-xs"
                          />
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold mb-1">Jabatan</label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={100}
                          value={memPosition}
                          onChange={(e) => setMemPosition(e.target.value)}
                          placeholder="Ketua / Sekretaris / Koordinator"
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">Urutan Tampil</label>
                        <input
                          type="number"
                          min={1}
                          max={100}
                          value={memOrder}
                          onChange={(e) => setMemOrder(Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">Status Tampil</label>
                        <select
                          value={memStatus}
                          onChange={(e) => setMemStatus(e.target.value as 'published' | 'archived')}
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                        >
                          <option value="published">Tampil Publik</option>
                          <option value="archived">Arsip</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Pilih Potret Preset atau URL Foto Kustom
                      </label>
                      <select
                        value={ASSET_PRESETS[memPhotoKey] ? memPhotoKey : 'custom'}
                        onChange={(e) => {
                          if (e.target.value !== 'custom') setMemPhotoKey(e.target.value);
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm mb-2"
                      >
                        {Object.entries(ASSET_PRESETS).map(([k, v]) => (
                          <option key={k} value={k}>
                            Preset: {v.label}
                          </option>
                        ))}
                        <option value="custom">URL Foto Kustom (https://...)</option>
                      </select>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-teal-800 shrink-0 bg-slate-100 dark:bg-slate-800">
                          <ResilientImage
                            src={resolveImageAsset(memPhotoKey)}
                            alt={memName || 'Pratinjau Foto'}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={500}
                          value={memPhotoKey}
                          onChange={(e) => setMemPhotoKey(e.target.value)}
                          placeholder="Preset key atau URL foto https://..."
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Deskripsi Tugas &amp; Peran
                      </label>
                      <textarea
                        rows={3}
                        required
                        minLength={5}
                        maxLength={500}
                        value={memBio}
                        onChange={(e) => setMemBio(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={busyAction}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{editingMemberId ? 'Simpan Perubahan Struktur' : 'Tambahkan ke Struktur'}</span>
                    </button>
                  </form>

                  <div className="lg:col-span-7 space-y-3">
                    {boardMembers.map((m) => (
                      <div
                        key={m.id}
                        className="p-4 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-teal-800 shrink-0 bg-slate-100 dark:bg-slate-800">
                            <ResilientImage
                              src={resolveImageAsset(m.photoKey)}
                              alt={m.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-teal-700 dark:text-teal-400 truncate">
                              #{m.orderIndex} · {m.position} · {m.division}
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                              {m.name}
                            </h3>
                            <p className="text-xs text-slate-500 line-clamp-1">{m.bio}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMemberId(m.id);
                              setMemName(m.name);
                              setMemPosition(m.position);
                              setMemDivision(m.division);
                              setMemBio(m.bio);
                              setMemOrder(m.orderIndex);
                              setMemPhotoKey(m.photoKey);
                              setMemStatus(m.status);
                              if (m.division === 'Demisioner') {
                                const parts = m.position
                                  .split('·')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                setCmsDemRole(
                                  /wakil/i.test(m.position)
                                    ? 'Wakil Ketua Demisioner'
                                    : 'Ketua Demisioner'
                                );
                                setCmsDemPeriod(parts[1] || 'Periode Terdahulu');
                              }
                            }}
                            className="p-2 rounded-lg border border-slate-200 dark:border-teal-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc('board_members', m.id, m.name)}
                            className="p-2 rounded-lg border border-slate-200 dark:border-teal-800 text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUBTAB: PROFIL & SAMBUTAN ORGANISASI */}
              {cmsSubTab === 'profil' && (
                <form
                  onSubmit={handleSaveSiteProfile}
                  className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-5 max-w-4xl"
                >
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Pengaturan Profil Organisasi, Visi-Misi &amp; Sambutan Ketua
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-semibold mb-1">Nama Organisasi</label>
                      <input
                        type="text"
                        required
                        maxLength={120}
                        value={profileForm.orgName}
                        onChange={(e) => setProfileForm({ ...profileForm, orgName: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Singkatan</label>
                      <input
                        type="text"
                        required
                        maxLength={30}
                        value={profileForm.orgShortName}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, orgShortName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Tagline Beranda</label>
                    <input
                      type="text"
                      required
                      maxLength={240}
                      value={profileForm.tagline}
                      onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Total Anggota Petambak
                      </label>
                      <input
                        type="number"
                        value={profileForm.totalMembers}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, totalMembers: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        Total Petak Tambak
                      </label>
                      <input
                        type="number"
                        value={profileForm.totalPonds}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, totalPonds: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Jumlah Blok Aktif</label>
                      <input
                        type="number"
                        value={profileForm.activeBlocks}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, activeBlocks: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold mb-1">Nama Ketua P2UWM</label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={profileForm.chairmanName}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, chairmanName: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1">Jabatan Ketua</label>
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={profileForm.chairmanTitle}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, chairmanTitle: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Sambutan Ketua</label>
                    <textarea
                      rows={3}
                      required
                      maxLength={1200}
                      value={profileForm.chairmanQuote}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, chairmanQuote: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Visi Utama</label>
                    <textarea
                      rows={2}
                      required
                      maxLength={800}
                      value={profileForm.vision}
                      onChange={(e) => setProfileForm({ ...profileForm, vision: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Sejarah &amp; Mandat Organisasi
                    </label>
                    <textarea
                      rows={4}
                      required
                      maxLength={2500}
                      value={profileForm.historyText}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, historyText: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={busyAction}
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Simpan Perubahan Profil ke Cloud
                  </button>
                </form>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 3: KOTAK MASUK ASPIRASI & BRANKAS PII
          ================================================================== */}
          {activeTab === 'aspirations' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Kotak Masuk Aspirasi &amp; Tindak Lanjut Pengurus
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Data kontak pribadi pengirim terisolasi di koleksi Brankas PII terpisah dan
                    mencatat jejak audit saat dibuka.
                  </p>
                </div>

                <div className="flex items-center gap-1 p-1 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  {(['Semua', 'Diajukan', 'Ditinjau', 'Ditindaklanjuti', 'Selesai'] as const).map(
                    (st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setAspFilterStatus(st)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                          aspFilterStatus === st
                            ? 'bg-teal-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {st}
                      </button>
                    )
                  )}
                </div>
              </div>

              {filteredAspirations.length === 0 ? (
                <div className="p-12 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Belum ada dokumen aspirasi pada filter status ini.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAspirations.map((asp) => {
                    const pii = revealedPii[asp.id];
                    return (
                      <div
                        key={asp.id}
                        className="p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
                              <span className="font-semibold text-teal-700 dark:text-teal-400">
                                {asp.category}
                              </span>
                              <span>·</span>
                              <span>Urgensi: {asp.urgency}</span>
                              <span>·</span>
                              <span>Lokasi: {asp.pondBlock}</span>
                              <span>·</span>
                              <span className="font-mono tabular-nums">
                                {formatTimestamp(asp.createdAt)}
                              </span>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                              {asp.subject}
                            </h3>
                            <p className="text-xs text-slate-500">Pengirim: {asp.senderName}</p>
                          </div>

                          <div className="flex items-center gap-2">
                            {!pii ? (
                              <button
                                type="button"
                                onClick={() => handleRevealPii(asp.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-semibold cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Buka Kontak Brankas PII</span>
                              </button>
                            ) : (
                              <div className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs font-mono">
                                <span>Telp: {pii.phone}</span> · <span>Email: {pii.email}</span>
                                {pii.memberIdCode ? ` · Kode: ${pii.memberIdCode}` : ''}
                              </div>
                            )}
                          </div>
                        </div>

                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed bg-slate-50 dark:bg-[#071318] p-4 rounded-xl border border-slate-200/70 dark:border-teal-900/40">
                          {asp.message}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end pt-2">
                          <div className="md:col-span-3">
                            <label className="block text-xs font-semibold mb-1">
                              Status Tindak Lanjut
                            </label>
                            <select
                              value={statusDrafts[asp.id] || asp.status}
                              onChange={(e) =>
                                setStatusDrafts({
                                  ...statusDrafts,
                                  [asp.id]: e.target.value as AspirationStatus,
                                })
                              }
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs font-semibold"
                            >
                              <option value="Diajukan">Diajukan</option>
                              <option value="Ditinjau">Ditinjau Pengurus</option>
                              <option value="Ditindaklanjuti">Sedang Ditindaklanjuti</option>
                              <option value="Selesai">Selesai</option>
                            </select>
                          </div>

                          <div className="md:col-span-7">
                            <label className="block text-xs font-semibold mb-1">
                              Tanggapan Resmi Pengurus P2UWM
                            </label>
                            <input
                              type="text"
                              maxLength={1500}
                              value={
                                responseDrafts[asp.id] !== undefined
                                  ? responseDrafts[asp.id]
                                  : asp.adminResponse
                              }
                              onChange={(e) =>
                                setResponseDrafts({
                                  ...responseDrafts,
                                  [asp.id]: e.target.value,
                                })
                              }
                              placeholder="Tuliskan arahan teknis atau jadwal tindak lanjut pengurus..."
                              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() => handleUpdateAspirationStatus(asp)}
                              className="w-full px-3 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                            >
                              Simpan Status
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 4: SISTEM PELAPORAN LENGKAP & CETAK / EKSPOR CSV
          ================================================================== */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="no-print flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Sistem Pelaporan Lengkap &amp; Transparansi Organisasi
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Unduh rekapitulasi data operasional dalam format CSV atau cetak laporan resmi
                    kepengurusan P2UWM.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'laporan_analitik_p2uwm.csv',
                        [
                          'Tanggal',
                          'Pengunjung',
                          'Tayangan Halaman',
                          'Seluler',
                          'Desktop',
                          'Beranda',
                          'Program',
                          'Galeri',
                          'Berita',
                          'Aspirasi',
                        ],
                        sortedAnalytics.map((d) => [
                          d.dateKey,
                          d.visitors,
                          d.pageViews,
                          d.mobileUsers,
                          d.desktopUsers,
                          d.berandaViews,
                          d.programViews,
                          d.galeriViews,
                          d.beritaViews,
                          d.aspirasiViews,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>CSV Analitik</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'laporan_program_kerja_p2uwm.csv',
                        ['Kode', 'Bidang Kerja', 'Progres (%)', 'Target Sasaran', 'Status'],
                        programs.map((p) => [
                          p.code,
                          p.title,
                          p.progressPercent,
                          p.targetMetric,
                          p.status,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-600" />
                    <span>CSV Program Kerja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      downloadCsv(
                        'laporan_aspirasi_petambak_p2uwm.csv',
                        ['Pengirim', 'Blok Tambak', 'Kategori', 'Urgensi', 'Subjek', 'Status'],
                        allAspirations.map((a) => [
                          a.senderName,
                          a.pondBlock,
                          a.category,
                          a.urgency,
                          a.subject,
                          a.status,
                        ])
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-800 text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-600" />
                    <span>CSV Aspirasi</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Laporan Resmi</span>
                  </button>
                </div>
              </div>

              {/* Printable Executive Summary Sheet */}
              <div className="p-6 sm:p-10 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-8">
                <div className="pb-6 border-b border-slate-200 dark:border-teal-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-semibold text-teal-700 dark:text-teal-400">
                      LAPORAN EKSEKUTIF KELEMBAGAAN &amp; OPERASIONAL KAWASAN
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                      {siteSettings.orgName} ({siteSettings.orgShortName})
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">{siteSettings.locationText}</p>
                  </div>
                  <div className="text-xs font-mono tabular-nums text-slate-500">
                    Dicetak: {new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}
                  </div>
                </div>

                {/* Table 1: Capaian 5 Bidang Program Kerja */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                    I. Matriks Realisasi 5 Bidang Program Kerja P2UWM
                  </h3>
                  <div className="overflow-x-auto border border-slate-200 dark:border-teal-900/50 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#071318] border-b border-slate-200 dark:border-teal-900/50 text-slate-600 dark:text-slate-300">
                          <th className="py-2.5 px-4 font-semibold">Kode</th>
                          <th className="py-2.5 px-4 font-semibold">Bidang Program Kerja</th>
                          <th className="py-2.5 px-4 font-semibold">Indikator Sasaran</th>
                          <th className="py-2.5 px-4 font-semibold text-right">Realisasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-teal-900/40">
                        {programs.map((p) => (
                          <tr key={p.id}>
                            <td className="py-2.5 px-4 font-mono text-xs">{p.code}</td>
                            <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                              {p.title}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 dark:text-slate-300">
                              {p.targetMetric}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-teal-700 dark:text-teal-400">
                              {p.progressPercent}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 2: Ringkasan Kepengurusan & Statistik Kawasan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                      II. Jajaran Pengurus Pusat Tercatat
                    </h3>
                    <div className="border border-slate-200 dark:border-teal-900/50 rounded-xl divide-y divide-slate-200 dark:divide-teal-900/40">
                      {boardMembers.slice(0, 6).map((b) => (
                        <div key={b.id} className="py-2.5 px-4 flex justify-between text-xs">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {b.name}
                          </span>
                          <span className="text-slate-500">{b.position}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                      III. Ikhtisar Kinerja Digital &amp; Partisipasi Anggota
                    </h3>
                    <div className="border border-slate-200 dark:border-teal-900/50 rounded-xl divide-y divide-slate-200 dark:divide-teal-900/40 text-xs">
                      <div className="py-2.5 px-4 flex justify-between">
                        <span>Total Anggota Petambak Aktif</span>
                        <strong className="font-mono tabular-nums">
                          {siteSettings.totalMembers.toLocaleString('id-ID')} Orang
                        </strong>
                      </div>
                      <div className="py-2.5 px-4 flex justify-between">
                        <span>Total Petak Tambak Produktif</span>
                        <strong className="font-mono tabular-nums">
                          {siteSettings.totalPonds.toLocaleString('id-ID')} Petak
                        </strong>
                      </div>
                      <div className="py-2.5 px-4 flex justify-between">
                        <span>Artikel Berita &amp; Pengumuman Terpublikasi</span>
                        <strong className="font-mono tabular-nums">
                          {articles.length} Dokumen
                        </strong>
                      </div>
                      <div className="py-2.5 px-4 flex justify-between">
                        <span>Dokumentasi Galeri Kawasan</span>
                        <strong className="font-mono tabular-nums">
                          {galleryItems.length} Foto
                        </strong>
                      </div>
                      <div className="py-2.5 px-4 flex justify-between">
                        <span>Total Aspirasi Masuk Terverifikasi</span>
                        <strong className="font-mono tabular-nums">
                          {allAspirations.length} Aspirasi
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 5: DIREKTORI AKUN TERDAFTAR (WHITELIST LOGIN) & KEAMANAN
          ================================================================== */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Manajemen Akun Terdaftar (Whitelist Login) &amp; Keamanan Zero-Trust
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Hanya alamat email yang terdaftar dan berstatus Aktif pada direktori ini yang
                  diizinkan masuk ke dalam sistem P2UWM Bumi Pratama Mandira.
                </p>
              </div>

              {/* 4 Security Layers Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    Aktif · Ketat
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Login Khusus Akun Terdaftar
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Akun luar yang tidak terdaftar otomatis ditolak &amp; diputus sesinya seketika.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    Aktif · Split-Vault
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Brankas Isolasi PII Petambak
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Nomor telepon &amp; email pengirim aspirasi dipisahkan di brankas terkunci.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    Aktif · Zero-Trust Rules
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Proteksi Database Server-Side
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Aturan keamanan Cloud Firestore memvalidasi status pendaftaran di setiap operasi.
                  </p>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                    Aktif · Append-Only
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Log Audit Tak Terhapuskan
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Seluruh penambahan/pencabutan akun tercatat permanen secara kronologis.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Add Registered Email Account Form */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4 h-fit">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-teal-600" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Daftarkan Akun Email Resmi (Whitelist)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tambahkan alamat email Google Pengurus Pusat, Badan Pengawas, atau Anggota
                    Petambak agar diizinkan login ke sistem P2UWM tanpa memerlukan kode UID teknis.
                  </p>

                  {isBootstrappedAdmin ? (
                    <form onSubmit={handleSaveRegisteredAccount} className="space-y-3.5">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Alamat Email Resmi (Google)
                        </label>
                        <input
                          type="email"
                          required
                          maxLength={160}
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="contoh: pengurus.p2uwm@gmail.com"
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Nama Lengkap Pemilik Akun
                        </label>
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={100}
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="Contoh: Suaidi / Komarudin"
                          className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Hak Akses Sistem
                          </label>
                          <select
                            value={regRole}
                            onChange={(e) => {
                              const nextRole = e.target.value as RegisteredAccountRole;
                              setRegRole(nextRole);
                              setRegRoleTitle(
                                nextRole === 'admin'
                                  ? 'Pengurus Pusat P2UWM'
                                  : 'Anggota Petambak Mandira'
                              );
                            }}
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs font-semibold"
                          >
                            <option value="admin">Pengurus / Admin CMS</option>
                            <option value="member">Anggota Terdaftar (Aspirasi)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Jabatan / Keterangan Blok
                          </label>
                          <input
                            type="text"
                            required
                            minLength={2}
                            maxLength={80}
                            value={regRoleTitle}
                            onChange={(e) => setRegRoleTitle(e.target.value)}
                            placeholder="Sekretaris / Petambak Blok 4"
                            className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={busyAction}
                        className="luxury-sheen-btn w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        Simpan &amp; Izinkan Email Ini Login
                      </button>
                    </form>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Anda masuk menggunakan akun Pengurus Terdaftar (
                      <strong>{currentUser.email}</strong>). Pendaftaran dan pencabutan email
                      dikendalikan langsung oleh Super Administrator Utama (
                      <span className="font-mono">{BOOTSTRAPPED_ADMIN_EMAIL}</span>).
                    </div>
                  )}

                  {delegatedAdmins.length > 0 && isBootstrappedAdmin && (
                    <div className="pt-3 border-t border-slate-200 dark:border-teal-900/50 space-y-2">
                      <div className="text-xs font-semibold">Otorisasi UID Klasik ({delegatedAdmins.length}):</div>
                      {delegatedAdmins.map((adm) => (
                        <div
                          key={adm.uid}
                          className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#071318] flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0">
                            <div className="font-bold truncate">{adm.name}</div>
                            <div className="text-slate-500 truncate">{adm.email}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc('admins', adm.uid, adm.name)}
                            className="text-red-600 font-semibold ml-2 cursor-pointer"
                          >
                            Cabut
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right Column: Whitelisted Accounts Table */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Daftar Akun Resmi yang Diizinkan Login ({registeredAccounts.length + 1})
                      </h2>
                      <p className="text-xs text-slate-500">
                        Akun di luar daftar ini otomatis ditolak pada halaman login.
                      </p>
                    </div>

                    {isBootstrappedAdmin && (
                      <input
                        type="text"
                        value={regSearch}
                        onChange={(e) => setRegSearch(e.target.value)}
                        placeholder="Cari nama atau email..."
                        className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs w-full sm:w-52"
                      />
                    )}
                  </div>

                  {/* Permanent Bootstrapped Super Admin Entry */}
                  <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Super Administrator Utama P2UWM</span>
                      </div>
                      <div className="font-mono text-emerald-800 dark:text-emerald-300 mt-0.5 truncate">
                        {BOOTSTRAPPED_ADMIN_EMAIL}
                      </div>
                    </div>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                      Aktif Permanen · Kendali Penuh
                    </span>
                  </div>

                  {!isBootstrappedAdmin ? (
                    <div className="p-6 text-center text-xs text-slate-500 border border-slate-200/70 dark:border-teal-900/40 rounded-xl">
                      Daftar lengkap seluruh email terdaftar hanya ditampilkan kepada Super
                      Administrator Utama demi menjaga privasi direktori akun.
                    </div>
                  ) : filteredRegisteredAccounts.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500 border border-slate-200/70 dark:border-teal-900/40 rounded-xl">
                      Belum ada akun tambahan yang didaftarkan pada filter pencarian ini. Gunakan
                      formulir di sebelah kiri untuk mendaftarkan email pengurus atau anggota.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                      {filteredRegisteredAccounts.map((acc) => (
                        <div
                          key={acc.email}
                          className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50 flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5 text-slate-500 dark:text-slate-400 mb-0.5">
                              <span
                                className={`font-bold ${
                                  acc.active
                                    ? 'text-emerald-700 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {acc.active ? 'Aktif Diizinkan' : 'Dibekukan'}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {acc.role === 'admin' ? 'Pengurus / Admin CMS' : 'Anggota Terdaftar'}
                              </span>
                              <span>·</span>
                              <span>{acc.roleTitle}</span>
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white truncate">
                              {acc.name}
                            </div>
                            <div className="font-mono text-slate-600 dark:text-teal-300 truncate">
                              {acc.email}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              disabled={busyAction}
                              onClick={() => handleToggleRegisteredAccount(acc)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#0D1F26] font-semibold text-slate-700 dark:text-slate-200 hover:border-teal-500 cursor-pointer"
                            >
                              {acc.active ? 'Bekukan' : 'Aktifkan'}
                            </button>

                            {confirmRevokeEmail === acc.email ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  disabled={busyAction}
                                  onClick={() =>
                                    handleDeleteRegisteredAccount(acc.email, acc.name)
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white font-semibold cursor-pointer"
                                >
                                  Ya, Cabut
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmRevokeEmail(null)}
                                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-teal-800 text-slate-600 dark:text-slate-300 cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmRevokeEmail(acc.email)}
                                className="px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 font-semibold cursor-pointer"
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Live Security Audit Trail */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Log Audit Keamanan Real-Time ({filteredAuditLogs.length})
                    </h2>
                    <p className="text-xs text-slate-500">
                      Rekaman aktivitas otorisasi akun, perubahan CMS, dan akses brankas PII.
                    </p>
                  </div>

                  <select
                    value={auditFilter}
                    onChange={(e) => setAuditFilter(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-xs font-semibold"
                  >
                    <option value="ALL">Semua Aktivitas</option>
                    <option value="CREATE">CREATE</option>
                    <option value="UPDATE">UPDATE</option>
                    <option value="DELETE">DELETE</option>
                    <option value="STATUS_CHANGE">STATUS_CHANGE</option>
                    <option value="SECURITY_CHECK">Akses PII (SECURITY_CHECK)</option>
                    <option value="SEED_DATA">SEED_DATA</option>
                  </select>
                </div>

                {filteredAuditLogs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 border border-slate-200/70 dark:border-teal-900/40 rounded-xl">
                    Belum ada aktivitas audit terekam pada kategori ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 dark:border-teal-900/50 rounded-xl max-h-80 overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-[#071318] border-b border-slate-200 dark:border-teal-900/50 text-slate-600 dark:text-slate-300">
                          <th className="py-2.5 px-3 font-semibold">Waktu</th>
                          <th className="py-2.5 px-3 font-semibold">Aksi</th>
                          <th className="py-2.5 px-3 font-semibold">Rincian Aktivitas</th>
                          <th className="py-2.5 px-3 font-semibold">Pelaksana</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 dark:divide-teal-900/40">
                        {filteredAuditLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="py-2.5 px-3 font-mono tabular-nums whitespace-nowrap text-slate-500">
                              {formatTimestamp(log.createdAt)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-teal-700 dark:text-teal-400 whitespace-nowrap">
                              {log.action}
                            </td>
                            <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200">
                              {log.summary}
                            </td>
                            <td className="py-2.5 px-3 text-slate-500 truncate max-w-[160px]">
                              {log.actorEmail}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 6: KESIAPAN HOSTING RUMAHWEB (cPanel) & FULL BACKUP SISTEM
          ================================================================== */}
          {activeTab === 'hosting' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                    Pusat Kesiapan Hosting Rumahweb &amp; Cadangan Data Penuh
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Paket produksi siap unggah untuk cPanel / LiteSpeed Rumahweb Indonesia beserta
                    konfigurasi SSL, routing SPA, dan otorisasi domain login.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      downloadTextFile('.htaccess', RUMAHWEB_HTACCESS_CONTENT, 'text/plain;charset=utf-8;')
                    }
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-800 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:border-teal-500 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-teal-600" />
                    <span>Unduh File .htaccess Rumahweb</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadFullBackupJson}
                    className="luxury-sheen-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    <Database className="w-4 h-4" />
                    <span>Unduh Backup Penuh (.JSON)</span>
                  </button>
                </div>
              </div>

              {/* 4 Production Readiness Diagnostic Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Domain Host Aktif
                  </div>
                  <div className="text-sm font-bold font-mono text-slate-900 dark:text-white truncate">
                    {typeof window !== 'undefined' ? window.location.hostname : 'siap-deploy'}
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                    {typeof window !== 'undefined' && window.location.protocol === 'https:'
                      ? 'Protokol HTTPS Terenkripsi'
                      : 'Mode Lokal / Pratinjau'}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Server Web Target
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Rumahweb cPanel (LiteSpeed / Apache)
                  </div>
                  <div className="text-xs text-teal-600 dark:text-teal-400 mt-1">
                    .htaccess &amp; Webmanifest Terintegrasi
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Basis Data Real-Time
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    Cloud Firestore Aktif
                  </div>
                  <div className="text-xs text-slate-500 mt-1 truncate font-mono">
                    {FIREBASE_PROJECT_ID}
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Gerbang Autentikasi
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    Hanya Akun Terdaftar
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-mono tabular-nums">
                    {registeredAccounts.length + 1} Email Resmi Terdaftar
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Step-by-Step Rumahweb Deployment Guide */}
                <div className="lg:col-span-7 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-5">
                  <div className="flex items-center gap-2.5">
                    <Globe className="w-5 h-5 text-teal-600" />
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Panduan Lengkap Hosting di Rumahweb Indonesia
                    </h2>
                  </div>

                  <div className="space-y-4 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50 space-y-1.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        01. Build Paket Produksi &amp; Unggah ke cPanel Rumahweb
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Jalankan perintah <code className="font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800">npm run build</code> untuk menghasilkan folder produksi <code className="font-mono px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800">dist/</code>. Buka <strong>cPanel Rumahweb → File Manager → public_html</strong>, aktifkan opsi <em>Show Hidden Files (dotfiles)</em>, lalu unggah seluruh isi di dalam folder <code className="font-mono">dist/</code> (termasuk file <code className="font-mono">.htaccess</code>, <code className="font-mono">index.html</code>, dan folder <code className="font-mono">assets/</code>).
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50 space-y-2">
                      <div className="font-bold text-slate-900 dark:text-white">
                        02. Daftarkan Domain Rumahweb ke Firebase Authorized Domains (Wajib untuk Login)
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Agar jendela login akun terdaftar berfungsi pada domain baru Anda di Rumahweb
                        (misalnya <code className="font-mono">p2uwmmandira.or.id</code> atau <code className="font-mono">p2uwm.my.id</code>), buka <strong>Firebase Console → Pilih Project → Authentication → Settings → Authorized domains → Add domain</strong>, lalu masukkan nama domain Rumahweb Anda.
                      </p>
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(FIREBASE_PROJECT_ID, 'Firebase Project ID')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#0D1F26] text-xs font-mono font-semibold cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5 text-teal-600" />
                          <span>Project ID: {FIREBASE_PROJECT_ID}</span>
                        </button>
                        {typeof window !== 'undefined' && (
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(window.location.hostname, 'Nama Domain Aktif')
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#0D1F26] text-xs font-mono font-semibold cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5 text-amber-600" />
                            <span>Salin Domain Saat Ini</span>
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50 space-y-1.5">
                      <div className="font-bold text-slate-900 dark:text-white">
                        03. Aktifkan AutoSSL HTTPS &amp; Kelola Daftar Email Login
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        Pastikan sertifikat gratis <strong>Let&apos;s Encrypt / AutoSSL</strong> aktif di menu <em>SSL/TLS Status</em> cPanel Rumahweb. Seluruh perubahan berita, galeri, program kerja, struktur pengurus, dan daftar akun terdaftar tersimpan otomatis secara <em>real-time</em> di Cloud tanpa perlu mengunggah ulang file ke cPanel.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Column: .htaccess Preview & Cloud Sync Utility */}
                <div className="lg:col-span-5 p-6 rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 space-y-4 h-fit">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Konfigurasi Server .htaccess
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(RUMAHWEB_HTACCESS_CONTENT, 'Konfigurasi .htaccess')
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-teal-800 text-xs font-semibold text-teal-700 dark:text-teal-300 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Kode</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    File ini sudah otomatis disertakan ke dalam hasil build (<code className="font-mono">dist/.htaccess</code>). Anda juga dapat menyalin atau mengunduhnya langsung dari sini jika tersembunyi saat ekstraksi ZIP di cPanel.
                  </p>
                  <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-300 text-[11px] font-mono overflow-x-auto max-h-64 overflow-y-auto leading-relaxed border border-teal-900/60">
                    {RUMAHWEB_HTACCESS_CONTENT}
                  </pre>

                  <div className="pt-2 border-t border-slate-200 dark:border-teal-900/50 space-y-2.5">
                    <button
                      type="button"
                      disabled={busyAction}
                      onClick={handleSeedCloudData}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-400/70 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-200 text-xs font-bold cursor-pointer"
                    >
                      <CloudUpload className="w-4 h-4" />
                      <span>Sinkronkan / Muat Data Master Awal ke Cloud</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
