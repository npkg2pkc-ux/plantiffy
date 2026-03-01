import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Filter,
  History,
  Sun,
  Moon,
  Sunset,
  ChevronDown,
} from "lucide-react";
import { useSaveShortcut, useDataWithLogging } from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ConfirmDialog,
  Badge,
  DataTable,
  SuccessOverlay,
  ApprovalDialog,
  Select,
  ActivityLogModal,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatDate,
  canAdd,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";
import type { PemakaianBahanBaku } from "@/types";

// Generate year options from 2023 to current year + 1
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  ...Array.from({ length: currentYear - 2022 }, (_, i) => ({
    value: String(2023 + i),
    label: String(2023 + i),
  })),
  { value: String(currentYear + 1), label: String(currentYear + 1) },
];

// Shift options
const SHIFT_OPTIONS = [
  { value: "Malam", label: "Malam" },
  { value: "Pagi", label: "Pagi" },
  { value: "Sore", label: "Sore" },
];

// Filter shift options
const FILTER_SHIFT_OPTIONS = [
  { value: "", label: "Semua Shift" },
  ...SHIFT_OPTIONS,
];

// Material fields config: key, label, unit
const MATERIAL_FIELDS = [
  { key: "urea", label: "Urea", unit: "Bucket" },
  { key: "dap", label: "DAP", unit: "Bucket" },
  { key: "kcl", label: "KCL", unit: "Bucket" },
  { key: "za", label: "ZA", unit: "Bucket" },
  { key: "clayJumbo", label: "Clay (Jumbo)", unit: "Jumbo" },
  { key: "clayBucket", label: "Clay (Bucket)", unit: "Bucket" },
  { key: "pewarna", label: "Pewarna", unit: "Bag" },
  { key: "coatingOilLigno", label: "Coating Oil LIGNO", unit: "Dus" },
  { key: "riject", label: "Riject", unit: "Bucket" },
  { key: "tinta", label: "Tinta", unit: "pcs" },
  { key: "rekon", label: "Rekon", unit: "Ton" },
  { key: "makeupIjp", label: "MAKEUP IJP", unit: "pcs" },
] as const;

const initialFormState: PemakaianBahanBaku = {
  tanggal: getCurrentDate(),
  shift: "",
  urea: 0,
  dap: 0,
  kcl: 0,
  za: 0,
  clayJumbo: 0,
  clayBucket: 0,
  pewarna: 0,
  coatingOilLigno: 0,
  riject: 0,
  tinta: 0,
  rekon: 0,
  makeupIjp: 0,
};

interface PemakaianBahanBakuPageProps {
  plant: "NPK1" | "NPK2";
}

