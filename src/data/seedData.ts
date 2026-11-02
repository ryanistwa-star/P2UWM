import heroTambakImg from '../assets/images/hero_tambak_udang_1793594588254.jpg';
import gorongGorongImg from '../assets/images/infrastruktur_gorong_gorong_1793594590206.jpg';
import kesehatanUdangImg from '../assets/images/budidaya_kesehatan_udang_1793594591528.jpg';
import musyawarahImg from '../assets/images/musyawarah_petambak_1793594591955.jpg';
import ketuaPortraitImg from '../assets/images/ketua_portrait_1793594591832.jpg';
import wakilKetuaPortraitImg from '../assets/images/wakil_ketua_portrait_1793602916565.jpg';
import pengurusIntiPortraitImg from '../assets/images/pengurus_inti_portrait_1793602917585.jpg';
import badanPengawasPortraitImg from '../assets/images/badan_pengawas_portrait_1793602920267.jpg';
import demisionerKetuaPortraitImg from '../assets/images/demisioner_ketua_portrait_1793602921163.jpg';
import demisionerWakilPortraitImg from '../assets/images/demisioner_wakil_portrait_1793602922106.jpg';

import {
  AnalyticsDaily,
  BoardMember,
  GalleryItem,
  NewsArticle,
  SiteSetting,
  WorkProgram,
} from '../types';

export const P2UWM_LOGO_URL = '/assets/aistudio/logo_P2UWM_4dcdd383.png';

export const ASSET_PRESETS: Record<string, { label: string; url: string }> = {
  ketua_portrait: {
    label: 'Potret Ketua Pusat P2UWM',
    url: ketuaPortraitImg,
  },
  wakil_ketua_portrait: {
    label: 'Potret Wakil Ketua / Pimpinan Lapangan',
    url: wakilKetuaPortraitImg,
  },
  pengurus_inti_portrait: {
    label: 'Potret Sekretaris / Bendahara Pengurus Inti',
    url: pengurusIntiPortraitImg,
  },
  badan_pengawas_portrait: {
    label: 'Potret Pimpinan Badan Pengawas P2UWM',
    url: badanPengawasPortraitImg,
  },
  demisioner_ketua_portrait: {
    label: 'Potret Demisioner Ketua Terdahulu',
    url: demisionerKetuaPortraitImg,
  },
  demisioner_wakil_portrait: {
    label: 'Potret Demisioner Wakil Ketua Terdahulu',
    url: demisionerWakilPortraitImg,
  },
  logo_p2uwm: {
    label: 'Lambang Resmi Organisasi P2UWM',
    url: P2UWM_LOGO_URL,
  },
  hero_tambak: {
    label: 'Udara Kawasan Tambak Bumi Pratama Mandira',
    url: heroTambakImg,
  },
  gorong_gorong: {
    label: 'Infrastruktur Gorong-Gorong Main Inlet Blok 4',
    url: gorongGorongImg,
  },
  kesehatan_udang: {
    label: 'Pendampingan Teknis & Kesehatan Udang Vannamei',
    url: kesehatanUdangImg,
  },
  musyawarah: {
    label: 'Musyawarah & Koordinasi Pengurus P2UWM',
    url: musyawarahImg,
  },
};

export function resolveImageAsset(keyOrUrl: string): string {
  if (!keyOrUrl) return heroTambakImg;
  if (ASSET_PRESETS[keyOrUrl]) {
    return ASSET_PRESETS[keyOrUrl].url;
  }
  return keyOrUrl;
}

