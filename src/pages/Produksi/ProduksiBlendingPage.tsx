import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  CalendarDays,
  Package,
  BarChart3,
  Filter,
  ChevronLeft,
  ChevronRight,
  Beaker,
  Activity,
  Target,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  History,
} from "lucide-react";
import { useSaveShortcut, useDataWithLogging } from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  Badge,
  DataTable,
  SuccessOverlay,
  ApprovalDialog,
  PrintModal,
  ActivityLogModal,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatDate,
  formatNumber,
  parseNumber,
  canAdd,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";
import type { ProduksiBlending } from "@/types";

const initialFormState: ProduksiBlending = {
  tanggal: getCurrentDate(),
  kategori: "Fresh",
  formula: "",
  tonase: 0,
};

interface ProduksiBlendingPageProps {
  type: "blending" | "retail";
}

const ProduksiBlendingPage = ({ type }: ProduksiBlendingPageProps) => {
  const { user } = useAuthStore();
  const { createWithLog, updateWithLog, deleteWithLog } = useDataWithLogging();
  const [data, setData] = useState<ProduksiBlending[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isCustomFormula, setIsCustomFormula] = useState(false);
  const [customFormulaValue, setCustomFormulaValue] = useState("");
  const [form, setForm] = useState<ProduksiBlending>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter states
  const [selectedFormula, setSelectedFormula] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<number | "all">(
    new Date().getMonth()
  );
  const [selectedYear, setSelectedYear] = useState<number | "all">(
    new Date().getFullYear()
  );

  const plant = type === "blending" ? "NPK2" : "NPK1";
  const pageTitle =
    type === "blending" ? "Produksi Blending" : "Produksi Retail";

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<ProduksiBlending | null>(null);

  // Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRecordId, setLogRecordId] = useState("");

  // Handler for viewing log
  const handleViewLog = (id: string) => {
    setLogRecordId(id);
    setShowLogModal(true);
  };

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  const kategoriOptions =
    type === "blending"
      ? [
          { value: "Fresh", label: "Fresh" },
          { value: "Oversack", label: "Oversack" },
        ]
      : [{ value: "Retail", label: "Retail" }];

  // Base formula options - these are predefined
  const baseFormulaOptions = [
    "NPK 15-15-15",
    "NPK 16-16-16",
    "NPK 20-10-10",
    "NPK 12-12-17",
    "NPK 15-15-15-4S",
  ];

  // Dynamic formula options - combines base options with formulas from data
  const formulaOptions = useMemo(() => {
    // Get all unique formulas from existing data
    const dataFormulas = [
      ...new Set(
        data
          .map((item) => item.formula)
          .filter((f) => f && f !== "Tanpa Formula")
      ),
    ];

    // Combine base formulas with data formulas (remove duplicates)
    const allFormulas = [
      ...new Set([...baseFormulaOptions, ...dataFormulas]),
    ].sort();

    // Create options array
    const options = allFormulas.map((f) => ({ value: f, label: f }));

    // Add Custom option at the end
    options.push({ value: "Custom", label: "Custom (Tambah Baru)" });

    return options;
  }, [data]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(SHEETS.PRODUKSI_BLENDING, plant);
        const result = await readData<ProduksiBlending>(sheetName);

        // Debug: Log raw data from backend
        console.log("Raw data from backend:", result.data?.slice(0, 2));
        console.log(
          "Data keys:",
          result.data?.[0] ? Object.keys(result.data[0]) : "No data"
        );

        if (result.success && result.data) {
          // Normalize data - handle different field names from backend
          const normalizedData = (
            result.data as unknown as Record<string, unknown>[]
          ).map((item) => {
            // Debug log for first item
            if (
              result.data &&
              (result.data as unknown as Record<string, unknown>[]).indexOf(
                item
              ) === 0
            ) {
              console.log("First item raw:", item);
            }

            // Handle tonase field - check all possible variations
            const tonaseValue =
              item.tonase ??
              item.Tonase ??
              item.total ??
              item.Total ??
              item.jumlah ??
              item.Jumlah ??
              item.ton ??
              item.Ton ??
              item.qty ??
              item.Qty ??
              item.quantity ??
              item.Quantity ??
              0;

            // Handle formula field - might be 'formula', 'Formula', or empty
            const formulaValue =
              item.formula ??
              item.Formula ??
              item.formulasi ??
              item.Formulasi ??
              item.jenis ??
              item.Jenis ??
              item.produk ??
              item.Produk ??
              "";

            // Handle kategori field
            const kategoriValue =
              item.kategori ??
              item.Kategori ??
              item.tipe ??
              item.Tipe ??
              item.jenis ??
              item.Jenis ??
              (type === "retail" ? "Retail" : "Fresh");

            const normalized = {
              ...item,
              id: (item.id ??
                item.ID ??
                item.Id ??
                item.no ??
                item.No) as string,
              tanggal: (item.tanggal ??
                item.Tanggal ??
                item.tgl ??
                item.Tgl ??
                item.date ??
                item.Date ??
                "") as string,
              kategori: kategoriValue as string,
              formula: ((formulaValue as string) || "Tanpa Formula").trim(),
              tonase: parseNumber(tonaseValue as number),
              _plant: plant as "NPK1" | "NPK2",
            } as ProduksiBlending;

            return normalized;
          });

          const sortedData = normalizedData.sort(
            (a, b) =>
              new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
          );
          setData(sortedData);

          // Debug log
          console.log("Normalized data sample:", sortedData.slice(0, 3));
          console.log(
            "Total tonase check:",
            sortedData
              .slice(0, 5)
              .map((d) => ({ formula: d.formula, tonase: d.tonase }))
          );
        } else {
          setData([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, plant]);

  // Calculate current month production
  const MONTH_NAMES = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];

  // Get unique formulas from data (filter out empty/null values)
  const uniqueFormulas = useMemo(() => {
    const formulas = [
      ...new Set(
        data.map((item) => item.formula).filter((f) => f && f.trim() !== "")
      ),
    ].sort();
    return formulas;
  }, [data]);

  // Get available years from data
  const availableYears = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsFromData = data.map((item) => {
      const date = new Date(item.tanggal);
      return isNaN(date.getTime()) ? currentYear : date.getFullYear();
    });
    // Include current year and a few years back
    const defaultYears = [currentYear, currentYear - 1, currentYear - 2];
    const allYears = [...new Set([...yearsFromData, ...defaultYears])];
    return allYears.sort((a, b) => b - a);
  }, [data]);

  // Filter data by selected month and year
  const filteredByMonth = useMemo(() => {
    return data.filter((item) => {
      const itemDate = new Date(item.tanggal);
      if (isNaN(itemDate.getTime())) return false;

      // If "all" is selected for year, show all years
      const yearMatches =
        selectedYear === "all" || itemDate.getFullYear() === selectedYear;
      // If "all" is selected for month, show all months
      const monthMatches =
        selectedMonth === "all" || itemDate.getMonth() === selectedMonth;

      return yearMatches && monthMatches;
    });
  }, [data, selectedMonth, selectedYear]);

  // Filter data by formula (if selected)
  const filteredData = useMemo(() => {
    if (selectedFormula === "all") return filteredByMonth;
    return filteredByMonth.filter((item) => item.formula === selectedFormula);
  }, [filteredByMonth, selectedFormula]);

  // Helper function to safely get tonase value
  const getTonaseValue = (item: ProduksiBlending): number => {
    // item.tonase should already be normalized, but double-check
    const value = item.tonase;
    if (typeof value === "number" && !isNaN(value)) return value;
    return parseNumber(value);
  };

  // Calculate statistics for selected month
  const monthStats = useMemo(() => {
    const totalTonase = filteredByMonth.reduce(
      (sum, item) => sum + getTonaseValue(item),
      0
    );
    const totalFresh = filteredByMonth
      .filter((i) => i.kategori === "Fresh")
      .reduce((sum, item) => sum + getTonaseValue(item), 0);
    const totalOversack = filteredByMonth
      .filter((i) => i.kategori === "Oversack")
      .reduce((sum, item) => sum + getTonaseValue(item), 0);
    const totalRetail = filteredByMonth
      .filter((i) => i.kategori === "Retail")
      .reduce((sum, item) => sum + getTonaseValue(item), 0);

    // Get previous month data for comparison (only if specific month/year selected)
    let growthPercent = 0;
    let prevTotalTonase = 0;

    if (selectedMonth !== "all" && selectedYear !== "all") {
      const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
      const prevYear =
        selectedMonth === 0 ? (selectedYear as number) - 1 : selectedYear;
      const prevMonthData = data.filter((item) => {
        const itemDate = new Date(item.tanggal);
        if (isNaN(itemDate.getTime())) return false;
        return (
          itemDate.getMonth() === prevMonth &&
          itemDate.getFullYear() === prevYear
        );
      });
      prevTotalTonase = prevMonthData.reduce(
        (sum, item) => sum + getTonaseValue(item),
        0
      );

      growthPercent =
        prevTotalTonase > 0
          ? ((totalTonase - prevTotalTonase) / prevTotalTonase) * 100
          : 0;
    }

    return {
      totalTonase,
      totalFresh,
      totalOversack,
      totalRetail,
      entryCount: filteredByMonth.length,
      uniqueFormulas: new Set(
        filteredByMonth
          .map((i) => i.formula)
          .filter((f) => f && f.trim() !== "")
      ).size,
      growthPercent,
      prevTotalTonase,
      avgPerEntry:
        filteredByMonth.length > 0 ? totalTonase / filteredByMonth.length : 0,
    };
  }, [filteredByMonth, selectedMonth, selectedYear, data]);

  // Calculate statistics per formula
  const formulaStats = useMemo(() => {
    const stats: Record<
      string,
      {
        total: number;
        fresh: number;
        oversack: number;
        retail: number;
        count: number;
        percentage: number;
      }
    > = {};

    filteredByMonth.forEach((item) => {
      // Use formula name or "Tanpa Formula" for empty formulas
      const formulaKey =
        item.formula && item.formula.trim() !== ""
          ? item.formula
          : "Tanpa Formula";

      if (!stats[formulaKey]) {
        stats[formulaKey] = {
          total: 0,
          fresh: 0,
          oversack: 0,
          retail: 0,
          count: 0,
          percentage: 0,
        };
      }
      const tonase = getTonaseValue(item);
      stats[formulaKey].total += tonase;
      stats[formulaKey].count += 1;
      if (item.kategori === "Fresh") stats[formulaKey].fresh += tonase;
      else if (item.kategori === "Oversack")
        stats[formulaKey].oversack += tonase;
      else if (item.kategori === "Retail") stats[formulaKey].retail += tonase;
    });

    // Calculate percentages
    Object.keys(stats).forEach((formula) => {
      stats[formula].percentage =
        monthStats.totalTonase > 0
          ? (stats[formula].total / monthStats.totalTonase) * 100
          : 0;
    });

    return stats;
  }, [filteredByMonth, monthStats.totalTonase]);

  // Sort formulas by total tonase (descending)
  const sortedFormulaStats = useMemo(() => {
    return Object.entries(formulaStats)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 10); // Top 10
  }, [formulaStats]);

  // Daily production for selected month (keeping for potential future use)
  // Commented out to avoid unused variable warning
  /* const dailyProduction = useMemo(() => {
    const days: Record<number, number> = {};
    filteredByMonth.forEach((item) => {
      const day = new Date(item.tanggal).getDate();
      days[day] = (days[day] || 0) + parseNumber(item.tonase);
    });
    return days;
  }, [filteredByMonth]); */

  // Navigation functions for month
  const goToPrevMonth = () => {
    if (selectedMonth === "all" || selectedYear === "all") {
      // If "all" is selected, start from current month/year
      const now = new Date();
      setSelectedMonth(now.getMonth() === 0 ? 11 : now.getMonth() - 1);
      setSelectedYear(
        now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
      );
    } else if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => (y as number) - 1);
    } else {
      setSelectedMonth((m) => (m as number) - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === "all" || selectedYear === "all") {
      // If "all" is selected, start from current month/year
      const now = new Date();
      setSelectedMonth(now.getMonth() === 11 ? 0 : now.getMonth() + 1);
      setSelectedYear(
        now.getMonth() === 11 ? now.getFullYear() + 1 : now.getFullYear()
      );
    } else if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => (y as number) + 1);
    } else {
      setSelectedMonth((m) => (m as number) + 1);
    }
  };

  // Commented out to avoid unused variable warning
  /* const currentMonthProduksi = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthData = data.filter((item) => {
      const itemDate = new Date(item.tanggal);
      if (isNaN(itemDate.getTime())) return false;
      return (
        itemDate.getMonth() === currentMonth &&
        itemDate.getFullYear() === currentYear
      );
    });

    const totalFresh = thisMonthData
      .filter((i) => i.kategori === "Fresh")
      .reduce((sum, item) => sum + getTonaseValue(item), 0);
    const totalOversack = thisMonthData
      .filter((i) => i.kategori === "Oversack")
      .reduce((sum, item) => sum + getTonaseValue(item), 0);
    const total = thisMonthData.reduce(
      (sum, item) => sum + getTonaseValue(item),
      0
    );

    return {
      monthName: MONTH_NAMES[currentMonth],
      year: currentYear,
      totalFresh,
      totalOversack,
      total,
      entryCount: thisMonthData.length,
    };
  }, [data]); */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const updateResult = await updateWithLog<ProduksiBlending>(
          "produksi_blending",
          {
            ...form,
            id: editingId,
            _plant: plant,
          }
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId
                ? { ...form, id: editingId, _plant: plant }
                : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const newData = { ...form, _plant: plant as "NPK1" | "NPK2" };
        const createResult = await createWithLog<ProduksiBlending>(
          "produksi_blending",
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: ProduksiBlending = {
            ...createResult.data,
            _plant: plant as "NPK1" | "NPK2",
          };
          setData((prev) => [newItem, ...prev]);
        } else {
          throw new Error(createResult.error || "Gagal menyimpan data");
        }
      }

      setShowForm(false);
      setForm(initialFormState);
      setEditingId(null);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error("Error saving data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: ProduksiBlending) => {
    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
      return;
    }
    setForm(item);
    setEditingId(item.id || null);
    // Check if formula is custom (not in predefined options)
    const isPredefined = formulaOptions.some(
      (opt) => opt.value === item.formula && opt.value !== "Custom"
    );
    setIsCustomFormula(!isPredefined && item.formula !== "");
    setCustomFormulaValue(
      !isPredefined && item.formula !== "" ? item.formula : ""
    );
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (userNeedsApprovalDelete) {
      const item = data.find((d) => d.id === id);
      if (item) {
        setPendingEditItem(item);
        setApprovalAction("delete");
        setShowApprovalDialog(true);
      }
      return;
    }
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleApprovalSubmit = async (reason: string) => {
    if (!pendingEditItem || !user) return;

    setLoading(true);
    try {
      const API_URL =
        "https://script.google.com/macros/s/AKfycbwhf1qqyKphj6flFppZSczHJDqERKyfn6qoh-LVhfS8thGvZw085lqDGMKKHyt_uYcwEw/exec";

      const approvalData = {
        action: "create",
        sheet: "APPROVAL_REQUESTS",
        data: {
          requestedBy: user.nama,
          requestedByRole: user.role,
          requestedByPlant: user.plant,
          actionType: approvalAction,
          targetSheet:
            type === "retail" ? "PRODUKSI_BLENDING_NPK1" : "PRODUKSI_BLENDING",
          targetId: pendingEditItem.id,
          targetData: JSON.stringify(pendingEditItem),
          reason: reason,
          status: "pending",
          requestedAt: new Date().toISOString(),
        },
      };

      await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(approvalData),
        mode: "no-cors",
      });

      alert("Permintaan approval telah dikirim ke AVP/Supervisor/Admin");
      setShowApprovalDialog(false);
      setPendingEditItem(null);
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert("Gagal mengirim permintaan approval");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const deleteResult = await deleteWithLog("produksi_blending", {
        id: deleteId,
        _plant: plant,
      });
      if (deleteResult.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        setShowDeleteConfirm(false);
        setDeleteId(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        throw new Error(deleteResult.error || "Gagal menghapus data");
      }
    } catch (error) {
      console.error("Error deleting data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus data"
      );
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setForm(initialFormState);
    setEditingId(null);
    setIsCustomFormula(false);
    setCustomFormulaValue("");
    setShowForm(true);
  };

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "kategori",
      header: "Kategori",
      render: (value: unknown) => (
        <Badge
          variant={
            value === "Fresh"
              ? "success"
              : value === "Oversack"
              ? "warning"
              : "primary"
          }
        >
          {value as string}
        </Badge>
      ),
    },
    { key: "formula", header: "Formula" },
    {
      key: "tonase",
      header: "Tonase",
      render: (value: unknown) => (
        <span className="font-semibold">
          {formatNumber(parseNumber(value as number))} Ton
        </span>
      ),
    },
  ];

  // Formula color palette for cards
  const getFormulaColor = (index: number) => {
    const colors = [
      "from-blue-500 to-blue-600",
      "from-emerald-500 to-emerald-600",
      "from-violet-500 to-violet-600",
      "from-amber-500 to-amber-600",
      "from-rose-500 to-rose-600",
      "from-cyan-500 to-cyan-600",
      "from-indigo-500 to-indigo-600",
      "from-teal-500 to-teal-600",
      "from-orange-500 to-orange-600",
      "from-pink-500 to-pink-600",
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-dark-900 dark:text-white">
              {pageTitle}
            </h1>
            <Badge variant={plant === "NPK1" ? "primary" : "success"}>
              {plant}
            </Badge>
          </div>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Kelola data {pageTitle.toLowerCase()} untuk {plant}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPrintModal(true)}
          >
            <Printer className="h-4 w-4 mr-2" />
            Cetak
          </Button>
          {userCanAdd && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Data
            </Button>
          )}
        </div>
      </div>

      {/* Month Selector - Management View */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-dark-800 to-dark-900 dark:from-dark-700 dark:to-dark-800 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-white/10 rounded-xl p-3">
                <CalendarDays className="h-8 w-8 text-white" />
              </div>
              <div>
                <p className="text-white/70 text-sm font-medium">
                  Laporan Produksi
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={goToPrevMonth}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5 text-white" />
                  </button>
                  <h2 className="text-2xl font-bold text-white min-w-[200px] text-center">
                    {selectedMonth === "all"
                      ? "Semua Bulan"
                      : MONTH_NAMES[selectedMonth]}{" "}
                    {selectedYear === "all" ? "Semua Tahun" : selectedYear}
                  </h2>
                  <button
                    onClick={goToNextMonth}
                    className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <ChevronRight className="h-5 w-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={selectedMonth.toString()}
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
                options={[
                  { value: "all", label: "Semua Bulan" },
                  ...MONTH_NAMES.map((name, index) => ({
                    value: index.toString(),
                    label: name,
                  })),
                ]}
                className="bg-white/10 border-white/20 text-white min-w-[130px] [&>option]:text-dark-900"
              />
              <Select
                value={selectedYear.toString()}
                onChange={(e) =>
                  setSelectedYear(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
                options={[
                  { value: "all", label: "Semua Tahun" },
                  ...availableYears.map((y) => ({
                    value: y.toString(),
                    label: y.toString(),
                  })),
                ]}
                className="bg-white/10 border-white/20 text-white min-w-[130px] [&>option]:text-dark-900"
              />
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-4 w-4 text-white/70" />
                <p className="text-white/70 text-xs uppercase tracking-wide">
                  Total Produksi
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(monthStats.totalTonase)}
                <span className="text-sm font-normal text-white/70 ml-1">
                  Ton
                </span>
              </p>
              {monthStats.growthPercent !== 0 && (
                <div
                  className={`flex items-center gap-1 mt-1 text-xs ${
                    monthStats.growthPercent > 0
                      ? "text-green-300"
                      : "text-red-300"
                  }`}
                >
                  {monthStats.growthPercent > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  <span>
                    {Math.abs(monthStats.growthPercent).toFixed(1)}% dari bulan
                    lalu
                  </span>
                </div>
              )}
            </div>

            {type === "blending" ? (
              <>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Beaker className="h-4 w-4 text-green-300" />
                    <p className="text-white/70 text-xs uppercase tracking-wide">
                      Fresh
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(monthStats.totalFresh)}
                    <span className="text-sm font-normal text-white/70 ml-1">
                      Ton
                    </span>
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    {monthStats.totalTonase > 0
                      ? (
                          (monthStats.totalFresh / monthStats.totalTonase) *
                          100
                        ).toFixed(1)
                      : 0}
                    % dari total
                  </p>
                </div>

                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="h-4 w-4 text-amber-300" />
                    <p className="text-white/70 text-xs uppercase tracking-wide">
                      Oversack
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {formatNumber(monthStats.totalOversack)}
                    <span className="text-sm font-normal text-white/70 ml-1">
                      Ton
                    </span>
                  </p>
                  <p className="text-xs text-white/50 mt-1">
                    {monthStats.totalTonase > 0
                      ? (
                          (monthStats.totalOversack / monthStats.totalTonase) *
                          100
                        ).toFixed(1)
                      : 0}
                    % dari total
                  </p>
                </div>
              </>
            ) : (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Beaker className="h-4 w-4 text-blue-300" />
                  <p className="text-white/70 text-xs uppercase tracking-wide">
                    Retail
                  </p>
                </div>
                <p className="text-2xl font-bold text-white">
                  {formatNumber(monthStats.totalRetail)}
                  <span className="text-sm font-normal text-white/70 ml-1">
                    Ton
                  </span>
                </p>
              </div>
            )}

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="h-4 w-4 text-violet-300" />
                <p className="text-white/70 text-xs uppercase tracking-wide">
                  Jenis Formula
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {monthStats.uniqueFormulas}
              </p>
              <p className="text-xs text-white/50 mt-1">Formula berbeda</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-cyan-300" />
                <p className="text-white/70 text-xs uppercase tracking-wide">
                  Rata-rata
                </p>
              </div>
              <p className="text-2xl font-bold text-white">
                {formatNumber(monthStats.avgPerEntry)}
                <span className="text-sm font-normal text-white/70 ml-1">
                  Ton
                </span>
              </p>
              <p className="text-xs text-white/50 mt-1">
                Per entry ({monthStats.entryCount} data)
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Formula Filter & Stats Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-dark-500" />
            <h3 className="text-lg font-semibold text-dark-900 dark:text-white">
              Statistik per Formula
            </h3>
          </div>
          <Select
            value={selectedFormula}
            onChange={(e) => setSelectedFormula(e.target.value)}
            options={[
              { value: "all", label: "Semua Formula" },
              ...uniqueFormulas.map((f) => ({ value: f, label: f })),
            ]}
            className="min-w-[200px]"
          />
        </div>

        {/* Formula Cards Grid */}
        {sortedFormulaStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedFormulaStats.map(([formula, stats], index) => (
              <Card
                key={formula}
                className={`overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
                  selectedFormula === formula
                    ? "ring-2 ring-primary-500 ring-offset-2 dark:ring-offset-dark-900"
                    : ""
                }`}
                onClick={() =>
                  setSelectedFormula(
                    selectedFormula === formula ? "all" : formula
                  )
                }
              >
                <div
                  className={`bg-gradient-to-br ${getFormulaColor(index)} p-4`}
                >
                  <div className="flex items-center justify-between">
                    <div className="bg-white/20 rounded-lg px-2 py-1">
                      <span className="text-white text-xs font-medium">
                        #{index + 1}
                      </span>
                    </div>
                    <BarChart3 className="h-5 w-5 text-white/70" />
                  </div>
                  <h4
                    className="text-white font-bold text-lg mt-3 truncate"
                    title={formula}
                  >
                    {formula}
                  </h4>
                  <p className="text-white/70 text-sm">
                    {stats.count} entry data
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-dark-500 dark:text-dark-400 text-sm">
                      Total Tonase
                    </span>
                    <span className="font-bold text-dark-900 dark:text-white">
                      {formatNumber(stats.total)} Ton
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dark-500 dark:text-dark-400">
                        Kontribusi
                      </span>
                      <span className="font-medium text-dark-700 dark:text-dark-300">
                        {stats.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-dark-100 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${getFormulaColor(
                          index
                        )} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(stats.percentage, 100)}%` }}
                      />
                    </div>
                  </div>

                  {type === "blending" && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dark-100 dark:border-dark-700">
                      <div className="text-center">
                        <p className="text-xs text-dark-500 dark:text-dark-400">
                          Fresh
                        </p>
                        <p className="font-semibold text-green-600 dark:text-green-400 text-sm">
                          {formatNumber(stats.fresh)} T
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-xs text-dark-500 dark:text-dark-400">
                          Oversack
                        </p>
                        <p className="font-semibold text-amber-600 dark:text-amber-400 text-sm">
                          {formatNumber(stats.oversack)} T
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 text-dark-300 mx-auto mb-3" />
            <p className="text-dark-500 dark:text-dark-400">
              Tidak ada data produksi untuk bulan{" "}
              {MONTH_NAMES[selectedMonth as number]} {selectedYear}
            </p>
          </Card>
        )}
      </div>

      {/* Selected Formula Details */}
      {selectedFormula !== "all" && formulaStats[selectedFormula] && (
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary-500 to-primary-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 rounded-lg p-2">
                  <Beaker className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-white">
                    Detail Formula: {selectedFormula}
                  </CardTitle>
                  <p className="text-white/70 text-sm mt-1">
                    Data untuk{" "}
                    {selectedMonth === "all"
                      ? "semua bulan"
                      : `bulan ${MONTH_NAMES[selectedMonth as number]}`}{" "}
                    {selectedYear === "all" ? "semua tahun" : selectedYear}
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setSelectedFormula("all")}
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
              >
                Lihat Semua
              </Button>
            </div>
          </CardHeader>
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-50 dark:bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-sm text-dark-500 dark:text-dark-400 mb-1">
                  Total Tonase
                </p>
                <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                  {formatNumber(formulaStats[selectedFormula].total)}
                  <span className="text-sm font-normal text-dark-500 ml-1">
                    Ton
                  </span>
                </p>
              </div>
              <div className="bg-dark-50 dark:bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-sm text-dark-500 dark:text-dark-400 mb-1">
                  Jumlah Entry
                </p>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">
                  {formulaStats[selectedFormula].count}
                </p>
              </div>
              <div className="bg-dark-50 dark:bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-sm text-dark-500 dark:text-dark-400 mb-1">
                  Rata-rata/Entry
                </p>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">
                  {formatNumber(
                    formulaStats[selectedFormula].total /
                      formulaStats[selectedFormula].count
                  )}
                  <span className="text-sm font-normal text-dark-500 ml-1">
                    Ton
                  </span>
                </p>
              </div>
              <div className="bg-dark-50 dark:bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-sm text-dark-500 dark:text-dark-400 mb-1">
                  Kontribusi
                </p>
                <p className="text-2xl font-bold text-dark-900 dark:text-white">
                  {formulaStats[selectedFormula].percentage.toFixed(1)}
                  <span className="text-sm font-normal text-dark-500 ml-1">
                    %
                  </span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>
                Data {pageTitle} - Semua Data
                {selectedFormula !== "all" && (
                  <Badge variant="primary" className="ml-2">
                    {selectedFormula}
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
                {data.length} data total
              </p>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
              <Input
                type="text"
                placeholder="Cari..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
          </div>
        </CardHeader>
        <DataTable
          data={data.filter(
            (item) =>
              (selectedFormula === "all" || item.formula === selectedFormula) &&
              (item.tanggal?.includes(searchTerm) ||
                item.formula
                  ?.toLowerCase()
                  .includes(searchTerm.toLowerCase()) ||
                item.kategori?.toLowerCase().includes(searchTerm.toLowerCase()))
          )}
          columns={columns}
          loading={loading}
          searchable={false}
          actions={
            !userIsViewOnly
              ? (row) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewLog(row.id!);
                      }}
                      title="Lihat Log"
                    >
                      <History className="h-4 w-4 text-purple-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(row);
                      }}
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4 text-primary-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(row.id!);
                      }}
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )
              : (row) => (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewLog(row.id!);
                      }}
                      title="Lihat Log"
                    >
                      <History className="h-4 w-4 text-purple-600" />
                    </Button>
                  </div>
                )
          }
        />
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setForm(initialFormState);
          setEditingId(null);
        }}
        title={
          editingId ? `Edit Data ${pageTitle}` : `Tambah Data ${pageTitle}`
        }
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tanggal: e.target.value }))
            }
            required
          />

          <Select
            label="Kategori"
            value={form.kategori}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, kategori: e.target.value }))
            }
            options={kategoriOptions}
            required
          />

          <Select
            label="Formula"
            value={isCustomFormula ? "Custom" : form.formula}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "Custom") {
                setIsCustomFormula(true);
                setCustomFormulaValue("");
              } else {
                setIsCustomFormula(false);
                setForm((prev) => ({ ...prev, formula: val }));
              }
            }}
            options={formulaOptions}
            placeholder="Pilih formula"
            required
          />

          {isCustomFormula && (
            <Input
              label="Formula Custom"
              type="text"
              value={customFormulaValue}
              onChange={(e) => {
                setCustomFormulaValue(e.target.value);
                setForm((prev) => ({ ...prev, formula: e.target.value }));
              }}
              placeholder="Masukkan formula custom (contoh: NPK 18-18-18)"
              required
            />
          )}

          <Input
            label="Tonase (Ton)"
            type="number"
            value={form.tonase}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, tonase: Number(e.target.value) }))
            }
            min="0"
            step="0.01"
            required
          />

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setForm(initialFormState);
                setEditingId(null);
              }}
            >
              Batal
            </Button>
            <Button type="submit" isLoading={loading}>
              {editingId ? "Update" : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Data"
        message="Apakah Anda yakin ingin menghapus data ini?"
        confirmText="Hapus"
        variant="danger"
        isLoading={loading}
      />

      {/* Approval Dialog */}
      <ApprovalDialog
        isOpen={showApprovalDialog}
        onClose={() => {
          setShowApprovalDialog(false);
          setPendingEditItem(null);
        }}
        onSubmit={handleApprovalSubmit}
        action={approvalAction}
        itemName="data produksi blending"
        loading={loading}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />

      {/* Print Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={`${pageTitle} - ${
          MONTH_NAMES[selectedMonth as number]
        } ${selectedYear}${
          selectedFormula !== "all" ? ` (${selectedFormula})` : ""
        }`}
        plant={plant === "NPK1" ? "NPK Plant 1" : "NPK Plant 2"}
        data={filteredData as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: "tanggal",
            header: "Tanggal",
            render: (v) => formatDate(v as string),
            width: "80px",
          },
          { key: "kategori", header: "Kategori", width: "70px" },
          { key: "formula", header: "Formula", width: "120px" },
          {
            key: "tonase",
            header: "Tonase (Ton)",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "80px",
          },
        ]}
        filters={
          type === "blending"
            ? {
                kategori: {
                  label: "Kategori",
                  options: [
                    { value: "Fresh", label: "Fresh" },
                    { value: "Oversack", label: "Oversack" },
                  ],
                },
              }
            : undefined
        }
        signatures={[
          { role: "mengetahui", label: "Mengetahui" },
          { role: "pembuat", label: "Pembuat" },
        ]}
        summaryRows={[
          {
            label: "Total Tonase:",
            getValue: (d) =>
              formatNumber(
                d.reduce(
                  (s, i) =>
                    s +
                    parseNumber(
                      (i as Record<string, unknown>).tonase as number
                    ),
                  0
                )
              ) + " Ton",
          },
        ]}
      />

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setLogRecordId("");
        }}
        sheetName={
          type === "blending" ? "produksi_blending" : "produksi_blending_NPK1"
        }
        recordId={logRecordId}
        title={`Log Aktivitas ${pageTitle}`}
      />
    </div>
  );
};

export default ProduksiBlendingPage;
