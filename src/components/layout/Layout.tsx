import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Factory,
  FileText,
  Database,
  Settings,
  ChevronDown,
  ChevronRight,
  Menu,
  LogOut,
  Bell,
  MessageCircle,
  ChevronLeft,
  Send,
  X,
  Sun,
  Moon,
  Users,
  Circle,
  Monitor,
  Smartphone,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import {
  cn,
  canViewSettings,
  canViewUsersPage,
  canViewRKAPPage,
  formatDateTime,
} from "@/lib/utils";
import {
  useAuthStore,
  useUIStore,
  useNotificationStore,
  useChatStore,
} from "@/stores";
import { Badge, NotificationLogModal } from "@/components/ui";
import type { Notification } from "@/types";

// ============================================
// INFORMATIVE MARQUEE COMPONENT
// ============================================
interface ActiveUser {
  id: string;
  username: string;
  namaLengkap: string;
  role: string;
  plant: string;
  lastActive: string;
  status: string;
}

interface DashboardMetrics {
  totalProduksiNPK: number;
  totalProduksiBlending: number;
  totalProduksiNPKMini: number;
  totalDowntime: number;
  workRequestPending: number;
  troubleRecordOpen: number;
  vibrasiWarnings: number;
  gatePassToday: number;
  bahanBakuToday: number;
}

// Helper function to format numbers with thousand separators
const formatMarqueeNumber = (num: number): string => {
  return num.toLocaleString("id-ID", { maximumFractionDigits: 0 });
};

// Global function to set user offline - FAST: fire and forget, no blocking
export const setUserOffline = (username: string) => {
  // Import and execute in background without blocking
  import("@/services/api").then(({ setUserOfflineBackground }) => {
    setUserOfflineBackground(username);
  }).catch((error) => {
    console.error("Error setting offline status:", error);
  });
};

