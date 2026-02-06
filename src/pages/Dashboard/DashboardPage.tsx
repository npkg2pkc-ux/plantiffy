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
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  Factory,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  Package,
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
  PemantauanBahanBaku,
} from "@/types";

// Bahan Baku options for filter
const BAHAN_BAKU_OPTIONS = [
  "Urea",
  "DAP",
  "KCL",
  "ZA",
  "Dolomite",
  "Clay",
] as const;

const COLORS = [
  "#3b82f6",
  "#22c55e",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
];

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
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-red-500 to-rose-500 text-white py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5" />
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
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

  // Pemantauan Bahan Baku state
  const [pemantauanBBFilter, setPemantauanBBFilter] = useState<string>("Urea");
  const [pemantauanBBData, setPemantauanBBData] = useState<
    PemantauanBahanBaku[]
  >([]);

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
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  // Fetch pemantauan bahan baku data terpisah
  useEffect(() => {
    const fetchPemantauanBB = async () => {
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        if (SHEETS.PEMANTAUAN_BAHAN_BAKU) {
          const result = await fetchDataByPlant<PemantauanBahanBaku>(
            SHEETS.PEMANTAUAN_BAHAN_BAKU
          );
          if (result.success && result.data) {
            setPemantauanBBData(result.data);
          }
        }
      } catch (error) {
        console.error("Error fetching pemantauan bahan baku:", error);
      }
    };
    fetchPemantauanBB();
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
          <h1 className="text-xl font-display font-semibold text-foreground">
            Dashboard - {plantLabel}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Selamat datang, {user?.namaLengkap || user?.nama}! Berikut ringkasan
            data {plantLabel.toLowerCase()} tahun {dashboardYear}.
          </p>
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

      {/* Produksi Bulan Ini - Highlighted Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-primary-500 rounded-xl p-5 text-white"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div
            onClick={() =>
              navigate(
                `/produksi/${effectivePlantFilter === "NPK1" ? "npk1" : "npk2"}`
              )
            }
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-6 w-6" />
              <h2 className="text-xl font-bold">
                Produksi Bulan {currentMonthData.monthName} {dashboardYear}
              </h2>
              <ArrowUpRight className="h-5 w-5 opacity-60 ml-2" />
            </div>
            <p className="text-primary-100 text-sm">
              Ringkasan produksi {plantLabel.toLowerCase()} bulan ini
            </p>
          </div>

          {/* Month Filter */}
          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <select
              value={produksiMonthFilter}
              onChange={(e) => setProduksiMonthFilter(Number(e.target.value))}
              className="bg-white/20 backdrop-blur-sm text-white border-0 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/30 cursor-pointer"
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
          className="cursor-pointer hover:opacity-90 transition-opacity"
        >
          <div className="flex flex-wrap gap-4 lg:gap-8 mt-4">
            <div className="bg-white/15 rounded-lg px-5 py-3 min-w-[140px]">
              <p className="text-primary-100 text-[10px] uppercase tracking-wider mb-1">
                NPK Produksi
              </p>
              <p className="text-2xl lg:text-3xl font-bold">
                {formatNumber(currentMonthData.npkProduksi)}
              </p>
              <p className="text-primary-100 text-xs">Ton</p>
            </div>

            <div className="bg-white/15 rounded-lg px-5 py-3 min-w-[140px]">
              <p className="text-primary-100 text-[10px] uppercase tracking-wider mb-1">
                Target RKAP
              </p>
              <p className="text-2xl lg:text-3xl font-bold">
                {formatNumber(currentMonthData.rkapThisMonth)}
              </p>
              <p className="text-primary-100 text-xs">Ton</p>
            </div>

            <div className="bg-white/15 rounded-lg px-5 py-3 min-w-[140px]">
              <p className="text-primary-100 text-xs uppercase tracking-wider mb-1">
                Pencapaian
              </p>
              <p className="text-2xl lg:text-3xl font-bold">
                {currentMonthData.percentageRkap}%
              </p>
              <p className="text-primary-100 text-xs">
                {Number(currentMonthData.percentageRkap) >= 100
                  ? "✓ Target Tercapai"
                  : "dari target"}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-detail row */}
        <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-primary-100 text-xs">Onspek</p>
            <p className="font-semibold">
              {formatNumber(currentMonthData.npkOnspek)} Ton
            </p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">Offspek</p>
            <p className="font-semibold">
              {formatNumber(currentMonthData.npkOffspek)} Ton
            </p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">Blending</p>
            <p className="font-semibold">
              {formatNumber(currentMonthData.blendingProduksi)} Ton
            </p>
          </div>
          <div>
            <p className="text-primary-100 text-xs">NPK Mini</p>
            <p className="font-semibold">
              {formatNumber(currentMonthData.npkMiniProduksi)} Ton
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Produksi Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() =>
            navigate(
              `/produksi/${effectivePlantFilter === "NPK1" ? "npk1" : "npk2"}`
            )
          }
          className="bg-blue-500 rounded-xl p-5 text-white cursor-pointer hover:bg-blue-600 transition-colors"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Factory className="h-5 w-5" />
              <h3 className="font-bold">Produksi Tahunan {dashboardYear}</h3>
            </div>
            <ArrowUpRight className="h-4 w-4 opacity-60" />
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
        </motion.div>

        {/* Operasional Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-slate-600 to-slate-700 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              <h3 className="font-bold">Operasional & Logistik</h3>
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
        </motion.div>
      </div>

      {/* Maintenance & Issues Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downtime & Issues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-r from-red-500 to-rose-500 rounded-2xl p-5 text-white shadow-lg"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <h3 className="font-bold">Downtime & Issues</h3>
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
        </motion.div>

        {/* BBM Summary Section */}
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
          className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-5 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Fuel className="h-5 w-5" />
              <h3 className="font-bold">
                Rekap BBM Alat Berat {dashboardYear}
              </h3>
            </div>
            <ArrowUpRight className="h-4 w-4 opacity-60" />
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
        </motion.div>
      </div>

      {/* Pemantauan Bahan Baku Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        onClick={() =>
          navigate(
            `/laporan/pemantauan-bb-${
              effectivePlantFilter === "NPK1" ? "npk1" : "npk2"
            }`
          )
        }
        className="bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-5 text-white shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.01] transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            <h3 className="font-bold">Pemantauan Stok Bahan Baku</h3>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={pemantauanBBFilter}
              onChange={(e) => {
                e.stopPropagation();
                setPemantauanBBFilter(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-40 bg-white/20 border-white/30 text-white text-sm"
              options={BAHAN_BAKU_OPTIONS.map((opt) => ({
                value: opt,
                label: opt,
              }))}
            />
            <ArrowUpRight className="h-4 w-4 opacity-60" />
          </div>
        </div>
        {(() => {
          const filteredBBData = pemantauanBBData.filter(
            (item) =>
              item._plant === effectivePlantFilter ||
              effectivePlantFilter === "ALL"
          );
          const selectedData = filteredBBData
            .filter((item) => item.bahanBaku === pemantauanBBFilter)
            .sort(
              (a, b) =>
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
            );
          const latestData = selectedData[0];
          const totalRecords = selectedData.length;
          const yearData = selectedData.filter((item) => {
            const year = new Date(item.tanggal).getFullYear();
            return year === dashboardYear;
          });
          const totalIn = yearData.reduce(
            (sum, item) => sum + (item.bahanBakuIn || 0),
            0
          );
          const totalOut = yearData.reduce(
            (sum, item) => sum + (item.bahanBakuOut || 0),
            0
          );

          return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">
                  Stok Terakhir
                </p>
                <p className="text-xl font-bold">
                  {formatNumber(latestData?.stockAkhir || 0)}
                </p>
                <p className="text-emerald-100 text-[10px]">
                  Ton ({latestData?.tanggal || "-"})
                </p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">
                  Total Masuk {dashboardYear}
                </p>
                <p className="text-xl font-bold">{formatNumber(totalIn)}</p>
                <p className="text-emerald-100 text-[10px]">Ton</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">
                  Total Keluar {dashboardYear}
                </p>
                <p className="text-xl font-bold">{formatNumber(totalOut)}</p>
                <p className="text-emerald-100 text-[10px]">Ton</p>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-3 backdrop-blur-sm">
                <p className="text-emerald-100 text-[10px] uppercase tracking-wider">
                  Total Record
                </p>
                <p className="text-xl font-bold">{totalRecords}</p>
                <p className="text-emerald-100 text-[10px]">Pencatatan</p>
              </div>
            </div>
          );
        })()}
      </motion.div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production vs RKAP Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Produksi vs RKAP</CardTitle>
              <Badge variant="primary">{dashboardYear}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bulan" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [
                    formatNumber(value) + " Ton",
                    "",
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="produksi"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: "#3b82f6", r: 4 }}
                  name="Produksi"
                />
                {effectivePlantFilter === "ALL" ? (
                  <>
                    <Line
                      type="monotone"
                      dataKey="rkapNPK1"
                      stroke="#22c55e"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="RKAP NPK 1"
                    />
                    <Line
                      type="monotone"
                      dataKey="rkapNPK2"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      name="RKAP NPK 2"
                    />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="rkap"
                    stroke="#22c55e"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                    name="RKAP"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Onspek vs Offspek */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Produksi Onspek vs Offspek</CardTitle>
              <Badge variant="success">Monthly</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="bulan" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                  }}
                  formatter={(value: number) => [
                    formatNumber(value) + " Ton",
                    "",
                  ]}
                />
                <Legend />
                <Bar
                  dataKey="onspek"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  name="Onspek"
                />
                <Bar
                  dataKey="offspek"
                  fill="#ef4444"
                  radius={[4, 4, 0, 0]}
                  name="Offspek"
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
        {/* Downtime Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <CardTitle>Downtime per Equipment</CardTitle>
                <Badge variant="warning">
                  {formatNumber(filteredTotalDowntime)}{" "}
                  {downtimeValueFilter === "jam" ? "Jam" : "Kejadian"} Total
                </Badge>
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
          <CardContent>
            {downtimeChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={downtimeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} />
                  <YAxis
                    type="category"
                    dataKey="item"
                    stroke="#64748b"
                    fontSize={12}
                    width={120}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
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
                  />
                  <Bar
                    dataKey="downtime"
                    fill="#f59e0b"
                    radius={[0, 8, 8, 0]}
                    name={
                      downtimeValueFilter === "jam"
                        ? "Downtime (Jam)"
                        : "Downtime (Frekuensi)"
                    }
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-dark-400">
                Tidak ada data downtime
              </div>
            )}
          </CardContent>
        </Card>

        {/* Produksi Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Breakdown Produksi</CardTitle>
          </CardHeader>
          <CardContent>
            {produksiBreakdownData.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={produksiBreakdownData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {produksiBreakdownData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                    formatter={(value: number) => [
                      formatNumber(value) + " Ton",
                      "",
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[350px] text-dark-400">
                Tidak ada data produksi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Work Request by Eksekutor */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Work Request by Eksekutor</CardTitle>
              <Badge variant="danger">{metrics.workRequestTotal} Total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {workRequestChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={workRequestChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="eksekutor"
                    label={({ eksekutor, count }) => `${eksekutor}: ${count}`}
                  >
                    {workRequestChartData.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-dark-400">
                Tidak ada data work request
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vibrasi Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status Vibrasi Equipment</CardTitle>
              <Badge
                variant={metrics.vibrasiWarnings > 0 ? "danger" : "success"}
              >
                {metrics.vibrasiWarnings} Alert
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {vibrasiChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={vibrasiChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="count"
                    nameKey="status"
                  >
                    {vibrasiChartData.map((entry, index) => {
                      const statusColors: { [key: string]: string } = {
                        Normal: "#22c55e",
                        Warning: "#f59e0b",
                        Critical: "#ef4444",
                        Alert: "#ef4444",
                      };
                      return (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            statusColors[entry.status] ||
                            COLORS[index % COLORS.length]
                          }
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "none",
                      borderRadius: "12px",
                      boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-dark-400">
                Tidak ada data vibrasi
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Aksi Cepat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/produksi/npk2"
              className="flex items-center justify-between p-3 bg-primary-50 hover:bg-primary-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Factory className="h-5 w-5 text-primary-600" />
                <span className="text-sm font-medium text-primary-900">
                  Input Produksi
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-primary-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/laporan/downtime-npk2"
              className="flex items-center justify-between p-3 bg-amber-50 hover:bg-amber-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">
                  Input Downtime
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-amber-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/data/work-request-npk2"
              className="flex items-center justify-between p-3 bg-secondary-50 hover:bg-secondary-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-secondary-600" />
                <span className="text-sm font-medium text-secondary-900">
                  Work Request
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-secondary-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
            <a
              href="/data/vibrasi-npk2"
              className="flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-xl transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-900">
                  Data Vibrasi
                </span>
              </div>
              <ArrowUpRight className="h-4 w-4 text-red-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </CardContent>
        </Card>

        {/* Data Summary */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ringkasan Data {plantLabel}</CardTitle>
              <Badge variant="info">{dashboardYear}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-primary-600">
                  {filteredData.produksiNPK.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Record Produksi NPK
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-secondary-600">
                  {filteredData.produksiBlending.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Record Blending
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {filteredData.downtime.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Record Downtime
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-red-600">
                  {filteredData.workRequest.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Work Request
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-cyan-600">
                  {filteredData.bahanBaku.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Bahan Baku
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-purple-600">
                  {filteredData.vibrasi.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Data Vibrasi
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-indigo-600">
                  {filteredData.gatePass.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Gate Pass
                </p>
              </div>
              <div className="p-4 bg-dark-50 rounded-xl text-center">
                <p className="text-2xl font-bold text-pink-600">
                  {filteredData.troubleRecord.length}
                </p>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  Trouble Record
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