export const DEFAULT_SITE_SETTINGS: SiteSetting = {
  orgName: 'Perhimpunan Petambak Udang Wahyuni Mandira',
  orgShortName: 'P2UWM',
  tagline:
    'Wadah perjuangan, koordinasi, dan aspirasi ribuan petambak udang menuju ekosistem budidaya yang mandiri, transparan, dan berkelanjutan.',
  locationText:
    'Desa Bumi Pratama Mandira, Kecamatan Sungai Menang, Kabupaten Ogan Komering Ilir (OKI), Sumatera Selatan',
  vision:
    'Terwujudnya kelembagaan petambak udang Bumi Pratama Mandira yang berdaulat, sejahtera, rukun, dan berdaya saing tinggi melalui tata kelola kawasan pertambakan yang modern serta berkelanjutan.',
  missionList: [
    'Mengonsolidasikan aspirasi, hak, dan kekuatan kelembagaan ribuan petambak di kawasan Desa Bumi Pratama Mandira secara demokratis dan transparan.',
    'Memperkuat infrastruktur saluran primer, main inlet, pintu air, dan konektivitas fisik kawasan pertambakan secara gotong royong dan terukur.',
    'Meningkatkan produktivitas panen melalui pendampingan teknis budidaya, biosekuriti terpadu, dan pemantauan kesehatan udang secara berkala.',
    'Membangun kemandirian ekonomi anggota lewat koperasi sarana produksi tambak, kepastian akses pakan-benur, serta stabilisasi harga panen.',
    'Menjaga kerukunan sosial, nilai keagamaan, serta sinergi harmonis dengan pemerintah daerah Kabupaten OKI dan mitra strategis.',
  ],
  historyText:
    'P2UWM lahir dari semangat kolektif para petambak di Desa Bumi Pratama Mandira, Kecamatan Sungai Menang, Kabupaten Ogan Komering Ilir (OKI), Sumatera Selatan. Menghadapi tantangan dinamika kualitas perairan pesisir, kebutuhan revitalisasi jaringan kanal pasok air laut, serta perlunya posisi tawar ekonomi yang adil bagi petambak mandiri, P2UWM hadir sebagai rumah besar pemersatu. Kini P2UWM menjadi motor penggerak pembangunan swadaya kawasan, advokasi kebijakan pertambakan, hingga transformasi teknis budidaya udang vannamei yang ramah lingkungan.',
  chairmanName: 'Hairu Badarudin',
  chairmanTitle: 'Ketua Pusat P2UWM',
  chairmanQuote:
    'Kekuatan utama kawasan Bumi Pratama Mandira terletak pada persatuan ribuan petambaknya. Melalui keterbukaan informasi, kerja nyata perbaikan infrastruktur saluran air hingga pendampingan teknis di setiap blok tambak, kita pastikan keberlanjutan penghidupan generasi petambak hari ini dan masa depan.',
  totalMembers: 1850,
  totalPonds: 3420,
  activeBlocks: 12,
};

