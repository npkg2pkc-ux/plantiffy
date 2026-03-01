import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  LabelList,
  AreaChart,
  Area,
} from "recharts";
import {
  Factory,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  Truck,
  Gauge,
  Loader2,
  CalendarDays,
  Fuel,
  X,
  ChevronUp,
  Award,
  Target,
  BarChart3,
  LayoutDashboard,
  Beaker,
  Droplets,
  FlaskConical,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Select,
  Modal,
} from "@/components/ui";
import { useAuthStore, useUIStore } from "@/stores";
import { formatNumber, parseNumber, cn } from "@/lib/utils";
import type {
  ProduksiNPK,
  ProduksiBlending,
  ProduksiNPKMini,
  Downtime,
  WorkRequest,
  BahanBaku,
  Vibrasi,
  GatePass,
  TimesheetForklift,
  TimesheetLoader,
  TroubleRecord,
  RKAP,
  PlantType,
  RekapBBM,
  PemakaianBahanBaku,
} from "@/types";

const COLORS = [
  "#6366f1",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#10b981",
  "#f97316",
];

// Modern glassmorphism tooltip style
const modernTooltipStyle = {
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "16px",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)",
  padding: "14px 18px",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
};

// Modern chart grid style
const modernGridStyle = {
  strokeDasharray: "3 3",
  stroke: "rgba(148, 163, 184, 0.15)",
  vertical: false as const,
};

// Modern axis style
const modernAxisStyle = {
  stroke: "#94a3b8",
  fontSize: 11,
  fontWeight: 500,
  tickLine: false,
  axisLine: false,
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const MONTH_KEY = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
] as const;

interface DashboardData {
  produksiNPK: ProduksiNPK[];
  produksiBlending: ProduksiBlending[];
  produksiNPKMini: ProduksiNPKMini[];
  downtime: Downtime[];
  workRequest: WorkRequest[];
  bahanBaku: BahanBaku[];
  vibrasi: Vibrasi[];
  gatePass: GatePass[];
  timesheetForklift: TimesheetForklift[];
  timesheetLoader: TimesheetLoader[];
  troubleRecord: TroubleRecord[];
  rkap: RKAP[];
  rekapBBM: RekapBBM[];
  pemakaianBB: PemakaianBahanBaku[];
}

// ============================================
// MONTHLY DOWNTIME DETAIL MODAL
// ============================================
interface MonthlyDowntimeDetail {
  item: string;
  deskripsi: string;
  tanggal: string;
  jamOff: string;
  jamStart: string;
  downtime: number;
}

interface MonthlyDowntimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  monthName: string;
  monthIndex: number;
  year: number;
  totalHours: number;
  details: MonthlyDowntimeDetail[];
  isHighest: boolean;
  rank: number;
  averageHours: number;
}

