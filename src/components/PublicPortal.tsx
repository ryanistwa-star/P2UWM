import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from 'firebase/auth';
import {
  ArrowRight,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Send,
  Lock,
  CheckCircle2,
  Sun,
  Moon,
  Clock,
  MapPin,
  LogIn,
  FileText,
  Plus,
  Edit3,
  Trash2,
  Network,
} from 'lucide-react';
import {
  ArticleCategory,
  Aspiration,
  AspirationCategory,
  AspirationUrgency,
  BoardDivision,
  BoardMember,
  GalleryCategory,
  GalleryItem,
  NewsArticle,
  PublicSectionKey,
  RegisteredAccount,
  SiteSetting,
  WorkProgram,
} from '../types';
import { ASSET_PRESETS, P2UWM_LOGO_URL, resolveImageAsset } from '../data/seedData';
import { ResilientImage } from './ResilientImage';
import { formatTimestamp, sanitizeText } from '../firebase';

interface PublicPortalProps {
  siteSettings: SiteSetting;
  boardMembers: BoardMember[];
  programs: WorkProgram[];
  galleryItems: GalleryItem[];
  articles: NewsArticle[];
  myAspirations: Aspiration[];
  currentUser: User | null;
  registeredAccount: RegisteredAccount | null;
  isAdmin: boolean;
  authChecking: boolean;
  authError: string | null;
  onClearAuthError: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onSectionVisit: (section: PublicSectionKey) => void;
  onLoginGoogle: () => Promise<void>;
  onLogout: () => Promise<void>;
  onOpenAdmin: () => void;
  onSubmitAspiration: (payload: {
    senderName: string;
    pondBlock: string;
    category: AspirationCategory;
    urgency: AspirationUrgency;
    subject: string;
    message: string;
    phone: string;
    memberIdCode: string;
  }) => Promise<void>;
  onSaveBoardMember: (payload: {
    id?: string;
    name: string;
    position: string;
    division: BoardDivision;
    bio: string;
    orderIndex: number;
    photoKey: string;
    status?: 'published' | 'archived';
  }) => Promise<void>;
  onDeleteBoardMember: (id: string, name: string) => Promise<void>;
}

const GALLERY_CATEGORIES: ('Semua' | GalleryCategory)[] = [
  'Semua',
  'Infrastruktur',
  'Budidaya & Teknis',
  'Musyawarah & Organisasi',
  'Sosial & Ekonomi',
];

const ARTICLE_CATEGORIES: ('Semua' | ArticleCategory)[] = [
  'Semua',
  'Infrastruktur',
  'Budidaya Udang',
  'Kegiatan Organisasi',
  'Ekonomi Tambak',
  'Pengumuman',
];

const BOARD_DIVISIONS: ('Semua' | BoardDivision)[] = [
  'Semua',
  'Inti',
  'Badan Pengawas',
  'Demisioner',
  'Infrastruktur Kawasan',
  'Teknis Budidaya',
  'Ekonomi & Usaha',
  'Humas & Advokasi',
  'Keanggotaan & Sosial',
];

/**
 * Zero-re-render pointer-tracking luxury spotlight container.
 * Updates CSS custom properties directly on the DOM element for 60fps iridescent glow.
 */
const SpotlightCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}> = ({ children, className = '', onClick }) => {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
    e.currentTarget.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
  };

  return (
    <div
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={`luxury-spotlight-surface ${className}`}
    >
      {children}
    </div>
  );
};