export const DEFAULT_BOARD_MEMBERS: BoardMember[] = [
  {
    id: 'pengurus_ketua_hairu',
    name: 'Hairu Badarudin',
    position: 'Ketua P2UWM',
    division: 'Inti',
    bio: 'Memimpin arah strategis perjuangan kelembagaan, konsolidasi antar-blok pertambakan, dan kemitraan eksternal kawasan Bumi Pratama Mandira.',
    orderIndex: 1,
    photoKey: 'ketua_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengurus_wakil_suaidi',
    name: 'Suaidi',
    position: 'Wakil Ketua',
    division: 'Inti',
    bio: 'Mengawasi sinkronisasi lintas bidang kerja operasional, penguatan disiplin organisasi, serta percepatan tindak lanjut aspirasi anggota.',
    orderIndex: 2,
    photoKey: 'wakil_ketua_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengurus_sekretaris_komarudin',
    name: 'Komarudin',
    position: 'Sekretaris I',
    division: 'Inti',
    bio: 'Mengelola tata administrasi pusat, dokumentasi keputusan musyawarah pengurus, dan korespondensi kelembagaan resmi P2UWM.',
    orderIndex: 3,
    photoKey: 'pengurus_inti_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengurus_sekretaris_ribut',
    name: 'Ribut Budi Santoso',
    position: 'Sekretaris II',
    division: 'Inti',
    bio: 'Mengawal pendataan keanggotaan petambak per blok saluran, publikasi informasi transparan, serta notulensi program lapangan.',
    orderIndex: 4,
    photoKey: 'wakil_ketua_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengurus_bendahara_cecep',
    name: 'Cecep Ardyanto',
    position: 'Bendahara Pusat',
    division: 'Inti',
    bio: 'Menjalankan tata kelola keuangan organisasi, kas swadaya infrastruktur kawasan, serta pelaporan anggaran secara akuntabel dan terbuka.',
    orderIndex: 5,
    photoKey: 'pengurus_inti_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengurus_bid_infrastruktur',
    name: 'Koordinator Teknis Kanal & Sipil',
    position: 'Koordinator Bidang Infrastruktur Kawasan',
    division: 'Infrastruktur Kawasan',
    bio: 'Mengkoordinasikan pembangunan gorong-gorong main inlet, normalisasi lumpur kanal pasok, dan pemeliharaan tanggul poros.',
    orderIndex: 6,
    photoKey: 'gorong_gorong',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengurus_bid_budidaya',
    name: 'Tim Pendamping Kesehatan Udang',
    position: 'Koordinator Bidang Teknis Budidaya',
    division: 'Teknis Budidaya',
    bio: 'Melaksanakan uji parameter air harian (DO, pH, salinitas, alkalinitas) dan edukasi manajemen pakan serta pencegahan penyakit udang.',
    orderIndex: 7,
    photoKey: 'kesehatan_udang',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengawas_01_ketua',
    name: 'H. Darmawan Saputra',
    position: 'Ketua Badan Pengawas · Pengawasan Internal',
    division: 'Badan Pengawas',
    bio: 'Memimpin fungsi pengawasan independen terhadap kepatuhan AD/ART, pelaksanaan mandat musyawarah anggota, serta integritas tata kelola organisasi P2UWM.',
    orderIndex: 8,
    photoKey: 'badan_pengawas_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengawas_02_keuangan',
    name: 'Mulyadi Pratama',
    position: 'Sekretaris Badan Pengawas · Audit Kas Swadaya',
    division: 'Badan Pengawas',
    bio: 'Melaksanakan pemeriksaan berkala atas laporan kas swadaya infrastruktur kawasan, transparansi anggaran program kerja, dan dokumentasi hasil audit internal.',
    orderIndex: 9,
    photoKey: 'pengurus_inti_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'pengawas_03_lapangan',
    name: 'Hendra Wijaya',
    position: 'Anggota Badan Pengawas · Inspeksi Kawasan',
    division: 'Badan Pengawas',
    bio: 'Mengawasi mutu pengerjaan konstruksi gorong-gorong main inlet, pemerataan manfaat normalisasi kanal antar-blok, serta ketepatan tindak lanjut aspirasi anggota.',
    orderIndex: 10,
    photoKey: 'wakil_ketua_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'demisioner_03_perintis',
    name: 'H. Abdul Karim',
    position: 'Ketua Demisioner · Periode I (2016–2020)',
    division: 'Demisioner',
    bio: 'Tokoh pelopor yang memimpin perintisan wadah perjuangan Perhimpunan Petambak Udang Wahyuni Mandira di Kecamatan Sungai Menang sejak masa awal pembukaan kawasan.',
    orderIndex: 11,
    photoKey: 'badan_pengawas_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'demisioner_04_wakil_perintis',
    name: 'Syamsul Bahri',
    position: 'Wakil Ketua Demisioner · Periode I (2016–2020)',
    division: 'Demisioner',
    bio: 'Mendampingi konsolidasi blok-blok awal pertambakan Desa Bumi Pratama Mandira dan merintis tata tertib saluran pasok air bersama para pendiri.',
    orderIndex: 12,
    photoKey: 'demisioner_wakil_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'demisioner_01_ketua_pendahulu',
    name: 'H. Sulaiman Mansyur',
    position: 'Ketua Demisioner · Periode II (2020–2024)',
    division: 'Demisioner',
    bio: 'Berjasa meletakkan fondasi persatuan antar-blok pertambakan, memperjuangkan kemandirian kelembagaan petambak Bumi Pratama Mandira, serta menjadi penasihat strategis organisasi.',
    orderIndex: 13,
    photoKey: 'demisioner_ketua_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'demisioner_02_wakil_pendahulu',
    name: 'H.B. Kurniawan',
    position: 'Wakil Ketua Demisioner · Periode II (2020–2024)',
    division: 'Demisioner',
    bio: 'Mengawal kesinambungan estafet kepemimpinan P2UWM, memperkokoh tradisi gotong royong pemeliharaan saluran tambak, serta menjaga marwah musyawarah petambak.',
    orderIndex: 14,
    photoKey: 'demisioner_wakil_portrait',
    status: 'published',
    authorId: 'system_seed',
  },
];

