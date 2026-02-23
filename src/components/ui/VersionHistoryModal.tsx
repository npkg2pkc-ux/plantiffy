import { useState } from "react";
import { Modal } from "./Modal";
import {
  Rocket,
  Star,
  Zap,
  Shield,
  Sparkles,
  Bug,
  ArrowUp,
  Volume2,
  History,
  MessageCircle,
  Bell,
  Database,
  BarChart3,
  Lock,
  Users,
  Smartphone,
  Eye,
  FileText,
  ClipboardList,
  FileSpreadsheet,
  Palette,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface VersionEntry {
  version: string;
  date: string;
  title: string;
  type: "major" | "minor" | "patch";
  icon: React.ReactNode;
  highlights: string[];
  details?: string;
}

const versionHistory: VersionEntry[] = [
  {
    version: "3.0.0",
    date: "23 Februari 2026",
    title: "Major UI Overhaul — Modern Dashboard & Charts",
    type: "major",
    icon: <Palette className="h-5 w-5" />,
    highlights: [
      "Semua chart di-upgrade ke desain modern: gradient fills, glassmorphism tooltips, animated legends",
      "Produksi vs RKAP: diubah dari LineChart ke AreaChart dengan gradient fill area transparan yang cantik",
      "Onspek vs Offspek: bar chart dengan gradient warna indigo & rose, rounded corners lebih halus",
      "Pie charts (Breakdown Produksi, Work Request, Vibrasi): donut chart modern dengan gradient fills, corner radius, dan white stroke separator",
      "Downtime per Equipment: horizontal bar chart dengan gradient fills amber-orange + enhanced empty state",
      "Semua chart: axis tanpa garis border (cleaner), grid transparan halus, tooltip glassmorphism blur",
      "Dashboard hero cards: redesign total — gradient backgrounds jadi lebih deep & vibrant, decorative blur orbs, backdrop glass borders",
      "Setiap card section punya icon header dengan gradient background dan shadow warna",
      "KPI Card: upgrade ke v3.0 — accent line atas, rounded-xl, hover lift effect, gradient variant baru",
      "Card component: modern rounded-xl, subtle border, dark mode backdrop-blur",
      "Quick Actions: redesign dengan gradient background per-item, bordered icon containers",
      "Data Summary: animated grid cards dengan gradient backgrounds per-warna",
      "CSS: glassmorphism v3.0, chart-specific dark mode support, hover-lift utility, gradient-border effect, text-gradient-vibrant",
      "Overall: tampilan enterprise premium — visual hierarchy lebih jelas, spacing lebih lapang, warna lebih vibrant",
    ],
  },
  {
    version: "2.7.1",
    date: "20 Februari 2026",
    title: "Export Excel - Grup per Bahan Baku",
    type: "patch",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    highlights: [
      "Data di Excel dikelompokkan per bahan baku (Urea, DAP, KCL, dll)",
      "Setiap kelompok memiliki header dan subtotal masing-masing",
      "Grand total di akhir sheet",
    ],
  },
  {
    version: "2.7.0",
    date: "20 Februari 2026",
    title: "Export Excel Bahan Baku NPK",
    type: "minor",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    highlights: [
      "Export data penerimaan bahan baku ke file Excel (.xlsx)",
      "Filter berdasarkan rentang tanggal (dari - sampai)",
      "Pilih per bahan baku atau semua bahan baku sekaligus",
      "Sheet 1: Data detail lengkap dengan semua kolom",
      "Sheet 2: Rekap total per bahan baku",
      "Tersedia di halaman Bahan Baku NPK 1 dan NPK 2",
      "Preview jumlah data sebelum export",
    ],
  },
  {
    version: "2.6.2",
    date: "19 Februari 2026",
    title: "Modal Tidak Tertutup Saat Klik di Luar",
    type: "patch",
    icon: <Shield className="h-5 w-5" />,
    highlights: [
      "Modal form tidak lagi tertutup saat klik di luar area modal",
      "Data input yang sedang diisi tidak akan hilang karena klik tidak sengaja",
      "Berlaku untuk semua modal di seluruh halaman aplikasi",
      "User tetap bisa menutup modal via tombol X atau tombol Batal",
    ],
  },
  {
    version: "2.6.1",
    date: "16 Februari 2026",
    title: "Fix Input Tonase NPK Mini",
    type: "patch",
    icon: <Smartphone className="h-5 w-5" />,
    highlights: [
      "Input tonase NPK Mini menggunakan placeholder '0' - tidak lagi pre-fill nilai lama",
      "Support input desimal dengan koma (,) dan titik (.) sebagai pemisah",
      "Maksimal 2 angka di belakang koma (contoh: 12,50 atau 12.50)",
      "Fix keyboard mobile - sekarang bisa ketik koma & titik di iPhone dan Android",
    ],
  },
  {
    version: "2.6.0",
    date: "16 Februari 2026",
    title: "Summary Cards & Mobile Responsive All Pages",
    type: "minor",
    icon: <Smartphone className="h-5 w-5" />,
    highlights: [
      "Summary cards informatif di SEMUA halaman data (Work Request, Inventaris, Riksa Timbangan, dll)",
      "Grid 2 kolom di mobile untuk semua summary cards - tidak terpotong di iPhone & Android",
      "Font & padding responsif (text-lg sm:text-2xl, p-3 sm:p-4) di 15+ halaman",
      "Fix pencarian Inventaris Material - sekarang mencari di seluruh database, bukan hanya halaman aktif",
      "Work Request: tambah card Bulan Ini, Area Terlibat, Top Eksekutor",
      "Riksa Timbangan: tambah card Total Pemeriksaan, Lolos, Perhatian, Rata-rata Selisih",
      "Inventaris: tambah card Total Material, Total Stok, Stok Aman, Stok Menipis",
    ],
  },
  {
    version: "2.5.4",
    date: "16 Februari 2026",
    title: "Mobile Responsive Produksi",
    type: "patch",
    icon: <Smartphone className="h-5 w-5" />,
    highlights: [
      "Perbaikan layout halaman Produksi NPK Granul agar tidak terpotong di HP",
      "Redesain banner produksi bulanan - compact & proporsional di iPhone & Android",
      "Summary cards 2 kolom di mobile (sebelumnya 1 kolom penuh, terlalu besar)",
      "Ukuran font & padding responsif (sm/xs) untuk tampilan lebih profesional",
      "Fix halaman Produksi NPK Mini dengan layout mobile yang sama",
    ],
  },
  {
    version: "2.5.3",
    date: "15 Februari 2026",
    title: "Work Request & Data Integrity Fix",
    type: "patch",
    icon: <Bug className="h-5 w-5" />,
    highlights: [
      "Fix Work Request NPK1 - eksekutor, include, keterangan sekarang tersimpan dengan benar",
      "Perbaikan header validation di backend (Code.gs) untuk konsistensi kolom",
      "Tambah fungsi Fix All Sheet Headers di menu Google Sheets",
    ],
  },
  {
    version: "2.5.1",
    date: "11 Februari 2026",
    title: "Work Request & Data Integrity Fix",
    type: "patch",
    icon: <Bug className="h-5 w-5" />,
    highlights: [
      "Fix Work Request NPK1 - eksekutor, include, keterangan sekarang tersimpan dengan benar",
      "Perbaikan header validation di backend (Code.gs) untuk konsistensi kolom",
      "Fix Activity Log di halaman Produksi NPK (sheet name mismatch)",
      "Perbaikan approval handler di 5 halaman - gunakan API helper yang benar",
      "Approval request sekarang plant-aware (NPK1/NPK2)",
      "Tambah fungsi Fix All Sheet Headers di menu Google Sheets",
    ],
  },
  {
    version: "2.5.0",
    date: "6 Februari 2026",
    title: "Notification Sound & Activity Enhancement",
    type: "minor",
    icon: <Volume2 className="h-5 w-5" />,
    highlights: [
      "Suara notifikasi interaktif untuk data baru, edit, dan pesan masuk",
      "Sound system menggunakan Web Audio API (tanpa file eksternal)",
      "5 jenis suara: notification, message, success, warning, error",
      "Toggle suara on/off di header",
      "Creator logging - pembuat data masuk ke log aktivitas",
      "Version history modal - lihat perjalanan aplikasi",
    ],
  },
  {
    version: "2.4.3",
    date: "28 Januari 2026",
    title: "Stability & Performance Fix",
    type: "patch",
    icon: <Bug className="h-5 w-5" />,
    highlights: [
      "Fix cache invalidation pada mutasi data",
      "Perbaikan polling interval untuk real-time update",
      "Optimasi memory usage pada background tasks",
      "Fix issue duplicate active users di marquee",
    ],
  },
  {
    version: "2.4.2",
    date: "20 Januari 2026",
    title: "Chat Enhancement",
    type: "patch",
    icon: <MessageCircle className="h-5 w-5" />,
    highlights: [
      "Edit dan hapus pesan chat (klik kanan / long press)",
      "Optimistic UI untuk pengiriman pesan instan",
      "Smart scroll - tidak auto-scroll saat baca pesan lama",
      "Per-user read tracking independen",
    ],
  },
  {
    version: "2.4.1",
    date: "12 Januari 2026",
    title: "UI Polish & Bug Fixes",
    type: "patch",
    icon: <Sparkles className="h-5 w-5" />,
    highlights: [
      "Perbaikan tampilan dark mode",
      "Fix responsive layout pada mobile",
      "Peningkatan animasi sidebar",
      "Fix badge count notifikasi",
    ],
  },
  {
    version: "2.4.0",
    date: "5 Januari 2026",
    title: "Activity Logging & Notification System",
    type: "minor",
    icon: <Bell className="h-5 w-5" />,
    highlights: [
      "Sistem logging aktivitas lengkap (create, update, delete)",
      "Notifikasi otomatis ke supervisor & admin",
      "Modal log aktivitas per record",
      "Tracking perubahan data (old vs new values)",
      "Filter dan pencarian log aktivitas",
    ],
  },
  {
    version: "2.3.0",
    date: "20 Desember 2025",
    title: "Inventaris Material Consumable",
    type: "minor",
    icon: <Database className="h-5 w-5" />,
    highlights: [
      "Fitur inventaris stok material consumable",
      "Manajemen stok masuk & keluar",
      "History transaksi material",
      "Alert stok minimum",
      "Laporan transaksi material",
    ],
  },
  {
    version: "2.2.0",
    date: "10 Desember 2025",
    title: "Real-time Chat & Active Users",
    type: "minor",
    icon: <Users className="h-5 w-5" />,
    highlights: [
      "Chat tim real-time antar pengguna",
      "Live active users marquee",
      "Status online/offline tracking",
      "Dashboard metrics di info bar",
      "Background polling untuk updated data",
    ],
  },
  {
    version: "2.1.0",
    date: "25 November 2025",
    title: "Dual Plant System",
    type: "minor",
    icon: <Zap className="h-5 w-5" />,
    highlights: [
      "Dukungan dual plant: NPK1 & NPK2",
      "Data terpisah per plant",
      "Admin dapat melihat semua plant",
      "Filter menu berdasarkan plant user",
      "Gate Pass, Work Request, Vibrasi per plant",
    ],
  },
  {
    version: "2.0.0",
    date: "10 November 2025",
    title: "PlantIQ v2 - Major Redesign",
    type: "major",
    icon: <Rocket className="h-5 w-5" />,
    highlights: [
      "Redesain UI/UX modern dengan design system baru",
      "Dark mode support",
      "Responsive mobile-first design",
      "Force desktop view pada mobile",
      "Animasi halus dengan Framer Motion",
      "Performance optimization dengan caching",
    ],
  },
  {
    version: "1.8.0",
    date: "20 Oktober 2025",
    title: "Approval System & Security",
    type: "minor",
    icon: <Shield className="h-5 w-5" />,
    highlights: [
      "Sistem approval untuk edit & hapus data sensitif",
      "Role-based access control (RBAC)",
      "Session management per device",
      "Multi-device detection",
    ],
  },
  {
    version: "1.7.0",
    date: "5 Oktober 2025",
    title: "Dokumentasi Foto & Gate Pass Print",
    type: "minor",
    icon: <FileText className="h-5 w-5" />,
    highlights: [
      "Upload dokumentasi foto ke Google Drive",
      "Print Gate Pass format resmi",
      "Print laporan BBM",
      "Print KOP dengan format standar",
    ],
  },
  {
    version: "1.6.0",
    date: "18 September 2025",
    title: "Report & Dashboard Enhancement",
    type: "minor",
    icon: <BarChart3 className="h-5 w-5" />,
    highlights: [
      "Dashboard KPI cards dengan metrik real-time",
      "Grafik produksi vs RKAP",
      "Laporan pemantauan bahan baku",
      "Filter tahun & bulan pada dashboard",
      "Export data ke format print",
    ],
  },
  {
    version: "1.5.0",
    date: "1 September 2025",
    title: "PWA & Offline Support",
    type: "minor",
    icon: <Smartphone className="h-5 w-5" />,
    highlights: [
      "Progressive Web App (PWA) - install di HP",
      "Service Worker untuk offline caching",
      "Push notification support",
      "Install prompt otomatis",
      "Splash screen & app icons",
    ],
  },
  {
    version: "1.4.0",
    date: "15 Agustus 2025",
    title: "Data Management Expansion",
    type: "minor",
    icon: <ClipboardList className="h-5 w-5" />,
    highlights: [
      "Trouble Record management",
      "Perbaikan Tahunan tracking",
      "Riksa Timbangan Portabel",
      "Rekap BBM Alat Berat",
      "Timesheet Forklift & Loader",
    ],
  },
  {
    version: "1.3.0",
    date: "1 Agustus 2025",
    title: "Vibrasi Monitoring & Work Request",
    type: "minor",
    icon: <Eye className="h-5 w-5" />,
    highlights: [
      "Monitoring vibrasi equipment",
      "Status alert: Normal, Warning, Critical",
      "Work Request management",
      "Tracking eksekutor dan progress",
    ],
  },
  {
    version: "1.2.0",
    date: "15 Juli 2025",
    title: "Production Data & Bahan Baku",
    type: "minor",
    icon: <Database className="h-5 w-5" />,
    highlights: [
      "Input produksi NPK Granul (3 shift)",
      "Produksi Blending/Retail",
      "Penerimaan bahan baku NPK",
      "Perhitungan otomatis total produksi",
    ],
  },
  {
    version: "1.1.0",
    date: "1 Juli 2025",
    title: "User Management & Auth",
    type: "minor",
    icon: <Lock className="h-5 w-5" />,
    highlights: [
      "Sistem login & registrasi",
      "Manajemen user oleh admin",
      "Role: Admin, Supervisor, AVP, Manager, User",
      "Profil dan pengaturan akun",
    ],
  },
  {
    version: "1.0.0",
    date: "15 Juni 2025",
    title: "PlantIQ v1 - Initial Release",
    type: "major",
    icon: <Star className="h-5 w-5" />,
    highlights: [
      "Rilis awal aplikasi PlantIQ / Plantiffy",
      "Dashboard produksi plant NPK",
      "Integrasi Google Sheets sebagai database",
      "Google Apps Script sebagai backend API",
      "Deploy di Vercel untuk frontend",
      "Arsitektur React + TypeScript + Vite",
    ],
  },
];

export function VersionHistoryModal({ isOpen, onClose }: VersionHistoryModalProps) {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const getTypeBadge = (type: VersionEntry["type"]) => {
    switch (type) {
      case "major":
        return (
          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold rounded-full uppercase">
            Major
          </span>
        );
      case "minor":
        return (
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded-full uppercase">
            Minor
          </span>
        );
      case "patch":
        return (
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-full uppercase">
            Patch
          </span>
        );
    }
  };

  const getTypeColor = (type: VersionEntry["type"]) => {
    switch (type) {
      case "major":
        return "border-red-400 dark:border-red-500 bg-red-500";
      case "minor":
        return "border-blue-400 dark:border-blue-500 bg-blue-500";
      case "patch":
        return "border-gray-300 dark:border-gray-600 bg-gray-400 dark:bg-gray-500";
    }
  };

  const getIconBg = (type: VersionEntry["type"]) => {
    switch (type) {
      case "major":
        return "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400";
      case "minor":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400";
      case "patch":
        return "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center pb-4 border-b border-border">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900/40 mb-3">
            <History className="h-7 w-7 text-primary-600 dark:text-primary-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Perjalanan Plantiffy</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Riwayat pengembangan dari versi awal hingga sekarang
          </p>
          <div className="flex items-center justify-center gap-3 mt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-3 w-3" />
              {versionHistory.length} versi
            </span>
            <span>•</span>
            <span>{versionHistory[versionHistory.length - 1].date} — {versionHistory[0].date}</span>
          </div>
        </div>

        {/* Timeline */}
        <div className="max-h-[60vh] overflow-y-auto pr-2 -mr-2 space-y-0">
          {versionHistory.map((entry, index) => (
            <div key={entry.version} className="relative flex gap-4">
              {/* Timeline line */}
              <div className="flex flex-col items-center gap-0">
                <div
                  className={cn(
                    "w-3 h-3 rounded-full border-2 mt-2 flex-shrink-0 z-10",
                    getTypeColor(entry.type)
                  )}
                />
                {index < versionHistory.length - 1 && (
                  <div className="w-0.5 flex-1 bg-border min-h-[20px]" />
                )}
              </div>

              {/* Content */}
              <div
                className={cn(
                  "flex-1 mb-4 p-3 rounded-lg border transition-all duration-200 cursor-pointer",
                  "hover:shadow-soft",
                  expandedVersion === entry.version
                    ? "border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/10"
                    : "border-border bg-card dark:bg-dark-800/50 hover:border-primary-200 dark:hover:border-primary-800"
                )}
                onClick={() =>
                  setExpandedVersion(
                    expandedVersion === entry.version ? null : entry.version
                  )
                }
              >
                {/* Version Header */}
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "flex-shrink-0 p-1.5 rounded-lg",
                      getIconBg(entry.type)
                    )}
                  >
                    {entry.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        v{entry.version}
                      </span>
                      {getTypeBadge(entry.type)}
                      {index === 0 && (
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase animate-pulse">
                          Terbaru
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.date}
                    </p>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-sm font-semibold text-foreground mt-2">
                  {entry.title}
                </h4>

                {/* Highlights - show first 2 always, rest on expand */}
                <ul className="mt-2 space-y-1">
                  {entry.highlights
                    .slice(0, expandedVersion === entry.version ? undefined : 2)
                    .map((highlight, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-xs text-muted-foreground"
                      >
                        <span className="text-primary-500 mt-0.5 flex-shrink-0">
                          •
                        </span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                </ul>
                {entry.highlights.length > 2 &&
                  expandedVersion !== entry.version && (
                    <p className="text-[11px] text-primary-500 mt-1.5 font-medium">
                      +{entry.highlights.length - 2} lainnya — klik untuk detail
                    </p>
                  )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Dibuat dengan ❤️ oleh Tim Plantiffy • Deployed on{" "}
            <span className="font-semibold text-foreground">Vercel</span>
          </p>
        </div>
      </div>
    </Modal>
  );
}