const PemakaianBahanBakuPage = ({ plant }: PemakaianBahanBakuPageProps) => {
  const { user } = useAuthStore();
  const { createWithLog, updateWithLog, deleteWithLog } = useDataWithLogging();
  const [data, setData] = useState<PemakaianBahanBaku[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<PemakaianBahanBaku>(initialFormState);
  const [filterShift, setFilterShift] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  );

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<PemakaianBahanBaku | null>(null);

  // Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRecordId, setLogRecordId] = useState("");

  // View mode: "table" or "daily"
  const [viewMode, setViewMode] = useState<"table" | "daily">("daily");

  // Expanded dates for daily view (default all collapsed)
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const toggleDate = useCallback((date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  }, []);

  const handleViewLog = (id: string) => {
    setLogRecordId(id);
    setShowLogModal(true);
  };

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);
  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const formEl = document.querySelector("form");
      if (formEl) formEl.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(
          SHEETS.PEMAKAIAN_BAHAN_BAKU,
          plant
        );
        const result = await readData<PemakaianBahanBaku>(sheetName);
        if (result.success && result.data) {
          const sortedData = result.data
            .map((item) => ({ ...item, _plant: plant }))
            .sort(
              (a, b) =>
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
            );
          setData(sortedData);
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
  }, [plant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: plant };
        const updateResult = await updateWithLog<PemakaianBahanBaku>(
          "pemakaian_bahan_baku",
          dataToUpdate
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
        const newData = { ...form, _plant: plant };
        const createResult = await createWithLog<PemakaianBahanBaku>(
          "pemakaian_bahan_baku",
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: PemakaianBahanBaku = {
            ...createResult.data,
            _plant: plant,
          };
          setData((prev) =>
            [newItem, ...prev].sort(
              (a, b) =>
                new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
            )
          );
        } else {
          throw new Error(createResult.error || "Gagal menambah data");
        }
      }

      setShowForm(false);
      setEditingId(null);
      setForm(initialFormState);
      setShowSuccess(true);
    } catch (error) {
      console.error("Error saving data:", error);
      alert(error instanceof Error ? error.message : "Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: PemakaianBahanBaku) => {
    if (userIsViewOnly) return;

    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
    } else {
      setForm(item);
      setEditingId(item.id || null);
      setShowForm(true);
    }
  };

  const handleDelete = (id: string) => {
    if (userIsViewOnly) return;

    if (userNeedsApprovalDelete) {
      setDeleteId(id);
      setApprovalAction("delete");
      setShowApprovalDialog(true);
    } else {
      setDeleteId(id);
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);

    try {
      const deleteResult = await deleteWithLog("pemakaian_bahan_baku", {
        id: deleteId,
        _plant: plant,
      });
      if (deleteResult.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
      } else {
        throw new Error(deleteResult.error || "Gagal menghapus data");
      }

      setShowDeleteConfirm(false);
      setDeleteId(null);
      setShowSuccess(true);
    } catch (error) {
      console.error("Error deleting data:", error);
      alert(error instanceof Error ? error.message : "Gagal menghapus data");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSubmit = async (reason: string) => {
    try {
      const { createData, SHEETS } = await import("@/services/api");

      const itemToSubmit =
        approvalAction === "edit"
          ? pendingEditItem
          : data.find((d) => d.id === deleteId);

      const approvalData = {
        requestBy: user?.username || "",
        requestByName: user?.nama || user?.username || "",
        requestDate: new Date().toISOString(),
        action: approvalAction,
        sheetType: `pemakaian_bahan_baku${plant === "NPK1" ? "_NPK1" : ""}`,
        dataId: itemToSubmit?.id || "",
        dataPreview: JSON.stringify({
          tanggal: itemToSubmit?.tanggal,
          shift: itemToSubmit?.shift,
        }),
        reason,
        status: "pending",
        requesterPlant: plant,
      };

      await createData(SHEETS.APPROVAL_REQUESTS, approvalData);

      setShowApprovalDialog(false);
      setPendingEditItem(null);
      setDeleteId(null);
      alert("Permintaan approval telah dikirim");
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert("Gagal mengirim permintaan approval");
    }
  };

  // Filter data by shift & year
  const filteredData = data.filter((item) => {
    const matchesShift = filterShift ? item.shift === filterShift : true;
    const itemYear = new Date(item.tanggal).getFullYear();
    const matchesYear = itemYear === parseInt(selectedYear);
    return matchesShift && matchesYear;
  });

  // Group data by date for daily view
  const groupedByDate = filteredData.reduce(
    (acc, item) => {
      if (!acc[item.tanggal]) {
        acc[item.tanggal] = [];
      }
      acc[item.tanggal].push(item);
      return acc;
    },
    {} as Record<string, PemakaianBahanBaku[]>
  );

  // Sort dates descending
  const sortedDates = Object.keys(groupedByDate).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  // Summary stats
  const getSummaryStats = () => {
    const yearData = data.filter((item) => {
      const itemYear = new Date(item.tanggal).getFullYear();
      return itemYear === parseInt(selectedYear);
    });

    const totalRecords = yearData.length;
    const totalDays = new Set(yearData.map((item) => item.tanggal)).size;

    // Total per material across all shifts
    const totals = MATERIAL_FIELDS.reduce(
      (acc, field) => {
        acc[field.key] = yearData.reduce(
          (sum, item) =>
            sum + (Number((item as unknown as Record<string, unknown>)[field.key]) || 0),
          0
        );
        return acc;
      },
      {} as Record<string, number>
    );

    return { totalRecords, totalDays, totals };
  };

  const stats = getSummaryStats();

  // Get shift icon
  const getShiftIcon = (shift: string) => {
    switch (shift) {
      case "Malam":
        return <Moon className="h-3.5 w-3.5" />;
      case "Pagi":
        return <Sun className="h-3.5 w-3.5" />;
      case "Sore":
        return <Sunset className="h-3.5 w-3.5" />;
      default:
        return null;
    }
  };

  // Get shift badge variant
  const getShiftVariant = (shift: string) => {
    switch (shift) {
      case "Malam":
        return "default" as const;
      case "Pagi":
        return "warning" as const;
      case "Sore":
        return "primary" as const;
      default:
        return "default" as const;
    }
  };

  // Shift order for sorting
  const SHIFT_ORDER: Record<string, number> = {
    Malam: 0,
    Pagi: 1,
    Sore: 2,
  };

  // Table columns for list view
  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "shift",
      header: "Shift",
      render: (value: unknown) => (
        <Badge variant={getShiftVariant(value as string)}>
          <span className="flex items-center gap-1">
            {getShiftIcon(value as string)}
            {value as string}
          </span>
        </Badge>
      ),
    },
    {
      key: "urea",
      header: "Urea",
      render: (value: unknown) => {
        const num = Number(value) || 0;
        return num > 0 ? (
          <span className="font-medium">{num} Bucket</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      key: "dap",
      header: "DAP",
      render: (value: unknown) => {
        const num = Number(value) || 0;
        return num > 0 ? (
          <span className="font-medium">{num} Bucket</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      key: "kcl",
      header: "KCL",
      render: (value: unknown) => {
        const num = Number(value) || 0;
        return num > 0 ? (
          <span className="font-medium">{num} Bucket</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      key: "za",
      header: "ZA",
      render: (value: unknown) => {
        const num = Number(value) || 0;
        return num > 0 ? (
          <span className="font-medium">{num} Bucket</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      key: "pewarna",
      header: "Pewarna",
      render: (value: unknown) => {
        const num = Number(value) || 0;
        return num > 0 ? (
          <span className="font-medium">{num} Bag</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
    {
      key: "coatingOilLigno",
      header: "Coating Oil",
      render: (value: unknown) => {
        const num = Number(value) || 0;
        return num > 0 ? (
          <span className="font-medium">{num} Dus</span>
        ) : (
          <span className="text-gray-400">-</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pemakaian Bahan Baku - {plant}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Catatan pemakaian bahan baku per shift
          </p>
        </div>
        {userCanAdd && (
          <Button
            onClick={() => {
              setForm(initialFormState);
              setEditingId(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Data
          </Button>
        )}
      </div>

      {/* Summary Cards — compact grid showing all materials */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Total Record */}
        <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-800 p-3">
          <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate">Total Record</p>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300 mt-0.5">{stats.totalRecords}</p>
          <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1">Tahun {selectedYear}</p>
        </div>
        {/* Total Hari */}
        <div className="rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800 p-3">
          <p className="text-[11px] text-green-600 dark:text-green-400 font-medium truncate">Total Hari</p>
          <p className="text-lg font-bold text-green-700 dark:text-green-300 mt-0.5">{stats.totalDays}</p>
          <p className="text-[10px] text-green-500 dark:text-green-400 mt-1">Hari tercatat</p>
        </div>
        {/* All material cards */}
        {MATERIAL_FIELDS.map((field) => {
          const total = stats.totals[field.key] || 0;
          return (
            <div
              key={field.key}
              className="rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-dark-700 dark:to-dark-800 border border-gray-200 dark:border-dark-600 p-3"
            >
              <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium truncate">{field.label}</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">
                {total}{" "}
                <span className="text-[10px] font-normal text-gray-500 dark:text-gray-400">{field.unit}</span>
              </p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">Tahun {selectedYear}</p>
            </div>
          );
        })}
      </div>

      {/* View Mode Toggle + Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle>Data Pemakaian Bahan Baku</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* View Mode Toggle */}
              <div className="flex rounded-lg border border-dark-200 dark:border-dark-600 overflow-hidden">
                <button
                  onClick={() => setViewMode("daily")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "daily"
                      ? "bg-primary-600 text-white"
                      : "bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
                  }`}
                >
                  Harian
                </button>
                <button
                  onClick={() => setViewMode("table")}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    viewMode === "table"
                      ? "bg-primary-600 text-white"
                      : "bg-white dark:bg-dark-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700"
                  }`}
                >
                  Tabel
                </button>
              </div>
              {/* Filter Tahun */}
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={YEAR_OPTIONS}
                className="w-full sm:w-28"
              />
              {/* Filter Shift */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <select
                  value={filterShift}
                  onChange={(e) => setFilterShift(e.target.value)}
                  className="px-3 py-2 text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {FILTER_SHIFT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Daily View - grouped by date like the image */}
        {viewMode === "daily" ? (
          <div className="p-4 space-y-6">
            {loading ? (
              <div className="text-center py-12 text-gray-500">
                Memuat data...
              </div>
            ) : sortedDates.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Tidak ada data
              </div>
            ) : (
              sortedDates.map((date) => {
                const dayData = groupedByDate[date].sort(
                  (a, b) =>
                    (SHIFT_ORDER[a.shift] ?? 99) -
                    (SHIFT_ORDER[b.shift] ?? 99)
                );
                const shifts = dayData.map((d) => d.shift);

                return (
                  <div
                    key={date}
                    className="border border-dark-200 dark:border-dark-600 rounded-xl overflow-hidden"
                  >
                    {/* Date Header — Collapsible */}
                    <div
                      className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-primary-700 dark:to-primary-800 px-4 py-3 flex items-center justify-between cursor-pointer select-none hover:from-primary-700 hover:to-primary-800 transition-all"
                      onClick={() => toggleDate(date)}
                    >
                      <div className="flex items-center gap-2">
                        <ChevronDown
                          className={`h-4 w-4 text-white transition-transform duration-200 ${
                            expandedDates.has(date) ? "rotate-180" : "rotate-0"
                          }`}
                        />
                        <h3 className="font-bold text-white text-sm">
                          {formatDate(date)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        {shifts.map((shift) => (
                          <Badge
                            key={shift}
                            variant="default"
                            className="bg-white/20 text-white border-white/30 text-xs"
                          >
                            {shift}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Material Table — Collapsible */}
                    {expandedDates.has(date) && (
                    <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 dark:bg-dark-700">
                            <th className="px-4 py-2.5 text-left font-semibold text-gray-700 dark:text-gray-300 w-48">
                              Bahan Baku
                            </th>
                            {dayData.map((d) => (
                              <th
                                key={d.shift}
                                className="px-4 py-2.5 text-center font-semibold text-gray-700 dark:text-gray-300 min-w-[120px]"
                              >
                                <span className="flex items-center justify-center gap-1.5">
                                  {getShiftIcon(d.shift)}
                                  {d.shift}
                                </span>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {MATERIAL_FIELDS.map((field, idx) => (
                            <tr
                              key={field.key}
                              className={
                                idx % 2 === 0
                                  ? "bg-white dark:bg-dark-800"
                                  : "bg-gray-50/50 dark:bg-dark-750"
                              }
                            >
                              <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300 border-r border-dark-100 dark:border-dark-600">
                                {field.label}
                              </td>
                              {dayData.map((d) => {
                                const val = Number(
                                  (d as unknown as Record<string, unknown>)[
                                    field.key
                                  ]
                                ) || 0;
                                return (
                                  <td
                                    key={d.shift}
                                    className="px-4 py-2 text-center"
                                  >
                                    {val > 0 ? (
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {val}{" "}
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                          {field.unit}
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 dark:text-gray-600">
                                        -
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Actions per shift */}
                    {!userIsViewOnly && (
                      <div className="bg-gray-50 dark:bg-dark-700 px-4 py-2 flex flex-wrap gap-2 border-t border-dark-100 dark:border-dark-600">
                        {dayData.map((d) => (
                          <div
                            key={d.shift}
                            className="flex items-center gap-1"
                          >
                            <Badge
                              variant={getShiftVariant(d.shift)}
                              className="text-xs"
                            >
                              {d.shift}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewLog(d.id!)}
                              title="Lihat Log"
                            >
                              <History className="h-3.5 w-3.5 text-purple-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(d)}
                              title="Edit"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-primary-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(d.id!)}
                              title="Hapus"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Table view */
          <DataTable
            data={filteredData}
            columns={columns}
            loading={loading}
            searchable={true}
            searchPlaceholder="Cari tanggal, shift..."
            searchKeys={["tanggal", "shift"]}
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
        )}
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
          setForm(initialFormState);
        }}
        title={
          editingId
            ? "Edit Data Pemakaian Bahan Baku"
            : "Tambah Data Pemakaian Bahan Baku"
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tanggal"
            type="date"
            value={form.tanggal}
            onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            required
          />

          <Select
            label="Shift"
            value={form.shift}
            onChange={(e) => setForm({ ...form, shift: e.target.value })}
            options={SHIFT_OPTIONS}
            placeholder="Pilih Shift"
            required
          />

          <div className="border-t border-dark-200 dark:border-dark-600 pt-4 mt-4">
            <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">
              Jumlah Pemakaian per Bahan Baku
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MATERIAL_FIELDS.map((field) => (
                <Input
                  key={field.key}
                  label={`${field.label} (${field.unit})`}
                  type="number"
                  step="any"
                  min="0"
                  value={
                    (form as unknown as Record<string, unknown>)[field.key] as number || ""
                  }
                  onChange={(e) => {
                    const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      [field.key]: isNaN(val) ? 0 : val,
                    }));
                  }}
                  placeholder="0"
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(initialFormState);
              }}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Menyimpan..." : editingId ? "Update" : "Simpan"}
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
          setDeleteId(null);
        }}
        onSubmit={handleApprovalSubmit}
        action={approvalAction}
        loading={loading}
      />

      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setLogRecordId("");
        }}
        sheetName={
          plant === "NPK1"
            ? "pemakaian_bahan_baku_NPK1"
            : "pemakaian_bahan_baku"
        }
        recordId={logRecordId}
        title="Log Aktivitas Pemakaian Bahan Baku"
      />
    </div>
  );
};

export default PemakaianBahanBakuPage;