export const DEFAULT_PROGRAMS: WorkProgram[] = [
  {
    id: 'prog_01_keanggotaan',
    code: 'BIDANG 01',
    title: 'Bidang Keanggotaan, Sosial, & Keagamaan',
    fieldCategory: 'Keanggotaan, Sosial, & Keagamaan',
    summary:
      'Mempererat solidaritas ribuan keluarga petambak melalui sensus keanggotaan digital, dana gotong royong sosial, dan pembinaan kerukunan umat.',
    details:
      'Program ini memastikan setiap petambak aktif di Desa Bumi Pratama Mandira tercatat secara sah dalam basis data keanggotaan P2UWM. Selain administrasi kartu anggota per blok, bidang ini menyelenggarakan santunan duka/kesehatan warga tambak, pengajian akbar bulanan lintas blok, serta bakti sosial pesisir Sungai Menang.',
    highlights: [
      'Pemutakhiran basis data 1.850+ anggota petambak lintas 12 blok kawasan',
      'Program dana solidaritas sosial & tanggap darurat keluarga petambak',
      'Majelis taklim rutin, peringatan hari besar keagamaan, dan forum kerukunan desa',
    ],
    progressPercent: 92,
    targetMetric: '1.850 Anggota Terdata Aktif',
    imageKey: 'musyawarah',
    orderIndex: 1,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'prog_02_humas',
    code: 'BIDANG 02',
    title: 'Bidang Humas, Komunikasi, & Advokasi',
    fieldCategory: 'Humas, Komunikasi, & Advokasi',
    summary:
      'Menjadi garda komunikasi publik, penyalur aspirasi resmi petambak, dan pendamping advokasi hukum maupun regulasi tata ruang pertambakan.',
    details:
      'Berfungsi sebagai penghubung strategis antara anggota P2UWM dengan Pemerintah Kabupaten Ogan Komering Ilir (OKI), Dinas Perikanan, aparat keamanan perairan, dan pemangku kepentingan luar. Setiap persoalan perizinan, tata batas petak, maupun distribusi air dimediasi secara bermartabat dan berlandaskan hukum.',
    highlights: [
      'Pusat informasi digital satu pintu & buletin transparansi kegiatan pengurus',
      'Dialog kebijakan berkala bersama Pemkab OKI dan instansi kelautan-perikanan',
      'Pendampingan mediasi sengketa lahan/saluran dan perlindungan hak petambak',
    ],
    progressPercent: 86,
    targetMetric: '100% Aspirasi Termediasi Terbuka',
    imageKey: 'musyawarah',
    orderIndex: 2,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'prog_03_ekonomi',
    code: 'BIDANG 03',
    title: 'Bidang Penguatan Ekonomi & Usaha Anggota',
    fieldCategory: 'Penguatan Ekonomi & Usaha Anggota',
    summary:
      'Meningkatkan margin kesejahteraan petambak melalui pengadaan kolektif sarana produksi tambak berkualitas dan kemitraan pasar panen yang adil.',
    details:
      'Biaya pakan, benur (post-larvae SPF), kapur dolomit, dan probiotik menyumbang porsi terbesar operasional tambak. Bidang Ekonomi P2UWM mengonsolidasikan permintaan anggota agar memperoleh harga pabrik langsung, mutu terjamin, serta memfasilitasi informasi harga beli udang terkini dari cold storage Sumatera Selatan & Lampung.',
    highlights: [
      'Kemitraan pengadaan benur SPF bersertifikat & pakan udang harga kolektif',
      'Transparansi papan referensi harga panen udang vannamei per size harian',
      'Pengembangan unit usaha koperasi peralatan kincir air dan logistik es panen',
    ],
    progressPercent: 79,
    targetMetric: 'Efisiensi Biaya Saprotam 14%',
    imageKey: 'hero_tambak',
    orderIndex: 3,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'prog_04_teknis',
    code: 'BIDANG 04',
    title: 'Bidang Pendampingan Teknis Budidaya & Kesehatan Udang',
    fieldCategory: 'Pendampingan Teknis Budidaya & Kesehatan Udang',
    summary:
      'Mengawal keberhasilan siklus tebar hingga panen melalui laboratorium pemantauan kualitas air, protokol biosekuriti kawasan, dan klinik kesehatan udang.',
    details:
      'Kesehatan ekosistem satu petak tambak berkaitan erat dengan petak lainnya dalam satu jaringan saluran. Tim teknis P2UWM rutin memeriksa parameter oksigen terlarut (DO), pH, salinitas, amonia, serta kelimpahan plankton, sekaligus memberikan peringatan dini cuaca ekstrem dan protokol pencegahan WSSV, EHP, maupun AHPND.',
    highlights: [
      'Monitoring berkala pH, DO, alkalinitas, dan kecerahan air saluran pasok utama',
      'SOP tebar serentak & protokol biosekuriti terpadu antar-blok pertambakan',
      'Klinik konsultasi lapangan manajemen pakan (FCR) dan sampling pertumbuhan udang',
    ],
    progressPercent: 88,
    targetMetric: 'SR Rata-Rata Kawasan > 82%',
    imageKey: 'kesehatan_udang',
    orderIndex: 4,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'prog_05_infrastruktur',
    code: 'BIDANG 05',
    title: 'Bidang Infrastruktur & Pengelolaan Kawasan Pertambakan',
    fieldCategory: 'Infrastruktur & Pengelolaan Kawasan Pertambakan',
    summary:
      'Membangun dan merawat urat nadi fisik pertambakan: gorong-gorong main inlet, pengerukan sedimen kanal primer-sekunder, pintu air, dan tanggul jalan.',
    details:
      'Sirkulasi air laut bersih yang terpisah tegas dari saluran pembuangan (outlet) adalah kunci utama keberlanjutan tambak Bumi Pratama Mandira. Bidang Infrastruktur memimpin pengerjaan konstruksi beton bertulang gorong-gorong main inlet (termasuk pencapaian strategis Blok 4), operasional ekskavator amfibi, serta perbaikan jembatan akses panen.',
    highlights: [
      'Pembangunan & penguatan konstruksi gorong-gorong beton Main Inlet Blok 4',
      'Normalisasi berkala endapan lumpur kanal pasok primer sepanjang pesisir Mandira',
      'Pemeliharaan tanggul penahan abrasi dan jalur transportasi logistik hasil panen',
    ],
    progressPercent: 94,
    targetMetric: '12 Blok Kanal Terkoneksi Lancar',
    imageKey: 'gorong_gorong',
    orderIndex: 5,
    status: 'published',
    authorId: 'system_seed',
  },
];

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'gal_01_gorong_blok4',
    title: 'Pembangunan Infrastruktur Gorong-Gorong Main Inlet Blok 4',
    caption:
      'Pengerjaan pengecoran kepala gorong-gorong beton bertulang Main Inlet Blok 4 guna memperlancar debit suplai air laut bersih menuju petak pertambakan anggota.',
    category: 'Infrastruktur',
    locationBlock: 'Main Inlet Blok 4 · Bumi Pratama Mandira',
    eventDate: 'Oktober 2026',
    imageUrl: gorongGorongImg,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'gal_02_sampling_udang',
    title: 'Sampling Kesehatan Udang & Uji Parameter Air Harian',
    caption:
      'Tim Bidang Pendampingan Teknis bersama petambak melakukan pengecekan anco, keseragaman ukuran udang vannamei, serta pengukuran DO dan pH air tambak.',
    category: 'Budidaya & Teknis',
    locationBlock: 'Blok 2 & Blok 5 · Sungai Menang',
    eventDate: 'Oktober 2026',
    imageUrl: kesehatanUdangImg,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'gal_03_musyawarah_pusat',
    title: 'Rapat Koordinasi Pengurus Pusat & Perwakilan Blok Tambak',
    caption:
      'Musyawarah evaluasi jadwal tebar serentak dan sinkronisasi pemeliharaan jaringan kanal yang dipimpin jajaran pengurus pusat P2UWM.',
    category: 'Musyawarah & Organisasi',
    locationBlock: 'Balai Pertemuan Desa Bumi Pratama Mandira',
    eventDate: 'September 2026',
    imageUrl: musyawarahImg,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'gal_04_udara_kawasan',
    title: 'Bentang Udara Kawasan Pertambakan Bumi Pratama Mandira',
    caption:
      'Tata letak geometris ribuan petak tambak udang produktif dengan sistem kincir aerasi aktif dan sabuk hijau mangrove pesisir Kabupaten OKI.',
    category: 'Infrastruktur',
    locationBlock: 'Kawasan Terpadu Pesisir Sungai Menang',
    eventDate: 'Agustus 2026',
    imageUrl: heroTambakImg,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'gal_05_klinik_biosekuriti',
    title: 'Pendampingan Manajemen Pakan & Biosekuriti Pergantian Musim',
    caption:
      'Sosialisasi lapangan pengaturan dosis probiotik dan mineral air tambak menghadapi fluktuasi salinitas musim pancaroba di pesisir timur Sumatera Selatan.',
    category: 'Budidaya & Teknis',
    locationBlock: 'Blok 7 · Bumi Pratama Mandira',
    eventDate: 'Agustus 2026',
    imageUrl: kesehatanUdangImg,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'gal_06_forum_ekonomi',
    title: 'Konsolidasi Koperasi Sarana Produksi & Mitra Pembeli Panen',
    caption:
      'Pertemuan terbuka transparansi harga udang vannamei dan skema distribusi benur unggul bersertifikat bagi anggota aktif P2UWM.',
    category: 'Sosial & Ekonomi',
    locationBlock: 'Sekretariat Pusat P2UWM',
    eventDate: 'Juli 2026',
    imageUrl: musyawarahImg,
    status: 'published',
    authorId: 'system_seed',
  },
];