const ActiveUsersMarquee = () => {
  const { user } = useAuthStore();
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [dashboardMetrics, setDashboardMetrics] = useState<DashboardMetrics>({
    totalProduksiNPK: 0,
    totalProduksiBlending: 0,
    totalProduksiNPKMini: 0,
    totalDowntime: 0,
    workRequestPending: 0,
    troubleRecordOpen: 0,
    vibrasiWarnings: 0,
    gatePassToday: 0,
    bahanBakuToday: 0,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Update current date every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch dashboard metrics
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const { fetchDataByPlant, SHEETS } = await import("@/services/api");
      const currentYear = new Date().getFullYear();
      const today = new Date().toISOString().split("T")[0];

      // Parse number helper
      const parseNum = (val: unknown): number => {
        if (typeof val === "number") return val;
        if (typeof val === "string") {
          const parsed = parseFloat(val.replace(/,/g, ""));
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      const [
        produksiNPKResult,
        produksiBlendingResult,
        produksiNPKMiniResult,
        downtimeResult,
        workRequestResult,
        troubleRecordResult,
        vibrasiResult,
        gatePassResult,
        bahanBakuResult,
      ] = await Promise.all([
        fetchDataByPlant(SHEETS.PRODUKSI_NPK),
        fetchDataByPlant(SHEETS.PRODUKSI_BLENDING),
        fetchDataByPlant(SHEETS.PRODUKSI_NPK_MINI),
        fetchDataByPlant(SHEETS.DOWNTIME),
        fetchDataByPlant(SHEETS.WORK_REQUEST),
        fetchDataByPlant(SHEETS.TROUBLE_RECORD),
        fetchDataByPlant(SHEETS.VIBRASI),
        fetchDataByPlant(SHEETS.GATE_PASS),
        fetchDataByPlant(SHEETS.BAHAN_BAKU),
      ]);

      // Filter by current year
      const filterByYear = <T extends { tanggal?: string }>(data: T[]): T[] => {
        return data.filter((item) => {
          if (!item.tanggal) return false;
          const year = new Date(item.tanggal).getFullYear();
          return year === currentYear;
        });
      };

      // Filter by today
      const filterByToday = <T extends { tanggal?: string }>(data: T[]): T[] => {
        return data.filter((item) => {
          if (!item.tanggal) return false;
          return item.tanggal.startsWith(today);
        });
      };

      const produksiNPK = filterByYear(
        (produksiNPKResult.data as Array<{ tanggal?: string; total?: number; shiftMalamOnspek?: number; shiftMalamOffspek?: number; shiftPagiOnspek?: number; shiftPagiOffspek?: number; shiftSoreOnspek?: number; shiftSoreOffspek?: number }>) || []
      );
      const produksiBlending = filterByYear(
        (produksiBlendingResult.data as Array<{ tanggal?: string; tonase?: number }>) || []
      );
      const produksiNPKMini = filterByYear(
        (produksiNPKMiniResult.data as Array<{ tanggal?: string; tonase?: number }>) || []
      );
      const downtime = filterByYear(
        (downtimeResult.data as Array<{ tanggal?: string; downtime?: number }>) || []
      );
      const workRequest = (workRequestResult.data as Array<{ tanggal?: string; eksekutor?: string }>) || [];
      const troubleRecord = (troubleRecordResult.data as Array<{ tanggal?: string; status?: string }>) || [];
      const vibrasi = (vibrasiResult.data as Array<{ tanggal?: string; status?: string }>) || [];
      const gatePassToday = filterByToday(
        (gatePassResult.data as Array<{ tanggal?: string }>) || []
      );
      const bahanBakuToday = filterByToday(
        (bahanBakuResult.data as Array<{ tanggal?: string }>) || []
      );

      // Calculate metrics
      const totalProduksiNPK = produksiNPK.reduce((sum, item) => {
        const hasTotal = item.total !== undefined && item.total !== null;
        const total = hasTotal
          ? parseNum(item.total)
          : parseNum(item.shiftMalamOnspek) +
            parseNum(item.shiftMalamOffspek) +
            parseNum(item.shiftPagiOnspek) +
            parseNum(item.shiftPagiOffspek) +
            parseNum(item.shiftSoreOnspek) +
            parseNum(item.shiftSoreOffspek);
        return sum + total;
      }, 0);

      const totalProduksiBlending = produksiBlending.reduce(
        (sum, item) => sum + parseNum(item.tonase),
        0
      );

      const totalProduksiNPKMini = produksiNPKMini.reduce(
        (sum, item) => sum + parseNum(item.tonase),
        0
      );

      const totalDowntime = downtime.reduce(
        (sum, item) => sum + parseNum(item.downtime),
        0
      );

      const workRequestPending = workRequest.filter(
        (item) => !item.eksekutor || item.eksekutor === ""
      ).length;

      const troubleRecordOpen = troubleRecord.filter(
        (item) => item.status === "Open" || item.status === "In Progress"
      ).length;

      const vibrasiWarnings = vibrasi.filter(
        (item) =>
          item.status === "Warning" ||
          item.status === "Critical" ||
          item.status === "Alert"
      ).length;

      setDashboardMetrics({
        totalProduksiNPK,
        totalProduksiBlending,
        totalProduksiNPKMini,
        totalDowntime,
        workRequestPending,
        troubleRecordOpen,
        vibrasiWarnings,
        gatePassToday: gatePassToday.length,
        bahanBakuToday: bahanBakuToday.length,
      });
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
    }
  }, []);

  // Fetch metrics on mount and periodically
  useEffect(() => {
    fetchDashboardMetrics();
    const metricsInterval = setInterval(fetchDashboardMetrics, 60000); // Update every minute
    return () => clearInterval(metricsInterval);
  }, [fetchDashboardMetrics]);

  // Update current user's active status
  const updateMyStatus = useCallback(async () => {
    if (!user) return;

    try {
      const { readData, createData, updateData, SHEETS } = await import(
        "@/services/api"
      );

      // Check if user already exists in active_users
      const result = await readData(SHEETS.ACTIVE_USERS);
      const existingUsers = (result.data as ActiveUser[]) || [];
      const existingUser = existingUsers.find(
        (u) => u.username === user.username
      );

      const now = new Date().toISOString();

      if (existingUser) {
        // Update existing record
        await updateData(SHEETS.ACTIVE_USERS, {
          id: existingUser.id,
          lastActive: now,
          status: "online",
        });
      } else {
        // Create new record
        await createData(SHEETS.ACTIVE_USERS, {
          username: user.username,
          namaLengkap: user.namaLengkap || user.nama || user.username,
          role: user.role,
          plant: user.plant,
          lastActive: now,
          status: "online",
        });
      }
    } catch (error) {
      console.error("Error updating active status:", error);
    }
  }, [user]);

  // Fetch active users
  const fetchActiveUsers = useCallback(async () => {
    try {
      const { readData, SHEETS } = await import("@/services/api");
      const result = await readData(SHEETS.ACTIVE_USERS);

      if (result.success && result.data) {
        const users = result.data as ActiveUser[];
        const now = new Date().getTime();
        const TIMEOUT = 45 * 1000; // 45 seconds timeout for real-time

        // Filter only users active within last 45 seconds AND status is online
        const onlineUsers = users.filter((u) => {
          const lastActive = new Date(u.lastActive).getTime();
          return now - lastActive < TIMEOUT && u.status === "online";
        });

        // Deduplicate users by username - keep the one with the most recent lastActive
        const uniqueUsersMap = new Map<string, ActiveUser>();
        onlineUsers.forEach((u) => {
          const existing = uniqueUsersMap.get(u.username);
          if (!existing) {
            uniqueUsersMap.set(u.username, u);
          } else {
            // Keep the one with more recent lastActive
            const existingTime = new Date(existing.lastActive).getTime();
            const currentTime = new Date(u.lastActive).getTime();
            if (currentTime > existingTime) {
              uniqueUsersMap.set(u.username, u);
            }
          }
        });

        // Convert map to array and sort by namaLengkap for consistent ordering
        const uniqueOnlineUsers = Array.from(uniqueUsersMap.values()).sort((a, b) => 
          (a.namaLengkap || a.username).localeCompare(b.namaLengkap || b.username)
        );

        setActiveUsers(uniqueOnlineUsers);
      }
    } catch (error) {
      console.error("Error fetching active users:", error);
    }
  }, []);

  // Update status on mount and periodically
  useEffect(() => {
    if (user) {
      // Update immediately
      updateMyStatus();
      fetchActiveUsers();

      // Update my status every 15 seconds
      const statusInterval = setInterval(updateMyStatus, 15000);
      // Fetch active users every 5 seconds for real-time updates
      const fetchInterval = setInterval(fetchActiveUsers, 5000);

      return () => {
        clearInterval(statusInterval);
        clearInterval(fetchInterval);
      };
    }
  }, [user, updateMyStatus, fetchActiveUsers]);

  // Set status to offline on unmount/close
  useEffect(() => {
    const setOffline = () => {
      if (user && user.username) {
        // Use fetch with keepalive for reliable offline status on page close
        const apiUrl = import.meta.env.VITE_API_URL;
        if (apiUrl) {
          fetch(apiUrl, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({
              action: "update",
              sheet: "active_users",
              data: {
                username: user.username,
                status: "offline",
              },
            }),
            keepalive: true,
          }).catch(() => {});
        }
        // Also call the async function
        setUserOffline(user.username);
      }
    };

    const handleBeforeUnload = () => {
      setOffline();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        // User might be closing tab - update status
        setOffline();
      } else if (document.visibilityState === "visible" && user) {
        // User came back - update to online
        updateMyStatus();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, updateMyStatus]);

  // Always show marquee - it now contains dashboard info too

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500";
      case "supervisor":
        return "bg-blue-500";
      case "manager":
        return "bg-purple-500";
      case "avp":
        return "bg-emerald-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPlantBadgeColor = (plant: string) => {
    switch (plant) {
      case "NPK1":
        return "bg-orange-500";
      case "NPK2":
        return "bg-cyan-500";
      case "ALL":
        return "bg-gradient-to-r from-orange-500 to-cyan-500";
      default:
        return "bg-gray-500";
    }
  };

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleDateString("id-ID", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentDate.getHours();
    if (hour >= 5 && hour < 11) return "Selamat Pagi";
    if (hour >= 11 && hour < 15) return "Selamat Siang";
    if (hour >= 15 && hour < 18) return "Selamat Sore";
    return "Selamat Malam";
  };

  // Build informative messages
  const infoMessages = [
    // Greeting and date
    {
      id: "greeting",
      icon: "📅",
      text: `${getGreeting()}! ${formatDate(currentDate)} • ${formatTime(currentDate)} WIB`,
      bgColor: "bg-white/15",
    },
    // Production info
    {
      id: "produksi",
      icon: "🏭",
      text: `Produksi NPK ${new Date().getFullYear()}: ${formatMarqueeNumber(dashboardMetrics.totalProduksiNPK)} Ton`,
      bgColor: "bg-green-500/20",
    },
    // Blending production
    {
      id: "blending",
      icon: "⚗️",
      text: `Produksi Blending: ${formatMarqueeNumber(dashboardMetrics.totalProduksiBlending)} Ton`,
      bgColor: "bg-blue-500/20",
    },
    // NPK Mini production
    ...(dashboardMetrics.totalProduksiNPKMini > 0
      ? [
          {
            id: "npkmini",
            icon: "🧪",
            text: `Produksi NPK Mini: ${formatMarqueeNumber(dashboardMetrics.totalProduksiNPKMini)} Ton`,
            bgColor: "bg-teal-500/20",
          },
        ]
      : []),
    // Downtime info
    ...(dashboardMetrics.totalDowntime > 0
      ? [
          {
            id: "downtime",
            icon: "⏱️",
            text: `Total Downtime: ${formatMarqueeNumber(dashboardMetrics.totalDowntime)} Jam`,
            bgColor: "bg-amber-500/20",
          },
        ]
      : []),
    // Work Request pending
    ...(dashboardMetrics.workRequestPending > 0
      ? [
          {
            id: "wr-pending",
            icon: "📋",
            text: `Work Request Pending: ${dashboardMetrics.workRequestPending} item`,
            bgColor: "bg-orange-500/20",
          },
        ]
      : []),
    // Trouble Record open
    ...(dashboardMetrics.troubleRecordOpen > 0
      ? [
          {
            id: "trouble",
            icon: "🔧",
            text: `Trouble Record Open: ${dashboardMetrics.troubleRecordOpen} masalah`,
            bgColor: "bg-red-500/20",
          },
        ]
      : []),
    // Vibrasi warnings
    ...(dashboardMetrics.vibrasiWarnings > 0
      ? [
          {
            id: "vibrasi",
            icon: "⚠️",
            text: `Vibrasi Warning/Critical: ${dashboardMetrics.vibrasiWarnings} alat`,
            bgColor: "bg-yellow-500/20",
          },
        ]
      : []),
    // Today's activities
    ...(dashboardMetrics.gatePassToday > 0
      ? [
          {
            id: "gatepass",
            icon: "🚛",
            text: `Gate Pass Hari Ini: ${dashboardMetrics.gatePassToday} kendaraan`,
            bgColor: "bg-cyan-500/20",
          },
        ]
      : []),
    ...(dashboardMetrics.bahanBakuToday > 0
      ? [
          {
            id: "bahanbaku",
            icon: "📦",
            text: `Penerimaan BB Hari Ini: ${dashboardMetrics.bahanBakuToday} batch`,
            bgColor: "bg-purple-500/20",
          },
        ]
      : []),
  ];

  // Calculate animation duration based on content
  const totalItems = infoMessages.length + activeUsers.length;
  const animationDuration = Math.max(totalItems * 4, 30);

  return (
    <div
      className="bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 text-white overflow-hidden relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-grid-pattern animate-slide-slow" />
      </div>

      <div className="flex items-center h-9 relative z-10">
        {/* Fixed Label - PlantIQ Info with Live Indicator */}
        <div className="flex-shrink-0 flex items-center gap-2 px-4 bg-primary-700/60 h-full border-r border-white/20 z-10 backdrop-blur-sm">
          <div className="relative">
            <Factory className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full animate-ping" />
            <span className="absolute -top-1 -right-1 h-2 w-2 bg-green-400 rounded-full" />
          </div>
          <span className="text-xs font-semibold whitespace-nowrap tracking-wide">
            LIVE INFO
          </span>
        </div>

        {/* Scrolling Content */}
        <div className="flex-1 overflow-hidden relative h-full flex items-center">
          <div className={cn("marquee-wrapper", isPaused && "paused")}>
            <div
              className="marquee-inner"
              style={{
                animationDuration: `${animationDuration}s`,
              }}
            >
              {/* Info Messages with improved hover effects */}
              {infoMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 mx-2 rounded-full backdrop-blur-sm",
                    "transition-all duration-200 hover:scale-105 cursor-default",
                    "shadow-sm hover:shadow-md",
                    msg.bgColor
                  )}
                >
                  <span className="text-sm drop-shadow-sm">{msg.icon}</span>
                  <span className="text-xs font-medium whitespace-nowrap drop-shadow-sm">
                    {msg.text}
                  </span>
                </div>
              ))}

              {/* Separator - only show if there are active users */}
              {activeUsers.length > 0 && (
                <div className="inline-flex items-center mx-4">
                  <span className="text-white/30">•</span>
                </div>
              )}

              {/* Online Users Section - only show if there are active users */}
              {activeUsers.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 mx-2 bg-white/15 rounded-full shadow-sm">
                  <Users className="h-3.5 w-3.5" />
                  <span className="text-xs font-bold whitespace-nowrap">
                    Online ({activeUsers.length}):
                  </span>
                </div>
              )}

              {/* Active Users with enhanced cards */}
              {activeUsers.map((activeUser) => (
                <div
                  key={activeUser.username}
                  className="inline-flex items-center gap-2 px-3 py-1.5 mx-2 bg-white/15 rounded-full backdrop-blur-sm shadow-sm hover:bg-white/25 transition-colors cursor-default"
                >
                  <div className="relative">
                    <Circle className="h-2 w-2 fill-green-400 text-green-400" />
                    <Circle className="absolute inset-0 h-2 w-2 fill-green-400 text-green-400 animate-ping opacity-75" />
                  </div>
                  <span className="text-xs font-medium whitespace-nowrap">
                    {activeUser.namaLengkap}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full text-white font-semibold uppercase shadow-sm",
                      getRoleBadgeColor(activeUser.role)
                    )}
                  >
                    {activeUser.role}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full text-white font-semibold shadow-sm",
                      getPlantBadgeColor(activeUser.plant)
                    )}
                  >
                    {activeUser.plant}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats Badge - Desktop only */}
        <div className="hidden lg:flex items-center gap-2 px-3 border-l border-white/20 h-full bg-primary-700/40">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-white/15 rounded-lg">
            <Users className="h-3 w-3" />
            <span className="text-xs font-bold">{activeUsers.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// NAVIGATION ITEMS
// ============================================
interface NavItemProps {
  name: string;
  path: string;
  icon: React.ReactNode;
  children?: { name: string; path: string }[];
}

const navItems: NavItemProps[] = [
  {
    name: "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    name: "Produksi",
    path: "/produksi",
    icon: <Factory className="h-5 w-5" />,
    children: [
      { name: "NPK Granul 1", path: "/produksi/npk1" },
      { name: "NPK Granul 2", path: "/produksi/npk2" },
      { name: "Blending", path: "/produksi/blending" },
      { name: "NPK Mini", path: "/produksi/npk-mini" },
      { name: "Retail", path: "/produksi/retail" },
    ],
  },
  {
    name: "Laporan",
    path: "/laporan",
    icon: <FileText className="h-5 w-5" />,
    children: [
      { name: "KOP NPK1", path: "/laporan/kop-npk1" },
      { name: "KOP NPK2", path: "/laporan/kop-npk2" },
      {
        name: "Timesheet Forklift NPK1",
        path: "/laporan/timesheet-forklift-npk1",
      },
      {
        name: "Timesheet Forklift NPK2",
        path: "/laporan/timesheet-forklift-npk2",
      },
      { name: "Timesheet Loader NPK1", path: "/laporan/timesheet-loader-npk1" },
      { name: "Timesheet Loader NPK2", path: "/laporan/timesheet-loader-npk2" },
      { name: "Downtime NPK1", path: "/laporan/downtime-npk1" },
      { name: "Downtime NPK2", path: "/laporan/downtime-npk2" },
      { name: "Pemantauan BB NPK1", path: "/laporan/pemantauan-bb-npk1" },
      { name: "Pemantauan BB NPK2", path: "/laporan/pemantauan-bb-npk2" },
    ],
  },
  {
    name: "Data",
    path: "/data",
    icon: <Database className="h-5 w-5" />,
    children: [
      { name: "Inventaris Material", path: "/data/inventaris" },
      { name: "Work Request NPK1", path: "/data/work-request-npk1" },
      { name: "Work Request NPK2", path: "/data/work-request-npk2" },
      { name: "Penerimaan Bahan Baku NPK1", path: "/data/bahan-baku-npk1" },
      { name: "Penerimaan Bahan Baku NPK2", path: "/data/bahan-baku-npk2" },
      { name: "Vibrasi NPK1", path: "/data/vibrasi-npk1" },
      { name: "Vibrasi NPK2", path: "/data/vibrasi-npk2" },
      { name: "Gate Pass NPK1", path: "/data/gate-pass-npk1" },
      { name: "Gate Pass NPK2", path: "/data/gate-pass-npk2" },
      { name: "Perbaikan Tahunan NPK1", path: "/data/perbaikan-tahunan-npk1" },
      { name: "Perbaikan Tahunan NPK2", path: "/data/perbaikan-tahunan-npk2" },
      { name: "Trouble Record NPK1", path: "/data/trouble-record-npk1" },
      { name: "Trouble Record NPK2", path: "/data/trouble-record-npk2" },
      { name: "Dokumentasi Foto NPK1", path: "/data/dokumentasi-foto-npk1" },
      { name: "Dokumentasi Foto NPK2", path: "/data/dokumentasi-foto-npk2" },
      { name: "Rekap BBM NPK1", path: "/data/rekap-bbm-npk1" },
      { name: "Rekap BBM NPK2", path: "/data/rekap-bbm-npk2" },
      { name: "Riksa Timb Portabel", path: "/data/riksa-timb-portabel" },
    ],
  },
  {
    name: "Pengaturan",
    path: "/settings",
    icon: <Settings className="h-5 w-5" />,
    children: [
      { name: "Profil", path: "/settings/akun" },
      { name: "RKAP", path: "/settings/rkap" },
      { name: "Users", path: "/settings/users" },
      { name: "Approval", path: "/settings/approval" },
    ],
  },
];

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const {
    sidebarCollapsed,
    toggleSidebarCollapse,
    sidebarOpen,
    toggleSidebar,
    forceDesktopView,
  } = useUIStore();
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen - but respect forceDesktopView
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024 && !forceDesktopView);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [forceDesktopView]);

  // Close sidebar when clicking on link in mobile
  const handleLinkClick = () => {
    if (isMobile && sidebarOpen && !forceDesktopView) {
      toggleSidebar();
    }
  };

  // Filter menu items based on user's plant and role
  const getFilteredNavItems = () => {
    const userPlant = user?.plant;
    const userRole = user?.role || "";

    return navItems
      .map((item) => {
        // Filter Settings menu based on role and plant
        if (item.name === "Pengaturan") {
          if (!canViewSettings(userRole, userPlant)) {
            return null; // Hide settings for user role and view-only roles
          }

          // Filter settings children based on permissions
          if (item.children) {
            const filteredChildren = item.children.filter((child) => {
              // Users page - only for Admin with ALL plant
              if (child.path === "/settings/users") {
                return canViewUsersPage(userRole, userPlant);
              }
              // RKAP page - not for user role
              if (child.path === "/settings/rkap") {
                return canViewRKAPPage(userRole);
              }
              // Akun and Approval - visible for admin, avp, supervisor
              return true;
            });

            if (filteredChildren.length === 0) return null;
            return { ...item, children: filteredChildren };
          }
          return item;
        }

        // Filter Produksi menu based on plant
        if (item.name === "Produksi" && item.children) {
          let filteredChildren = item.children;

          if (userPlant === "NPK1") {
            // NPK1: Produksi NPK1 dan Retail saja
            filteredChildren = item.children.filter(
              (child) =>
                child.path === "/produksi/npk1" ||
                child.path === "/produksi/retail"
            );
          } else if (userPlant === "NPK2") {
            // NPK2: Produksi NPK2, Blending, NPK Mini
            filteredChildren = item.children.filter(
              (child) =>
                child.path === "/produksi/npk2" ||
                child.path === "/produksi/blending" ||
                child.path === "/produksi/npk-mini"
            );
          }
          // Admin (ALL) sees everything
          return { ...item, children: filteredChildren };
        }

        // Filter Laporan menu based on plant
        if (item.name === "Laporan" && item.children) {
          let filteredChildren = item.children;

          if (userPlant === "NPK1") {
            // NPK1: Only show NPK1 reports
            filteredChildren = item.children.filter((child) =>
              child.path.includes("npk1")
            );
          } else if (userPlant === "NPK2") {
            // NPK2: Only show NPK2 reports
            filteredChildren = item.children.filter((child) =>
              child.path.includes("npk2")
            );
          }
          // Admin (ALL) sees all
          return { ...item, children: filteredChildren };
        }

        // Filter Data menu based on plant
        if (item.name === "Data" && item.children) {
          let filteredChildren = item.children;

          if (userPlant === "NPK1") {
            // NPK1: Only show NPK1 data forms (exclude Riksa Timb Portabel and Inventaris Material)
            filteredChildren = item.children.filter((child) =>
              child.path.includes("npk1")
            );
          } else if (userPlant === "NPK2") {
            // NPK2: Show NPK2 data forms AND Riksa Timb Portabel + Inventaris Material
            filteredChildren = item.children.filter(
              (child) =>
                child.path.includes("npk2") ||
                child.path === "/data/riksa-timb-portabel" ||
                child.path === "/data/inventaris"
            );
          }
          // Admin (ALL) sees all
          return { ...item, children: filteredChildren };
        }

        return item;
      })
      .filter(Boolean) as NavItemProps[];
  };

  const filteredNavItems = getFilteredNavItems();

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItemProps) => {
    if (item.children) {
      return item.children.some((child) => location.pathname === child.path);
    }
    return location.pathname === item.path;
  };

  // Effective mobile state - forceDesktopView overrides mobile behavior
  const effectiveMobile = isMobile && !forceDesktopView;

  return (
    <>
      {/* Mobile Overlay with blur effect */}
      {effectiveMobile && sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen transition-all duration-300",
          // Enhanced gradient background
          "bg-gradient-to-b from-white via-white to-dark-50 dark:from-dark-800 dark:via-dark-800 dark:to-dark-900",
          "border-r border-dark-100/50 dark:border-dark-700/50",
          "shadow-xl shadow-dark-200/20 dark:shadow-dark-900/50",
          // Mobile: hidden by default, show when sidebarOpen (unless forceDesktopView)
          effectiveMobile
            ? sidebarOpen
              ? "translate-x-0 w-64"
              : "-translate-x-full w-64"
            : // Desktop or forceDesktopView: collapse behavior
            sidebarCollapsed
            ? "w-20"
            : "w-64"
        )}
      >
        {/* Logo with enhanced styling */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-dark-100/50 dark:border-dark-700/50 bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm">
          {(!sidebarCollapsed || effectiveMobile) && (
            <Link
              to="/dashboard"
              className="flex items-center gap-3 group"
              onClick={handleLinkClick}
            >
              <div className="relative">
                <img src="/favicon.png" alt="PlantIQ Logo" className="h-10 w-10 transition-transform duration-200 group-hover:scale-110" />
                <div className="absolute inset-0 bg-primary-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <span className="font-display font-bold text-lg text-dark-900 dark:text-white">
                  Plantiffy
                </span>
                <span className="block text-[10px] text-dark-400 -mt-1">
                  Plant Intelligence System
                </span>
              </div>
            </Link>
          )}
          {/* Collapsed state logo */}
          {sidebarCollapsed && !effectiveMobile && (
            <Link to="/dashboard" className="mx-auto" onClick={handleLinkClick}>
              <img src="/favicon.png" alt="PlantIQ Logo" className="h-10 w-10 transition-transform duration-200 hover:scale-110" />
            </Link>
          )}
          {/* Desktop: collapse toggle with animation */}
          {!effectiveMobile && !sidebarCollapsed && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleSidebarCollapse}
              className="p-2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </motion.button>
          )}
          {sidebarCollapsed && !effectiveMobile && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleSidebarCollapse}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          )}
          {/* Mobile: close button */}
          {effectiveMobile && (
            <button
              onClick={toggleSidebar}
              className="p-2 text-dark-500 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-xl transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation with improved styling */}
        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-8rem)] scrollbar-thin">
          {filteredNavItems.map((item) => (
            <div key={item.name}>
              {item.children ? (
                <>
                  <button
                    onClick={() =>
                      (!sidebarCollapsed || effectiveMobile) &&
                      toggleExpand(item.name)
                    }
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                      "group relative overflow-hidden",
                      isParentActive(item)
                        ? "bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/20 text-primary-700 dark:text-primary-400 shadow-sm"
                        : "text-dark-600 dark:text-dark-300 hover:bg-dark-100/70 dark:hover:bg-dark-700/50"
                    )}
                  >
                    {/* Active indicator bar */}
                    {isParentActive(item) && (
                      <motion.div
                        layoutId="activeParentIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary-500 rounded-r-full"
                      />
                    )}
                    <span className={cn(
                      "p-1.5 rounded-lg transition-colors",
                      isParentActive(item)
                        ? "bg-primary-100 dark:bg-primary-800/50"
                        : "bg-dark-100 dark:bg-dark-700 group-hover:bg-dark-200 dark:group-hover:bg-dark-600"
                    )}>
                      {item.icon}
                    </span>
                    {(!sidebarCollapsed || effectiveMobile) && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform duration-300",
                            expandedItems.includes(item.name) && "rotate-180"
                          )}
                        />
                      </>
                    )}
                  </button>
                  {(!sidebarCollapsed || effectiveMobile) && (
                    <AnimatePresence>
                      {expandedItems.includes(item.name) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="overflow-hidden"
                        >
                          <div className="ml-4 pl-4 py-1.5 space-y-0.5 border-l-2 border-dark-100 dark:border-dark-700">
                            {item.children.map((child) => (
                              <Link
                                key={child.path}
                                to={child.path}
                                onClick={handleLinkClick}
                                className={cn(
                                  "block px-3 py-2 text-sm rounded-lg transition-all duration-200 relative",
                                  isActive(child.path)
                                    ? "bg-primary-500 text-white font-medium shadow-sm shadow-primary-500/30"
                                    : "text-dark-500 dark:text-dark-400 hover:text-dark-900 dark:hover:text-white hover:bg-dark-100/70 dark:hover:bg-dark-700/50 hover:translate-x-1"
                                )}
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={handleLinkClick}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative group",
                    isActive(item.path)
                      ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30"
                      : "text-dark-600 dark:text-dark-300 hover:bg-dark-100/70 dark:hover:bg-dark-700/50"
                  )}
                >
                  <span className={cn(
                    "p-1.5 rounded-lg transition-colors",
                    isActive(item.path)
                      ? "bg-white/20"
                      : "bg-dark-100 dark:bg-dark-700 group-hover:bg-dark-200 dark:group-hover:bg-dark-600"
                  )}>
                    {item.icon}
                  </span>
                  {(!sidebarCollapsed || effectiveMobile) && (
                    <span>{item.name}</span>
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Footer with version info */}
        {(!sidebarCollapsed || effectiveMobile) && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-100/50 dark:border-dark-700/50 bg-white/50 dark:bg-dark-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-dark-400">
              <span>© 2025 Plantiffy</span>
              <span className="px-2 py-0.5 bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400 rounded-full font-medium">
                v2.4.2
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

const Header = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const {
    sidebarCollapsed,
    toggleSidebar,
    darkMode,
    toggleDarkMode,
    forceDesktopView,
    toggleForceDesktopView,
  } = useUIStore();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    setNotifications,
  } = useNotificationStore();
  const {
    isOpen: chatOpen,
    toggleChat,
    unreadChatCount,
    setUnreadChatCount,
  } = useChatStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  // State for notification log modal
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedNotification, setSelectedNotification] =
    useState<Notification | null>(null);

  // Handle notification click to show log modal
  const handleNotificationClick = (notif: Notification) => {
    handleMarkAsRead(notif.id);
    // Only show log modal if notification has related log info
    if (notif.sheetName && notif.recordId) {
      setSelectedNotification(notif);
      setShowLogModal(true);
      setShowNotifications(false);
    }
  };

  // Detect if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      const isMobile =
        window.innerWidth < 1024 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
      setIsMobileDevice(isMobile);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Handle mark notification as read - also update backend.
  const handleMarkAsRead = async (notifId: string) => {
    try {
      // Update local state first for instant feedback.
      markAsRead(notifId);

      // Update backend
      const { updateData, SHEETS } = await import("@/services/api");
      await updateData(SHEETS.NOTIFICATIONS, { id: notifId, read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Handle mark all notifications as read - also update backend
  const handleMarkAllAsRead = async () => {
    try {
      // Get unread notifications before marking (to update backend)
      const unreadNotifs = notifications.filter((n) => !n.read);
      
      // Update local state first for instant feedback
      markAllAsRead();

      // Update backend for all unread notifications in parallel
      const { updateData, SHEETS } = await import("@/services/api");
      await Promise.all(
        unreadNotifs.map((notif) =>
          updateData(SHEETS.NOTIFICATIONS, { id: notif.id, read: true })
        )
      );
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  // Load notifications from backend
  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { readData, SHEETS } = await import("@/services/api");
        const result = await readData(SHEETS.NOTIFICATIONS);
        if (result.success && result.data) {
          // Filter notifications for current user (exclude self-generated)
          // User should NOT see their own notifications
          const userNotifications = (result.data as any[]).filter((n) => {
            // Exclude notifications created by the current user
            if (n.fromUser === user?.username) {
              return false;
            }
            // Include if targeted to ALL or specifically to this user
            if (n.toUser === "ALL" || n.toUser === user?.username) {
              return true;
            }
            // Include if from same plant (broadcast within plant)
            if (n.fromPlant === user?.plant) {
              return true;
            }
            return false;
          });
          // Sort by timestamp descending
          const sorted = userNotifications.sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setNotifications(sorted);
        }
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    if (user) {
      loadNotifications();
      // Refresh every 10 seconds for better real-time feel
      const interval = setInterval(loadNotifications, 10000);
      return () => clearInterval(interval);
    }
  }, [user, setNotifications]);

  // Background polling for chat messages (to update badge count)
  // Each user has their own lastReadTimestamp stored in localStorage
  // This ensures User A reading chat doesn't affect User B, C, D's badge
  // Also pre-fetches messages for instant display when chat opens
  useEffect(() => {
    const loadChatMessages = async () => {
      if (!user) return;

      try {
        const { readData, SHEETS } = await import("@/services/api");
        const result = await readData(SHEETS.CHAT_MESSAGES);
        if (result.success && result.data) {
          const messages = result.data as any[];

          // Sort messages by timestamp (oldest first)
          const sortedMessages = [...messages].sort(
            (a, b) =>
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
          );

          // Pre-cache messages in store for instant display
          // This makes chat open instantly without loading
          const { setMessages, setLastFetchTimestamp } =
            useChatStore.getState();
          setMessages(sortedMessages);
          setLastFetchTimestamp(new Date().toISOString());

          // Calculate unread count for badge
          const lastReadKey = `chat_last_read_${user.username}`;
          const lastRead = localStorage.getItem(lastReadKey);
          const lastReadTime = lastRead ? new Date(lastRead).getTime() : 0;

          const currentUserDisplayName =
            user.namaLengkap || user.nama || user.username;

          const unreadCount = messages.filter((msg) => {
            if (msg.sender === currentUserDisplayName) return false;
            const msgTime = new Date(msg.timestamp).getTime();
            return msgTime > lastReadTime;
          }).length;

          setUnreadChatCount(unreadCount);
        }
      } catch (error) {
        console.error("Error loading chat messages:", error);
      }
    };

    if (user) {
      // Always load messages in background for instant access
      loadChatMessages();
      // Poll every 3 seconds for real-time updates
      const interval = setInterval(loadChatMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [user, setUnreadChatCount]);

  // Close notification panel on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    // Set user offline in background (non-blocking)
    if (user && user.username) {
      setUserOffline(user.username);
    }
    // Immediately logout and navigate - don't wait for API
    logout();
    navigate("/login");
  };

  return (
    <header
      className={cn(
        "fixed top-9 right-0 z-30 h-16 transition-all duration-300",
        // Enhanced glassmorphism
        "bg-white/70 dark:bg-dark-800/70 backdrop-blur-xl backdrop-saturate-150",
        "border-b border-white/20 dark:border-dark-700/50",
        "shadow-[0_4px_30px_rgba(0,0,0,0.1)]",
        // Mobile: full width (left-0), Desktop: depends on sidebar
        forceDesktopView ? "left-64" : "left-0 lg:left-64",
        sidebarCollapsed && (forceDesktopView ? "left-20" : "lg:left-20")
      )}
    >
      <div className="h-full px-4 lg:px-6 flex items-center justify-between">
        {/* Mobile menu button - hide if forceDesktopView */}
        {!forceDesktopView && (
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2.5 text-dark-500 hover:bg-dark-100/50 dark:text-dark-300 dark:hover:bg-dark-700/50 rounded-xl transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Spacer for desktop */}
        <div className={forceDesktopView ? "block" : "hidden lg:block"} />

        {/* Right side with improved action buttons */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Action Buttons Group */}
          <div className="flex items-center gap-1 p-1 bg-dark-100/50 dark:bg-dark-700/50 rounded-xl">
            {/* Desktop/Mobile View Toggle - Only show on mobile devices */}
            {isMobileDevice && (
              <button
                onClick={toggleForceDesktopView}
                className={cn(
                  "p-2 rounded-lg transition-all duration-200",
                  forceDesktopView
                    ? "bg-white dark:bg-dark-600 shadow-sm text-primary-600 dark:text-primary-400"
                    : "text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
                )}
                title={forceDesktopView ? "Tampilan HP" : "Tampilan Desktop"}
              >
                {forceDesktopView ? (
                  <Smartphone className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Dark Mode Toggle with rotation animation */}
            <button
              onClick={toggleDarkMode}
              className={cn(
                "p-2 rounded-lg transition-all duration-200",
                "text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
              )}
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <motion.div
                initial={false}
                animate={{ rotate: darkMode ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                {darkMode ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </motion.div>
            </button>
          </div>

          {/* Chat Button with enhanced styling */}
          <button
            onClick={toggleChat}
            className={cn(
              "relative p-2.5 rounded-xl transition-all duration-200",
              chatOpen
                ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                : "bg-dark-100/50 dark:bg-dark-700/50 text-dark-500 dark:text-dark-400 hover:bg-dark-200/50 dark:hover:bg-dark-600/50"
            )}
          >
            <MessageCircle className="h-5 w-5" />
            {unreadChatCount > 0 && !chatOpen && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg"
              >
                {unreadChatCount > 9 ? "9+" : unreadChatCount}
              </motion.span>
            )}
          </button>

          {/* Notifications with enhanced styling */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={cn(
                "relative p-2.5 rounded-xl transition-all duration-200",
                showNotifications
                  ? "bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                  : "bg-dark-100/50 dark:bg-dark-700/50 text-dark-500 dark:text-dark-400 hover:bg-dark-200/50 dark:hover:bg-dark-600/50"
              )}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </motion.span>
              )}
            </button>

            {/* Improved Notification Panel */}
            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 dark:bg-dark-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-dark-100/50 dark:border-dark-700/50 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-dark-100/50 dark:border-dark-700/50 flex items-center justify-between bg-gradient-to-r from-dark-50/50 to-transparent dark:from-dark-900/50">
                    <h3 className="font-bold text-dark-900 dark:text-white flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary-500" />
                      Notifikasi
                    </h3>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                      >
                        Tandai semua dibaca
                      </button>
                    )}
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-dark-400">
                        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Tidak ada notifikasi</p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notif) => (
                        <div
                          key={notif.id}
                          className={cn(
                            "px-4 py-3 border-b border-dark-50 dark:border-dark-700 hover:bg-dark-50 dark:hover:bg-dark-700 transition-colors",
                            !notif.read &&
                              "bg-primary-50 dark:bg-primary-900/30"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                                notif.read
                                  ? "bg-dark-300 dark:bg-dark-500"
                                  : "bg-primary-500"
                              )}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-dark-700 dark:text-dark-200 line-clamp-2">
                                {notif.message}
                              </p>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-dark-400">
                                  {formatDateTime(notif.timestamp)}
                                </p>
                                <div className="flex items-center gap-2">
                                  {notif.sheetName && notif.recordId && (
                                    <button
                                      onClick={() =>
                                        handleNotificationClick(notif)
                                      }
                                      className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                                    >
                                      <Eye className="h-3 w-3" />
                                      Lihat Log
                                    </button>
                                  )}
                                  {!notif.read && (
                                    <button
                                      onClick={() => handleMarkAsRead(notif.id)}
                                      className="text-xs text-dark-500 hover:text-dark-700 dark:text-dark-400 dark:hover:text-dark-200"
                                    >
                                      Tandai dibaca
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User menu with enhanced profile styling */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200",
                "bg-gradient-to-r from-dark-50/50 to-dark-100/50 dark:from-dark-700/50 dark:to-dark-600/50",
                "hover:shadow-md hover:scale-[1.02]",
                showUserMenu && "ring-2 ring-primary-500/30"
              )}
            >
              {/* Avatar with initials and status indicator */}
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <span className="text-white font-bold text-sm">
                    {(user?.namaLengkap || user?.username || "U").charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white dark:border-dark-800 rounded-full" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-semibold text-dark-900 dark:text-white leading-tight">
                  {user?.namaLengkap}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 capitalize flex items-center gap-1">
                  <span className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    user?.role === "admin" ? "bg-red-500" :
                    user?.role === "supervisor" ? "bg-blue-500" :
                    user?.role === "manager" ? "bg-purple-500" :
                    user?.role === "avp" ? "bg-emerald-500" : "bg-gray-500"
                  )} />
                  {user?.role} • {user?.plant}
                </p>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 text-dark-400 transition-transform duration-200",
                showUserMenu && "rotate-180"
              )} />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 w-56 bg-white/95 dark:bg-dark-800/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-dark-100/50 dark:border-dark-700/50 py-2 z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-dark-100/50 dark:border-dark-700/50 bg-gradient-to-r from-dark-50/50 to-transparent dark:from-dark-900/50">
                    <p className="text-sm font-bold text-dark-900 dark:text-white">
                      {user?.namaLengkap}
                    </p>
                    <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                      @{user?.username}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="primary" size="sm">
                        {user?.role}
                      </Badge>
                      <Badge variant="info" size="sm">
                        {user?.plant}
                      </Badge>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Keluar
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Notification Log Modal */}
      <NotificationLogModal
        isVisible={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setSelectedNotification(null);
        }}
        notification={selectedNotification}
      />
    </header>
  );
};

// Chat Panel Component
// Each user has independent read tracking via localStorage
// User A reading chat does NOT affect User B, C, D's unread badge
// Uses optimistic UI for instant message display
const ChatPanel = () => {
  const { user } = useAuthStore();
  const {
    messages,
    isOpen,
    toggleChat,
    addOptimisticMessage,
    removeOptimisticMessage,
    setMessages,
    setUnreadChatCount,
  } = useChatStore();
  const [newMessage, setNewMessage] = useState("");
  const [loading, _setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const prevMessagesLengthRef = useRef(0);

  // Context menu state for edit/delete
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    messageId: string;
    messageText: string;
  } | null>(null);
  const [editingMessage, setEditingMessage] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if user is near the bottom of chat
  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    const threshold = 100; // pixels from bottom
    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <
      threshold
    );
  };

  // Handle scroll event to detect if user is reading old messages
  const handleScroll = () => {
    setIsUserScrolling(!isNearBottom());
  };

  // Scroll to bottom helper
  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Mark chat as read ONLY for current user when panel opens
  // This updates only the current user's lastReadTimestamp in localStorage
  // Other users' badges remain unaffected
  useEffect(() => {
    if (isOpen && user) {
      // Save last read timestamp to localStorage for THIS user only
      // Key format: chat_last_read_<username>
      // Each user has their own key, so marking as read for User A
      // does NOT affect User B, C, D, etc.
      const lastReadKey = `chat_last_read_${user.username}`;
      const now = new Date().toISOString();
      localStorage.setItem(lastReadKey, now);

      // Only reset THIS user's unread count in the UI
      setUnreadChatCount(0);

      // Scroll to bottom when chat first opens
      setTimeout(() => scrollToBottom("auto"), 100);
    }
  }, [isOpen, user, setUnreadChatCount]);

  // Also update lastReadTimestamp when new messages arrive while chat is open
  // This ensures badge stays at 0 when user is actively viewing chat
  useEffect(() => {
    if (isOpen && user && messages.length > 0) {
      const lastReadKey = `chat_last_read_${user.username}`;
      localStorage.setItem(lastReadKey, new Date().toISOString());
    }
  }, [isOpen, user, messages.length]);

  // Smart scroll: only scroll to bottom if user is not reading old messages
  useEffect(() => {
    const hasNewMessages = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    // Only auto-scroll if:
    // 1. There are new messages AND
    // 2. User is NOT scrolling up to read old messages (is near bottom)
    if (hasNewMessages && !isUserScrolling) {
      scrollToBottom();
    }
  }, [messages, isUserScrolling]);

  // Messages are pre-loaded by background polling in Header component
  // Just refresh periodically when chat is open for real-time updates
  useEffect(() => {
    if (isOpen) {
      // Auto-refresh every 3 seconds for real-time feel
      const interval = setInterval(fetchMessages, 3000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchMessages = async () => {
    try {
      const { readData, SHEETS } = await import("@/services/api");
      const result = await readData(SHEETS.CHAT_MESSAGES);
      if (result.success && result.data) {
        // Sort by timestamp
        const sortedMessages = [...(result.data as any[])].sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  // Handle context menu for right-click (desktop)
  const handleContextMenu = (e: React.MouseEvent, msg: any, isOwn: boolean) => {
    if (!isOwn) return; // Only allow context menu for own messages
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      messageId: msg.id,
      messageText: msg.message,
    });
  };

  // Handle long press for mobile
  const handleTouchStart = (msg: any, isOwn: boolean) => {
    if (!isOwn) return;
    longPressTimerRef.current = setTimeout(() => {
      // Use fixed position at center-bottom of screen for mobile
      setContextMenu({
        visible: true,
        x: window.innerWidth / 2,
        y: window.innerHeight - 200,
        messageId: msg.id,
        messageText: msg.message,
      });
    }, 500); // 500ms long press
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Handle edit message
  const handleEditMessage = async () => {
    if (!editingMessage || !editingMessage.text.trim()) return;

    try {
      const { updateData, SHEETS } = await import("@/services/api");
      await updateData(SHEETS.CHAT_MESSAGES, {
        id: editingMessage.id,
        message: editingMessage.text.trim(),
        edited: true,
      });

      // Update local state
      setMessages(
        messages.map((msg) =>
          msg.id === editingMessage.id
            ? { ...msg, message: editingMessage.text.trim(), edited: true }
            : msg
        )
      );

      setEditingMessage(null);
    } catch (error) {
      console.error("Error editing message:", error);
    }
  };

  // Handle delete message
  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { deleteData, SHEETS } = await import("@/services/api");
      await deleteData(SHEETS.CHAT_MESSAGES, messageId);

      // Update local state
      setMessages(messages.filter((msg) => msg.id !== messageId));
      setContextMenu(null);
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  // Start editing
  const startEditing = () => {
    if (contextMenu) {
      setEditingMessage({
        id: contextMenu.messageId,
        text: contextMenu.messageText,
      });
      setContextMenu(null);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    // Use consistent sender name (namaLengkap > nama > username)
    const senderName = user.namaLengkap || user.nama || user.username;
    const tempId = `temp_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const messageText = newMessage.trim();

    // Create optimistic message for instant display
    const optimisticMessage = {
      id: tempId,
      sender: senderName,
      role: user.role,
      message: messageText,
      timestamp: timestamp,
    };

    // INSTANT: Add message to UI immediately (optimistic update)
    addOptimisticMessage(optimisticMessage as any);
    setNewMessage(""); // Clear input immediately for better UX

    // Update last read timestamp
    const lastReadKey = `chat_last_read_${user.username}`;
    localStorage.setItem(lastReadKey, timestamp);

    // BACKGROUND: Send to database (no need to update UI again, just sync)
    try {
      const { createData, SHEETS } = await import("@/services/api");

      const messageData = {
        sender: senderName,
        role: user.role,
        message: messageText,
        timestamp: timestamp,
      };

      const result = await createData(SHEETS.CHAT_MESSAGES, messageData);
      if (!result.success) {
        // Only remove optimistic message if failed
        removeOptimisticMessage(tempId);
        console.error("Failed to send message");
      }
      // On success: Don't remove or refetch - let background polling handle sync
      // This prevents the "blink" effect
    } catch (error) {
      // On error, remove optimistic message
      removeOptimisticMessage(tempId);
      console.error("Error sending message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleEditMessage();
      } else {
        handleSendMessage();
      }
    }
    // Cancel editing with Escape
    if (e.key === "Escape" && editingMessage) {
      setEditingMessage(null);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
      className={cn(
        "fixed left-4 bottom-4 z-50 w-80 md:w-96",
        "bg-white/95 dark:bg-dark-800/95 backdrop-blur-xl",
        "rounded-2xl shadow-2xl shadow-dark-200/30 dark:shadow-dark-900/50",
        "border border-dark-100/50 dark:border-dark-700/50",
        "overflow-hidden"
      )}
    >
      {/* Header with gradient */}
      <div className="relative px-4 py-4 bg-gradient-to-r from-primary-600 via-primary-500 to-secondary-500 text-white">
        <div className="absolute inset-0 bg-grid-pattern opacity-10" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold">Chat Tim</h3>
              <p className="text-xs text-white/70">
                {messages.length} pesan
              </p>
            </div>
          </div>
          <button
            onClick={toggleChat}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu?.visible && (
        <div
          ref={contextMenuRef}
          className="fixed z-[100] bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-dark-200 dark:border-dark-600 py-2 min-w-[140px]"
          style={{
            left: Math.min(contextMenu.x, window.innerWidth - 160),
            top: Math.min(contextMenu.y, window.innerHeight - 100),
          }}
        >
          <button
            onClick={startEditing}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-dark-700 dark:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-700 transition-colors"
          >
            <Pencil className="h-4 w-4" />
            Edit
          </button>
          <button
            onClick={() => handleDeleteMessage(contextMenu.messageId)}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Hapus
          </button>
        </div>
      )}

      {/* Messages with improved styling */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="h-80 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-dark-50/50 to-white dark:from-dark-900/50 dark:to-dark-800"
      >
        {messages.length === 0 ? (
          <div className="text-center text-dark-400 py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-100 dark:bg-dark-700 flex items-center justify-center">
              <MessageCircle className="h-8 w-8 opacity-50" />
            </div>
            <p className="text-sm font-medium">Belum ada pesan</p>
            <p className="text-xs mt-1">Mulai percakapan dengan tim!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isOwn =
              msg.sender ===
              (user?.namaLengkap || user?.nama || user?.username);
            const showAvatar = index === 0 || messages[index - 1].sender !== msg.sender;
            return (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-2", isOwn ? "justify-end" : "justify-start")}
              >
                {/* Avatar for others */}
                {!isOwn && showAvatar && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                    {msg.sender.charAt(0).toUpperCase()}
                  </div>
                )}
                {!isOwn && !showAvatar && <div className="w-8" />}
                <div
                  onContextMenu={(e) => handleContextMenu(e, msg, isOwn)}
                  onTouchStart={() => handleTouchStart(msg, isOwn)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd}
                  className={cn(
                    "max-w-[75%] rounded-2xl px-4 py-2.5 select-none shadow-sm",
                    "transition-all duration-200 hover:shadow-md",
                    isOwn
                      ? "bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-br-md cursor-pointer"
                      : "bg-white dark:bg-dark-700 text-dark-700 dark:text-dark-200 rounded-bl-md"
                  )}
                >
                  {/* Sender name for others */}
                  {!isOwn && showAvatar && (
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 mb-1">
                      {msg.sender}
                      <span className="ml-1 font-normal text-dark-400 capitalize">
                        • {msg.role}
                      </span>
                    </p>
                  )}
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                  <div className={cn(
                    "flex items-center gap-1 mt-1",
                    isOwn ? "justify-end" : "justify-start"
                  )}>
                    <p
                      className={cn(
                        "text-[10px]",
                        isOwn ? "text-white/60" : "text-dark-400"
                      )}
                    >
                      {new Date(msg.timestamp).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                    {msg.edited && (
                      <span className={cn(
                        "text-[10px] italic",
                        isOwn ? "text-white/50" : "text-dark-300"
                      )}>
                        (diedit)
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Edit Mode Banner */}
      {editingMessage && (
        <div className="px-3 py-2 bg-amber-100 dark:bg-amber-900/30 border-t border-amber-200 dark:border-amber-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
            <Pencil className="h-4 w-4" />
            <span>Mengedit pesan</span>
          </div>
          <button
            onClick={() => setEditingMessage(null)}
            className="text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Input with modern styling */}
      <div className="p-4 border-t border-dark-100/50 dark:border-dark-700/50 bg-white/80 dark:bg-dark-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={editingMessage ? editingMessage.text : newMessage}
              onChange={(e) =>
                editingMessage
                  ? setEditingMessage({ ...editingMessage, text: e.target.value })
                  : setNewMessage(e.target.value)
              }
              onKeyDown={handleKeyPress}
              placeholder={editingMessage ? "Edit pesan..." : "Ketik pesan..."}
              className={cn(
                "w-full px-4 py-3 bg-dark-50 dark:bg-dark-900 border-2 rounded-xl text-sm",
                "focus:outline-none focus:ring-0 transition-all duration-200",
                "text-dark-900 dark:text-dark-100 placeholder-dark-400",
                editingMessage
                  ? "border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-900/20"
                  : "border-transparent focus:border-primary-500"
              )}
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={editingMessage ? handleEditMessage : handleSendMessage}
            disabled={
              editingMessage
                ? !editingMessage.text.trim()
                : !newMessage.trim() || loading
            }
            className={cn(
              "p-3 text-white rounded-xl transition-all duration-200",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100",
              "shadow-lg",
              editingMessage
                ? "bg-gradient-to-r from-amber-500 to-amber-600 shadow-amber-500/30"
                : "bg-gradient-to-r from-primary-500 to-primary-600 shadow-primary-500/30"
            )}
          >
            {editingMessage ? (
              <Pencil className="h-5 w-5" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

interface LayoutProps {
  children?: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { sidebarCollapsed, darkMode, forceDesktopView } = useUIStore();
  const { isOpen: chatOpen } = useChatStore();

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  // Apply force desktop view class
  useEffect(() => {
    if (forceDesktopView) {
      document.documentElement.classList.add("force-desktop");
    } else {
      document.documentElement.classList.remove("force-desktop");
    }
  }, [forceDesktopView]);

  return (
    <div
      className={cn(
        "min-h-screen bg-dark-50 dark:bg-dark-900 transition-colors duration-300",
        forceDesktopView && "force-desktop-view"
      )}
    >
      {/* Active Users Marquee - Fixed at top */}
      <div
        className={cn(
          "fixed top-0 right-0 z-40 transition-all duration-300",
          // Mobile: full width (left-0), Desktop: depends on sidebar
          forceDesktopView ? "left-64" : "left-0 lg:left-64",
          sidebarCollapsed && (forceDesktopView ? "left-20" : "lg:left-20")
        )}
      >
        <ActiveUsersMarquee />
      </div>

      <Sidebar />
      <Header />
      <main
        className={cn(
          "pt-24 min-h-screen transition-all duration-300",
          // Mobile: no left padding, Desktop: depends on sidebar
          forceDesktopView ? "pl-64" : "pl-0 lg:pl-64",
          sidebarCollapsed && (forceDesktopView ? "pl-20" : "lg:pl-20")
        )}
      >
        <div className="p-4 lg:p-6">{children || <Outlet />}</div>
      </main>

      {/* Chat Panel */}
      <AnimatePresence>{chatOpen && <ChatPanel />}</AnimatePresence>
    </div>
  );
};

export default Layout;