export const PublicPortal: React.FC<PublicPortalProps> = ({
  siteSettings,
  boardMembers,
  programs,
  galleryItems,
  articles,
  myAspirations,
  currentUser,
  registeredAccount,
  isAdmin,
  authChecking,
  authError,
  onClearAuthError,
  darkMode,
  onToggleDarkMode,
  onSectionVisit,
  onLoginGoogle,
  onLogout,
  onOpenAdmin,
  onSubmitAspiration,
  onSaveBoardMember,
  onDeleteBoardMember,
}) => {
  // Interactive Filter & Modal States
  const [boardFilter, setBoardFilter] = useState<'Semua' | BoardDivision>('Semua');
  const [showOrgChart, setShowOrgChart] = useState<boolean>(true);
  const [manageBoardMode, setManageBoardMode] = useState<boolean>(false);
  const [boardToast, setBoardToast] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Add / Edit Board Structure Modal State
  const [boardModalOpen, setBoardModalOpen] = useState<boolean>(false);
  const [editingMemberId, setEditingMemberId] = useState<string | undefined>(undefined);
  const [bmName, setBmName] = useState<string>('');
  const [bmPosition, setBmPosition] = useState<string>('');
  const [bmDivision, setBmDivision] = useState<BoardDivision>('Inti');
  const [bmBio, setBmBio] = useState<string>('');
  const [bmOrder, setBmOrder] = useState<number>(1);
  const [bmPhotoKey, setBmPhotoKey] = useState<string>('ketua_portrait');

  // Structured Demisioner Period & Paired Ketua + Wakil Modal State
  const [demPairMode, setDemPairMode] = useState<boolean>(false);
  const [demRoleSelect, setDemRoleSelect] = useState<'Ketua Demisioner' | 'Wakil Ketua Demisioner'>(
    'Ketua Demisioner'
  );
  const [demPeriodInput, setDemPeriodInput] = useState<string>('Periode III (2024–2028)');
  // Second person fields when adding a full Demisioner Period (Ketua + Wakil together)
  const [demWakilName, setDemWakilName] = useState<string>('');
  const [demWakilBio, setDemWakilBio] = useState<string>('');
  const [demWakilPhotoKey, setDemWakilPhotoKey] = useState<string>('demisioner_wakil_portrait');

  const [bmSaving, setBmSaving] = useState<boolean>(false);
  const [bmError, setBmError] = useState<string | null>(null);

  const [selectedProgram, setSelectedProgram] = useState<WorkProgram | null>(null);

  const [galleryFilter, setGalleryFilter] = useState<'Semua' | GalleryCategory>('Semua');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const [articleFilter, setArticleFilter] = useState<'Semua' | ArticleCategory>('Semua');
  const [articleSearch, setArticleSearch] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  // Kirim Aspirasi Form State
  const [senderName, setSenderName] = useState(currentUser?.displayName || '');
  const [pondBlock, setPondBlock] = useState('Blok 4 - Jalur Utama');
  const [aspCategory, setAspCategory] = useState<AspirationCategory>('Infrastruktur & Kanal');
  const [urgency, setUrgency] = useState<AspirationUrgency>('Normal');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [phone, setPhone] = useState('');
  const [memberIdCode, setMemberIdCode] = useState('');
  const [aspSubmitting, setAspSubmitting] = useState(false);
  const [aspSuccess, setAspSuccess] = useState<string | null>(null);
  const [aspError, setAspError] = useState<string | null>(null);

  const allPublishedBoard = useMemo(
    () =>
      boardMembers
        .filter((m) => m.status === 'published')
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [boardMembers]
  );

  const publishedBoard = useMemo(
    () =>
      allPublishedBoard.filter((m) =>
        boardFilter === 'Semua' ? true : m.division === boardFilter
      ),
    [allPublishedBoard, boardFilter]
  );

  const parseDemisionerMeta = (position: string) => {
    const parts = position.split('·').map((s) => s.trim()).filter(Boolean);
    let rolePart = parts[0] || position.trim();
    let periodPart = '';

    if (parts.length >= 2) {
      const periodCandidate = parts.find((p) => /periode|\d{4}/i.test(p));
      periodPart = periodCandidate || parts[1];
      if (periodCandidate === parts[0] && parts[1]) {
        rolePart = parts[1];
      }
    } else {
      const match = position.match(/(periode\s+[^,;]+)/i);
      if (match) {
        periodPart = match[1].trim();
        rolePart = position.replace(match[0], '').replace(/[-–—()]/g, ' ').trim() || 'Demisioner';
      }
    }

    const isWakil = /wakil/i.test(rolePart) || /wakil/i.test(position);
    const cleanRole: 'Ketua Demisioner' | 'Wakil Ketua Demisioner' = isWakil
      ? 'Wakil Ketua Demisioner'
      : 'Ketua Demisioner';

    return {
      isWakil,
      roleLabel: cleanRole,
      periodLabel: periodPart || 'Periode Terdahulu',
    };
  };

  const demisionerPeriodGroups = useMemo(() => {
    const demList = allPublishedBoard.filter((m) => m.division === 'Demisioner');
    const map = new Map<
      string,
      {
        periodKey: string;
        periodLabel: string;
        ketua?: BoardMember;
        wakil?: BoardMember;
        extras: BoardMember[];
      }
    >();

    demList.forEach((member) => {
      const meta = parseDemisionerMeta(member.position);
      const normKey = meta.periodLabel.toLowerCase().replace(/\s+/g, ' ').trim();
      if (!map.has(normKey)) {
        map.set(normKey, {
          periodKey: normKey,
          periodLabel: meta.periodLabel,
          extras: [],
        });
      }
      const group = map.get(normKey)!;
      if (meta.isWakil) {
        if (!group.wakil) group.wakil = member;
        else group.extras.push(member);
      } else {
        if (!group.ketua) group.ketua = member;
        else group.extras.push(member);
      }
    });

    return Array.from(map.values());
  }, [allPublishedBoard]);

  const defaultPhotoForDivision = (div: BoardDivision): string => {
    if (div === 'Badan Pengawas') return 'badan_pengawas_portrait';
    if (div === 'Demisioner') return 'demisioner_ketua_portrait';
    if (div === 'Infrastruktur Kawasan') return 'gorong_gorong';
    if (div === 'Teknis Budidaya') return 'kesehatan_udang';
    return 'pengurus_inti_portrait';
  };

  const openAddDemisionerPeriodModal = () => {
    const nextNum = demisionerPeriodGroups.length + 1;
    const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][nextNum - 1] || String(nextNum);
    setEditingMemberId(undefined);
    setBmDivision('Demisioner');
    setDemPairMode(true);
    setDemPeriodInput(`Periode ${roman} (2024–2028)`);
    setDemRoleSelect('Ketua Demisioner');
    setBmName('');
    setBmBio('');
    setBmPhotoKey('demisioner_ketua_portrait');
    setDemWakilName('');
    setDemWakilBio('');
    setDemWakilPhotoKey('demisioner_wakil_portrait');
    setBmOrder(allPublishedBoard.length + 1);
    setBmError(null);
    setBoardModalOpen(true);
  };

  const openAddDemisionerRoleInPeriod = (
    periodLabel: string,
    role: 'Ketua Demisioner' | 'Wakil Ketua Demisioner'
  ) => {
    setEditingMemberId(undefined);
    setBmDivision('Demisioner');
    setDemPairMode(false);
    setDemRoleSelect(role);
    setDemPeriodInput(periodLabel);
    setBmName('');
    setBmPosition(`${role} · ${periodLabel}`);
    setBmBio('');
    setBmOrder(allPublishedBoard.length + 1);
    setBmPhotoKey(
      role === 'Wakil Ketua Demisioner' ? 'demisioner_wakil_portrait' : 'demisioner_ketua_portrait'
    );
    setBmError(null);
    setBoardModalOpen(true);
  };

  const openAddBoardModal = (presetDivision?: BoardDivision) => {
    const targetDiv: BoardDivision =
      presetDivision || (boardFilter !== 'Semua' ? boardFilter : 'Inti');
    if (targetDiv === 'Demisioner') {
      openAddDemisionerPeriodModal();
      return;
    }
    setEditingMemberId(undefined);
    setDemPairMode(false);
    setBmName('');
    setBmPosition(
      targetDiv === 'Badan Pengawas' ? 'Anggota Badan Pengawas' : 'Pengurus Pusat P2UWM'
    );
    setBmDivision(targetDiv);
    setBmBio('');
    setBmOrder(allPublishedBoard.length + 1);
    setBmPhotoKey(defaultPhotoForDivision(targetDiv));
    setBmError(null);
    setBoardModalOpen(true);
  };

  const openEditBoardModal = (member: BoardMember) => {
    setEditingMemberId(member.id);
    setDemPairMode(false);
    setBmName(member.name);
    setBmPosition(member.position);
    setBmDivision(member.division);
    if (member.division === 'Demisioner') {
      const meta = parseDemisionerMeta(member.position);
      setDemRoleSelect(meta.roleLabel);
      setDemPeriodInput(meta.periodLabel);
    }
    setBmBio(member.bio);
    setBmOrder(member.orderIndex);
    setBmPhotoKey(member.photoKey);
    setBmError(null);
    setBoardModalOpen(true);
  };

  const handleSaveBoardModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setBmError(null);

    if (bmDivision === 'Demisioner' && demPairMode && !editingMemberId) {
      const cleanPeriod = sanitizeText(demPeriodInput, 60);
      const cleanKetuaName = sanitizeText(bmName, 100);
      const cleanKetuaBio = sanitizeText(bmBio, 500);
      const cleanKetuaPhoto = sanitizeText(bmPhotoKey, 500);
      const cleanWakilName = sanitizeText(demWakilName, 100);
      const cleanWakilBio = sanitizeText(demWakilBio, 500);
      const cleanWakilPhoto = sanitizeText(demWakilPhotoKey, 500);

      if (cleanPeriod.length < 3) {
        setBmError('Masukkan nama / tahun periode (contoh: Periode III 2024–2028).');
        return;
      }
      if (cleanKetuaName.length < 2 || cleanWakilName.length < 2) {
        setBmError('Nama Ketua Demisioner dan Wakil Ketua Demisioner wajib diisi lengkap.');
        return;
      }
      if (cleanKetuaBio.length < 5 || cleanWakilBio.length < 5) {
        setBmError('Uraian pengabdian Ketua dan Wakil Ketua masing-masing minimal 5 karakter.');
        return;
      }
      if (cleanKetuaPhoto.startsWith('data:') || cleanWakilPhoto.startsWith('data:')) {
        setBmError('Gunakan potret preset atau tautan URL foto (https://...), bukan base64.');
        return;
      }

      setBmSaving(true);
      try {
        await onSaveBoardMember({
          name: cleanKetuaName,
          position: sanitizeText(`Ketua Demisioner · ${cleanPeriod}`, 100),
          division: 'Demisioner',
          bio: cleanKetuaBio,
          orderIndex: bmOrder,
          photoKey: cleanKetuaPhoto,
          status: 'published',
        });
        await onSaveBoardMember({
          name: cleanWakilName,
          position: sanitizeText(`Wakil Ketua Demisioner · ${cleanPeriod}`, 100),
          division: 'Demisioner',
          bio: cleanWakilBio,
          orderIndex: Math.min(100, bmOrder + 1),
          photoKey: cleanWakilPhoto,
          status: 'published',
        });
        setBoardModalOpen(false);
        setBoardToast(
          `Pasangan Ketua & Wakil Ketua untuk "${cleanPeriod}" berhasil ditambahkan.`
        );
        setTimeout(() => setBoardToast(null), 4000);
      } catch (err) {
        setBmError(
          err instanceof Error
            ? err.message
            : 'Gagal menyimpan periode demisioner. Pastikan Anda masuk sebagai Admin.'
        );
      } finally {
        setBmSaving(false);
      }
      return;
    }

    const composedPosition =
      bmDivision === 'Demisioner'
        ? `${demRoleSelect} · ${sanitizeText(demPeriodInput, 65)}`
        : bmPosition;

    const cleanName = sanitizeText(bmName, 100);
    const cleanPos = sanitizeText(composedPosition, 100);
    const cleanBio = sanitizeText(bmBio, 500);
    const cleanPhoto = sanitizeText(bmPhotoKey, 500);

    if (cleanName.length < 2) {
      setBmError('Nama lengkap minimal 2 karakter.');
      return;
    }
    if (cleanPos.length < 2) {
      setBmError('Jabatan minimal 2 karakter.');
      return;
    }
    if (cleanBio.length < 5) {
      setBmError('Deskripsi peran / masa bakti minimal 5 karakter.');
      return;
    }
    if (cleanPhoto.startsWith('data:')) {
      setBmError('Gunakan pilihan foto potret preset atau tautan URL gambar (https://...), bukan data base64.');
      return;
    }

    setBmSaving(true);
    try {
      await onSaveBoardMember({
        id: editingMemberId,
        name: cleanName,
        position: cleanPos,
        division: bmDivision,
        bio: cleanBio,
        orderIndex: bmOrder,
        photoKey: cleanPhoto,
        status: 'published',
      });
      setBoardModalOpen(false);
      setBoardToast(
        editingMemberId
          ? `Data "${cleanName}" berhasil diperbarui.`
          : `"${cleanName}" berhasil ditambahkan ke struktur organisasi.`
      );
      setTimeout(() => setBoardToast(null), 4000);
    } catch (err) {
      setBmError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan perubahan struktur. Pastikan Anda masuk sebagai Admin.'
      );
    } finally {
      setBmSaving(false);
    }
  };

  const handleConfirmDeleteMember = async (member: BoardMember) => {
    try {
      await onDeleteBoardMember(member.id, member.name);
      setConfirmDeleteId(null);
      setBoardToast(`Data "${member.name}" telah dihapus dari struktur.`);
      setTimeout(() => setBoardToast(null), 4000);
    } catch (err) {
      setBoardToast(
        err instanceof Error ? err.message : 'Gagal menghapus anggota struktur.'
      );
      setTimeout(() => setBoardToast(null), 4000);
    }
  };

  const publishedPrograms = useMemo(
    () =>
      programs
        .filter((p) => p.status === 'published')
        .sort((a, b) => a.orderIndex - b.orderIndex),
    [programs]
  );

  const filteredGallery = useMemo(
    () =>
      galleryItems
        .filter((g) => g.status === 'published')
        .filter((g) => (galleryFilter === 'Semua' ? true : g.category === galleryFilter)),
    [galleryItems, galleryFilter]
  );

  const filteredArticles = useMemo(() => {
    const q = articleSearch.trim().toLowerCase();
    return articles
      .filter((a) => a.status === 'published')
      .filter((a) => (articleFilter === 'Semua' ? true : a.category === articleFilter))
      .filter((a) =>
        !q
          ? true
          : a.title.toLowerCase().includes(q) ||
            a.excerpt.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
      );
  }, [articles, articleFilter, articleSearch]);

  const handleJump = (section: PublicSectionKey, elementId: string) => {
    onSectionVisit(section);
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleAspirationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAspError(null);
    setAspSuccess(null);

    const cleanName = sanitizeText(senderName || currentUser?.displayName || '', 100);
    const cleanBlock = sanitizeText(pondBlock, 60);
    const cleanSubject = sanitizeText(subject, 160);
    const cleanMsg = sanitizeText(message, 2500);
    const cleanPhone = sanitizeText(phone, 30);
    const cleanCode = sanitizeText(memberIdCode, 50);

    if (cleanName.length < 2) {
      setAspError('Nama lengkap pengirim minimal 2 karakter.');
      return;
    }
    if (cleanSubject.length < 5) {
      setAspError('Judul pokok aspirasi minimal 5 karakter.');
      return;
    }
    if (cleanMsg.length < 15) {
      setAspError('Uraian aspirasi atau masukan minimal 15 karakter agar jelas ditindaklanjuti.');
      return;
    }
    if (!/^[0-9+\-\s()]{6,30}$/.test(cleanPhone)) {
      setAspError('Masukkan nomor WhatsApp/telepon aktif yang valid (6–30 digit).');
      return;
    }

    setAspSubmitting(true);
    try {
      await onSubmitAspiration({
        senderName: cleanName,
        pondBlock: cleanBlock,
        category: aspCategory,
        urgency,
        subject: cleanSubject,
        message: cleanMsg,
        phone: cleanPhone,
        memberIdCode: cleanCode,
      });
      setSubject('');
      setMessage('');
      setAspSuccess(
        'Aspirasi Anda berhasil dienkripsi & dikirim secara atomik ke Pengurus Pusat P2UWM. Pantau status tindak lanjutnya di bawah.'
      );
    } catch (err) {
      setAspError(
        err instanceof Error
          ? 'Gagal mengirim aspirasi. Pastikan akun Google Anda telah terverifikasi.'
          : 'Terjadi kendala jaringan saat mengirim aspirasi.'
      );
    } finally {
      setAspSubmitting(false);
    }
  };

  const programJewelThemes = [
    {
      wash: 'from-emerald-500/16 via-teal-500/8 to-transparent dark:from-emerald-500/24 dark:via-teal-500/12',
      topBar: 'from-emerald-500 via-teal-400 to-cyan-500',
      hoverBorder: 'hover:border-emerald-500/70 dark:hover:border-emerald-400/60',
      codeColor: 'text-emerald-700 dark:text-emerald-300',
      barFill: 'from-emerald-500 via-teal-400 to-cyan-400',
    },
    {
      wash: 'from-amber-500/18 via-orange-500/8 to-transparent dark:from-amber-500/24 dark:via-orange-500/12',
      topBar: 'from-amber-400 via-yellow-500 to-orange-500',
      hoverBorder: 'hover:border-amber-500/70 dark:hover:border-amber-400/60',
      codeColor: 'text-amber-700 dark:text-amber-300',
      barFill: 'from-amber-400 via-orange-400 to-emerald-500',
    },
    {
      wash: 'from-cyan-500/18 via-sky-500/8 to-transparent dark:from-cyan-500/24 dark:via-indigo-500/12',
      topBar: 'from-cyan-400 via-sky-500 to-indigo-500',
      hoverBorder: 'hover:border-cyan-500/70 dark:hover:border-cyan-400/60',
      codeColor: 'text-cyan-700 dark:text-cyan-300',
      barFill: 'from-cyan-500 via-sky-400 to-indigo-500',
    },
    {
      wash: 'from-teal-500/18 via-emerald-500/8 to-transparent dark:from-teal-500/24 dark:via-lime-500/10',
      topBar: 'from-teal-400 via-emerald-500 to-lime-500',
      hoverBorder: 'hover:border-teal-500/70 dark:hover:border-teal-400/60',
      codeColor: 'text-teal-700 dark:text-teal-300',
      barFill: 'from-teal-500 via-emerald-400 to-amber-400',
    },
    {
      wash: 'from-indigo-500/16 via-cyan-500/10 to-transparent dark:from-indigo-500/24 dark:via-cyan-500/12',
      topBar: 'from-indigo-500 via-cyan-400 to-amber-400',
      hoverBorder: 'hover:border-indigo-500/70 dark:hover:border-cyan-400/60',
      codeColor: 'text-indigo-700 dark:text-cyan-300',
      barFill: 'from-indigo-500 via-cyan-400 to-amber-400',
    },
  ];

  return (
    <div className="w-full overflow-x-hidden">
      {/* =====================================================================
          1. HERO SECTION (Luxury Multi-Color Aurora + Emblem + 2-Column Stretch)
      ====================================================================== */}
      <section
        id="section-beranda"
        className="relative pt-8 pb-16 lg:pt-12 lg:pb-24 luxury-aurora-hero overflow-hidden"
      >
        {/* Subtle Architectural Grid Overlay */}
        <div className="pointer-events-none absolute inset-0 luxury-grid-pattern opacity-80" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Contextual Utility Row (Regional Marker + Jewel Theme Switcher) */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-emerald-900/10 dark:border-teal-400/20">
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>Desa Bumi Pratama Mandira</span>
              <span aria-hidden="true" className="text-amber-500">
                ·
              </span>
              <span>Kec. Sungai Menang</span>
              <span aria-hidden="true" className="text-amber-500">
                ·
              </span>
              <span>Kab. Ogan Komering Ilir (OKI), Sumatera Selatan</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onToggleDarkMode}
                className="luxury-sheen-btn inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-amber-300/70 dark:border-amber-400/40 bg-white/90 dark:bg-[#0B1E26]/90 backdrop-blur-xs text-xs font-semibold text-slate-800 dark:text-amber-100 hover:border-emerald-500 dark:hover:border-teal-400 shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                aria-label="Ubah Tema Tampilan"
              >
                {darkMode ? (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Mode Terang</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Mode Malam Mewah</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 2-Column Balanced Hero Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-7 flex flex-col justify-between py-2"
            >
              <div>
                {/* Official Emblem + Organization Kicker (Unboxed Institutional Lockup) */}
                <div className="flex items-center gap-3.5 mb-5">
                  <div className="p-1.5 rounded-2xl bg-white shadow-md ring-1 ring-amber-400/70 shrink-0">
                    <img
                      src={P2UWM_LOGO_URL}
                      alt="Lambang Resmi Perhimpunan Petambak Udang Wahyuni Mandira"
                      referrerPolicy="no-referrer"
                      className="h-11 w-14 object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-bold tracking-tight bg-gradient-to-r from-emerald-800 via-teal-700 to-amber-700 dark:from-emerald-300 dark:via-teal-200 dark:to-amber-300 bg-clip-text text-transparent">
                      {siteSettings.orgName} ({siteSettings.orgShortName})
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Kelembagaan Resmi Petambak Pesisir Timur Sumatera Selatan
                    </p>
                  </div>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.45rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.08] text-balance mb-6">
                  Menyatukan Aspirasi &amp; Kemandirian{' '}
                  <span className="luxury-shimmer-text">Ribuan Petambak Udang</span> Mandira.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mb-8">
                  {siteSettings.tagline} Pusat transparansi pembangunan infrastruktur kawasan,
                  pendampingan kesehatan udang vannamei, serta penguatan ekonomi bersama di pesisir
                  timur Sumatera Selatan.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => handleJump('aspirasi', 'section-aspirasi')}
                  className="luxury-sheen-btn inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 text-white text-sm font-semibold ring-1 ring-amber-300/60 shadow-lg shadow-teal-900/15 dark:shadow-teal-950/50 transition-transform duration-150 active:scale-[0.98] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Sampaikan Aspirasi Petambak</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => handleJump('program', 'section-program')}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-amber-400/60 dark:border-amber-400/40 bg-white/90 dark:bg-[#0D1F26]/90 backdrop-blur-xs hover:border-emerald-500 dark:hover:border-teal-400 text-slate-800 dark:text-slate-100 text-sm font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Jelajahi 5 Bidang Kerja</span>
                </button>
              </div>
            </motion.div>

            {/* Right Visual Carrier inside Iridescent Jewel Frame */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-5 p-[2px] rounded-2xl bg-gradient-to-br from-emerald-500 via-amber-400 to-cyan-500 shadow-xl shadow-teal-900/15 dark:shadow-black/50 min-h-[320px] lg:min-h-[440px] flex"
            >
              <div className="group relative w-full h-full rounded-[14px] overflow-hidden bg-slate-900">
                <ResilientImage
                  src={resolveImageAsset('hero_tambak')}
                  alt="Kawasan Pertambakan Udang Desa Bumi Pratama Mandira"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                {/* Official Crest Medallion on Top-Right */}
                <div className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/95 backdrop-blur-xs shadow-md ring-1 ring-amber-400/60">
                  <img
                    src={P2UWM_LOGO_URL}
                    alt="Emblem P2UWM"
                    referrerPolicy="no-referrer"
                    className="h-9 w-11 object-contain"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent flex flex-col justify-end p-6">
                  <p className="text-xs font-semibold bg-gradient-to-r from-emerald-300 via-teal-200 to-amber-300 bg-clip-text text-transparent mb-1">
                    Kawasan Pertambakan Terpadu · Sungai Menang, OKI
                  </p>
                  <p className="text-base sm:text-lg font-bold text-white leading-snug">
                    Sinergi Pengelolaan Kanal Pasok Air Laut &amp; Biosekuriti Berkelanjutan
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Full-Width 4-Column Jewel-Accented Quantitative KPI Strip Below Hero Split */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-8 border-t border-emerald-900/10 dark:border-teal-400/15">
            <SpotlightCard className="relative overflow-hidden p-5 rounded-2xl bg-white/90 dark:bg-[#0B1D24]/90 backdrop-blur-xs border border-emerald-200/80 dark:border-emerald-800/50 hover:border-emerald-500 transition-colors">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
              <div className="relative z-10">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums bg-gradient-to-r from-emerald-700 to-teal-600 dark:from-emerald-300 dark:to-teal-300 bg-clip-text text-transparent">
                  {siteSettings.totalMembers.toLocaleString('id-ID')}+
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  Petambak Anggota Aktif
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Terkonsolidasi di Bumi Pratama Mandira
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard className="relative overflow-hidden p-5 rounded-2xl bg-white/90 dark:bg-[#0B1D24]/90 backdrop-blur-xs border border-cyan-200/80 dark:border-cyan-800/50 hover:border-cyan-500 transition-colors">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-teal-500" />
              <div className="relative z-10">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums bg-gradient-to-r from-cyan-700 to-sky-600 dark:from-cyan-300 dark:to-sky-300 bg-clip-text text-transparent">
                  {siteSettings.totalPonds.toLocaleString('id-ID')}
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  Petak Tambak Produktif
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Budidaya udang vannamei intensif &amp; semi-intensif
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard className="relative overflow-hidden p-5 rounded-2xl bg-white/90 dark:bg-[#0B1D24]/90 backdrop-blur-xs border border-amber-200/90 dark:border-amber-800/50 hover:border-amber-500 transition-colors">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500" />
              <div className="relative z-10">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-300 dark:to-orange-300 bg-clip-text text-transparent">
                  {siteSettings.activeBlocks} Blok
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  Jaringan Saluran Kawasan
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Termasuk revitalisasi Main Inlet Blok 4
                </div>
              </div>
            </SpotlightCard>

            <SpotlightCard className="relative overflow-hidden p-5 rounded-2xl bg-white/90 dark:bg-[#0B1D24]/90 backdrop-blur-xs border border-indigo-200/80 dark:border-indigo-800/50 hover:border-indigo-500 transition-colors">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 via-cyan-500 to-emerald-500" />
              <div className="relative z-10">
                <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums bg-gradient-to-r from-indigo-700 to-cyan-600 dark:from-indigo-300 dark:to-cyan-300 bg-clip-text text-transparent">
                  5 Bidang
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                  Program Kerja Strategis
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sosial, advokasi, ekonomi, teknis &amp; infrastruktur
                </div>
              </div>
            </SpotlightCard>
          </div>
        </div>
      </section>

      {/* =====================================================================
          2. PROFIL, SEJARAH, VISI-MISI & SAMBUTAN KETUA (Hairu Badarudin)
      ====================================================================== */}
      <section
        id="section-profil"
        className="py-16 lg:py-24 bg-white dark:bg-[#08161C] luxury-aurora-section border-t border-slate-200/70 dark:border-teal-900/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Sambutan Ketua */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center pb-16 border-b border-slate-200 dark:border-teal-900/40">
            <div className="lg:col-span-4">
              <div className="p-1.5 max-w-sm mx-auto rounded-3xl bg-gradient-to-br from-emerald-500 via-amber-400 to-cyan-500 shadow-xl shadow-teal-900/10 dark:shadow-black/40">
                <div className="aspect-square rounded-[20px] overflow-hidden bg-slate-100 dark:bg-[#0D1F26]">
                  <ResilientImage
                    src={resolveImageAsset('ketua_portrait')}
                    alt={`${siteSettings.chairmanName} - ${siteSettings.chairmanTitle}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              <p className="text-xs font-bold bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600 dark:from-emerald-300 dark:via-teal-300 dark:to-amber-300 bg-clip-text text-transparent mb-2">
                Sambutan Kepemimpinan · Pengurus Pusat P2UWM
              </p>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight text-balance mb-6">
                Merawat Persatuan Petambak, Memperkuat Infrastruktur Demi Panen Berkelanjutan
              </h2>
              <div className="p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/50 to-amber-50/70 dark:from-[#0C222B] dark:via-[#0D1F26] dark:to-[#181E17] border border-amber-300/60 dark:border-amber-500/30 mb-6">
                <p className="text-base sm:text-lg text-slate-800 dark:text-slate-100 leading-relaxed italic">
                  &ldquo;{siteSettings.chairmanQuote}&rdquo;
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-bold text-slate-900 dark:text-white">
                  {siteSettings.chairmanName}
                </span>
                <span aria-hidden="true" className="text-amber-500">
                  ·
                </span>
                <span className="text-emerald-700 dark:text-amber-300 font-semibold">
                  {siteSettings.chairmanTitle}
                </span>
                <span aria-hidden="true" className="text-amber-500">
                  ·
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  Desa Bumi Pratama Mandira, OKI
                </span>
              </div>
            </div>
          </div>

          {/* Sejarah, Visi & Misi */}
          <div className="mt-16 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            <div className="lg:col-span-5">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">
                01. Sejarah &amp; Mandat Kelembagaan
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-balance mb-4">
                Rumah Besar Perjuangan Petambak Sungai Menang
              </h3>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                {siteSettings.historyText}
              </p>

              {/* Luxury Jewel Monument Card for Vision */}
              <div className="relative overflow-hidden p-6 sm:p-7 rounded-2xl bg-gradient-to-br from-emerald-900 via-teal-900 to-[#061520] text-white border border-amber-400/40 shadow-lg">
                <div className="pointer-events-none absolute -right-12 -top-12 w-40 h-40 rounded-full bg-amber-400/20 blur-2xl" />
                <div className="relative z-10 flex items-center gap-3 mb-3">
                  <img
                    src={P2UWM_LOGO_URL}
                    alt="Lambang P2UWM"
                    referrerPolicy="no-referrer"
                    className="h-8 w-10 rounded-md bg-white p-0.5 object-contain shrink-0"
                  />
                  <span className="text-xs font-bold text-amber-300 tracking-wide">
                    Visi Utama P2UWM
                  </span>
                </div>
                <p className="relative z-10 text-base font-medium leading-relaxed text-emerald-50">
                  {siteSettings.vision}
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                02. Misi Konsolidasi &amp; Penguatan Ekosistem
              </p>
              <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-balance mb-6">
                Lima Pilar Misi Organisasi P2UWM
              </h3>

              <div className="divide-y divide-slate-200 dark:divide-teal-900/50 border-t border-b border-slate-200 dark:border-teal-900/50">
                {siteSettings.missionList.map((mission, idx) => (
                  <div
                    key={idx}
                    className="py-4 px-3 -mx-3 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-teal-950/30 transition-colors flex items-start gap-4"
                  >
                    <span className="font-mono text-sm font-extrabold bg-gradient-to-br from-emerald-600 via-teal-600 to-amber-600 dark:from-emerald-400 dark:to-amber-300 bg-clip-text text-transparent tabular-nums pt-0.5 shrink-0">
                      0{idx + 1}.
                    </span>
                    <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                      {mission}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* =================================================================
              STRUKTUR PENGURUS PUSAT, BADAN PENGAWAS & DEMISIONER P2UWM
          ================================================================== */}
          <div className="mt-20 pt-16 border-t border-slate-200 dark:border-teal-900/40">
            <div className="flex flex-col gap-6 mb-10">
              {/* Header Title + Direct Add/Edit Action Controls */}
              <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
                <div>
                  <p className="text-xs font-bold bg-gradient-to-r from-emerald-700 via-teal-600 to-amber-600 dark:from-emerald-300 dark:via-teal-300 dark:to-amber-300 bg-clip-text text-transparent mb-2">
                    Struktur Kelembagaan, Badan Pengawas &amp; Demisioner
                  </p>
                  <h3 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                    Jajaran Pengurus Pusat, Badan Pengawas &amp; Demisioner P2UWM
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 max-w-2xl">
                    Sinergi kepemimpinan pengurus aktif, fungsi pengawasan independen Badan Pengawas,
                    serta penghormatan atas pengabdian Demisioner Ketua dan Wakil Ketua terdahulu.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowOrgChart((v) => !v)}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-teal-800 bg-white dark:bg-[#0D1F26] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-emerald-500 transition-colors cursor-pointer"
                  >
                    <Network className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                    <span>{showOrgChart ? 'Sembunyikan Bagan' : 'Tampilkan Bagan Struktur'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManageBoardMode((v) => !v)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer ${
                      manageBoardMode || isAdmin
                        ? 'border-amber-400/80 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200'
                        : 'border-slate-200 dark:border-teal-800 bg-white dark:bg-[#0D1F26] text-slate-700 dark:text-slate-200 hover:border-amber-400'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{manageBoardMode ? 'Selesai Kelola' : 'Edit Struktur'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => openAddBoardModal()}
                    className="luxury-sheen-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-xs font-semibold ring-1 ring-amber-300/50 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Struktur / Pengurus</span>
                  </button>
                </div>
              </div>

              {/* Interactive Division Segmented Filter — Zero Horizontal Scroll (flex-wrap) */}
              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-[#0D1F26] rounded-xl border border-slate-200/80 dark:border-teal-900/50 w-full">
                {BOARD_DIVISIONS.map((div) => (
                  <button
                    key={div}
                    type="button"
                    onClick={() => setBoardFilter(div)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      boardFilter === div
                        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-teal-950/50'
                    }`}
                  >
                    {div}
                  </button>
                ))}
              </div>
            </div>

            {boardToast && (
              <div className="mb-8 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300/70 dark:border-emerald-700/60 text-xs sm:text-sm font-medium text-emerald-800 dark:text-emerald-200 flex items-center justify-between gap-4">
                <span>{boardToast}</span>
                <button
                  type="button"
                  onClick={() => setBoardToast(null)}
                  className="text-emerald-700 dark:text-emerald-300 hover:underline text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            )}

            {/* ===============================================================
                BAGAN HIRARKI STRUKTUR ORGANISASI P2UWM (RESPONSIVE, NO SCROLL)
            ================================================================ */}
            {showOrgChart && boardFilter === 'Semua' && (
              <div className="mb-14 p-5 sm:p-8 rounded-2xl bg-slate-50/90 dark:bg-[#0B1B22] border border-slate-200/90 dark:border-teal-900/60 luxury-grid-pattern">
                <div className="text-center max-w-2xl mx-auto mb-8">
                  <p className="text-xs font-bold text-emerald-700 dark:text-amber-300 mb-1">
                    Bagan Struktur Kelembagaan Resmi
                  </p>
                  <h4 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                    Tata Kelola Organisasi {siteSettings.orgShortName} Bumi Pratama Mandira
                  </h4>
                </div>

                {/* Tier 1: Dewan Kehormatan (Demisioner) & Badan Pengawas */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-5xl mx-auto">
                  {/* Demisioner Node — Grouped per Periode */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0D1F26] border border-indigo-200/90 dark:border-cyan-800/60 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-teal-900/50">
                      <div>
                        <p className="text-xs font-bold text-indigo-700 dark:text-cyan-300">
                          Dewan Kehormatan · Demisioner per Periode
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Setiap Periode: Ketua &amp; Wakil Ketua Terdahulu
                        </p>
                      </div>
                      {(isAdmin || manageBoardMode) && (
                        <button
                          type="button"
                          onClick={openAddDemisionerPeriodModal}
                          className="text-xs font-semibold text-indigo-700 dark:text-cyan-300 hover:underline cursor-pointer"
                        >
                          + Periode
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      {demisionerPeriodGroups.map((grp) => (
                        <div key={grp.periodKey} className="space-y-1.5">
                          <div className="text-[11px] font-mono font-bold text-indigo-700 dark:text-amber-300">
                            {grp.periodLabel}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {[grp.ketua, grp.wakil].filter(Boolean).map((m) => {
                              const item = m!;
                              const meta = parseDemisionerMeta(item.position);
                              return (
                                <div
                                  key={item.id}
                                  onClick={() => {
                                    if (isAdmin || manageBoardMode) openEditBoardModal(item);
                                  }}
                                  className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200/70 dark:border-teal-900/40 ${
                                    isAdmin || manageBoardMode
                                      ? 'cursor-pointer hover:border-indigo-400'
                                      : ''
                                  }`}
                                >
                                  <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 border border-indigo-200 dark:border-cyan-800 bg-slate-200 dark:bg-slate-800">
                                    <ResilientImage
                                      src={resolveImageAsset(item.photoKey)}
                                      alt={item.name}
                                      className="w-full h-full object-cover object-top"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                      {item.name}
                                    </div>
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                      {meta.isWakil ? 'Wakil Ketua' : 'Ketua'}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Badan Pengawas Node */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0D1F26] border border-amber-300/80 dark:border-amber-600/40 shadow-2xs">
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-teal-900/50">
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          Badan Pengawas Organisasi
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Pengawasan Independen AD/ART &amp; Audit Kas
                        </p>
                      </div>
                      {(isAdmin || manageBoardMode) && (
                        <button
                          type="button"
                          onClick={() => openAddBoardModal('Badan Pengawas')}
                          className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                        >
                          + Tambah
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {allPublishedBoard
                        .filter((m) => m.division === 'Badan Pengawas')
                        .slice(0, 4)
                        .map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (isAdmin || manageBoardMode) openEditBoardModal(m);
                            }}
                            className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200/70 dark:border-teal-900/40 ${
                              isAdmin || manageBoardMode
                                ? 'cursor-pointer hover:border-amber-400'
                                : ''
                            }`}
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-amber-300 dark:border-amber-700 bg-slate-200 dark:bg-slate-800">
                              <ResilientImage
                                src={resolveImageAsset(m.photoKey)}
                                alt={m.name}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {m.name}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {m.position}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Vertical Connector */}
                <div className="w-px h-6 bg-gradient-to-b from-amber-400 to-emerald-500 mx-auto" />

                {/* Tier 2: Pucuk Pimpinan Eksekutif (Ketua & Wakil Ketua) */}
                <div className="max-w-3xl mx-auto p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-teal-900 to-[#08222B] text-white border border-amber-400/50 shadow-sm">
                  <div className="text-center text-xs font-semibold text-amber-300 mb-3">
                    Pimpinan Eksekutif Pengurus Pusat P2UWM
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {allPublishedBoard
                      .filter((m) => m.division === 'Inti')
                      .slice(0, 2)
                      .map((m) => (
                        <div
                          key={m.id}
                          onClick={() => {
                            if (isAdmin || manageBoardMode) openEditBoardModal(m);
                          }}
                          className={`flex items-center gap-3.5 p-3 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 ${
                            isAdmin || manageBoardMode
                              ? 'cursor-pointer hover:border-amber-300'
                              : ''
                          }`}
                        >
                          <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 ring-2 ring-amber-400/80 bg-slate-800">
                            <ResilientImage
                              src={resolveImageAsset(m.photoKey)}
                              alt={m.name}
                              className="w-full h-full object-cover object-top"
                            />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs text-amber-300 font-semibold truncate">
                              {m.position}
                            </div>
                            <div className="text-base font-bold text-white truncate">
                              {m.name}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Vertical Connector */}
                <div className="w-px h-6 bg-gradient-to-b from-emerald-500 to-teal-500 mx-auto" />

                {/* Tier 3: Sekretariat & Bendahara Pusat */}
                {allPublishedBoard.filter((m) => m.division === 'Inti').length > 2 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-4xl mx-auto">
                      {allPublishedBoard
                        .filter((m) => m.division === 'Inti')
                        .slice(2)
                        .map((m) => (
                          <div
                            key={m.id}
                            onClick={() => {
                              if (isAdmin || manageBoardMode) openEditBoardModal(m);
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-800/70 ${
                              isAdmin || manageBoardMode
                                ? 'cursor-pointer hover:border-emerald-500'
                                : ''
                            }`}
                          >
                            <div className="w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-emerald-500/40 bg-slate-100 dark:bg-slate-800">
                              <ResilientImage
                                src={resolveImageAsset(m.photoKey)}
                                alt={m.name}
                                className="w-full h-full object-cover object-top"
                              />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[11px] font-semibold text-emerald-700 dark:text-teal-300 truncate">
                                {m.position}
                              </div>
                              <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {m.name}
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="w-px h-6 bg-gradient-to-b from-teal-500 to-cyan-500 mx-auto" />
                  </>
                )}

                {/* Tier 4: 5 Bidang Kerja Operasional Kawasan */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  {(
                    [
                      'Keanggotaan & Sosial',
                      'Humas & Advokasi',
                      'Ekonomi & Usaha',
                      'Teknis Budidaya',
                      'Infrastruktur Kawasan',
                    ] as BoardDivision[]
                  ).map((divName, idx) => {
                    const divMembers = allPublishedBoard.filter((m) => m.division === divName);
                    return (
                      <button
                        key={divName}
                        type="button"
                        onClick={() => setBoardFilter(divName)}
                        className="text-left p-3.5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 hover:border-emerald-500 dark:hover:border-teal-400 transition-colors cursor-pointer flex flex-col justify-between"
                      >
                        <div>
                          <div className="text-[11px] font-mono font-bold text-emerald-700 dark:text-amber-300">
                            BIDANG 0{idx + 1}
                          </div>
                          <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                            {divName}
                          </div>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-teal-900/40">
                          {divMembers.length > 0
                            ? `${divMembers[0].name}`
                            : 'Klik untuk lihat / kelola bidang'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Helper Renderer for Uniform Portrait Cards */}
            {(() => {
              const renderMemberCard = (member: BoardMember, index: number) => {
                const isPengawas = member.division === 'Badan Pengawas';
                const isDemisioner = member.division === 'Demisioner';
                const topBarClass = isPengawas
                  ? 'from-amber-400 via-yellow-500 to-emerald-500'
                  : isDemisioner
                    ? 'from-indigo-500 via-cyan-400 to-amber-400'
                    : 'from-emerald-500 via-teal-400 to-cyan-500';
                const surfaceClass = isPengawas
                  ? 'bg-gradient-to-br from-amber-50/60 via-white to-emerald-50/30 dark:from-[#171B15] dark:via-[#0D1F26] dark:to-[#0B2027] border-amber-300/70 dark:border-amber-500/35 hover:border-amber-500'
                  : isDemisioner
                    ? 'bg-gradient-to-br from-indigo-50/50 via-white to-amber-50/30 dark:from-[#101829] dark:via-[#0D1F26] dark:to-[#181B16] border-indigo-200/80 dark:border-cyan-800/50 hover:border-amber-400/80'
                    : 'bg-white dark:bg-[#0D1F26] border-slate-200/90 dark:border-teal-900/60 hover:border-emerald-500/80';
                const kickerColor = isPengawas
                  ? 'text-amber-700 dark:text-amber-300'
                  : isDemisioner
                    ? 'text-indigo-700 dark:text-amber-300'
                    : 'text-emerald-700 dark:text-teal-300';
                const isLogoFallback = member.photoKey === 'logo_p2uwm';

                return (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.12 }}
                    transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2) }}
                  >
                    <SpotlightCard
                      className={`h-full relative overflow-hidden group rounded-2xl border ${surfaceClass} transition-colors flex flex-col shadow-2xs`}
                    >
                      <div className={`h-1 w-full bg-gradient-to-r ${topBarClass} shrink-0`} />

                      {/* Prominent Portrait Frame */}
                      <div className="aspect-[4/3] w-full overflow-hidden relative bg-slate-100 dark:bg-slate-900 shrink-0">
                        <ResilientImage
                          src={resolveImageAsset(member.photoKey)}
                          alt={`Potret ${member.name} - ${member.position}`}
                          className={`w-full h-full ${
                            isLogoFallback
                              ? 'object-contain p-8 bg-white'
                              : 'object-cover object-top'
                          } group-hover:scale-105 transition-transform duration-300`}
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/55 via-slate-950/15 to-transparent" />
                      </div>

                      {/* Card Content */}
                      <div className="relative z-10 p-5 sm:p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <div className={`text-xs font-semibold ${kickerColor}`}>
                            {member.position} · {member.division}
                          </div>
                          <h5 className="text-lg font-bold text-slate-900 dark:text-white leading-snug mt-1">
                            {member.name}
                          </h5>
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5">
                            {member.bio}
                          </p>
                        </div>

                        {(isAdmin || manageBoardMode) && (
                          <div className="mt-5 pt-3.5 border-t border-slate-200/80 dark:border-teal-900/50 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => openEditBoardModal(member)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-[#071318] hover:bg-emerald-50 dark:hover:bg-teal-950/70 text-xs font-semibold text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-teal-800 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-emerald-600 dark:text-teal-400" />
                              <span>Edit Data &amp; Foto</span>
                            </button>

                            {confirmDeleteId === member.id ? (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleConfirmDeleteMember(member)}
                                  className="px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold cursor-pointer"
                                >
                                  Ya, Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-teal-800 text-xs text-slate-600 dark:text-slate-300 cursor-pointer"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(member.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </SpotlightCard>
                  </motion.div>
                );
              };

              const renderDemisionerPeriods = () => {
                if (demisionerPeriodGroups.length === 0) {
                  return (
                    <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                      <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                        Belum ada data periode kepemimpinan Demisioner.
                      </p>
                      <button
                        type="button"
                        onClick={openAddDemisionerPeriodModal}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Tambah Periode Demisioner (Ketua &amp; Wakil)</span>
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-10">
                    {demisionerPeriodGroups.map((group, pIdx) => (
                      <div
                        key={group.periodKey}
                        className="pt-2 first:pt-0"
                      >
                        {/* Dedicated Period Header Strip */}
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-slate-200 dark:border-teal-900/60">
                          <div className="flex flex-wrap items-baseline gap-2.5">
                            <span className="font-mono text-xs font-bold text-indigo-700 dark:text-amber-300">
                              PERIODE 0{pIdx + 1}
                            </span>
                            <span aria-hidden="true" className="text-slate-300 dark:text-teal-800">
                              ·
                            </span>
                            <h5 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                              {group.periodLabel}
                            </h5>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            Pasangan Kepemimpinan Ketua &amp; Wakil Ketua
                          </span>
                        </div>

                        {/* Strict 2-Column Pair per Period: Ketua (Left) & Wakil Ketua (Right) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {group.ketua ? (
                            renderMemberCard(group.ketua, 0)
                          ) : (
                            <div className="rounded-2xl border border-dashed border-indigo-300 dark:border-cyan-800/70 bg-slate-50/60 dark:bg-[#0B1920] p-8 flex flex-col items-center justify-center text-center min-h-[260px]">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Kursi Ketua Demisioner Belum Terisi
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                {group.periodLabel}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  openAddDemisionerRoleInPeriod(
                                    group.periodLabel,
                                    'Ketua Demisioner'
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Ketua Periode Ini</span>
                              </button>
                            </div>
                          )}

                          {group.wakil ? (
                            renderMemberCard(group.wakil, 1)
                          ) : (
                            <div className="rounded-2xl border border-dashed border-indigo-300 dark:border-cyan-800/70 bg-slate-50/60 dark:bg-[#0B1920] p-8 flex flex-col items-center justify-center text-center min-h-[260px]">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                                Kursi Wakil Ketua Demisioner Belum Terisi
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                                {group.periodLabel}
                              </p>
                              <button
                                type="button"
                                onClick={() =>
                                  openAddDemisionerRoleInPeriod(
                                    group.periodLabel,
                                    'Wakil Ketua Demisioner'
                                  )
                                }
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tambah Wakil Ketua Periode Ini</span>
                              </button>
                            </div>
                          )}

                          {group.extras.map((extra, exIdx) => renderMemberCard(extra, exIdx + 2))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              };

              if (boardFilter === 'Demisioner') {
                return (
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-4 border-b border-indigo-500/20 dark:border-cyan-400/20">
                      <div>
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                          Arsip Kepemimpinan Demisioner per Periode ({demisionerPeriodGroups.length}{' '}
                          Periode)
                        </h4>
                        <p className="text-xs text-indigo-700 dark:text-cyan-300 font-semibold mt-0.5">
                          Dipisahkan per masa bakti · Setiap periode terdiri dari Ketua dan Wakil Ketua
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openAddDemisionerPeriodModal}
                        className="luxury-sheen-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-teal-600 to-cyan-600 hover:from-indigo-700 hover:to-cyan-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Periode Baru (Ketua &amp; Wakil)</span>
                      </button>
                    </div>
                    {renderDemisionerByPeriodsWrapper()}
                  </div>
                );
              }

              function renderDemisionerByPeriodsWrapper() {
                return renderDemisionerPeriods();
              }

              if (boardFilter !== 'Semua') {
                return publishedBoard.length === 0 ? (
                  <div className="p-10 text-center rounded-2xl bg-slate-50 dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
                      Belum ada data anggota pada kelompok <strong>{boardFilter}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => openAddBoardModal(boardFilter)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Tambah Anggota {boardFilter}</span>
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {publishedBoard.map((m, idx) => renderMemberCard(m, idx))}
                  </div>
                );
              }

              return (
                <div className="space-y-16">
                  {/* 1. Jajaran Pengurus Pusat & Bidang Aktif */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-emerald-900/10 dark:border-teal-400/15">
                      <div>
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                          01. Pengurus Pusat &amp; Koordinator Bidang Aktif
                        </h4>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 font-semibold mt-0.5">
                          Pelaksana Operasional Kawasan Bumi Pratama Mandira
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddBoardModal('Inti')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Pengurus</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {publishedBoard
                        .filter(
                          (m) => m.division !== 'Badan Pengawas' && m.division !== 'Demisioner'
                        )
                        .map((member, index) => renderMemberCard(member, index))}
                    </div>
                  </div>

                  {/* 2. Badan Pengawas P2UWM */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-amber-500/25 dark:border-amber-400/20">
                      <div>
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                          02. Badan Pengawas Organisasi P2UWM
                        </h4>
                        <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mt-0.5">
                          Pengawasan Independen AD/ART · Audit Kas Swadaya &amp; Infrastruktur
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => openAddBoardModal('Badan Pengawas')}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Badan Pengawas</span>
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {publishedBoard
                        .filter((m) => m.division === 'Badan Pengawas')
                        .map((member, index) => renderMemberCard(member, index))}
                    </div>
                  </div>

                  {/* 3. Demisioner Ketua & Wakil Ketua Terdahulu — Dipisahkan per Periode */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-8 pb-3 border-b border-indigo-500/20 dark:border-cyan-400/20">
                      <div>
                        <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                          03. Demisioner Ketua &amp; Wakil Ketua per Periode
                        </h4>
                        <p className="text-xs text-indigo-700 dark:text-cyan-300 font-semibold mt-0.5">
                          Dewan Kehormatan · Setiap periode menampilkan Ketua dan Wakil Ketua
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openAddDemisionerPeriodModal}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-cyan-300 hover:underline cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Periode Demisioner</span>
                      </button>
                    </div>
                    {renderDemisionerPeriods()}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* =====================================================================
          3. PROGRAM KERJA (5 BIDANG UTAMA — RICH MULTI-COLOR JEWEL BENTO GRID)
      ====================================================================== */}
      <section
        id="section-program"
        className="py-16 lg:py-24 luxury-aurora-hero border-t border-slate-200/70 dark:border-teal-900/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">
              Lima Bidang Kerja Organisasi
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance mb-4">
              Program Kerja Terpadu{' '}
              <span className="luxury-shimmer-text">P2UWM Mandira</span> yang Sedang Berjalan
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              Setiap bidang kerja dirancang untuk menjawab kebutuhan hulu hingga hilir ribuan
              petambak di Bumi Pratama Mandira. Klik salah satu bidang untuk melihat rincian capaian
              dan sasaran teknisnya.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {publishedPrograms.map((prog, idx) => {
              const isWide = idx === 0 || idx === 4;
              const jewel = programJewelThemes[idx % programJewelThemes.length];
              return (
                <motion.div
                  key={prog.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18 }}
                  className={isWide ? 'lg:col-span-2' : 'lg:col-span-1'}
                >
                  <SpotlightCard
                    onClick={() => setSelectedProgram(prog)}
                    className={`h-full group relative overflow-hidden rounded-2xl bg-white/95 dark:bg-[#0C1E26]/95 backdrop-blur-xs border border-slate-200 dark:border-teal-900/60 ${jewel.hoverBorder} transition-colors p-6 sm:p-8 flex flex-col justify-between cursor-pointer shadow-xs`}
                  >
                    {/* Jewel Top Chromatic Bar */}
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${jewel.topBar}`}
                    />
                    <div
                      className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${jewel.wash} opacity-85 group-hover:opacity-100 transition-opacity`}
                    />

                    <div className="relative z-10">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <span className={`font-mono font-bold ${jewel.codeColor}`}>
                          0{idx + 1}. {prog.code}
                        </span>
                        <span className="font-mono tabular-nums font-semibold text-slate-700 dark:text-slate-200">
                          Realisasi {prog.progressPercent}% · {prog.targetMetric}
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-3 group-hover:text-emerald-700 dark:group-hover:text-amber-300 transition-colors">
                        {prog.title}
                      </h3>

                      <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                        {prog.summary}
                      </p>

                      <div className="space-y-2 mb-6">
                        {prog.highlights.slice(0, 3).map((item, hIdx) => (
                          <div
                            key={hIdx}
                            className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="relative z-10 pt-4 border-t border-slate-200/70 dark:border-teal-900/50 flex items-center justify-between gap-4">
                      <div className="flex-1 max-w-xs">
                        <div className="h-2.5 w-full rounded-full bg-slate-200/90 dark:bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${jewel.barFill}`}
                            style={{ width: `${Math.min(100, Math.max(0, prog.progressPercent))}%` }}
                          />
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-amber-300 whitespace-nowrap shrink-0">
                        <span>Rincian Bidang</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </SpotlightCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================================
          4. GALERI FOTO DOKUMENTASI KAWASAN (TERMASUK GORONG-GORONG BLOK 4)
      ====================================================================== */}
      <section
        id="section-galeri"
        className="py-16 lg:py-24 bg-white dark:bg-[#08161C] luxury-aurora-section border-t border-slate-200/70 dark:border-teal-900/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-bold bg-gradient-to-r from-emerald-700 to-cyan-600 dark:from-emerald-300 dark:to-cyan-300 bg-clip-text text-transparent mb-2">
                Dokumentasi Visual Lapangan
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance mb-3">
                Galeri Kegiatan Fisik &amp; Operasional Kawasan Pertambakan
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                Rekam jejak pembangunan swadaya gorong-gorong Main Inlet Blok 4, uji kesehatan udang
                harian, hingga musyawarah anggota.
              </p>
            </div>

            {/* Interactive Category Filter Tabs — Zero Horizontal Scroll */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-[#0D1F26] rounded-xl border border-slate-200/80 dark:border-teal-900/50">
              {GALLERY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setGalleryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    galleryFilter === cat
                      ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {filteredGallery.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-slate-200 dark:border-teal-900/50 bg-slate-50 dark:bg-[#0D1F26]">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Belum ada dokumentasi foto pada kategori ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredGallery.map((item, idx) => (
                <motion.div
                  key={item.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  <SpotlightCard
                    onClick={() => setLightboxIndex(idx)}
                    className="h-full group rounded-2xl overflow-hidden bg-slate-50/95 dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 hover:border-amber-400/80 dark:hover:border-amber-400/60 transition-colors cursor-pointer flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden relative">
                      <ResilientImage
                        src={resolveImageAsset(item.imageUrl)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                        <span className="text-xs font-semibold text-amber-300">
                          Klik untuk perbesar dokumentasi
                        </span>
                      </div>
                    </div>
                    <div className="relative z-10 p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-2">
                          <span className="text-emerald-700 dark:text-amber-300 font-semibold">
                            {item.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{item.eventDate}</span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-emerald-700 dark:group-hover:text-teal-300 transition-colors">
                          {item.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                          {item.caption}
                        </p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 pt-3 border-t border-slate-200/70 dark:border-teal-900/40 truncate">
                        Lokasi: {item.locationBlock}
                      </p>
                    </div>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          5. BERITA & KEGIATAN (PUSAT INFORMASI & TRANSPARANSI)
      ====================================================================== */}
      <section
        id="section-berita"
        className="py-16 lg:py-24 luxury-aurora-hero border-t border-slate-200/70 dark:border-teal-900/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
            <div className="max-w-2xl">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-2">
                Pusat Informasi &amp; Transparansi P2UWM
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance">
                Berita Terbaru, Capaian Organisasi &amp; Pengumuman Anggota
              </h2>
            </div>

            {/* Search Input */}
            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-emerald-600 dark:text-teal-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={articleSearch}
                onChange={(e) => setArticleSearch(e.target.value)}
                placeholder="Cari berita atau pengumuman..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* Interactive Category Filter — Zero Horizontal Scroll */}
          <div className="flex flex-wrap items-center gap-1.5 mb-8">
            {ARTICLE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setArticleFilter(cat)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  articleFilter === cat
                    ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50 text-slate-600 dark:text-slate-300 hover:border-amber-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {filteredArticles.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Tidak ditemukan artikel berita yang cocok dengan pencarian Anda.
              </p>
              <button
                type="button"
                onClick={() => {
                  setArticleFilter('Semua');
                  setArticleSearch('');
                }}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold cursor-pointer"
              >
                Tampilkan Semua Berita
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Featured Lead Article */}
              <SpotlightCard
                onClick={() => setSelectedArticle(filteredArticles[0])}
                className="lg:col-span-7 group rounded-2xl overflow-hidden bg-white/95 dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 hover:border-amber-400/80 transition-colors cursor-pointer flex flex-col shadow-xs"
              >
                <div className="aspect-[16/9] w-full overflow-hidden relative">
                  <ResilientImage
                    src={resolveImageAsset(filteredArticles[0].imageUrl)}
                    alt={filteredArticles[0].title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="relative z-10 p-6 sm:p-8 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-3">
                      <span className="font-bold text-emerald-700 dark:text-amber-300">
                        {filteredArticles[0].category}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{filteredArticles[0].publishDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">
                        {filteredArticles[0].readMinutes} mnt baca
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight mb-3 group-hover:text-emerald-700 dark:group-hover:text-teal-300 transition-colors">
                      {filteredArticles[0].title}
                    </h3>
                    <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                      {filteredArticles[0].excerpt}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200/70 dark:border-teal-900/40 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Oleh {filteredArticles[0].authorName}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-amber-300">
                      <span>Baca Selengkapnya</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </div>
              </SpotlightCard>

              {/* Secondary Articles Column */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                {filteredArticles.slice(1).map((art) => (
                  <SpotlightCard
                    key={art.id}
                    onClick={() => setSelectedArticle(art)}
                    className="group p-5 rounded-2xl bg-white/95 dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 hover:border-amber-400/80 transition-colors cursor-pointer flex gap-4 items-start"
                  >
                    <div className="relative z-10 w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-slate-200 dark:border-teal-900/50">
                      <ResilientImage
                        src={resolveImageAsset(art.imageUrl)}
                        alt={art.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="relative z-10 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span className="font-bold text-emerald-700 dark:text-amber-300">
                          {art.category}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{art.publishDate}</span>
                      </div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white leading-snug line-clamp-2 group-hover:text-emerald-700 dark:group-hover:text-teal-300 transition-colors mb-1.5">
                        {art.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                        {art.excerpt}
                      </p>
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================================
          6. KIRIM ASPIRASI INTERAKTIF + PROTEKSI KEAMANAN PII TINGKAT LANJUT
      ====================================================================== */}
      <section
        id="section-aspirasi"
        className="py-16 lg:py-24 bg-white dark:bg-[#08161C] luxury-aurora-section border-t border-slate-200/70 dark:border-teal-900/40"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
            {/* Left Info & Security Assurance */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold bg-gradient-to-r from-emerald-700 to-amber-600 dark:from-emerald-300 dark:to-amber-300 bg-clip-text text-transparent mb-2">
                  Kanal Partisipasi &amp; Suara Petambak
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight text-balance mb-4">
                  Kirim Aspirasi, Saran &amp; Laporan Lapangan
                </h2>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed mb-8">
                  Sampaikan usulan perbaikan saluran blok, kendala kualitas air, kebutuhan sarana
                  produksi, maupun masukan kelembagaan langsung kepada jajaran Pengurus Pusat P2UWM.
                </p>

                {/* Security Protection Highlight */}
                <div className="relative overflow-hidden p-6 rounded-2xl bg-gradient-to-br from-emerald-50/90 via-slate-50 to-amber-50/60 dark:from-[#0C2129] dark:via-[#0D1F26] dark:to-[#171E18] border border-amber-300/60 dark:border-teal-800/70 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                        Proteksi Data Sensitif Berbasis Brankas PII Terisolasi
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-amber-300 font-medium">
                        Zero-Trust Security Architecture · P2UWM
                      </p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Nomor telepon, alamat email, dan nomor kartu anggota Anda disimpan terpisah di
                    brankas data terenkripsi yang hanya dapat diakses oleh Anda sendiri dan Pengurus
                    Pusat berwenang, serta dilindungi aturan anti-pemalsuan identitas.
                  </p>
                </div>
              </div>

              {/* My Submitted Aspirations Live Tracker */}
              {currentUser && (
                <div className="mt-8 p-6 rounded-2xl bg-slate-50 dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Riwayat Aspirasi Saya ({myAspirations.length})
                    </h4>
                    <span className="text-xs text-emerald-700 dark:text-teal-400 font-semibold">
                      Sinkronisasi Langsung
                    </span>
                  </div>
                  {myAspirations.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Anda belum mengirimkan aspirasi melalui akun ini.
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                      {myAspirations.map((asp) => (
                        <div
                          key={asp.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50"
                        >
                          <div className="flex items-center justify-between gap-2 text-xs mb-1">
                            <span className="font-semibold text-emerald-700 dark:text-amber-300">
                              Status: {asp.status}
                            </span>
                            <span className="text-slate-400 font-mono tabular-nums">
                              {formatTimestamp(asp.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">
                            {asp.subject}
                          </p>
                          {asp.adminResponse && (
                            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 pt-2 border-t border-slate-100 dark:border-teal-900/40">
                              Tanggapan Pengurus: {asp.adminResponse}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Interactive Verified Form */}
            <div className="lg:col-span-7">
              <div className="relative overflow-hidden rounded-2xl bg-slate-50/95 dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 p-6 sm:p-8 shadow-sm">
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500" />
                {!currentUser ? (
                  <div className="py-8 text-center max-w-md mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600/20 to-amber-500/20 text-emerald-700 dark:text-amber-300 flex items-center justify-center mx-auto mb-4">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Login Khusus Akun Terdaftar P2UWM
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5">
                      Demi menjaga validitas suara petambak dan keamanan Brankas PII, sistem hanya
                      mengizinkan login bagi <strong>akun pengurus &amp; anggota yang telah terdaftar resmi</strong>{' '}
                      di Direktori Otorisasi P2UWM.
                    </p>

                    {authError && (
                      <div className="mb-5 p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-left text-xs text-red-700 dark:text-red-300 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <strong className="font-bold">Verifikasi Akun Ditolak</strong>
                          <button
                            type="button"
                            onClick={onClearAuthError}
                            className="text-red-600 dark:text-red-400 hover:underline cursor-pointer"
                          >
                            Tutup
                          </button>
                        </div>
                        <p className="leading-relaxed">{authError}</p>
                      </div>
                    )}

                    <button
                      type="button"
                      disabled={authChecking}
                      onClick={onLoginGoogle}
                      className="luxury-sheen-btn inline-flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 disabled:opacity-60 text-white text-sm font-semibold ring-1 ring-amber-300/50 transition-all cursor-pointer"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>
                        {authChecking
                          ? 'Memverifikasi Akun Terdaftar...'
                          : 'Masuk dengan Akun Terdaftar'}
                      </span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAspirationSubmit} className="space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200 dark:border-teal-900/50 text-xs">
                      <span className="text-slate-600 dark:text-slate-300">
                        Akun Terdaftar:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          {currentUser.email}
                        </strong>
                        {registeredAccount?.roleTitle ? ` · ${registeredAccount.roleTitle}` : ''}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Otorisasi Terverifikasi</span>
                        </span>
                        <button
                          type="button"
                          onClick={onLogout}
                          className="text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 font-semibold cursor-pointer"
                        >
                          Keluar
                        </button>
                      </div>
                    </div>

                    {aspError && (
                      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs sm:text-sm text-red-700 dark:text-red-300">
                        {aspError}
                      </div>
                    )}

                    {aspSuccess && (
                      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs sm:text-sm text-emerald-800 dark:text-emerald-300">
                        {aspSuccess}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                          Nama Lengkap Pengirim
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={100}
                          value={senderName}
                          onChange={(e) => setSenderName(e.target.value)}
                          placeholder="Contoh: H. Ahmad Fauzi"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                          Lokasi Blok / Jalur Tambak
                        </label>
                        <input
                          type="text"
                          required
                          maxLength={60}
                          value={pondBlock}
                          onChange={(e) => setPondBlock(e.target.value)}
                          placeholder="Contoh: Blok 4 Sub-Inlet Utara"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                          Nomor WhatsApp / Telepon (Brankas PII)
                        </label>
                        <input
                          type="tel"
                          required
                          maxLength={30}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="0812-xxxx-xxxx"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                          Kode Petak / ID Anggota (Opsional · PII)
                        </label>
                        <input
                          type="text"
                          maxLength={50}
                          value={memberIdCode}
                          onChange={(e) => setMemberIdCode(e.target.value)}
                          placeholder="Contoh: BPM-B04-118"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                          Bidang Aspirasi Tujuan
                        </label>
                        <select
                          value={aspCategory}
                          onChange={(e) => setAspCategory(e.target.value as AspirationCategory)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="Infrastruktur & Kanal">Infrastruktur &amp; Kanal</option>
                          <option value="Kesehatan Udang & Teknis">
                            Kesehatan Udang &amp; Teknis
                          </option>
                          <option value="Ekonomi & Koperasi">Ekonomi &amp; Koperasi</option>
                          <option value="Keanggotaan & Sosial">Keanggotaan &amp; Sosial</option>
                          <option value="Advokasi & Kebijakan">Advokasi &amp; Kebijakan</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                          Tingkat Urgensi Lapangan
                        </label>
                        <select
                          value={urgency}
                          onChange={(e) => setUrgency(e.target.value as AspirationUrgency)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="Normal">Normal (Saran &amp; Program)</option>
                          <option value="Penting">Penting (Perlu Koordinasi Blok)</option>
                          <option value="Mendesak">Mendesak (Kendala Pintu Air / Wabah)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5">
                        Pokok Aspirasi / Subjek Laporan
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={160}
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="Contoh: Usulan pengerukan endapan lumpur cabang saluran Blok 4 Selatan"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Uraian Lengkap Aspirasi &amp; Harapan Tindak Lanjut
                        </label>
                        <span className="text-xs font-mono tabular-nums text-slate-400">
                          {message.length}/2500
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        required
                        maxLength={2500}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Jelaskan kondisi lapangan, titik petak/saluran terkait, serta usulan solusi demi kemajuan bersama..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        disabled={aspSubmitting}
                        className="luxury-sheen-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:via-teal-700 hover:to-cyan-700 disabled:opacity-60 text-white text-sm font-semibold ring-1 ring-amber-300/50 transition-all cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        <span>{aspSubmitting ? 'Mengirim Aman...' : 'Kirim Aspirasi Resmi'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          7. LUXURY INSTITUTIONAL FOOTER WITH P2UWM EMBLEM
      ====================================================================== */}
      <footer className="relative bg-[#040D12] text-slate-300 pt-0 pb-14">
        <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-amber-400 via-cyan-400 to-teal-500" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-teal-900/40">
            <div className="md:col-span-5">
              <div className="flex items-center gap-3.5 mb-3">
                <div className="p-1 rounded-xl bg-white ring-1 ring-amber-400/70 shrink-0">
                  <img
                    src={P2UWM_LOGO_URL}
                    alt="Lambang Resmi P2UWM"
                    referrerPolicy="no-referrer"
                    className="h-10 w-12 object-contain"
                  />
                </div>
                <div className="text-xl font-extrabold bg-gradient-to-r from-white via-emerald-200 to-amber-200 bg-clip-text text-transparent tracking-tight">
                  {siteSettings.orgShortName} Bumi Pratama Mandira
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed max-w-md mb-4">
                {siteSettings.orgName}. Pusat transparansi, media komunikasi, dan penguatan sinergi
                antar-petambak demi keberlanjutan ekosistem budidaya udang.
              </p>
              <p className="text-xs text-emerald-300/80">{siteSettings.locationText}</p>
            </div>

            <div className="md:col-span-4">
              <div className="text-xs font-bold text-amber-300 mb-3">Navigasi Cepat</div>
              <div className="grid grid-cols-2 gap-2.5 text-sm text-slate-400">
                <button
                  type="button"
                  onClick={() => handleJump('beranda', 'section-beranda')}
                  className="text-left hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Beranda Utama
                </button>
                <button
                  type="button"
                  onClick={() => handleJump('profil', 'section-profil')}
                  className="text-left hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Profil &amp; Pengurus
                </button>
                <button
                  type="button"
                  onClick={() => handleJump('program', 'section-program')}
                  className="text-left hover:text-amber-300 transition-colors cursor-pointer"
                >
                  5 Bidang Kerja
                </button>
                <button
                  type="button"
                  onClick={() => handleJump('galeri', 'section-galeri')}
                  className="text-left hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Galeri Kawasan
                </button>
                <button
                  type="button"
                  onClick={() => handleJump('berita', 'section-berita')}
                  className="text-left hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Berita &amp; Pengumuman
                </button>
                <button
                  type="button"
                  onClick={() => handleJump('aspirasi', 'section-aspirasi')}
                  className="text-left hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Kirim Aspirasi
                </button>
              </div>
            </div>

            <div className="md:col-span-3 flex flex-col justify-between">
              <div>
                <div className="text-xs font-bold text-amber-300 mb-2">Portal Pengelolaan</div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  Akses sistem manajemen konten (CMS), analitik real-time, pelaporan, dan modul
                  keamanan pengurus.
                </p>
              </div>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="luxury-sheen-btn inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/25 to-teal-600/25 hover:from-emerald-600/40 hover:to-teal-600/40 border border-amber-400/40 text-amber-200 text-xs font-semibold transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>{isAdmin ? 'Buka Dashboard Administrator' : 'Portal Pengurus / Admin'}</span>
              </button>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>
              &copy; {new Date().getFullYear()} {siteSettings.orgName} ({siteSettings.orgShortName}
              ). Hak cipta dilindungi.
            </span>
            <span>Kec. Sungai Menang · Kab. Ogan Komering Ilir · Sumatera Selatan</span>
          </div>
        </div>
      </footer>

      {/* =====================================================================
          MODAL 1: PROGRAM KERJA DETAIL DRAWER/MODAL
      ====================================================================== */}
      <AnimatePresence>
        {selectedProgram && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setSelectedProgram(null)}
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0D1F26] border border-amber-400/50 dark:border-teal-700 p-6 sm:p-8 shadow-2xl"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500" />
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-xs font-mono font-bold text-emerald-700 dark:text-amber-300">
                    {selectedProgram.code} · Target: {selectedProgram.targetMetric}
                  </p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                    {selectedProgram.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedProgram(null)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Tutup Rincian"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-6 border border-slate-200 dark:border-teal-900/50">
                <ResilientImage
                  src={resolveImageAsset(selectedProgram.imageKey)}
                  alt={selectedProgram.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed mb-6">
                {selectedProgram.details}
              </p>

              <div className="p-5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50 mb-6">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-200 mb-3">
                  <span>Fokus Pelaksanaan &amp; Capaian Utama</span>
                  <span className="font-mono tabular-nums text-emerald-600 dark:text-amber-300">
                    Progres {selectedProgram.progressPercent}%
                  </span>
                </div>
                <div className="space-y-2.5">
                  {selectedProgram.highlights.map((h, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const cat = selectedProgram.fieldCategory;
                    setSelectedProgram(null);
                    if (cat.includes('Infrastruktur')) setAspCategory('Infrastruktur & Kanal');
                    else if (cat.includes('Teknis')) setAspCategory('Kesehatan Udang & Teknis');
                    else if (cat.includes('Ekonomi')) setAspCategory('Ekonomi & Koperasi');
                    else if (cat.includes('Humas')) setAspCategory('Advokasi & Kebijakan');
                    else setAspCategory('Keanggotaan & Sosial');
                    handleJump('aspirasi', 'section-aspirasi');
                  }}
                  className="luxury-sheen-btn px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Kirim Usulan ke Bidang Ini
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODAL 2: GALERI LIGHTBOX VIEWER
      ====================================================================== */}
      <AnimatePresence>
        {lightboxIndex !== null && filteredGallery[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setLightboxIndex(null)}
            className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-4xl w-full rounded-2xl overflow-hidden bg-slate-900 border border-amber-400/40 shadow-2xl"
            >
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500" />
              <div className="relative aspect-[16/10] bg-black">
                <ResilientImage
                  src={resolveImageAsset(filteredGallery[lightboxIndex].imageUrl)}
                  alt={filteredGallery[lightboxIndex].title}
                  className="w-full h-full object-contain"
                />
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="absolute top-4 right-4 p-2 rounded-xl bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                  aria-label="Tutup Foto"
                >
                  <X className="w-5 h-5" />
                </button>
                {filteredGallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setLightboxIndex(
                          (lightboxIndex - 1 + filteredGallery.length) % filteredGallery.length
                        )
                      }
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                      aria-label="Foto Sebelumnya"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex((lightboxIndex + 1) % filteredGallery.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 rounded-xl bg-black/60 text-white hover:bg-black/80 cursor-pointer"
                      aria-label="Foto Berikutnya"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              <div className="p-6 text-white">
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 mb-1.5">
                  <span>{filteredGallery[lightboxIndex].category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{filteredGallery[lightboxIndex].locationBlock}</span>
                  <span aria-hidden="true">·</span>
                  <span>{filteredGallery[lightboxIndex].eventDate}</span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">
                  {filteredGallery[lightboxIndex].title}
                </h3>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {filteredGallery[lightboxIndex].caption}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODAL 3: FULL NEWS ARTICLE READER
      ====================================================================== */}
      <AnimatePresence>
        {selectedArticle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setSelectedArticle(null)}
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0D1F26] border border-amber-400/50 dark:border-teal-700 p-6 sm:p-10 shadow-2xl"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500" />
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-bold text-emerald-700 dark:text-amber-300">
                    {selectedArticle.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedArticle.publishDate}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1 tabular-nums">
                    <Clock className="w-3.5 h-3.5" />
                    {selectedArticle.readMinutes} menit baca
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedArticle(null)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Tutup Berita"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight mb-3">
                {selectedArticle.title}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Diterbitkan oleh {selectedArticle.authorName}</span>
              </p>

              <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-6 border border-slate-200 dark:border-teal-900/50">
                <ResilientImage
                  src={resolveImageAsset(selectedArticle.imageUrl)}
                  alt={selectedArticle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="space-y-4 text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {selectedArticle.content}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =====================================================================
          MODAL 4: TAMBAH / EDIT STRUKTUR PENGURUS, BADAN PENGAWAS & DEMISIONER
      ====================================================================== */}
      <AnimatePresence>
        {boardModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={() => setBoardModalOpen(false)}
            className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-[#0D1F26] border border-amber-400/50 dark:border-teal-700 p-6 sm:p-8 shadow-2xl"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-cyan-500" />

              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <p className="text-xs font-bold text-emerald-700 dark:text-amber-300">
                    Manajemen Struktur Organisasi P2UWM
                  </p>
                  <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                    {editingMemberId
                      ? 'Edit Data & Foto Struktur Organisasi'
                      : 'Tambah Anggota Pengurus / Pengawas / Demisioner'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setBoardModalOpen(false)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                  aria-label="Tutup Form Struktur"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!currentUser ? (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300/70 dark:border-amber-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                    <strong>Verifikasi Pengurus / Admin:</strong> Silakan masuk dengan akun Google
                    Administrator P2UWM untuk menyimpan perubahan ke Cloud Firestore.
                  </div>
                  <button
                    type="button"
                    onClick={onLoginGoogle}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Masuk Google</span>
                  </button>
                </div>
              ) : !isAdmin ? (
                <div className="mb-6 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/35 border border-amber-300/70 dark:border-amber-700/60 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  Akun Anda saat ini (<strong>{currentUser.email}</strong>) belum terdaftar sebagai
                  Administrator CMS. Masuk menggunakan akun Administrator utama untuk menyimpan
                  perubahan struktur secara permanen.
                </div>
              ) : null}

              {bmError && (
                <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
                  {bmError}
                </div>
              )}

              <form onSubmit={handleSaveBoardModal} className="space-y-4">
                {/* Kelompok Struktur Selector (when adding new) */}
                {!editingMemberId && (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    <div className="sm:col-span-8">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Kelompok Struktur Organisasi
                      </label>
                      <select
                        value={bmDivision}
                        onChange={(e) => {
                          const nextDiv = e.target.value as BoardDivision;
                          setBmDivision(nextDiv);
                          if (nextDiv === 'Demisioner') {
                            setDemPairMode(true);
                            setBmPhotoKey('demisioner_ketua_portrait');
                          } else {
                            setDemPairMode(false);
                            setBmPhotoKey(defaultPhotoForDivision(nextDiv));
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                      >
                        <option value="Inti">Pengurus Inti (Ketua, Wakil, Sekretaris, Bendahara)</option>
                        <option value="Badan Pengawas">Badan Pengawas Organisasi</option>
                        <option value="Demisioner">Demisioner per Periode (Ketua &amp; Wakil Ketua)</option>
                        <option value="Infrastruktur Kawasan">Bidang Infrastruktur Kawasan</option>
                        <option value="Teknis Budidaya">Bidang Teknis Budidaya</option>
                        <option value="Ekonomi & Usaha">Bidang Ekonomi &amp; Usaha</option>
                        <option value="Humas & Advokasi">Bidang Humas &amp; Advokasi</option>
                        <option value="Keanggotaan & Sosial">Bidang Keanggotaan &amp; Sosial</option>
                      </select>
                    </div>

                    <div className="sm:col-span-4">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Urutan Tampil
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={bmOrder}
                        onChange={(e) => setBmOrder(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm font-mono text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}

                {/*PAIRED DEMISIONER PERIOD FORM: KETUA + WAKIL KETUA TOGETHER*/}
                {bmDivision === 'Demisioner' && demPairMode && !editingMemberId ? (
                  <div className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Nama &amp; Tahun Periode Masa Bakti
                      </label>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={60}
                        value={demPeriodInput}
                        onChange={(e) => setDemPeriodInput(e.target.value)}
                        placeholder="Contoh: Periode III (2024–2028)"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-indigo-300 dark:border-cyan-800 text-sm font-semibold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Ketua Demisioner */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 space-y-3">
                        <div className="text-xs font-bold text-indigo-700 dark:text-amber-300">
                          1. Ketua Demisioner ({demPeriodInput || 'Periode'})
                        </div>
                        <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-slate-200 dark:border-teal-800 bg-slate-200 dark:bg-slate-800">
                          <ResilientImage
                            src={resolveImageAsset(bmPhotoKey)}
                            alt={bmName || 'Ketua Demisioner'}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <select
                          value={ASSET_PRESETS[bmPhotoKey] ? bmPhotoKey : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') setBmPhotoKey(e.target.value);
                          }}
                          className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-xs text-slate-900 dark:text-white"
                        >
                          {Object.entries(ASSET_PRESETS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                          <option value="custom">Link URL Foto Kustom</option>
                        </select>
                        <input
                          type="text"
                          required
                          maxLength={500}
                          value={bmPhotoKey}
                          onChange={(e) => setBmPhotoKey(e.target.value)}
                          placeholder="Preset atau URL https://..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-xs font-mono text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={100}
                          value={bmName}
                          onChange={(e) => setBmName(e.target.value)}
                          placeholder="Nama Lengkap Ketua Demisioner"
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                        />
                        <textarea
                          rows={3}
                          required
                          minLength={5}
                          maxLength={500}
                          value={bmBio}
                          onChange={(e) => setBmBio(e.target.value)}
                          placeholder="Uraian singkat jasa & masa pengabdian Ketua..."
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-xs text-slate-900 dark:text-white"
                        />
                      </div>

                      {/* Right Column: Wakil Ketua Demisioner */}
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 space-y-3">
                        <div className="text-xs font-bold text-indigo-700 dark:text-amber-300">
                          2. Wakil Ketua Demisioner ({demPeriodInput || 'Periode'})
                        </div>
                        <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-slate-200 dark:border-teal-800 bg-slate-200 dark:bg-slate-800">
                          <ResilientImage
                            src={resolveImageAsset(demWakilPhotoKey)}
                            alt={demWakilName || 'Wakil Ketua Demisioner'}
                            className="w-full h-full object-cover object-top"
                          />
                        </div>
                        <select
                          value={ASSET_PRESETS[demWakilPhotoKey] ? demWakilPhotoKey : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') setDemWakilPhotoKey(e.target.value);
                          }}
                          className="w-full px-2.5 py-2 rounded-lg bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-xs text-slate-900 dark:text-white"
                        >
                          {Object.entries(ASSET_PRESETS).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v.label}
                            </option>
                          ))}
                          <option value="custom">Link URL Foto Kustom</option>
                        </select>
                        <input
                          type="text"
                          required
                          maxLength={500}
                          value={demWakilPhotoKey}
                          onChange={(e) => setDemWakilPhotoKey(e.target.value)}
                          placeholder="Preset atau URL https://..."
                          className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-xs font-mono text-slate-900 dark:text-white"
                        />
                        <input
                          type="text"
                          required
                          minLength={2}
                          maxLength={100}
                          value={demWakilName}
                          onChange={(e) => setDemWakilName(e.target.value)}
                          placeholder="Nama Lengkap Wakil Ketua Demisioner"
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                        />
                        <textarea
                          rows={3}
                          required
                          minLength={5}
                          maxLength={500}
                          value={demWakilBio}
                          onChange={(e) => setDemWakilBio(e.target.value)}
                          placeholder="Uraian singkat jasa & masa pengabdian Wakil Ketua..."
                          className="w-full px-3 py-2 rounded-lg bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-xs text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Live Portrait Preview + Photo Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center p-4 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/50">
                      <div className="sm:col-span-4">
                        <div className="aspect-[4/3] w-full rounded-xl overflow-hidden border border-slate-200 dark:border-teal-800 bg-slate-200 dark:bg-slate-800">
                          <ResilientImage
                            src={resolveImageAsset(bmPhotoKey)}
                            alt={bmName || 'Pratinjau Potret'}
                            className={`w-full h-full ${
                              bmPhotoKey === 'logo_p2uwm'
                                ? 'object-contain p-4 bg-white'
                                : 'object-cover object-top'
                            }`}
                          />
                        </div>
                      </div>
                      <div className="sm:col-span-8 space-y-2.5">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Pilih Potret Resmi atau Masukkan Link URL Foto
                        </label>
                        <select
                          value={ASSET_PRESETS[bmPhotoKey] ? bmPhotoKey : 'custom'}
                          onChange={(e) => {
                            if (e.target.value !== 'custom') {
                              setBmPhotoKey(e.target.value);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-xs sm:text-sm text-slate-900 dark:text-white"
                        >
                          {Object.entries(ASSET_PRESETS).map(([k, v]) => (
                            <option key={k} value={k}>
                              Preset: {v.label}
                            </option>
                          ))}
                          <option value="custom">Gunakan Link URL Foto Kustom (https://...)</option>
                        </select>
                        <input
                          type="text"
                          required
                          maxLength={500}
                          value={bmPhotoKey}
                          onChange={(e) => setBmPhotoKey(e.target.value)}
                          placeholder="Tempel link URL foto https://... atau kode preset"
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-[#0D1F26] border border-slate-200 dark:border-teal-900/60 text-xs font-mono text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    {editingMemberId && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Kelompok Struktur Organisasi
                          </label>
                          <select
                            value={bmDivision}
                            onChange={(e) => {
                              const nextDiv = e.target.value as BoardDivision;
                              setBmDivision(nextDiv);
                              if (nextDiv === 'Demisioner') {
                                const meta = parseDemisionerMeta(bmPosition);
                                setDemRoleSelect(meta.roleLabel);
                                setDemPeriodInput(meta.periodLabel);
                              }
                            }}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                          >
                            <option value="Inti">Pengurus Inti (Ketua, Wakil, Sekretaris, Bendahara)</option>
                            <option value="Badan Pengawas">Badan Pengawas Organisasi</option>
                            <option value="Demisioner">Demisioner (Ketua &amp; Wakil Ketua Terdahulu)</option>
                            <option value="Infrastruktur Kawasan">Bidang Infrastruktur Kawasan</option>
                            <option value="Teknis Budidaya">Bidang Teknis Budidaya</option>
                            <option value="Ekonomi & Usaha">Bidang Ekonomi &amp; Usaha</option>
                            <option value="Humas & Advokasi">Bidang Humas &amp; Advokasi</option>
                            <option value="Keanggotaan & Sosial">Bidang Keanggotaan &amp; Sosial</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Urutan Tampil
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={100}
                            value={bmOrder}
                            onChange={(e) => setBmOrder(Number(e.target.value))}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm font-mono text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    {bmDivision === 'Demisioner' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Nama Lengkap &amp; Gelar
                          </label>
                          <input
                            type="text"
                            required
                            minLength={2}
                            maxLength={100}
                            value={bmName}
                            onChange={(e) => setBmName(e.target.value)}
                            placeholder="Contoh: H. Sulaiman Mansyur"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Jabatan dalam Periode
                          </label>
                          <select
                            value={demRoleSelect}
                            onChange={(e) =>
                              setDemRoleSelect(
                                e.target.value as 'Ketua Demisioner' | 'Wakil Ketua Demisioner'
                              )
                            }
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                          >
                            <option value="Ketua Demisioner">Ketua Demisioner</option>
                            <option value="Wakil Ketua Demisioner">Wakil Ketua Demisioner</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Periode Masa Bakti
                          </label>
                          <input
                            type="text"
                            required
                            minLength={3}
                            maxLength={65}
                            value={demPeriodInput}
                            onChange={(e) => setDemPeriodInput(e.target.value)}
                            placeholder="Periode II (2020–2024)"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Nama Lengkap &amp; Gelar
                          </label>
                          <input
                            type="text"
                            required
                            minLength={2}
                            maxLength={100}
                            value={bmName}
                            onChange={(e) => setBmName(e.target.value)}
                            placeholder="Contoh: Hairu Badarudin"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
                            Jabatan Resmi
                          </label>
                          <input
                            type="text"
                            required
                            minLength={2}
                            maxLength={100}
                            value={bmPosition}
                            onChange={(e) => setBmPosition(e.target.value)}
                            placeholder="Contoh: Ketua Badan Pengawas"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          Uraian Tugas / Pengabdian Singkat
                        </label>
                        <span className="text-xs font-mono tabular-nums text-slate-400">
                          {bmBio.length}/500
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        required
                        minLength={5}
                        maxLength={500}
                        value={bmBio}
                        onChange={(e) => setBmBio(e.target.value)}
                        placeholder="Tuliskan amanah jabatan, fokus pengawasan, atau rekam jejak masa kepemimpinan..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-[#071318] border border-slate-200 dark:border-teal-900/60 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </>
                )}

                <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-teal-900/50">
                  <button
                    type="button"
                    onClick={() => setBoardModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-teal-800 text-xs font-semibold text-slate-700 dark:text-slate-200 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={bmSaving || !isAdmin}
                    className="luxury-sheen-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700 disabled:opacity-50 text-white text-xs font-semibold cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {bmSaving
                        ? 'Menyimpan...'
                        : editingMemberId
                          ? 'Simpan Perubahan'
                          : bmDivision === 'Demisioner' && demPairMode
                            ? 'Simpan Periode (Ketua & Wakil)'
                            : 'Tambahkan ke Struktur'}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