export const DEFAULT_ARTICLES: NewsArticle[] = [
  {
    id: 'art_01_gorong_blok4',
    title:
      'Progres Konstruksi Gorong-Gorong Main Inlet Blok 4 Capai Tahap Fungsional Penuh',
    excerpt:
      'Pembangunan infrastruktur vital gorong-gorong beton bertulang di jalur Main Inlet Blok 4 resmi mengalirkan debit air laut bersih secara optimal bagi ratusan petak tambak.',
    content: `Pengurus Pusat P2UWM melalui Bidang Infrastruktur & Pengelolaan Kawasan Pertambakan mengumumkan rampungnya tahapan krusial pengecoran struktur kepala dan pemasangan pipa beton bertulang gorong-gorong Main Inlet Blok 4 di Desa Bumi Pratama Mandira.

Ketua P2UWM, Hairu Badarudin, menyampaikan apresiasi setinggi-tingginya atas partisipasi swadaya, semangat gotong royong anggota lintas blok, serta pengawasan teknis ketat di lapangan sehingga pekerjaan berjalan tepat waktu dan memenuhi standar kekuatan konstruksi pesisir.

Dengan berfungsinya gorong-gorong Main Inlet Blok 4 secara penuh, sirkulasi pasokan air laut pasang menuju kanal distribusi sekunder meningkat lebih dari 35 persen. Peningkatan debit ini sangat penting untuk menjaga stabilitas oksigen terlarut dan mempercepat pergantian air bersih selama puncak masa pemeliharaan udang vannamei.

Bendahara Pusat Cecep Ardyanto bersama tim pelaksana juga telah mempublikasikan rincian realisasi penggunaan material semen, besi tulangan, operasional pompa pengering kerja, serta jam alat berat secara transparan di papan informasi sekretariat dan laporan berkala anggota.`,
    category: 'Infrastruktur',
    authorName: 'Bidang Humas & Infrastruktur P2UWM',
    publishDate: '29 Oktober 2026',
    readMinutes: 4,
    imageUrl: gorongGorongImg,
    featured: true,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'art_02_protokol_pancaroba',
    title:
      'Panduan Biosekuriti & Stabilisasi Alkalinitas Air Tambak Menghadapi Musim Hujan',
    excerpt:
      'Bidang Pendampingan Teknis Budidaya merilis rekomendasi praktis aplikasi kapur dolomit, pengaturan kincir saat hujan deras, dan kontrol pakan harian.',
    content: `Memasuki periode curah hujan tinggi di wilayah pesisir Kecamatan Sungai Menang, Kabupaten OKI, perubahan mendadak suhu permukaan air dan penurunan pH akibat air hujan berpotensi memicu stres molting pada udang vannamei.

Tim Pendampingan Teknis Budidaya & Kesehatan Udang P2UWM mengimbau seluruh petambak anggota untuk menerapkan langkah mitigasi berikut:
1. Menyalakan kincir air secara optimal saat hujan turun guna mencegah stratifikasi lapisan air tawar di permukaan petak tambak.
2. Menebarkan kapur pertanian/dolomit pada pematang dan perairan sesuai hasil ukur pH pagi-sore untuk menjaga alkalinitas di atas 120 ppm.
3. Menyesuaikan takaran pakan sebesar 15–25 persen apabila suhu air turun di bawah 27 derajat Celcius berdasarkan pengamatan anco.
4. Melaporkan segera ke koordinator blok apabila ditemukan gejala perubahan warna hepatopankreas atau penurunan nafsu makan udang agar tim teknis dapat melakukan uji kualitas air di lokasi.`,
    category: 'Budidaya Udang',
    authorName: 'Bidang Teknis Budidaya P2UWM',
    publishDate: '21 Oktober 2026',
    readMinutes: 5,
    imageUrl: kesehatanUdangImg,
    featured: false,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'art_03_musyawarah_jadwal_tebar',
    title:
      'Hasil Musyawarah Pengurus Pusat: Kesepakatan Kalender Tebar Terpadu & Disiplin Limbah',
    excerpt:
      'Dipimpin Hairu Badarudin dan Wakil Ketua Suaidi, forum menyepakati sinkronisasi jadwal pengeringan petak dan standar instalasi pengolahan air buangan.',
    content: `Bertempat di Balai Pertemuan Desa Bumi Pratama Mandira, jajaran Pengurus Pusat P2UWM bersama perwakilan ketua blok menggelar rapat koordinasi triwulanan guna mengevaluasi performa panen siklus berjalan.

Sekretaris P2UWM, Komarudin dan Ribut Budi Santoso, memaparkan data bahwa blok pertambakan yang menerapkan jadwal tebar serentak dan sterilisasi dasar tambak secara disiplin mencatatkan tingkat kelangsungan hidup (Survival Rate) rata-rata 12 persen lebih tinggi dibandingkan tebar acak.

Dalam musyawarah tersebut disepakati tiga poin utama demi menjaga daya dukung ekosistem perairan Sungai Menang: disiplin pemisahan waktu pembuangan air panen dengan jadwal pemompaan air masuk (inlet), larangan keras membuang endapan lumpur dasar langsung ke saluran navigasi umum, serta penguatan koordinasi keamanan malam hari di pintu-pintu kanal utama.`,
    category: 'Kegiatan Organisasi',
    authorName: 'Sekretariat Pusat P2UWM',
    publishDate: '12 Oktober 2026',
    readMinutes: 4,
    imageUrl: musyawarahImg,
    featured: false,
    status: 'published',
    authorId: 'system_seed',
  },
  {
    id: 'art_04_kemitraan_benur_pakan',
    title:
      'Penguatan Ekonomi Anggota: Skema Pengadaan Kolektif Benur SPF & Pakan Berkualitas',
    excerpt:
      'Melalui konsolidasi pesanan tingkat kawasan, petambak Bumi Pratama Mandira memperoleh kepastian kualitas benur bersertifikat bebas patogen dan efisiensi biaya.',
    content: `Bidang Penguatan Ekonomi & Usaha Anggota P2UWM terus memperluas kemitraan langsung dengan hatchery benur udang vannamei bereputasi nasional serta distributor utama pakan akuakultur.

Langkah kolektif ini menjawab aspirasi para petambak mandiri yang selama ini terbebani selisih biaya distribusi rantai panjang di wilayah pesisir jauh. Setiap batch pengiriman benur yang masuk ke kawasan Bumi Pratama Mandira kini dilengkapi dokumen uji PCR bebas penyakit utama (SPF) serta pengawalan logistik terkoordinasi hingga titik pembagian blok.

Selain sarana produksi, P2UWM juga rutin memperbarui informasi referensi harga pembelian udang size 30 hingga size 100 setiap pekan agar seluruh petambak memiliki posisi tawar yang transparan dan setara saat masa panen tiba.`,
    category: 'Ekonomi Tambak',
    authorName: 'Bidang Ekonomi & Usaha P2UWM',
    publishDate: '03 Oktober 2026',
    readMinutes: 3,
    imageUrl: heroTambakImg,
    featured: false,
    status: 'published',
    authorId: 'system_seed',
  },
];