const MonthlyDowntimeModal = ({
  isOpen,
  onClose,
  monthName,
  year,
  totalHours,
  details,
  isHighest,
  rank,
  averageHours,
}: MonthlyDowntimeModalProps) => {
  // Group details by item (equipment)
  const groupedByItem = useMemo(() => {
    const grouped: {
      [key: string]: {
        total: number;
        count: number;
        details: MonthlyDowntimeDetail[];
      };
    } = {};
    details.forEach((d) => {
      const key = d.item || "Unknown";
      if (!grouped[key]) {
        grouped[key] = { total: 0, count: 0, details: [] };
      }
      grouped[key].total += parseNumber(d.downtime);
      grouped[key].count += 1;
      grouped[key].details.push(d);
    });
    return Object.entries(grouped)
      .map(([item, data]) => ({ item, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [details]);

  const percentageFromAverage =
    averageHours > 0
      ? (((totalHours - averageHours) / averageHours) * 100).toFixed(1)
      : "0";

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full" title="">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-dark-900 dark:text-white">
                Detail Downtime {monthName} {year}
              </h2>
              {isHighest && (
                <Badge variant="danger" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Tertinggi
                </Badge>
              )}
              {rank <= 3 && !isHighest && (
                <Badge variant="warning">Top {rank}</Badge>
              )}
            </div>
            <p className="text-dark-500 dark:text-dark-400">
              Analisis detail downtime per equipment untuk bulan {monthName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-dark-500 dark:text-dark-400" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div
            className={cn(
              "p-4 rounded-xl",
              isHighest
                ? "bg-gradient-to-br from-red-500 to-rose-600 text-white"
                : "bg-gradient-to-br from-amber-500 to-orange-500 text-white"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 opacity-80" />
              <span className="text-xs uppercase tracking-wider opacity-80">
                Total Downtime
              </span>
            </div>
            <p className="text-3xl font-bold">{formatNumber(totalHours)}</p>
            <p className="text-sm opacity-80">Jam</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 opacity-80" />
              <span className="text-xs uppercase tracking-wider opacity-80">
                Jumlah Kejadian
              </span>
            </div>
            <p className="text-3xl font-bold">{details.length}</p>
            <p className="text-sm opacity-80">Kejadian</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 opacity-80" />
              <span className="text-xs uppercase tracking-wider opacity-80">
                Rata-rata/Kejadian
              </span>
            </div>
            <p className="text-3xl font-bold">
              {details.length > 0
                ? (totalHours / details.length).toFixed(1)
                : "0"}
            </p>
            <p className="text-sm opacity-80">Jam</p>
          </div>
          <div
            className={cn(
              "p-4 rounded-xl",
              Number(percentageFromAverage) > 0
                ? "bg-gradient-to-br from-red-400 to-red-500 text-white"
                : "bg-gradient-to-br from-green-500 to-emerald-500 text-white"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              {Number(percentageFromAverage) > 0 ? (
                <TrendingUp className="h-4 w-4 opacity-80" />
              ) : (
                <TrendingDown className="h-4 w-4 opacity-80" />
              )}
              <span className="text-xs uppercase tracking-wider opacity-80">
                vs Rata-rata Bulanan
              </span>
            </div>
            <p className="text-3xl font-bold">
              {Number(percentageFromAverage) > 0 ? "+" : ""}
              {percentageFromAverage}%
            </p>
            <p className="text-sm opacity-80">
              {Number(percentageFromAverage) > 0
                ? "Di atas rata-rata"
                : "Di bawah rata-rata"}
            </p>
          </div>
        </div>

        {/* Breakdown by Equipment */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-500" />
            Breakdown per Equipment
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groupedByItem.slice(0, 6).map((item, index) => {
              const percentage =
                totalHours > 0
                  ? ((item.total / totalHours) * 100).toFixed(1)
                  : "0";
              return (
                <motion.div
                  key={item.item}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={cn(
                    "p-4 rounded-xl border transition-all duration-300 hover:shadow-lg",
                    index === 0
                      ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
                      : "bg-white dark:bg-dark-800 border-dark-100 dark:border-dark-700"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                          index === 0
                            ? "bg-red-500 text-white"
                            : "bg-dark-200 dark:bg-dark-600 text-dark-700 dark:text-dark-200"
                        )}
                      >
                        {index + 1}
                      </span>
                      <h4
                        className={cn(
                          "font-semibold",
                          index === 0
                            ? "text-red-700 dark:text-red-400"
                            : "text-dark-900 dark:text-white"
                        )}
                      >
                        {item.item}
                      </h4>
                    </div>
                    <Badge
                      variant={index === 0 ? "danger" : "warning"}
                      size="sm"
                    >
                      {percentage}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-dark-500 dark:text-dark-400">
                        Total:
                      </span>
                      <span
                        className={cn(
                          "ml-1 font-bold",
                          index === 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-dark-900 dark:text-white"
                        )}
                      >
                        {formatNumber(item.total)} Jam
                      </span>
                    </div>
                    <div>
                      <span className="text-dark-500 dark:text-dark-400">
                        Kejadian:
                      </span>
                      <span className="ml-1 font-medium text-dark-700 dark:text-dark-200">
                        {item.count}x
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                      className={cn(
                        "h-full rounded-full",
                        index === 0
                          ? "bg-gradient-to-r from-red-500 to-rose-500"
                          : "bg-gradient-to-r from-amber-400 to-orange-500"
                      )}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Detail Table */}
        <div>
          <h3 className="text-lg font-semibold text-dark-900 dark:text-white mb-4">
            Detail Kejadian ({details.length} record)
          </h3>
          <div className="overflow-x-auto rounded-xl border border-dark-100 dark:border-dark-700">
            <table className="w-full text-sm">
              <thead className="bg-dark-50 dark:bg-dark-800">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-dark-700 dark:text-dark-200">
                    No
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-dark-700 dark:text-dark-200">
                    Tanggal
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-dark-700 dark:text-dark-200">
                    Equipment
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-dark-700 dark:text-dark-200">
                    Deskripsi
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-dark-700 dark:text-dark-200">
                    Jam Off
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-dark-700 dark:text-dark-200">
                    Jam Start
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-dark-700 dark:text-dark-200">
                    Downtime (Jam)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-100 dark:divide-dark-700">
                {details
                  .sort(
                    (a, b) => parseNumber(b.downtime) - parseNumber(a.downtime)
                  )
                  .slice(0, 20)
                  .map((detail, index) => (
                    <tr
                      key={index}
                      className={cn(
                        "hover:bg-dark-50 dark:hover:bg-dark-700/50 transition-colors",
                        index === 0 && "bg-red-50 dark:bg-red-900/10"
                      )}
                    >
                      <td className="px-4 py-3 text-dark-600 dark:text-dark-300">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-dark-900 dark:text-white font-medium">
                        {new Date(detail.tanggal).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={index === 0 ? "danger" : "default"}
                          size="sm"
                        >
                          {detail.item}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-dark-600 dark:text-dark-300 max-w-xs truncate">
                        {detail.deskripsi || "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-dark-600 dark:text-dark-300">
                        {detail.jamOff || "-"}
                      </td>
                      <td className="px-4 py-3 text-center text-dark-600 dark:text-dark-300">
                        {detail.jamStart || "-"}
                      </td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-bold",
                          index === 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-amber-600 dark:text-amber-400"
                        )}
                      >
                        {formatNumber(parseNumber(detail.downtime))}
                      </td>
                    </tr>
                  ))}
              </tbody>
              {details.length > 20 && (
                <tfoot className="bg-dark-50 dark:bg-dark-800">
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-3 text-center text-dark-500 dark:text-dark-400"
                    >
                      ... dan {details.length - 20} record lainnya
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// MONTHLY DOWNTIME ANALYSIS CHART
// ============================================
interface MonthlyDowntimeData {
  month: string;
  monthIndex: number;
  hours: number;
  count: number;
  isHighest: boolean;
  rank: number;
  details: MonthlyDowntimeDetail[];
}

interface MonthlyDowntimeChartProps {
  downtimeData: Downtime[];
  year: number;
  plantLabel: string;
}

const MonthlyDowntimeChart = ({
  downtimeData,
  year,
  plantLabel,
}: MonthlyDowntimeChartProps) => {
  const [selectedMonth, setSelectedMonth] =
    useState<MonthlyDowntimeData | null>(null);

  // Process downtime data by month
  const monthlyData = useMemo(() => {
    const dataByMonth: MonthlyDowntimeData[] = MONTH_SHORT.map(
      (month, index) => {
        const monthDowntimes = downtimeData.filter((item) => {
          if (!item.tanggal) return false;
          const itemMonth = new Date(item.tanggal).getMonth();
          return itemMonth === index;
        });

        const totalHours = monthDowntimes.reduce(
          (sum, item) => sum + parseNumber(item.downtime),
          0
        );

        return {
          month,
          monthIndex: index,
          hours: totalHours,
          count: monthDowntimes.length,
          isHighest: false,
          rank: 0,
          details: monthDowntimes.map((d) => ({
            item: d.item,
            deskripsi: d.deskripsi,
            tanggal: d.tanggal,
            jamOff: d.jamOff,
            jamStart: d.jamStart,
            downtime: parseNumber(d.downtime),
          })),
        };
      }
    );

    // Calculate rankings (only for months with data)
    const sortedByHours = [...dataByMonth]
      .filter((d) => d.hours > 0)
      .sort((a, b) => b.hours - a.hours);

    sortedByHours.forEach((item, index) => {
      const original = dataByMonth.find(
        (d) => d.monthIndex === item.monthIndex
      );
      if (original) {
        original.rank = index + 1;
        if (index === 0) {
          original.isHighest = true;
        }
      }
    });

    return dataByMonth;
  }, [downtimeData]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalHours = monthlyData.reduce((sum, d) => sum + d.hours, 0);
    const monthsWithData = monthlyData.filter((d) => d.hours > 0).length;
    const averageHours = monthsWithData > 0 ? totalHours / monthsWithData : 0;
    const highestMonth = monthlyData.find((d) => d.isHighest);
    const maxHours = highestMonth?.hours || 0;

    return { totalHours, averageHours, highestMonth, maxHours, monthsWithData };
  }, [monthlyData]);

  // Custom bar component with click handler
  const handleBarClick = (data: MonthlyDowntimeData) => {
    if (data.hours > 0) {
      setSelectedMonth(data);
    }
  };

  // Get bar color based on ranking
  const getBarColor = (entry: MonthlyDowntimeData) => {
    if (entry.isHighest) return "#ef4444"; // red for highest
    if (entry.rank === 2) return "#f97316"; // orange for 2nd
    if (entry.rank === 3) return "#f59e0b"; // amber for 3rd
    return "#3b82f6"; // blue for others
  };

  // Custom label renderer
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, index } = props;
    const entry = monthlyData[index];
    if (value === 0) return null;

    return (
      <g>
        <text
          x={x + width / 2}
          y={y - 10}
          fill={entry.isHighest ? "#ef4444" : "#64748b"}
          textAnchor="middle"
          fontSize={11}
          fontWeight={entry.isHighest ? "bold" : "normal"}
        >
          {formatNumber(value)}
        </text>
        {entry.isHighest && (
          <text
            x={x + width / 2}
            y={y - 24}
            fill="#ef4444"
            textAnchor="middle"
            fontSize={10}
            fontWeight="bold"
          >
            ⚠️ TERTINGGI
          </text>
        )}
      </g>
    );
  };

  return (
    <>
      <Card className="overflow-hidden border-0 shadow-soft-lg">
        <CardHeader className="bg-gradient-to-r from-red-500 to-rose-500 text-white py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <CardTitle className="text-white text-lg">
                  Analisis Downtime Bulanan {year}
                </CardTitle>
              </div>
              <p className="text-red-100 text-sm">
                {plantLabel} • Klik bar untuk melihat detail
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
                <p className="text-red-100 text-xs">Total Tahunan</p>
                <p className="text-xl font-bold">
                  {formatNumber(stats.totalHours)} Jam
                </p>
              </div>
              {stats.highestMonth && (
                <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm border-2 border-white/30">
                  <p className="text-red-100 text-xs flex items-center gap-1">
                    <ChevronUp className="h-3 w-3" /> Bulan Tertinggi
                  </p>
                  <p className="text-xl font-bold">
                    {stats.highestMonth.month}
                  </p>
                  <p className="text-red-100 text-xs">
                    {formatNumber(stats.highestMonth.hours)} Jam
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
              <p className="text-xs text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                Total Kejadian
              </p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                {downtimeData.length}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
              <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                Rata-rata/Bulan
              </p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                {formatNumber(stats.averageHours)} Jam
              </p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
              <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                Bulan Dengan Data
              </p>
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {stats.monthsWithData} / 12
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 text-center">
              <p className="text-xs text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1">
                Rata-rata/Kejadian
              </p>
              <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                {downtimeData.length > 0
                  ? (stats.totalHours / downtimeData.length).toFixed(1)
                  : "0"}{" "}
                Jam
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyData}
                margin={{ top: 40, right: 30, left: 20, bottom: 20 }}
              >
                <defs>
                  <linearGradient id="gradDowntimeMonth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#60a5fa" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...modernGridStyle} />
                <XAxis
                  dataKey="month"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  label={{
                    value: "Jam",
                    angle: -90,
                    position: "insideLeft",
                    style: { textAnchor: "middle", fill: "#64748b" },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                    padding: "12px 16px",
                  }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as MonthlyDowntimeData;
                      return (
                        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-xl border border-dark-100 dark:border-dark-700 p-4 min-w-[200px]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-dark-900 dark:text-white">
                              {data.month} {year}
                            </span>
                            {data.isHighest && (
                              <Badge variant="danger" size="sm">
                                Tertinggi
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm">
                              <span className="text-dark-500 dark:text-dark-400">
                                Total Downtime:
                              </span>
                              <span
                                className={cn(
                                  "ml-2 font-bold",
                                  data.isHighest
                                    ? "text-red-600"
                                    : "text-amber-600"
                                )}
                              >
                                {formatNumber(data.hours)} Jam
                              </span>
                            </p>
                            <p className="text-sm">
                              <span className="text-dark-500 dark:text-dark-400">
                                Jumlah Kejadian:
                              </span>
                              <span className="ml-2 font-medium text-dark-700 dark:text-dark-200">
                                {data.count} kejadian
                              </span>
                            </p>
                            {data.rank > 0 && (
                              <p className="text-sm">
                                <span className="text-dark-500 dark:text-dark-400">
                                  Peringkat:
                                </span>
                                <span className="ml-2 font-medium text-dark-700 dark:text-dark-200">
                                  #{data.rank} dari {stats.monthsWithData} bulan
                                </span>
                              </p>
                            )}
                          </div>
                          {data.hours > 0 && (
                            <p className="text-xs text-primary-600 dark:text-primary-400 mt-3 pt-2 border-t border-dark-100 dark:border-dark-700">
                              Klik untuk melihat detail →
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {stats.averageHours > 0 && (
                  <ReferenceLine
                    y={stats.averageHours}
                    stroke="#22c55e"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      value: `Rata-rata: ${formatNumber(
                        stats.averageHours
                      )} Jam`,
                      position: "right",
                      fill: "#22c55e",
                      fontSize: 11,
                    }}
                  />
                )}
                <Bar
                  dataKey="hours"
                  radius={[8, 8, 0, 0]}
                  cursor="pointer"
                  onClick={(data) => handleBarClick(data)}
                >
                  {monthlyData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry)}
                      className="hover:opacity-80 transition-opacity"
                    />
                  ))}
                  <LabelList dataKey="hours" content={renderCustomLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-4 pt-4 border-t border-dark-100 dark:border-dark-700">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-dark-600 dark:text-dark-300">
                Tertinggi
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-orange-500"></div>
              <span className="text-sm text-dark-600 dark:text-dark-300">
                Top 2
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-amber-500"></div>
              <span className="text-sm text-dark-600 dark:text-dark-300">
                Top 3
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm text-dark-600 dark:text-dark-300">
                Lainnya
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-0.5 bg-green-500"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(to right, #22c55e, #22c55e 5px, transparent 5px, transparent 10px)",
                }}
              ></div>
              <span className="text-sm text-dark-600 dark:text-dark-300">
                Rata-rata
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedMonth && (
        <MonthlyDowntimeModal
          isOpen={!!selectedMonth}
          onClose={() => setSelectedMonth(null)}
          monthName={selectedMonth.month}
          monthIndex={selectedMonth.monthIndex}
          year={year}
          totalHours={selectedMonth.hours}
          details={selectedMonth.details}
          isHighest={selectedMonth.isHighest}
          rank={selectedMonth.rank}
          averageHours={stats.averageHours}
        />
      )}
    </>
  );
};

const DashboardPage = () => {
  const { user } = useAuthStore();
  const {
    dashboardPlantFilter,
    dashboardYear,
    setDashboardPlantFilter,
    setDashboardYear,
  } = useUIStore();

  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);

  // Production card filter (month filter for "Produksi Bulan" card)
  const [produksiMonthFilter, setProduksiMonthFilter] = useState<number>(
    new Date().getMonth()
  );

  // Downtime chart filter states
  const [downtimePeriodFilter, setDowntimePeriodFilter] = useState<
    "bulanan" | "tahunan"
  >("tahunan");
  const [downtimeValueFilter, setDowntimeValueFilter] = useState<
    "jam" | "frekuensi"
  >("jam");
  const [downtimeMonthFilter, setDowntimeMonthFilter] = useState<number>(
    new Date().getMonth()
  );

  // Pemakaian BB dashboard states
  const [pemakaianViewMode, setPemakaianViewMode] = useState<"chart" | "shift" | "trend">("chart");
  const [pemakaianSelectedMaterial, setPemakaianSelectedMaterial] = useState<string | null>(null);

  const [dashboardData, setDashboardData] = useState<DashboardData>({
    produksiNPK: [],
    produksiBlending: [],
    produksiNPKMini: [],
    downtime: [],
    workRequest: [],
    bahanBaku: [],
    vibrasi: [],
    gatePass: [],
    timesheetForklift: [],
    timesheetLoader: [],
    troubleRecord: [],
    rkap: [],
    rekapBBM: [],
    pemakaianBB: [],
  });

  // Determine if user can view all plants
  const userPlant = user?.plant;
  const userRole = user?.role;
  const canViewAllPlants =
    userPlant === "ALL" || userRole === "manager" || userRole === "eksternal";

  // Set initial plant filter based on user's plant
  useEffect(() => {
    if (!canViewAllPlants && userPlant) {
      setDashboardPlantFilter(userPlant as "NPK1" | "NPK2");
    }
  }, [userPlant, canViewAllPlants, setDashboardPlantFilter]);

  // Effective plant filter - use user's plant if they can't view all
  const effectivePlantFilter = canViewAllPlants
    ? dashboardPlantFilter
    : (userPlant as "NPK1" | "NPK2") || "NPK2";

  // Fetch all data from API
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, readData, SHEETS } = await import(
          "@/services/api"
        );

        // Fetch all data in parallel (tanpa pemantauanBB dulu)
        const [
          produksiNPKResult,
          produksiBlendingResult,
          produksiNPKMiniResult,
          downtimeResult,
          workRequestResult,
          bahanBakuResult,
          vibrasiResult,
          gatePassResult,
          timesheetForkliftResult,
          timesheetLoaderResult,
          troubleRecordResult,
          rkapResult,
          rekapBBMResult,
          pemakaianBBResult,
        ] = await Promise.all([
          fetchDataByPlant<ProduksiNPK>(SHEETS.PRODUKSI_NPK),
          fetchDataByPlant<ProduksiBlending>(SHEETS.PRODUKSI_BLENDING),
          fetchDataByPlant<ProduksiNPKMini>(SHEETS.PRODUKSI_NPK_MINI),
          fetchDataByPlant<Downtime>(SHEETS.DOWNTIME),
          fetchDataByPlant<WorkRequest>(SHEETS.WORK_REQUEST),
          fetchDataByPlant<BahanBaku>(SHEETS.BAHAN_BAKU),
          fetchDataByPlant<Vibrasi>(SHEETS.VIBRASI),
          fetchDataByPlant<GatePass>(SHEETS.GATE_PASS),
          fetchDataByPlant<TimesheetForklift>(SHEETS.TIMESHEET_FORKLIFT),
          fetchDataByPlant<TimesheetLoader>(SHEETS.TIMESHEET_LOADER),
          fetchDataByPlant<TroubleRecord>(SHEETS.TROUBLE_RECORD),
          readData<RKAP>(SHEETS.RKAP),
          fetchDataByPlant<RekapBBM>(SHEETS.REKAP_BBM),
          fetchDataByPlant<PemakaianBahanBaku>(SHEETS.PEMAKAIAN_BAHAN_BAKU),
        ]);

        setDashboardData({
          produksiNPK:
            produksiNPKResult.success && produksiNPKResult.data
              ? produksiNPKResult.data
              : [],
          produksiBlending:
            produksiBlendingResult.success && produksiBlendingResult.data
              ? produksiBlendingResult.data
              : [],
          produksiNPKMini:
            produksiNPKMiniResult.success && produksiNPKMiniResult.data
              ? produksiNPKMiniResult.data
              : [],
          downtime:
            downtimeResult.success && downtimeResult.data
              ? downtimeResult.data
              : [],
          workRequest:
            workRequestResult.success && workRequestResult.data
              ? workRequestResult.data
              : [],
          bahanBaku:
            bahanBakuResult.success && bahanBakuResult.data
              ? bahanBakuResult.data
              : [],
          vibrasi:
            vibrasiResult.success && vibrasiResult.data
              ? vibrasiResult.data
              : [],
          gatePass:
            gatePassResult.success && gatePassResult.data
              ? gatePassResult.data
              : [],
          timesheetForklift:
            timesheetForkliftResult.success && timesheetForkliftResult.data
              ? timesheetForkliftResult.data
              : [],
          timesheetLoader:
            timesheetLoaderResult.success && timesheetLoaderResult.data
              ? timesheetLoaderResult.data
              : [],
          troubleRecord:
            troubleRecordResult.success && troubleRecordResult.data
              ? troubleRecordResult.data
              : [],
          rkap: rkapResult.success && rkapResult.data ? rkapResult.data : [],
          rekapBBM:
            rekapBBMResult.success && rekapBBMResult.data
              ? rekapBBMResult.data
              : [],
          pemakaianBB:
            pemakaianBBResult.success && pemakaianBBResult.data
              ? pemakaianBBResult.data
              : [],
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);



  // Filter data by plant - use effectivePlantFilter
  const filterByPlant = useCallback(
    <T extends { _plant?: PlantType }>(data: T[]): T[] => {
      if (effectivePlantFilter === "ALL") return data;
      return data.filter((item) => item._plant === effectivePlantFilter);
    },
    [effectivePlantFilter]
  );

  // Filter RKAP by plant (uses 'plant' field instead of '_plant')
  const filterRKAPByPlant = useCallback(
    (data: RKAP[]): RKAP[] => {
      if (effectivePlantFilter === "ALL") return data;
      return data.filter((item) => item.plant === effectivePlantFilter);
    },
    [effectivePlantFilter]
  );

  // Filter data by year
  const filterByYear = useCallback(
    <T extends { tanggal?: string }>(data: T[]): T[] => {
      return data.filter((item) => {
        if (!item.tanggal) return false;
        const year = new Date(item.tanggal).getFullYear();
        return year === dashboardYear;
      });
    },
    [dashboardYear]
  );

  // Filtered data
  const filteredData = useMemo(() => {
    return {
      produksiNPK: filterByYear(filterByPlant(dashboardData.produksiNPK)),
      produksiBlending: filterByYear(
        filterByPlant(dashboardData.produksiBlending)
      ),
      produksiNPKMini: filterByYear(
        filterByPlant(dashboardData.produksiNPKMini)
      ),
      downtime: filterByYear(filterByPlant(dashboardData.downtime)),
      workRequest: filterByYear(filterByPlant(dashboardData.workRequest)),
      bahanBaku: filterByYear(filterByPlant(dashboardData.bahanBaku)),
      vibrasi: filterByYear(filterByPlant(dashboardData.vibrasi)),
      gatePass: filterByYear(filterByPlant(dashboardData.gatePass)),
      timesheetForklift: filterByYear(
        filterByPlant(dashboardData.timesheetForklift)
      ),
      timesheetLoader: filterByYear(
        filterByPlant(dashboardData.timesheetLoader)
      ),
      troubleRecord: filterByYear(filterByPlant(dashboardData.troubleRecord)),
      rekapBBM: filterByYear(filterByPlant(dashboardData.rekapBBM)),
      pemakaianBB: filterByYear(filterByPlant(dashboardData.pemakaianBB)),
      rkap: filterRKAPByPlant(dashboardData.rkap).filter(
        (item) => Number(item.tahun) === dashboardYear
      ),
    };
  }, [
    dashboardData,
    filterByPlant,
    filterByYear,
    filterRKAPByPlant,
    dashboardYear,
  ]);

  // Calculate metrics
  const metrics = useMemo(() => {
    // Total produksi NPK - use total field if available (not undefined/null), otherwise calculate from shifts
    const totalProduksiNPK = filteredData.produksiNPK.reduce((sum, item) => {
      // Check if total field exists and is a valid value (not undefined/null)
      // If total is 0, it's still valid and should be used
      const hasTotal = item.total !== undefined && item.total !== null;
      const total = hasTotal
        ? parseNumber(item.total)
        : parseNumber(item.shiftMalamOnspek) +
          parseNumber(item.shiftMalamOffspek) +
          parseNumber(item.shiftPagiOnspek) +
          parseNumber(item.shiftPagiOffspek) +
          parseNumber(item.shiftSoreOnspek) +
          parseNumber(item.shiftSoreOffspek);
      return sum + total;
    }, 0);

    const totalOnspek = filteredData.produksiNPK.reduce((sum, item) => {
      const hasTotal =
        item.totalOnspek !== undefined && item.totalOnspek !== null;
      return (
        sum +
        (hasTotal
          ? parseNumber(item.totalOnspek)
          : parseNumber(item.shiftMalamOnspek) +
            parseNumber(item.shiftPagiOnspek) +
            parseNumber(item.shiftSoreOnspek))
      );
    }, 0);

    const totalOffspek = filteredData.produksiNPK.reduce((sum, item) => {
      const hasTotal =
        item.totalOffspek !== undefined && item.totalOffspek !== null;
      return (
        sum +
        (hasTotal
          ? parseNumber(item.totalOffspek)
          : parseNumber(item.shiftMalamOffspek) +
            parseNumber(item.shiftPagiOffspek) +
            parseNumber(item.shiftSoreOffspek))
      );
    }, 0);

    // Total produksi blending
    const totalProduksiBlending = filteredData.produksiBlending.reduce(
      (sum, item) => sum + parseNumber(item.tonase),
      0
    );

    // Total produksi NPK Mini
    const totalProduksiNPKMini = filteredData.produksiNPKMini.reduce(
      (sum, item) => sum + parseNumber(item.tonase),
      0
    );

    // Total RKAP target - sum all monthly targets from all matching RKAP records
    const totalRKAP = filteredData.rkap.reduce((total, rkapItem) => {
      const hasTotal = rkapItem.total !== undefined && rkapItem.total !== null;
      const rkapTotal = hasTotal
        ? parseNumber(rkapItem.total)
        : MONTH_KEY.reduce(
            (sum, monthKey) =>
              sum + parseNumber(rkapItem[monthKey as keyof RKAP]),
            0
          );
      return total + rkapTotal;
    }, 0);

    // Separate RKAP targets for NPK1 and NPK2
    const rkapNPK1 = dashboardData.rkap
      .filter(
        (item) => item.plant === "NPK1" && Number(item.tahun) === dashboardYear
      )
      .reduce((total, rkapItem) => {
        const hasTotal =
          rkapItem.total !== undefined && rkapItem.total !== null;
        return (
          total +
          (hasTotal
            ? parseNumber(rkapItem.total)
            : MONTH_KEY.reduce(
                (sum, monthKey) =>
                  sum + parseNumber(rkapItem[monthKey as keyof RKAP]),
                0
              ))
        );
      }, 0);

    const rkapNPK2 = dashboardData.rkap
      .filter(
        (item) => item.plant === "NPK2" && Number(item.tahun) === dashboardYear
      )
      .reduce((total, rkapItem) => {
        const hasTotal =
          rkapItem.total !== undefined && rkapItem.total !== null;
        return (
          total +
          (hasTotal
            ? parseNumber(rkapItem.total)
            : MONTH_KEY.reduce(
                (sum, monthKey) =>
                  sum + parseNumber(rkapItem[monthKey as keyof RKAP]),
                0
              ))
        );
      }, 0);

    // Produksi per plant for separate calculations
    const produksiNPK1 = dashboardData.produksiNPK
      .filter(
        (item) =>
          item._plant === "NPK1" &&
          new Date(item.tanggal).getFullYear() === dashboardYear
      )
      .reduce((sum, item) => {
        const hasTotal = item.total !== undefined && item.total !== null;
        return (
          sum +
          (hasTotal
            ? parseNumber(item.total)
            : parseNumber(item.shiftMalamOnspek) +
              parseNumber(item.shiftMalamOffspek) +
              parseNumber(item.shiftPagiOnspek) +
              parseNumber(item.shiftPagiOffspek) +
              parseNumber(item.shiftSoreOnspek) +
              parseNumber(item.shiftSoreOffspek))
        );
      }, 0);

    const produksiNPK2 = dashboardData.produksiNPK
      .filter(
        (item) =>
          item._plant === "NPK2" &&
          new Date(item.tanggal).getFullYear() === dashboardYear
      )
      .reduce((sum, item) => {
        const hasTotal = item.total !== undefined && item.total !== null;
        return (
          sum +
          (hasTotal
            ? parseNumber(item.total)
            : parseNumber(item.shiftMalamOnspek) +
              parseNumber(item.shiftMalamOffspek) +
              parseNumber(item.shiftPagiOnspek) +
              parseNumber(item.shiftPagiOffspek) +
              parseNumber(item.shiftSoreOnspek) +
              parseNumber(item.shiftSoreOffspek))
        );
      }, 0);

    // Total downtime
    const totalDowntime = filteredData.downtime.reduce(
      (sum, item) => sum + parseNumber(item.downtime),
      0
    );

    // Work request counts
    const workRequestTotal = filteredData.workRequest.length;
    const workRequestPending = filteredData.workRequest.filter(
      (item) => !item.eksekutor || item.eksekutor === ""
    ).length;

    // Bahan baku total
    const totalBahanBaku = filteredData.bahanBaku.reduce(
      (sum, item) => sum + parseNumber(item.jumlah),
      0
    );

    // Vibrasi warnings
    const vibrasiWarnings = filteredData.vibrasi.filter(
      (item) =>
        item.status === "Warning" ||
        item.status === "Critical" ||
        item.status === "Alert"
    ).length;

    // Gate pass count
    const gatePassCount = filteredData.gatePass.length;

    // Trouble record open
    const troubleRecordOpen = filteredData.troubleRecord.filter(
      (item) => item.status === "Open" || item.status === "In Progress"
    ).length;

    // Forklift & Loader hours - use parseNumber to handle string/number values
    const forkliftHours = filteredData.timesheetForklift.reduce(
      (sum, item) => sum + parseNumber(item.jamOperasi),
      0
    );
    const loaderHours = filteredData.timesheetLoader.reduce(
      (sum, item) => sum + parseNumber(item.jamOperasi),
      0
    );

    // BBM Statistics
    const bbmPengajuan = filteredData.rekapBBM.reduce(
      (sum, item) => sum + parseNumber(item.pengajuanSolar),
      0
    );
    const bbmRealisasi = filteredData.rekapBBM.reduce(
      (sum, item) => sum + parseNumber(item.realisasiPengisian),
      0
    );
    const bbmSelisih = bbmRealisasi - bbmPengajuan;

    return {
      totalProduksiNPK,
      totalOnspek,
      totalOffspek,
      totalProduksiBlending,
      totalProduksiNPKMini,
      totalRKAP,
      totalDowntime,
      workRequestTotal,
      workRequestPending,
      totalBahanBaku,
      vibrasiWarnings,
      gatePassCount,
      troubleRecordOpen,
      forkliftHours,
      loaderHours,
      bbmPengajuan,
      bbmRealisasi,
      bbmSelisih,
      bbmRecordCount: filteredData.rekapBBM.length,
      percentage:
        totalRKAP > 0 ? ((totalProduksiNPK / totalRKAP) * 100).toFixed(1) : "0",
      rkapNPK1,
      rkapNPK2,
      produksiNPK1,
      produksiNPK2,
      percentageNPK1:
        rkapNPK1 > 0 ? ((produksiNPK1 / rkapNPK1) * 100).toFixed(1) : "0",
      percentageNPK2:
        rkapNPK2 > 0 ? ((produksiNPK2 / rkapNPK2) * 100).toFixed(1) : "0",
    };
  }, [filteredData, dashboardData, dashboardYear]);

  // Monthly chart data
  const monthlyChartData = useMemo(() => {
    const monthlyData = MONTH_SHORT.map((bulan, index) => {
      // Filter produksi by month
      const monthProduksi = filteredData.produksiNPK.filter((item) => {
        const month = new Date(item.tanggal).getMonth();
        return month === index;
      });

      const produksi = monthProduksi.reduce((sum, item) => {
        const hasTotal = item.total !== undefined && item.total !== null;
        return (
          sum +
          (hasTotal
            ? parseNumber(item.total)
            : parseNumber(item.shiftMalamOnspek) +
              parseNumber(item.shiftMalamOffspek) +
              parseNumber(item.shiftPagiOnspek) +
              parseNumber(item.shiftPagiOffspek) +
              parseNumber(item.shiftSoreOnspek) +
              parseNumber(item.shiftSoreOffspek))
        );
      }, 0);

      const onspek = monthProduksi.reduce((sum, item) => {
        const hasTotal =
          item.totalOnspek !== undefined && item.totalOnspek !== null;
        return (
          sum +
          (hasTotal
            ? parseNumber(item.totalOnspek)
            : parseNumber(item.shiftMalamOnspek) +
              parseNumber(item.shiftPagiOnspek) +
              parseNumber(item.shiftSoreOnspek))
        );
      }, 0);

      const offspek = monthProduksi.reduce((sum, item) => {
        const hasTotal =
          item.totalOffspek !== undefined && item.totalOffspek !== null;
        return (
          sum +
          (hasTotal
            ? parseNumber(item.totalOffspek)
            : parseNumber(item.shiftMalamOffspek) +
              parseNumber(item.shiftPagiOffspek) +
              parseNumber(item.shiftSoreOffspek))
        );
      }, 0);

      // Get RKAP for this month - sum all plants if filter is "ALL"
      const monthKey = MONTH_KEY[index];
      const rkap = filteredData.rkap.reduce((sum, rkapItem) => {
        return sum + parseNumber(rkapItem[monthKey as keyof RKAP]);
      }, 0);

      // Get separate RKAP for NPK1 and NPK2
      const rkapNPK1 = dashboardData.rkap
        .filter(
          (item) =>
            item.plant === "NPK1" && Number(item.tahun) === dashboardYear
        )
        .reduce((sum, rkapItem) => {
          return sum + parseNumber(rkapItem[monthKey as keyof RKAP]);
        }, 0);

      const rkapNPK2 = dashboardData.rkap
        .filter(
          (item) =>
            item.plant === "NPK2" && Number(item.tahun) === dashboardYear
        )
        .reduce((sum, rkapItem) => {
          return sum + parseNumber(rkapItem[monthKey as keyof RKAP]);
        }, 0);

      return { bulan, produksi, rkap, rkapNPK1, rkapNPK2, onspek, offspek };
    });

    return monthlyData;
  }, [filteredData, dashboardData, dashboardYear]);

  // Current month production data (filtered by produksiMonthFilter)
  const currentMonthData = useMemo(() => {
    const selectedMonth = produksiMonthFilter;
    const currentMonthName = MONTH_SHORT[selectedMonth];
    const monthKey = MONTH_KEY[selectedMonth];

    // NPK Production this month
    const npkThisMonth = filteredData.produksiNPK.filter((item) => {
      const month = new Date(item.tanggal).getMonth();
      return month === selectedMonth;
    });

    const npkProduksi = npkThisMonth.reduce((sum, item) => {
      const hasTotal = item.total !== undefined && item.total !== null;
      return (
        sum +
        (hasTotal
          ? parseNumber(item.total)
          : parseNumber(item.shiftMalamOnspek) +
            parseNumber(item.shiftMalamOffspek) +
            parseNumber(item.shiftPagiOnspek) +
            parseNumber(item.shiftPagiOffspek) +
            parseNumber(item.shiftSoreOnspek) +
            parseNumber(item.shiftSoreOffspek))
      );
    }, 0);

    const npkOnspek = npkThisMonth.reduce((sum, item) => {
      const hasTotal =
        item.totalOnspek !== undefined && item.totalOnspek !== null;
      return (
        sum +
        (hasTotal
          ? parseNumber(item.totalOnspek)
          : parseNumber(item.shiftMalamOnspek) +
            parseNumber(item.shiftPagiOnspek) +
            parseNumber(item.shiftSoreOnspek))
      );
    }, 0);

    const npkOffspek = npkThisMonth.reduce((sum, item) => {
      const hasTotal =
        item.totalOffspek !== undefined && item.totalOffspek !== null;
      return (
        sum +
        (hasTotal
          ? parseNumber(item.totalOffspek)
          : parseNumber(item.shiftMalamOffspek) +
            parseNumber(item.shiftPagiOffspek) +
            parseNumber(item.shiftSoreOffspek))
      );
    }, 0);

    // Blending Production this month
    const blendingThisMonth = filteredData.produksiBlending.filter((item) => {
      const month = new Date(item.tanggal).getMonth();
      return month === selectedMonth;
    });

    const blendingProduksi = blendingThisMonth.reduce((sum, item) => {
      return sum + parseNumber(item.tonase);
    }, 0);

    // NPK Mini Production this month
    const npkMiniThisMonth = filteredData.produksiNPKMini.filter((item) => {
      const month = new Date(item.tanggal).getMonth();
      return month === selectedMonth;
    });

    const npkMiniProduksi = npkMiniThisMonth.reduce((sum, item) => {
      return sum + parseNumber(item.tonase);
    }, 0);

    // RKAP for this month
    const rkapThisMonth = filteredData.rkap.reduce((sum, rkapItem) => {
      return sum + parseNumber(rkapItem[monthKey as keyof RKAP]);
    }, 0);

    const percentageRkap =
      rkapThisMonth > 0
        ? ((npkProduksi / rkapThisMonth) * 100).toFixed(1)
        : "0";

    return {
      monthName: currentMonthName,
      npkProduksi,
      npkOnspek,
      npkOffspek,
      blendingProduksi,
      npkMiniProduksi,
      rkapThisMonth,
      percentageRkap,
      totalProduksi: npkProduksi + blendingProduksi + npkMiniProduksi,
    };
  }, [filteredData, produksiMonthFilter]);

  // Downtime by equipment chart data - with period and value filters
  const downtimeChartData = useMemo(() => {
    // Filter by period (bulanan/tahunan)
    let filteredDowntime = filteredData.downtime;

    if (downtimePeriodFilter === "bulanan") {
      filteredDowntime = filteredData.downtime.filter((item) => {
        if (!item.tanggal) return false;
        const month = new Date(item.tanggal).getMonth();
        return month === downtimeMonthFilter;
      });
    }

    const downtimeByItem: {
      [key: string]: { jam: number; frekuensi: number };
    } = {};
    filteredDowntime.forEach((item) => {
      const key = item.item || "Unknown";
      if (!downtimeByItem[key]) {
        downtimeByItem[key] = { jam: 0, frekuensi: 0 };
      }
      downtimeByItem[key].jam += parseNumber(item.downtime);
      downtimeByItem[key].frekuensi += 1;
    });

    return Object.entries(downtimeByItem)
      .map(([item, data]) => ({
        item,
        downtime: downtimeValueFilter === "jam" ? data.jam : data.frekuensi,
        jam: data.jam,
        frekuensi: data.frekuensi,
      }))
      .sort((a, b) => b.downtime - a.downtime)
      .slice(0, 8);
  }, [
    filteredData,
    downtimePeriodFilter,
    downtimeValueFilter,
    downtimeMonthFilter,
  ]);

  // Calculate total downtime for filtered data
  const filteredTotalDowntime = useMemo(() => {
    let filteredDowntime = filteredData.downtime;

    if (downtimePeriodFilter === "bulanan") {
      filteredDowntime = filteredData.downtime.filter((item) => {
        if (!item.tanggal) return false;
        const month = new Date(item.tanggal).getMonth();
        return month === downtimeMonthFilter;
      });
    }

    if (downtimeValueFilter === "jam") {
      return filteredDowntime.reduce(
        (sum, item) => sum + parseNumber(item.downtime),
        0
      );
    } else {
      return filteredDowntime.length;
    }
  }, [
    filteredData,
    downtimePeriodFilter,
    downtimeValueFilter,
    downtimeMonthFilter,
  ]);

  // Work request by eksekutor chart data
  const workRequestChartData = useMemo(() => {
    const wrByEksekutor: { [key: string]: number } = {};
    filteredData.workRequest.forEach((item) => {
      const key = item.eksekutor || "Belum Ditentukan";
      wrByEksekutor[key] = (wrByEksekutor[key] || 0) + 1;
    });

    return Object.entries(wrByEksekutor)
      .map(([eksekutor, count]) => ({ eksekutor, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredData]);

  // Vibrasi status chart data
  const vibrasiChartData = useMemo(() => {
    const statusCount: { [key: string]: number } = {};
    filteredData.vibrasi.forEach((item) => {
      const key = item.status || "Unknown";
      statusCount[key] = (statusCount[key] || 0) + 1;
    });

    return Object.entries(statusCount).map(([status, count]) => ({
      status,
      count,
    }));
  }, [filteredData]);

  // Produksi breakdown chart data
  const produksiBreakdownData = useMemo(() => {
    return [
      { name: "NPK Granul", value: metrics.totalProduksiNPK },
      { name: "Blending/Retail", value: metrics.totalProduksiBlending },
      { name: "NPK Mini", value: metrics.totalProduksiNPKMini },
    ].filter((item) => item.value > 0);
  }, [metrics]);

  const plantLabel =
    effectivePlantFilter === "ALL"
      ? "Semua Plant"
      : effectivePlantFilter === "NPK1"
      ? "NPK Plant 1"
      : "NPK Plant 2";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary-500 mx-auto" />
          <p className="mt-4 text-muted-foreground">
            Memuat data dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/20">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-display font-bold text-foreground tracking-tight">
                Dashboard - {plantLabel}
              </h1>
              <p className="text-muted-foreground text-sm">
                Selamat datang, {user?.namaLengkap || user?.nama}! Ringkasan
                data {plantLabel.toLowerCase()} tahun {dashboardYear}.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Only show plant filter if user can view all plants */}
          {canViewAllPlants && (
            <Select
              value={effectivePlantFilter}
              onChange={(e) =>
                setDashboardPlantFilter(
                  e.target.value as "ALL" | "NPK1" | "NPK2"
                )
              }
              options={[
                { value: "ALL", label: "Semua Plant" },
                { value: "NPK1", label: "NPK 1" },
                { value: "NPK2", label: "NPK 2" },
              ]}
              className="w-40"
            />
          )}
          <Select
            value={dashboardYear.toString()}
            onChange={(e) => setDashboardYear(Number(e.target.value))}
            options={[
              { value: "2023", label: "2023" },
              { value: "2024", label: "2024" },
              { value: "2025", label: "2025" },
              { value: "2026", label: "2026" },
            ]}
            className="w-32"
          />
        </div>
      </div>

      {/* Produksi Bulan Ini — Modern Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-cyan-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-500/15"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 w-48 h-48 rounded-full bg-white/10 blur-2xl" />
        </div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div
              onClick={() =>
                navigate(
                  `/produksi/${effectivePlantFilter === "NPK1" ? "npk1" : "npk2"}`
                )
              }
              className="cursor-pointer hover:opacity-90 transition-opacity"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">
                    Produksi Bulan {currentMonthData.monthName} {dashboardYear}
                  </h2>
                  <p className="text-blue-100 text-sm">
                    Ringkasan produksi {plantLabel.toLowerCase()} bulan ini
                  </p>
                </div>
                <ArrowUpRight className="h-5 w-5 opacity-60 ml-1" />
              </div>
            </div>

            {/* Month Filter */}
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <select
                value={produksiMonthFilter}
                onChange={(e) => setProduksiMonthFilter(Number(e.target.value))}
                className="bg-white/15 backdrop-blur-sm text-white border border-white/20 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer hover:bg-white/20 transition-colors"
              >
                {MONTH_SHORT.map((month, index) => (
                  <option key={index} value={index} className="text-dark-900">
                    {month}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            onClick={() =>
              navigate(
                `/produksi/${effectivePlantFilter === "NPK1" ? "npk1" : "npk2"}`
              )
            }
            className="cursor-pointer hover:opacity-95 transition-opacity"
          >
            <div className="flex flex-wrap gap-4 lg:gap-6 mt-5">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3.5 min-w-[140px] border border-white/10 hover:bg-white/15 transition-colors">
                <p className="text-blue-100 text-[10px] uppercase tracking-wider font-semibold mb-1">
                  NPK Produksi
                </p>
                <p className="text-2xl lg:text-3xl font-bold tabular-nums">
                  {formatNumber(currentMonthData.npkProduksi)}
                </p>
                <p className="text-blue-200 text-xs">Ton</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3.5 min-w-[140px] border border-white/10 hover:bg-white/15 transition-colors">
                <p className="text-blue-100 text-[10px] uppercase tracking-wider font-semibold mb-1">
                  Target RKAP
                </p>
                <p className="text-2xl lg:text-3xl font-bold tabular-nums">
                  {formatNumber(currentMonthData.rkapThisMonth)}
                </p>
                <p className="text-blue-200 text-xs">Ton</p>
              </div>

              <div className="bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3.5 min-w-[140px] border border-white/10 hover:bg-white/15 transition-colors">
                <p className="text-blue-100 text-xs uppercase tracking-wider font-semibold mb-1">
                  Pencapaian
                </p>
                <p className="text-2xl lg:text-3xl font-bold tabular-nums">
                  {currentMonthData.percentageRkap}%
                </p>
                <p className="text-blue-200 text-xs">
                  {Number(currentMonthData.percentageRkap) >= 100
                    ? "✓ Target Tercapai"
                    : "dari target"}
                </p>
              </div>
            </div>
          </div>

          {/* Sub-detail row */}
          <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-blue-200 text-xs font-medium">Onspek</p>
              <p className="font-semibold tabular-nums">
                {formatNumber(currentMonthData.npkOnspek)} Ton
              </p>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-blue-200 text-xs font-medium">Offspek</p>
              <p className="font-semibold tabular-nums">
                {formatNumber(currentMonthData.npkOffspek)} Ton
              </p>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-blue-200 text-xs font-medium">Blending</p>
              <p className="font-semibold tabular-nums">
                {formatNumber(currentMonthData.blendingProduksi)} Ton
              </p>
            </div>
            <div className="bg-white/5 rounded-lg px-3 py-2">
              <p className="text-blue-200 text-xs font-medium">NPK Mini</p>
              <p className="font-semibold tabular-nums">
                {formatNumber(currentMonthData.npkMiniProduksi)} Ton
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produksi Section — Modern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() =>
            navigate(
              `/produksi/${effectivePlantFilter === "NPK1" ? "npk1" : "npk2"}`
            )
          }
          className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 rounded-2xl p-5 text-white cursor-pointer hover:shadow-xl hover:shadow-blue-500/15 transition-all duration-300 group"
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/30 blur-2xl" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
                  <Factory className="h-4 w-4" />
                </div>
                <h3 className="font-bold text-base">Produksi Tahunan {dashboardYear}</h3>
              </div>
              <ArrowUpRight className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                NPK Granul
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalProduksiNPK)}
              </p>
              <p className="text-blue-100 text-[10px]">
                Ton ({metrics.percentage}% RKAP)
              </p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                Onspek
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalOnspek)}
              </p>
              <p className="text-blue-100 text-[10px]">Ton</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                Offspek
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalOffspek)}
              </p>
              <p className="text-blue-100 text-[10px]">Ton</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                Target RKAP
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalRKAP)}
              </p>
              <p className="text-blue-100 text-[10px]">Ton</p>
            </div>
          </div>
          {/* Show separate NPK1 and NPK2 RKAP when viewing ALL */}
          {effectivePlantFilter === "ALL" && (
            <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-3">
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                    NPK 1
                  </p>
                  <Badge
                    variant={
                      Number(metrics.percentageNPK1) >= 100
                        ? "success"
                        : "warning"
                    }
                    size="sm"
                    className="text-[9px] px-1.5 py-0.5"
                  >
                    {metrics.percentageNPK1}%
                  </Badge>
                </div>
                <p className="font-semibold">
                  {formatNumber(metrics.produksiNPK1)} /{" "}
                  {formatNumber(metrics.rkapNPK1)} Ton
                </p>
              </div>
              <div className="bg-white/10 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-blue-100 text-[10px] uppercase tracking-wider">
                    NPK 2
                  </p>
                  <Badge
                    variant={
                      Number(metrics.percentageNPK2) >= 100
                        ? "success"
                        : "warning"
                    }
                    size="sm"
                    className="text-[9px] px-1.5 py-0.5"
                  >
                    {metrics.percentageNPK2}%
                  </Badge>
                </div>
                <p className="font-semibold">
                  {formatNumber(metrics.produksiNPK2)} /{" "}
                  {formatNumber(metrics.rkapNPK2)} Ton
                </p>
              </div>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-3">
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-blue-100 text-[10px]">Blending/Retail</p>
              <p className="font-semibold">
                {formatNumber(metrics.totalProduksiBlending)} Ton
              </p>
            </div>
            <div className="bg-white/10 rounded-lg px-3 py-2">
              <p className="text-blue-100 text-[10px]">NPK Mini</p>
              <p className="font-semibold">
                {formatNumber(metrics.totalProduksiNPKMini)} Ton
              </p>
            </div>
          </div>
          </div>
        </motion.div>

        {/* Operasional Section — Modern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-gradient-to-br from-slate-700 via-slate-700 to-gray-800 rounded-2xl p-5 text-white shadow-xl shadow-slate-800/15"
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-white/30 blur-2xl" />
          </div>
          <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
                <Truck className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base">Operasional & Logistik</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              onClick={() =>
                navigate(
                  `/laporan/timesheet-forklift-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-slate-200 text-[10px] uppercase tracking-wider">
                Forklift
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.forkliftHours)}
              </p>
              <p className="text-slate-200 text-[10px]">
                Jam ({filteredData.timesheetForklift.length} rec)
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/laporan/timesheet-loader-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-slate-200 text-[10px] uppercase tracking-wider">
                Loader
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.loaderHours)}
              </p>
              <p className="text-slate-200 text-[10px]">
                Jam ({filteredData.timesheetLoader.length} rec)
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/gate-pass-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-slate-200 text-[10px] uppercase tracking-wider">
                Gate Pass
              </p>
              <p className="text-xl font-bold">{metrics.gatePassCount}</p>
              <p className="text-slate-200 text-[10px]">Transaksi</p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/bahan-baku-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-slate-200 text-[10px] uppercase tracking-wider">
                Bahan Baku
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalBahanBaku)}
              </p>
              <p className="text-slate-200 text-[10px]">
                {filteredData.bahanBaku.length} item
              </p>
            </div>
          </div>
          </div>
        </motion.div>
      </div>

      {/* Maintenance & Issues Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downtime & Issues — Modern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="relative overflow-hidden bg-gradient-to-br from-rose-600 via-red-600 to-pink-700 rounded-2xl p-5 text-white shadow-xl shadow-red-500/15"
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute -left-12 -top-12 w-48 h-48 rounded-full bg-white/30 blur-2xl" />
          </div>
          <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
                <Clock className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base">Downtime & Issues</h3>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div
              onClick={() =>
                navigate(
                  `/laporan/downtime-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-red-100 text-[10px] uppercase tracking-wider">
                Total Downtime
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.totalDowntime)}
              </p>
              <p className="text-red-100 text-[10px]">
                Jam ({filteredData.downtime.length} kejadian)
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/work-request-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-red-100 text-[10px] uppercase tracking-wider">
                Work Request
              </p>
              <p className="text-xl font-bold">{metrics.workRequestTotal}</p>
              <p className="text-red-100 text-[10px]">
                {metrics.workRequestPending} pending
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/trouble-record-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-red-100 text-[10px] uppercase tracking-wider">
                Trouble Open
              </p>
              <p className="text-xl font-bold">{metrics.troubleRecordOpen}</p>
              <p className="text-red-100 text-[10px]">
                dari {filteredData.troubleRecord.length} total
              </p>
            </div>
            <div
              onClick={() =>
                navigate(
                  `/data/vibrasi-${
                    effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
                  }`
                )
              }
              className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm cursor-pointer hover:bg-white/30 transition-colors"
            >
              <p className="text-red-100 text-[10px] uppercase tracking-wider">
                Vibrasi Alert
              </p>
              <p className="text-xl font-bold">{metrics.vibrasiWarnings}</p>
              <p className="text-red-100 text-[10px]">
                dari {filteredData.vibrasi.length} ukur
              </p>
            </div>
          </div>
          </div>
        </motion.div>

        {/* BBM Summary Section — Modern */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() =>
            navigate(
              `/data/rekap-bbm-${
                effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
              }`
            )
          }
          className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-xl shadow-amber-500/15 cursor-pointer hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 group"
        >
          <div className="absolute inset-0 opacity-5">
            <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/30 blur-2xl" />
          </div>
          <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
                <Fuel className="h-4 w-4" />
              </div>
              <h3 className="font-bold text-base">
                Rekap BBM Alat Berat {dashboardYear}
              </h3>
            </div>
            <ArrowUpRight className="h-4 w-4 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-amber-100 text-[10px] uppercase tracking-wider">
                Pengajuan
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.bbmPengajuan)}
              </p>
              <p className="text-amber-100 text-[10px]">Liter</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-amber-100 text-[10px] uppercase tracking-wider">
                Realisasi
              </p>
              <p className="text-xl font-bold">
                {formatNumber(metrics.bbmRealisasi)}
              </p>
              <p className="text-amber-100 text-[10px]">Liter</p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-amber-100 text-[10px] uppercase tracking-wider">
                Selisih
              </p>
              <p className="text-xl font-bold">
                {metrics.bbmSelisih >= 0 ? "+" : ""}
                {formatNumber(metrics.bbmSelisih)}
              </p>
              <p className="text-amber-100 text-[10px]">
                {metrics.bbmSelisih >= 0 ? "Surplus" : "Defisit"}
              </p>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
              <p className="text-amber-100 text-[10px] uppercase tracking-wider">
                Record
              </p>
              <p className="text-xl font-bold">{metrics.bbmRecordCount}</p>
              <p className="text-amber-100 text-[10px]">Pengajuan</p>
            </div>
          </div>
          </div>
        </motion.div>
      </div>

      {/* ============================================ */}
      {/* PEMAKAIAN BAHAN BAKU SECTION — Interactive */}
      {/* ============================================ */}
      {(() => {
        const MATERIAL_FIELDS: { key: keyof PemakaianBahanBaku; label: string; unit: string; color: string }[] = [
          { key: "urea", label: "Urea", unit: "Bucket", color: "#6366f1" },
          { key: "dap", label: "DAP", unit: "Bucket", color: "#06b6d4" },
          { key: "kcl", label: "KCL", unit: "Bucket", color: "#10b981" },
          { key: "za", label: "ZA", unit: "Bucket", color: "#f59e0b" },
          { key: "clayJumbo", label: "Clay (Jumbo)", unit: "Jumbo", color: "#ef4444" },
          { key: "clayBucket", label: "Clay (Bucket)", unit: "Bucket", color: "#8b5cf6" },
          { key: "pewarna", label: "Pewarna", unit: "Bag", color: "#ec4899" },
          { key: "coatingOilLigno", label: "Coating Oil LIGNO", unit: "Dus", color: "#14b8a6" },
          { key: "riject", label: "Riject", unit: "Bucket", color: "#f97316" },
          { key: "tinta", label: "Tinta", unit: "pcs", color: "#a855f7" },
          { key: "rekon", label: "Rekon", unit: "Ton", color: "#0ea5e9" },
          { key: "makeupIjp", label: "MAKEUP IJP", unit: "pcs", color: "#84cc16" },
        ];

        const pemakaianData = filteredData.pemakaianBB;
        const totalRecords = pemakaianData.length;

        // Calculate totals per material
        const materialTotals = MATERIAL_FIELDS.map((mat) => {
          const total = pemakaianData.reduce(
            (sum, item) => sum + (parseNumber((item as unknown as Record<string, number>)[mat.key as string]) || 0),
            0
          );
          return { ...mat, total };
        });

        // Group materials by unit for fair comparison
        const unitGroups = materialTotals.reduce((acc, mat) => {
          if (!acc[mat.unit]) acc[mat.unit] = [];
          acc[mat.unit].push(mat);
          return acc;
        }, {} as Record<string, typeof materialTotals>);

        // Shift breakdown
        const shiftData = [
          { name: "Malam", value: pemakaianData.filter((d) => d.shift === "Malam").length, color: "#6366f1" },
          { name: "Pagi", value: pemakaianData.filter((d) => d.shift === "Pagi").length, color: "#f59e0b" },
          { name: "Sore", value: pemakaianData.filter((d) => d.shift === "Sore").length, color: "#ef4444" },
        ];

        // Shift material breakdown for selected material
        const shiftMaterialData = pemakaianSelectedMaterial
          ? (() => {
              const mat = MATERIAL_FIELDS.find((m) => m.key === pemakaianSelectedMaterial);
              if (!mat) return [];
              return ["Malam", "Pagi", "Sore"].map((shift) => {
                const total = pemakaianData
                  .filter((d) => d.shift === shift)
                  .reduce(
                    (sum, item) => sum + (parseNumber((item as unknown as Record<string, number>)[mat.key as string]) || 0),
                    0
                  );
                return { shift, total, fill: shift === "Malam" ? "#6366f1" : shift === "Pagi" ? "#f59e0b" : "#ef4444" };
              });
            })()
          : [];

        // Monthly trend data — only compare materials with same unit (Bucket group)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
        const bucketMaterials = materialTotals.filter((m) => m.unit === "Bucket");
        const monthlyTrend = monthNames.map((month, idx) => {
          const monthData = pemakaianData.filter((d) => {
            if (!d.tanggal) return false;
            return new Date(d.tanggal).getMonth() === idx;
          });
          const entry: Record<string, unknown> = { bulan: month, records: monthData.length };
          bucketMaterials.forEach((mat) => {
            entry[mat.label] = monthData.reduce(
              (sum, item) => sum + (parseNumber((item as unknown as Record<string, number>)[mat.key as string]) || 0),
              0
            );
          });
          return entry;
        });
        const trendMaterials = bucketMaterials;

        // Bar chart data grouped by unit (only show same-unit comparisons)
        const barChartDataByUnit = Object.entries(unitGroups).map(([unit, mats]) => ({
          unit,
          data: mats.map((m) => ({
            name: m.label,
            total: Math.round(m.total * 100) / 100,
            fill: m.color,
            color: m.color,
          })),
        }));

        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="space-y-4"
          >
            {/* Header Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-xl shadow-teal-500/15">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/30 blur-2xl" />
                <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-white/20 blur-xl" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-white/15 backdrop-blur-sm border border-white/10">
                      <FlaskConical className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">
                        Pemakaian Bahan Baku {dashboardYear}
                      </h3>
                      <p className="text-teal-100 text-xs">
                        {totalRecords} record dari {pemakaianData.filter((d) => d.shift === "Malam").length + pemakaianData.filter((d) => d.shift === "Pagi").length + pemakaianData.filter((d) => d.shift === "Sore").length} shift
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {(["chart", "shift", "trend"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPemakaianViewMode(mode)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200",
                          pemakaianViewMode === mode
                            ? "bg-white/25 shadow-lg backdrop-blur-sm border border-white/20"
                            : "bg-white/10 hover:bg-white/15 border border-transparent"
                        )}
                      >
                        {mode === "chart" ? "📊 Material" : mode === "shift" ? "🔄 Shift" : "📈 Trend"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {materialTotals.slice(0, 6).map((mat, idx) => (
                    <motion.div
                      key={mat.key as string}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.05 * idx }}
                      onClick={() => setPemakaianSelectedMaterial(
                        pemakaianSelectedMaterial === (mat.key as string) ? null : (mat.key as string)
                      )}
                      className={cn(
                        "rounded-xl px-3 py-2 backdrop-blur-sm cursor-pointer transition-all duration-200",
                        pemakaianSelectedMaterial === (mat.key as string)
                          ? "bg-white/30 shadow-lg scale-105 border border-white/30"
                          : "bg-white/15 hover:bg-white/20 border border-white/5"
                      )}
                    >
                      <p className="text-teal-100 text-[9px] uppercase tracking-wider truncate">
                        {mat.label}
                      </p>
                      <p className="text-sm font-bold tabular-nums">
                        {formatNumber(mat.total)}
                      </p>
                      <p className="text-teal-200 text-[9px]">{mat.unit}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {/* Interactive Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left: Main Chart */}
              <Card className="overflow-hidden border-0 shadow-soft-lg">
                <CardHeader className="bg-gradient-to-r from-teal-500/5 via-emerald-500/5 to-green-500/5 dark:from-teal-500/10 dark:via-emerald-500/10 dark:to-green-500/10 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25">
                        <Beaker className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {pemakaianViewMode === "chart"
                            ? "Total Pemakaian per Material"
                            : pemakaianViewMode === "shift"
                            ? "Distribusi per Shift"
                            : "Trend Bulanan"}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pemakaianViewMode === "chart"
                            ? "Dikelompokkan per satuan · Klik bar untuk detail shift"
                            : pemakaianViewMode === "shift"
                            ? pemakaianSelectedMaterial
                              ? `Detail shift untuk ${MATERIAL_FIELDS.find((m) => m.key === pemakaianSelectedMaterial)?.label || ""}`
                              : "Pilih material di atas untuk detail"
                            : "Trend bulanan per satuan Bucket"}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success" className="shadow-sm">{totalRecords} data</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  {pemakaianViewMode === "chart" && (
                    <div className="space-y-6 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
                      {barChartDataByUnit.map((group) => (
                        <div key={group.unit}>
                          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                            Satuan: {group.unit}
                          </p>
                          <ResponsiveContainer width="100%" height={Math.max(group.data.length * 44, 80)}>
                            <BarChart
                              data={group.data}
                              layout="vertical"
                              margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                              onClick={(data) => {
                                if (data?.activePayload?.[0]) {
                                  const clickedMat = MATERIAL_FIELDS.find(
                                    (m) => m.label === data.activePayload![0].payload.name
                                  );
                                  if (clickedMat) {
                                    setPemakaianSelectedMaterial(
                                      pemakaianSelectedMaterial === (clickedMat.key as string) ? null : (clickedMat.key as string)
                                    );
                                    setPemakaianViewMode("shift");
                                  }
                                }
                              }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.07} horizontal={false} />
                              <XAxis
                                type="number"
                                tick={{ fontSize: 10 }}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                              />
                              <YAxis
                                type="category"
                                dataKey="name"
                                tick={{ fontSize: 11 }}
                                tickLine={false}
                                axisLine={false}
                                width={110}
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "rgba(255,255,255,0.95)",
                                  border: "none",
                                  borderRadius: "12px",
                                  boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                                  padding: "12px 16px",
                                }}
                                formatter={(value: number) => [formatNumber(value), group.unit]}
                                cursor={{ fill: "rgba(0,0,0,0.04)" }}
                              />
                              <Bar dataKey="total" radius={[0, 6, 6, 0]} cursor="pointer">
                                {group.data.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                                ))}
                                <LabelList
                                  dataKey="total"
                                  position="right"
                                  formatter={(v: number) => (v > 0 ? formatNumber(v) : "")}
                                  style={{ fontSize: "10px", fontWeight: "bold", fill: "#64748b" }}
                                />
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      ))}
                    </div>
                  )}

                  {pemakaianViewMode === "shift" && (
                    <div className="space-y-4">
                      {pemakaianSelectedMaterial && shiftMaterialData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={shiftMaterialData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.07} vertical={false} />
                            <XAxis dataKey="shift" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(255,255,255,0.95)",
                                border: "none",
                                borderRadius: "12px",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                                padding: "12px 16px",
                              }}
                              formatter={(value: number) => [formatNumber(value), MATERIAL_FIELDS.find((m) => m.key === pemakaianSelectedMaterial)?.label || ""]}
                            />
                            <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                              {shiftMaterialData.map((entry, index) => (
                                <Cell key={`shift-cell-${index}`} fill={entry.fill} />
                              ))}
                              <LabelList
                                dataKey="total"
                                position="top"
                                formatter={(v: number) => formatNumber(v)}
                                style={{ fontSize: "11px", fontWeight: "bold", fill: "#64748b" }}
                              />
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                          <Droplets className="h-12 w-12 mb-3 opacity-30" />
                          <p className="text-sm font-medium">Pilih Material</p>
                          <p className="text-xs opacity-60">Klik salah satu material di header untuk melihat detail shift</p>
                        </div>
                      )}
                      {/* Shift summary cards */}
                      <div className="grid grid-cols-3 gap-2">
                        {shiftData.map((shift) => (
                          <div
                            key={shift.name}
                            className="text-center p-3 rounded-xl border"
                            style={{ borderColor: `${shift.color}30`, backgroundColor: `${shift.color}08` }}
                          >
                            <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1.5" style={{ backgroundColor: shift.color }} />
                            <p className="text-xs font-medium text-muted-foreground">{shift.name}</p>
                            <p className="text-lg font-bold" style={{ color: shift.color }}>{shift.value}</p>
                            <p className="text-[10px] text-muted-foreground">record</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pemakaianViewMode === "trend" && (
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                          {trendMaterials.map((mat) => (
                            <linearGradient key={`trend_${mat.key as string}`} id={`gradTrend_${mat.key as string}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={mat.color} stopOpacity={0.25} />
                              <stop offset="100%" stopColor={mat.color} stopOpacity={0.02} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" opacity={0.07} vertical={false} />
                        <XAxis dataKey="bulan" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} dy={8} />
                        <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} dx={-4} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(255,255,255,0.95)",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                            padding: "12px 16px",
                          }}
                          formatter={(value: number, name: string) => [formatNumber(value), name]}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                        {trendMaterials.map((mat) => (
                          <Area
                            key={mat.key as string}
                            type="monotone"
                            dataKey={mat.label}
                            stroke={mat.color}
                            strokeWidth={2}
                            fill={`url(#gradTrend_${mat.key as string})`}
                            dot={{ r: 3, fill: mat.color, strokeWidth: 0 }}
                            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              {/* Right: Material Detail — Grouped by Unit */}
              <Card className="overflow-hidden border-0 shadow-soft-lg">
                <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-cyan-500/10 pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                        <Droplets className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Detail Material</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Pemakaian per material (dikelompokkan per satuan)
                        </p>
                      </div>
                    </div>
                    <Badge variant="success" className="shadow-sm">12 material</Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                    {Object.entries(unitGroups).map(([unit, mats]) => {
                      const groupMax = Math.max(...mats.map((m) => m.total), 1);
                      return (
                        <div key={unit}>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                            {unit}
                          </p>
                          <div className="space-y-1.5">
                            {mats.map((mat, idx) => {
                              const percentage = groupMax > 0 ? (mat.total / groupMax) * 100 : 0;
                              const isSelected = pemakaianSelectedMaterial === (mat.key as string);
                              return (
                                <motion.div
                                  key={mat.key as string}
                                  initial={{ opacity: 0, x: 20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: 0.03 * idx }}
                                  onClick={() =>
                                    setPemakaianSelectedMaterial(
                                      isSelected ? null : (mat.key as string)
                                    )
                                  }
                                  className={cn(
                                    "group p-2.5 rounded-xl border cursor-pointer transition-all duration-200",
                                    isSelected
                                      ? "border-teal-300 dark:border-teal-700 bg-teal-50/50 dark:bg-teal-950/20 shadow-md"
                                      : "border-gray-100 dark:border-gray-800 hover:border-teal-200 dark:hover:border-teal-800 hover:shadow-sm"
                                  )}
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className="w-3 h-3 rounded-full shadow-sm"
                                        style={{ backgroundColor: mat.color }}
                                      />
                                      <span className="text-sm font-medium">{mat.label}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-sm font-bold tabular-nums">
                                        {formatNumber(mat.total)}
                                      </span>
                                      <span className="text-[10px] text-muted-foreground ml-1">
                                        {mat.unit}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="relative h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 0.8, delay: 0.05 * idx, ease: "easeOut" }}
                                      className="absolute inset-y-0 left-0 rounded-full"
                                      style={{
                                        background: `linear-gradient(90deg, ${mat.color}cc, ${mat.color})`,
                                      }}
                                    />
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>
        );
      })()}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production vs RKAP Chart — Modern Area + Gradient */}
        <Card className="overflow-hidden border-0 shadow-soft-lg">
          <CardHeader className="bg-gradient-to-r from-indigo-500/5 via-blue-500/5 to-cyan-500/5 dark:from-indigo-500/10 dark:via-blue-500/10 dark:to-cyan-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-lg shadow-indigo-500/25">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Produksi vs RKAP</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Perbandingan realisasi produksi terhadap target</p>
                </div>
              </div>
              <Badge variant="primary" className="shadow-sm">{dashboardYear}</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradProduksi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="50%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradRkap" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradRkapNPK1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="gradRkapNPK2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...modernGridStyle} />
                <XAxis dataKey="bulan" {...modernAxisStyle} dy={8} />
                <YAxis {...modernAxisStyle} dx={-4} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                <Tooltip
                  contentStyle={modernTooltipStyle}
                  formatter={(value: number, name: string) => [
                    formatNumber(value) + " Ton",
                    name,
                  ]}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                />
                <Area
                  type="monotone"
                  dataKey="produksi"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  fill="url(#gradProduksi)"
                  dot={{ fill: "#6366f1", stroke: "#fff", strokeWidth: 2, r: 4 }}
                  activeDot={{ fill: "#6366f1", stroke: "#fff", strokeWidth: 2, r: 6 }}
                  name="Produksi"
                  animationDuration={1200}
                  animationEasing="ease-out"
                />
                {effectivePlantFilter === "ALL" ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="rkapNPK1"
                      stroke="#10b981"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      fill="url(#gradRkapNPK1)"
                      dot={false}
                      name="RKAP NPK 1"
                      animationDuration={1400}
                    />
                    <Area
                      type="monotone"
                      dataKey="rkapNPK2"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="6 4"
                      fill="url(#gradRkapNPK2)"
                      dot={false}
                      name="RKAP NPK 2"
                      animationDuration={1600}
                    />
                  </>
                ) : (
                  <Area
                    type="monotone"
                    dataKey="rkap"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                    fill="url(#gradRkap)"
                    dot={false}
                    name="RKAP"
                    animationDuration={1400}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Onspek vs Offspek — Modern Stacked Bar with Gradients */}
        <Card className="overflow-hidden border-0 shadow-soft-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-500/5 via-teal-500/5 to-cyan-500/5 dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-cyan-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Produksi Onspek vs Offspek</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Distribusi kualitas produksi bulanan</p>
                </div>
              </div>
              <Badge variant="success">Monthly</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOnspek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="gradOffspek" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...modernGridStyle} />
                <XAxis dataKey="bulan" {...modernAxisStyle} dy={8} />
                <YAxis {...modernAxisStyle} dx={-4} tickFormatter={(v: number) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}`} />
                <Tooltip
                  contentStyle={modernTooltipStyle}
                  formatter={(value: number) => [
                    formatNumber(value) + " Ton",
                    "",
                  ]}
                  labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                  cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                />
                <Bar
                  dataKey="onspek"
                  fill="url(#gradOnspek)"
                  radius={[6, 6, 0, 0]}
                  name="Onspek"
                  animationDuration={800}
                  animationEasing="ease-out"
                />
                <Bar
                  dataKey="offspek"
                  fill="url(#gradOffspek)"
                  radius={[6, 6, 0, 0]}
                  name="Offspek"
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Downtime Analysis Chart - NEW */}
      <MonthlyDowntimeChart
        downtimeData={filteredData.downtime}
        year={dashboardYear}
        plantLabel={plantLabel}
      />

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Downtime Chart — Enhanced */}
        <Card className="lg:col-span-2 overflow-hidden border-0 shadow-soft-lg">
          <CardHeader className="bg-gradient-to-r from-amber-500/5 via-orange-500/5 to-red-500/5 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-red-500/10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25">
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Downtime per Equipment</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{formatNumber(filteredTotalDowntime)}</span>
                    {' '}{downtimeValueFilter === "jam" ? "Jam" : "Kejadian"} Total
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  value={downtimePeriodFilter}
                  onChange={(e) =>
                    setDowntimePeriodFilter(
                      e.target.value as "bulanan" | "tahunan"
                    )
                  }
                  options={[
                    { value: "tahunan", label: "Tahunan" },
                    { value: "bulanan", label: "Bulanan" },
                  ]}
                  className="w-28"
                />
                {downtimePeriodFilter === "bulanan" && (
                  <Select
                    value={downtimeMonthFilter.toString()}
                    onChange={(e) =>
                      setDowntimeMonthFilter(Number(e.target.value))
                    }
                    options={MONTH_SHORT.map((month, index) => ({
                      value: index.toString(),
                      label: month,
                    }))}
                    className="w-24"
                  />
                )}
                <Select
                  value={downtimeValueFilter}
                  onChange={(e) =>
                    setDowntimeValueFilter(
                      e.target.value as "jam" | "frekuensi"
                    )
                  }
                  options={[
                    { value: "jam", label: "Jam" },
                    { value: "frekuensi", label: "Frekuensi" },
                  ]}
                  className="w-28"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {downtimeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={downtimeChartData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="gradDowntime" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#f97316" stopOpacity={0.95} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...modernGridStyle} horizontal={false} vertical={true} />
                  <XAxis type="number" {...modernAxisStyle} />
                  <YAxis
                    type="category"
                    dataKey="item"
                    {...modernAxisStyle}
                    width={130}
                    tick={{ fontSize: 11, fontWeight: 500 }}
                  />
                  <Tooltip
                    contentStyle={modernTooltipStyle}
                    formatter={(
                      value: number,
                      _name: string,
                      props: { payload?: { jam?: number; frekuensi?: number } }
                    ) => {
                      const unit =
                        downtimeValueFilter === "jam" ? " Jam" : " Kejadian";
                      const additionalInfo =
                        downtimeValueFilter === "jam"
                          ? `(${props.payload?.frekuensi || 0} kejadian)`
                          : `(${formatNumber(props.payload?.jam || 0)} jam)`;
                      return [
                        `${formatNumber(value)}${unit} ${additionalInfo}`,
                        "Downtime",
                      ];
                    }}
                    cursor={{ fill: 'rgba(245, 158, 11, 0.06)' }}
                  />
                  <Bar
                    dataKey="downtime"
                    fill="url(#gradDowntime)"
                    radius={[0, 8, 8, 0]}
                    name={
                      downtimeValueFilter === "jam"
                        ? "Downtime (Jam)"
                        : "Downtime (Frekuensi)"
                    }
                    animationDuration={1000}
                    animationEasing="ease-out"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                <Clock className="h-10 w-10 mb-3 opacity-30" />
                <p>Tidak ada data downtime</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produksi Breakdown — Modern Donut Chart */}
        <Card className="overflow-hidden border-0 shadow-soft-lg">
          <CardHeader className="bg-gradient-to-r from-violet-500/5 via-purple-500/5 to-fuchsia-500/5 dark:from-violet-500/10 dark:via-purple-500/10 dark:to-fuchsia-500/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-violet-500/25">
                <Target className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-base">Breakdown Produksi</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Komposisi produksi {dashboardYear}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {produksiBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <defs>
                    <linearGradient id="gradPie0" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                    <linearGradient id="gradPie1" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                    <linearGradient id="gradPie2" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  <Pie
                    data={produksiBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="value"
                    cornerRadius={6}
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {produksiBreakdownData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`url(#gradPie${index % 3})`}
                        stroke="rgba(255,255,255,0.6)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={modernTooltipStyle}
                    formatter={(value: number) => [
                      formatNumber(value) + " Ton",
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[350px] text-muted-foreground">
                <Target className="h-10 w-10 mb-3 opacity-30" />
                <p>Tidak ada data produksi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Request by Eksekutor — Modern */}
        <Card className="overflow-hidden border-0 shadow-soft-lg">
          <CardHeader className="bg-gradient-to-r from-rose-500/5 via-pink-500/5 to-fuchsia-500/5 dark:from-rose-500/10 dark:via-pink-500/10 dark:to-fuchsia-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-lg shadow-rose-500/25">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Work Request by Eksekutor</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="font-semibold text-rose-600 dark:text-rose-400">{metrics.workRequestTotal}</span> total request
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {workRequestChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={workRequestChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="eksekutor"
                    cornerRadius={5}
                    label={({ eksekutor, count }) => `${eksekutor}: ${count}`}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {workRequestChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                        stroke="rgba(255,255,255,0.6)"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={modernTooltipStyle} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <FileText className="h-10 w-10 mb-3 opacity-30" />
                <p>Tidak ada data work request</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vibrasi Status — Modern */}
        <Card className="overflow-hidden border-0 shadow-soft-lg">
          <CardHeader className="bg-gradient-to-r from-cyan-500/5 via-sky-500/5 to-blue-500/5 dark:from-cyan-500/10 dark:via-sky-500/10 dark:to-blue-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-sky-600 text-white shadow-lg shadow-cyan-500/25">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Status Vibrasi Equipment</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className={cn("font-semibold", metrics.vibrasiWarnings > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")}>{metrics.vibrasiWarnings}</span> alert aktif
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            {vibrasiChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vibrasiChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                    cornerRadius={5}
                    animationDuration={1200}
                    animationEasing="ease-out"
                  >
                    {vibrasiChartData.map((entry, index) => {
                      const statusColors: { [key: string]: string } = {
                        Normal: "#10b981",
                        Warning: "#f59e0b",
                        Critical: "#ef4444",
                        Alert: "#f43f5e",
                      };
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            statusColors[entry.status] ||
                            COLORS[index % COLORS.length]
                          }
                          stroke="rgba(255,255,255,0.6)"
                          strokeWidth={2}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip contentStyle={modernTooltipStyle} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Gauge className="h-10 w-10 mb-3 opacity-30" />
                <p>Tidak ada data vibrasi</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions — Modern */}
        <Card className="overflow-hidden border-0 shadow-soft-lg">
          <CardHeader className="bg-gradient-to-r from-slate-500/5 via-gray-500/5 to-zinc-500/5 dark:from-slate-500/10 dark:via-gray-500/10 dark:to-zinc-500/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-br from-slate-600 to-gray-700 text-white shadow-lg shadow-slate-600/25">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <CardTitle className="text-base">Aksi Cepat</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <a
              href="/produksi/npk2"
              className="flex items-center justify-between p-3.5 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 hover:from-indigo-100 hover:to-blue-100 dark:hover:from-indigo-950/50 dark:hover:to-blue-950/50 rounded-xl transition-all duration-200 group border border-indigo-100/50 dark:border-indigo-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/20">
                  <Factory className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                </div>
                <span className="text-sm font-medium text-indigo-900 dark:text-indigo-200">
                  Input Produksi
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/laporan/downtime-npk2"
              className="flex items-center justify-between p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 hover:from-amber-100 hover:to-orange-100 dark:hover:from-amber-950/50 dark:hover:to-orange-950/50 rounded-xl transition-all duration-200 group border border-amber-100/50 dark:border-amber-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  Input Downtime
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/data/work-request-npk2"
              className="flex items-center justify-between p-3.5 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-950/50 dark:hover:to-teal-950/50 rounded-xl transition-all duration-200 group border border-emerald-100/50 dark:border-emerald-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20">
                  <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  Work Request
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/data/vibrasi-npk2"
              className="flex items-center justify-between p-3.5 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 hover:from-rose-100 hover:to-pink-100 dark:hover:from-rose-950/50 dark:hover:to-pink-950/50 rounded-xl transition-all duration-200 group border border-rose-100/50 dark:border-rose-800/30"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 dark:bg-rose-500/20">
                  <Gauge className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                </div>
                <span className="text-sm font-medium text-rose-900 dark:text-rose-200">
                  Data Vibrasi
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-rose-600 dark:text-rose-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </CardContent>
        </Card>

        {/* Data Summary — Modern Grid */}
        <Card className="lg:col-span-2 overflow-hidden border-0 shadow-soft-lg">
          <CardHeader className="bg-gradient-to-r from-sky-500/5 via-blue-500/5 to-indigo-500/5 dark:from-sky-500/10 dark:via-blue-500/10 dark:to-indigo-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-500/25">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-base">Ringkasan Data {plantLabel}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Overview seluruh data tahun {dashboardYear}</p>
                </div>
              </div>
              <Badge variant="info">{dashboardYear}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Record Produksi NPK", value: filteredData.produksiNPK.length, color: "indigo" },
                { label: "Record Blending", value: filteredData.produksiBlending.length, color: "cyan" },
                { label: "Record Downtime", value: filteredData.downtime.length, color: "amber" },
                { label: "Work Request", value: filteredData.workRequest.length, color: "rose" },
                { label: "Bahan Baku", value: filteredData.bahanBaku.length, color: "sky" },
                { label: "Data Vibrasi", value: filteredData.vibrasi.length, color: "violet" },
                { label: "Gate Pass", value: filteredData.gatePass.length, color: "emerald" },
                { label: "Trouble Record", value: filteredData.troubleRecord.length, color: "pink" },
              ].map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`p-4 rounded-xl text-center border border-${item.color}-100 dark:border-${item.color}-900/30 bg-gradient-to-br from-${item.color}-50/80 to-${item.color}-50/30 dark:from-${item.color}-950/30 dark:to-${item.color}-950/10 hover:shadow-soft transition-shadow duration-200`}
                >
                  <p className={`text-2xl font-bold tabular-nums text-${item.color}-600 dark:text-${item.color}-400`}>
                    {item.value}
                  </p>
                  <p className="text-[11px] font-medium text-muted-foreground mt-1">
                    {item.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
