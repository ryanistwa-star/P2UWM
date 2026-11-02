export interface SiteSetting {
  orgName: string;
  orgShortName: string;
  tagline: string;
  locationText: string;
  vision: string;
  missionList: string[];
  historyText: string;
  chairmanName: string;
  chairmanTitle: string;
  chairmanQuote: string;
  totalMembers: number;
  totalPonds: number;
  activeBlocks: number;
  updatedBy?: string;
  updatedAt?: unknown;
}

export type BoardDivision =
  | 'Inti'
  | 'Badan Pengawas'
  | 'Demisioner'
  | 'Keanggotaan & Sosial'
  | 'Humas & Advokasi'
  | 'Ekonomi & Usaha'
  | 'Teknis Budidaya'
  | 'Infrastruktur Kawasan';

export interface BoardMember {
  id: string;
  name: string;
  position: string;
  division: BoardDivision;
  bio: string;
  orderIndex: number;
  photoKey: string;
  status: 'published' | 'archived';
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ProgramFieldCategory =
  | 'Keanggotaan, Sosial, & Keagamaan'
  | 'Humas, Komunikasi, & Advokasi'
  | 'Penguatan Ekonomi & Usaha Anggota'
  | 'Pendampingan Teknis Budidaya & Kesehatan Udang'
  | 'Infrastruktur & Pengelolaan Kawasan Pertambakan';

export interface WorkProgram {
  id: string;
  code: string;
  title: string;
  fieldCategory: ProgramFieldCategory;
  summary: string;
  details: string;
  highlights: string[];
  progressPercent: number;
  targetMetric: string;
  imageKey: string;
  orderIndex: number;
  status: 'published' | 'draft';
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type GalleryCategory =
  | 'Infrastruktur'
  | 'Budidaya & Teknis'
  | 'Musyawarah & Organisasi'
  | 'Sosial & Ekonomi';

export interface GalleryItem {
  id: string;
  title: string;
  caption: string;
  category: GalleryCategory;
  locationBlock: string;
  eventDate: string;
  imageUrl: string;
  status: 'published' | 'draft';
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type ArticleCategory =
  | 'Pengumuman'
  | 'Infrastruktur'
  | 'Budidaya Udang'
  | 'Kegiatan Organisasi'
  | 'Ekonomi Tambak';

export interface NewsArticle {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  category: ArticleCategory;
  authorName: string;
  publishDate: string;
  readMinutes: number;
  imageUrl: string;
  featured: boolean;
  status: 'published' | 'draft';
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AspirationCategory =
  | 'Infrastruktur & Kanal'
  | 'Kesehatan Udang & Teknis'
  | 'Ekonomi & Koperasi'
  | 'Keanggotaan & Sosial'
  | 'Advokasi & Kebijakan';

export type AspirationUrgency = 'Normal' | 'Penting' | 'Mendesak';
export type AspirationStatus = 'Diajukan' | 'Ditinjau' | 'Ditindaklanjuti' | 'Selesai';

export interface Aspiration {
  id: string;
  senderName: string;
  pondBlock: string;
  category: AspirationCategory;
  urgency: AspirationUrgency;
  subject: string;
  message: string;
  status: AspirationStatus;
  adminResponse: string;
  authorId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AspirationPii {
  aspirationId: string;
  authorId: string;
  email: string;
  phone: string;
  memberIdCode: string;
  createdAt?: unknown;
}

export interface AnalyticsDaily {
  dateKey: string;
  label: string;
  visitors: number;
  pageViews: number;
  mobileUsers: number;
  desktopUsers: number;
  berandaViews: number;
  profilViews: number;
  programViews: number;
  galeriViews: number;
  beritaViews: number;
  aspirasiViews: number;
  ownerScope: 'p2uwm_analytics';
  updatedAt?: unknown;
}

export type AuditActionType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'STATUS_CHANGE'
  | 'SECURITY_CHECK'
  | 'SEED_DATA';

export interface AuditLog {
  id: string;
  actorUid: string;
  actorEmail: string;
  action: AuditActionType;
  targetCollection: string;
  targetId: string;
  summary: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  scope: 'p2uwm_audit';
  createdAt?: unknown;
}

export interface AdminRole {
  uid: string;
  email: string;
  name: string;
  roleTitle: string;
  addedBy: string;
  createdAt?: unknown;
}

export type RegisteredAccountRole = 'admin' | 'member';

export interface RegisteredAccount {
  email: string;
  name: string;
  role: RegisteredAccountRole;
  roleTitle: string;
  active: boolean;
  scope: 'p2uwm_auth';
  addedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type PublicSectionKey =
  | 'beranda'
  | 'profil'
  | 'program'
  | 'galeri'
  | 'berita'
  | 'aspirasi';