export const DEFAULT_ANALYTICS_DAILY: AnalyticsDaily[] = [
  {
    dateKey: '2026-10-26',
    label: '26 Okt',
    visitors: 284,
    pageViews: 790,
    mobileUsers: 218,
    desktopUsers: 66,
    berandaViews: 265,
    profilViews: 94,
    programViews: 132,
    galeriViews: 118,
    beritaViews: 126,
    aspirasiViews: 55,
    ownerScope: 'p2uwm_analytics',
  },
  {
    dateKey: '2026-10-27',
    label: '27 Okt',
    visitors: 312,
    pageViews: 865,
    mobileUsers: 241,
    desktopUsers: 71,
    berandaViews: 290,
    profilViews: 102,
    programViews: 145,
    galeriViews: 134,
    beritaViews: 130,
    aspirasiViews: 64,
    ownerScope: 'p2uwm_analytics',
  },
  {
    dateKey: '2026-10-28',
    label: '28 Okt',
    visitors: 356,
    pageViews: 980,
    mobileUsers: 279,
    desktopUsers: 77,
    berandaViews: 325,
    profilViews: 115,
    programViews: 162,
    galeriViews: 158,
    beritaViews: 148,
    aspirasiViews: 72,
    ownerScope: 'p2uwm_analytics',
  },
  {
    dateKey: '2026-10-29',
    label: '29 Okt',
    visitors: 428,
    pageViews: 1240,
    mobileUsers: 338,
    desktopUsers: 90,
    berandaViews: 398,
    profilViews: 128,
    programViews: 185,
    galeriViews: 230,
    beritaViews: 215,
    aspirasiViews: 84,
    ownerScope: 'p2uwm_analytics',
  },
  {
    dateKey: '2026-10-30',
    label: '30 Okt',
    visitors: 395,
    pageViews: 1120,
    mobileUsers: 310,
    desktopUsers: 85,
    berandaViews: 360,
    profilViews: 121,
    programViews: 174,
    galeriViews: 196,
    beritaViews: 192,
    aspirasiViews: 77,
    ownerScope: 'p2uwm_analytics',
  },
  {
    dateKey: '2026-10-31',
    label: '31 Okt',
    visitors: 442,
    pageViews: 1310,
    mobileUsers: 351,
    desktopUsers: 91,
    berandaViews: 412,
    profilViews: 136,
    programViews: 198,
    galeriViews: 242,
    beritaViews: 228,
    aspirasiViews: 94,
    ownerScope: 'p2uwm_analytics',
  },
  {
    dateKey: '2026-11-01',
    label: '01 Nov',
    visitors: 486,
    pageViews: 1458,
    mobileUsers: 389,
    desktopUsers: 97,
    berandaViews: 455,
    profilViews: 149,
    programViews: 224,
    galeriViews: 268,
    beritaViews: 252,
    aspirasiViews: 110,
    ownerScope: 'p2uwm_analytics',
  },
];
