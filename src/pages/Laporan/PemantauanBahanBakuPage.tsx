import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Filter,
} from "lucide-react";
import { useSaveShortcut } from "@/hooks";
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
import type { PemantauanBahanBaku } from "@/types";

// Format angka dengan 2 desimal
const formatDecimal = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return "0,00";
  return num.toLocaleString("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Opsi bahan baku
const BAHAN_BAKU_OPTIONS = [
  { value: "Urea", label: "Urea" },
  { value: "DAP", label: "DAP" },
  { value: "KCL", label: "KCL" },
  { value: "ZA", label: "ZA" },
  { value: "Dolomite", label: "Dolomite" },
  { value: "Clay", label: "Clay" },
];

// Filter options - tanpa opsi "Semua"
const FILTER_OPTIONS = [...BAHAN_BAKU_OPTIONS];

const initialFormState: PemantauanBahanBaku = {
  tanggal: getCurrentDate(),
  bahanBaku: "",
  stockAwal: 0,
  bahanBakuIn: 0,
  bahanBakuOut: 0,
  stockAkhir: 0,
};

interface PemantauanBahanBakuPageProps {
  plant: "NPK1" | "NPK2";
}

const PemantauanBahanBakuPage = ({ plant }: PemantauanBahanBakuPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<PemantauanBahanBaku[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<PemantauanBahanBaku>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBahanBaku, setFilterBahanBaku] = useState("Urea"); // Default ke Urea

  // State untuk input string (agar bisa mengetik desimal dengan benar)
  const [inputValues, setInputValues] = useState({
    stockAwal: "",
    bahanBakuIn: "",
    bahanBakuOut: "",
  });

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<PemantauanBahanBaku | null>(null);

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const formEl = document.querySelector("form");
      if (formEl) formEl.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(
          SHEETS.PEMANTAUAN_BAHAN_BAKU,
          plant
        );
        const result = await readData<PemantauanBahanBaku>(sheetName);
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

  // Auto calculate stock akhir
  useEffect(() => {
    const stockAwal = parseNumber(inputValues.stockAwal);
    const bahanBakuIn = parseNumber(inputValues.bahanBakuIn);
    const bahanBakuOut = parseNumber(inputValues.bahanBakuOut);
    const stockAkhir = stockAwal + bahanBakuIn - bahanBakuOut;
    setForm((prev) => ({
      ...prev,
      stockAwal,
      bahanBakuIn,
      bahanBakuOut,
      stockAkhir: stockAkhir >= 0 ? stockAkhir : 0,
    }));
  }, [
    inputValues.stockAwal,
    inputValues.bahanBakuIn,
    inputValues.bahanBakuOut,
  ]);

  // Auto-fill stock awal from latest stock akhir for selected bahan baku
  useEffect(() => {
    if (form.bahanBaku && !editingId) {
      // Find latest data for this bahan baku
      const latestData = data
        .filter((d) => d.bahanBaku === form.bahanBaku)
        .sort(
          (a, b) =>
            new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
        )[0];

      if (latestData) {
        setForm((prev) => ({
          ...prev,
          stockAwal: latestData.stockAkhir,
        }));
        setInputValues((prev) => ({
          ...prev,
          stockAwal: String(latestData.stockAkhir),
        }));
      }
    }
  }, [form.bahanBaku, data, editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS, getSheetNameByPlant } =
        await import("@/services/api");
      const sheetName = getSheetNameByPlant(
        SHEETS.PEMANTAUAN_BAHAN_BAKU,
        plant
      );

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: plant };
        const updateResult = await updateData<PemantauanBahanBaku>(
          sheetName,
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
        const createResult = await createData<PemantauanBahanBaku>(
          sheetName,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: PemantauanBahanBaku = {
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
      setInputValues({ stockAwal: "", bahanBakuIn: "", bahanBakuOut: "" });
      setShowSuccess(true);
    } catch (error) {
      console.error("Error saving data:", error);
      alert(error instanceof Error ? error.message : "Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: PemantauanBahanBaku) => {
    if (userIsViewOnly) return;

    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
    } else {
      setForm(item);
      setInputValues({
        stockAwal: String(item.stockAwal || ""),
        bahanBakuIn: String(item.bahanBakuIn || ""),
        bahanBakuOut: String(item.bahanBakuOut || ""),
      });
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
      const { deleteData, SHEETS, getSheetNameByPlant } = await import(
        "@/services/api"
      );
      const sheetName = getSheetNameByPlant(
        SHEETS.PEMANTAUAN_BAHAN_BAKU,
        plant
      );

      const deleteResult = await deleteData(sheetName, deleteId);
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
        sheetType: `pemantauan_bahan_baku${plant === "NPK1" ? "_NPK1" : ""}`,
        dataId: itemToSubmit?.id || "",
        dataPreview: JSON.stringify({
          tanggal: itemToSubmit?.tanggal,
          bahanBaku: itemToSubmit?.bahanBaku,
          stockAkhir: itemToSubmit?.stockAkhir,
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

  // Calculate summary statistics based on selected filter
  const getSummaryStats = () => {
    // Filter data berdasarkan bahan baku yang dipilih
    const filteredByBahanBaku = data.filter(
      (item) => item.bahanBaku === filterBahanBaku
    );

    const todayData = filteredByBahanBaku.filter(
      (item) => item.tanggal === getCurrentDate()
    );

    // Get latest stock for selected bahan baku
    const latestData = filteredByBahanBaku.sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    )[0];

    const totalStockAkhir = latestData?.stockAkhir || 0;

    const totalBahanBakuIn = todayData.reduce(
      (sum, item) => sum + item.bahanBakuIn,
      0
    );
    const totalBahanBakuOut = todayData.reduce(
      (sum, item) => sum + item.bahanBakuOut,
      0
    );

    // Total records for selected bahan baku
    const totalRecords = filteredByBahanBaku.length;

    return {
      totalStockAkhir,
      totalBahanBakuIn,
      totalBahanBakuOut,
      totalRecords,
      lastDate: latestData?.tanggal || "-",
    };
  };

  const stats = getSummaryStats();

  // Filter data by selected bahan baku and search term
  const filteredData = data.filter((item) => {
    const matchesFilter = filterBahanBaku
      ? item.bahanBaku === filterBahanBaku
      : true;
    const matchesSearch =
      item.bahanBaku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tanggal?.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  // Get stats for filtered bahan baku
  const getFilteredStats = () => {
    if (!filterBahanBaku) return null;

    const filteredByBahanBaku = data.filter(
      (item) => item.bahanBaku === filterBahanBaku
    );
    const latestData = filteredByBahanBaku.sort(
      (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
    )[0];

    return {
      currentStock: latestData?.stockAkhir || 0,
      totalRecords: filteredByBahanBaku.length,
    };
  };

  const filteredStats = getFilteredStats();

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    {
      key: "bahanBaku",
      header: "Bahan Baku",
      render: (value: unknown) => (
        <Badge variant="default">{value as string}</Badge>
      ),
    },
    {
      key: "stockAwal",
      header: "Stock Awal",
      render: (value: unknown) => (
        <span className="font-medium">
          {formatDecimal(value as number)} Ton
        </span>
      ),
    },
    {
      key: "bahanBakuIn",
      header: "Bahan Baku In",
      render: (value: unknown) => (
        <span className="text-green-600 dark:text-green-400 font-medium">
          +{formatDecimal(value as number)} Ton
        </span>
      ),
    },
    {
      key: "bahanBakuOut",
      header: "Bahan Baku Out",
      render: (value: unknown) => (
        <span className="text-red-600 dark:text-red-400 font-medium">
          -{formatDecimal(value as number)} Ton
        </span>
      ),
    },
    {
      key: "stockAkhir",
      header: "Stock Akhir",
      render: (value: unknown) => (
        <span className="font-bold text-blue-600 dark:text-blue-400">
          {formatDecimal(value as number)} Ton
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pemantauan Bahan Baku - {plant}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Monitor stok bahan baku harian
          </p>
        </div>
        {userCanAdd && (
          <Button
            onClick={() => {
              setForm(initialFormState);
              setInputValues({
                stockAwal: "",
                bahanBakuIn: "",
                bahanBakuOut: "",
              });
              setEditingId(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Tambah Data
          </Button>
        )}
      </div>

      {/* Informative Cards - menampilkan data sesuai filter bahan baku */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                  Stock Akhir {filterBahanBaku}
                </p>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300 mt-1">
                  {formatDecimal(stats.totalStockAkhir)}{" "}
                  <span className="text-sm font-normal">Ton</span>
                </p>
              </div>
              <div className="p-3 bg-blue-500 rounded-lg">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
              Update terakhir: {stats.lastDate}
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">
                  {filterBahanBaku} Masuk Hari Ini
                </p>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300 mt-1">
                  +{formatDecimal(stats.totalBahanBakuIn)}{" "}
                  <span className="text-sm font-normal">Ton</span>
                </p>
              </div>
              <div className="p-3 bg-green-500 rounded-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-green-500 dark:text-green-400 mt-2">
              Total {filterBahanBaku} yang masuk
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 dark:text-red-400 font-medium">
                  {filterBahanBaku} Keluar Hari Ini
                </p>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300 mt-1">
                  -{formatDecimal(stats.totalBahanBakuOut)}{" "}
                  <span className="text-sm font-normal">Ton</span>
                </p>
              </div>
              <div className="p-3 bg-red-500 rounded-lg">
                <TrendingDown className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-red-500 dark:text-red-400 mt-2">
              Total {filterBahanBaku} yang digunakan
            </p>
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
                  Total Record {filterBahanBaku}
                </p>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                  {stats.totalRecords}{" "}
                  <span className="text-sm font-normal">Data</span>
                </p>
              </div>
              <div className="p-3 bg-purple-500 rounded-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
            </div>
            <p className="text-xs text-purple-500 dark:text-purple-400 mt-2">
              Jumlah pencatatan {filterBahanBaku}
            </p>
          </div>
        </Card>
      </div>

      {/* Info Box */}
      <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-800 rounded-lg">
              <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Informasi Pemantauan Bahan Baku
              </h3>
              <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                <li>
                  <strong>Stock Awal:</strong> Input manual di awal bulan,
                  selanjutnya otomatis terisi dari stock akhir terakhir
                </li>
                <li>
                  <strong>Stock Akhir:</strong> Dihitung otomatis = Stock Awal +
                  Bahan Baku In - Bahan Baku Out
                </li>
                <li>
                  Gunakan <strong>Filter Bahan Baku</strong> di atas tabel untuk
                  melihat data per jenis bahan baku
                </li>
                <li>
                  Bahan baku yang dipantau: Urea, DAP, KCL, ZA, Dolomite, dan
                  Clay
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Search and Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle>Data Pemantauan Bahan Baku</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filter Bahan Baku */}
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filterBahanBaku}
                  onChange={(e) => setFilterBahanBaku(e.target.value)}
                  className="px-3 py-2 text-sm bg-white dark:bg-dark-800 border border-dark-200 dark:border-dark-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari tanggal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          {/* Show filtered stats when filter is active */}
          {filterBahanBaku && filteredStats && (
            <div className="mt-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="primary">{filterBahanBaku}</Badge>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Stock Terkini:{" "}
                    <span className="font-bold text-primary-600 dark:text-primary-400">
                      {formatDecimal(filteredStats.currentStock)} Ton
                    </span>
                  </span>
                </div>
                <span className="text-sm text-gray-500">
                  {filteredStats.totalRecords} data tercatat
                </span>
              </div>
            </div>
          )}
        </CardHeader>
        <DataTable
          data={filteredData}
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
                        handleEdit(row);
                      }}
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
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                )
              : undefined
          }
        />
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
          setForm(initialFormState);
          setInputValues({ stockAwal: "", bahanBakuIn: "", bahanBakuOut: "" });
        }}
        title={editingId ? "Edit Data Pemantauan" : "Tambah Data Pemantauan"}
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
            label="Bahan Baku"
            value={form.bahanBaku}
            onChange={(e) => setForm({ ...form, bahanBaku: e.target.value })}
            options={BAHAN_BAKU_OPTIONS}
            placeholder="Pilih Bahan Baku"
            required
          />

          <Input
            label="Stock Awal (Ton)"
            type="text"
            inputMode="decimal"
            value={inputValues.stockAwal}
            onChange={(e) => {
              const val = e.target.value;
              // Hanya izinkan angka, titik, dan koma
              if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === "") {
                setInputValues((prev) => ({ ...prev, stockAwal: val }));
              }
            }}
            placeholder="0.00"
            required
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
            * Stock awal otomatis terisi dari stock akhir terakhir untuk bahan
            baku yang dipilih
          </p>

          <Input
            label="Bahan Baku In (Ton)"
            type="text"
            inputMode="decimal"
            value={inputValues.bahanBakuIn}
            onChange={(e) => {
              const val = e.target.value;
              // Hanya izinkan angka, titik, dan koma
              if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === "") {
                setInputValues((prev) => ({ ...prev, bahanBakuIn: val }));
              }
            }}
            placeholder="0.00"
            required
          />

          <Input
            label="Bahan Baku Out (Ton)"
            type="text"
            inputMode="decimal"
            value={inputValues.bahanBakuOut}
            onChange={(e) => {
              const val = e.target.value;
              // Hanya izinkan angka, titik, dan koma
              if (/^[0-9]*[.,]?[0-9]*$/.test(val) || val === "") {
                setInputValues((prev) => ({ ...prev, bahanBakuOut: val }));
              }
            }}
            placeholder="0.00"
            required
          />

          <Input
            label="Stock Akhir (Ton)"
            type="number"
            value={form.stockAkhir || 0}
            disabled
            className="bg-gray-100 dark:bg-gray-700"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setForm(initialFormState);
                setInputValues({
                  stockAwal: "",
                  bahanBakuIn: "",
                  bahanBakuOut: "",
                });
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
    </div>
  );
};

export default PemantauanBahanBakuPage;
