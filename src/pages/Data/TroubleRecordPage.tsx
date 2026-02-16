import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  Clock,
  Eye,
  Calendar,
  User,
  Target,
  FileText,
  CheckCircle,
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
  ActivityLogModal,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatDate,
  formatTime,
  canAdd,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
} from "@/lib/utils";
import { SHEETS } from "@/services/api";
import type { TroubleRecord, PlantType } from "@/types";

// Generate year options from 2023 to current year + 1
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  ...Array.from({ length: currentYear - 2022 }, (_, i) => ({
    value: String(2023 + i),
    label: String(2023 + i),
  })),
  { value: String(currentYear + 1), label: String(currentYear + 1) },
];

const initialFormState: TroubleRecord = {
  nomorBerkas: "",
  tanggal: getCurrentDate(),
  tanggalKejadian: getCurrentDate(),
  shift: "1",
  waktuKejadian: "",
  kodePeralatan: "",
  area: "",
  deskripsiMasalah: "",
  penyebab: "",
  tindakan: "",
  status: "Open",
  pic: "",
  targetSelesai: "",
  keterangan: "",
};

interface TroubleRecordPageProps {
  plant: PlantType;
}

const TroubleRecordPage = ({ plant }: TroubleRecordPageProps) => {
  const { user } = useAuthStore();
  const { createWithLog, updateWithLog, deleteWithLog } = useDataWithLogging();
  const [data, setData] = useState<TroubleRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<TroubleRecord>(initialFormState);
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  );
  // Plant is now set from prop
  const currentPlant = plant;

  // View states
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState<TroubleRecord | null>(null);

  // Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRecordId, setLogRecordId] = useState("");

  // Handler for viewing log
  const handleViewLog = (id: string) => {
    setLogRecordId(id);
    setShowLogModal(true);
  };

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<TroubleRecord | null>(
    null
  );

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

  const areaOptions = [
    { value: "Granulator", label: "Granulator" },
    { value: "Dryer", label: "Dryer" },
    { value: "Cooler", label: "Cooler" },
    { value: "Screening", label: "Screening" },
    { value: "Coater", label: "Coater" },
    { value: "Bagging", label: "Bagging" },
    { value: "Utility", label: "Utility" },
    { value: "Conveyor", label: "Conveyor" },
    { value: "Bucket Elevator", label: "Bucket Elevator" },
    { value: "Control Room", label: "Control Room" },
    { value: "Furnace", label: "Furnace" },
    { value: "Scrubbing System", label: "Scrubbing System" },
    { value: "Lainnya", label: "Lainnya" },
  ];

  const statusOptions = [
    { value: "Open", label: "Open" },
    { value: "In Progress", label: "In Progress" },
    { value: "Closed", label: "Closed" },
    { value: "Pending", label: "Pending" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { fetchDataByPlant, SHEETS } = await import("@/services/api");
        const result = await fetchDataByPlant<TroubleRecord>(
          SHEETS.TROUBLE_RECORD
        );
        if (result.success && result.data) {
          const sortedData = [...result.data].sort(
            (a, b) =>
              new Date(b.tanggal || "").getTime() -
              new Date(a.tanggal || "").getTime()
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        // Update with logging
        const dataToUpdate = { ...form, id: editingId, _plant: currentPlant };
        const updateResult = await updateWithLog<TroubleRecord>(
          SHEETS.TROUBLE_RECORD,
          dataToUpdate
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId
                ? { ...form, id: editingId, _plant: currentPlant }
                : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        // Create with logging
        const newData = { ...form, _plant: currentPlant };
        const createResult = await createWithLog<TroubleRecord>(
          SHEETS.TROUBLE_RECORD,
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: TroubleRecord = {
            ...createResult.data,
            _plant: currentPlant,
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

  const handleView = (item: TroubleRecord) => {
    setViewItem(item);
    setShowViewModal(true);
  };

  const handleEdit = (item: TroubleRecord) => {
    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
      return;
    }
    setForm(item);
    setEditingId(item.id || null);
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
      const { createData, SHEETS } = await import("@/services/api");

      const approvalData = {
        type: "trouble_record" as const,
        action: approvalAction,
        itemId: pendingEditItem.id,
        itemData: pendingEditItem,
        targetSheet: currentPlant === "NPK1" ? "trouble_record_NPK1" : "trouble_record",
        reason,
        submittedBy: user?.nama || user?.email || "Unknown",
        submittedAt: new Date().toISOString(),
        status: "pending" as const,
      };

      const result = await createData(SHEETS.APPROVAL_REQUESTS, approvalData);

      if (result.success) {
        setShowApprovalDialog(false);
        setPendingEditItem(null);
        alert("Permintaan telah dikirim dan menunggu persetujuan");
      } else {
        throw new Error(result.error || "Gagal mengirim permintaan");
      }
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert(error instanceof Error ? error.message : "Gagal mengirim permintaan approval");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const itemToDelete = data.find((item) => item.id === deleteId);

      // Delete with logging - use currentPlant as fallback
      const deleteResult = await deleteWithLog(SHEETS.TROUBLE_RECORD, {
        id: deleteId,
        _plant: itemToDelete?._plant || currentPlant,
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
    setShowForm(true);
  };

  const filteredData = data.filter((item) => {
    const matchesPlant = item._plant === currentPlant;

    // Filter by year
    const itemYear = new Date(item.tanggal || "").getFullYear();
    const matchesYear = itemYear === parseInt(selectedYear);

    return matchesPlant && matchesYear;
  });

  const statusCounts = {
    open: filteredData.filter((d) => d.status === "Open").length,
    progress: filteredData.filter((d) => d.status === "In Progress").length,
    closed: filteredData.filter((d) => d.status === "Closed").length,
    pending: filteredData.filter((d) => d.status === "Pending").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Open":
        return "danger";
      case "In Progress":
        return "warning";
      case "Closed":
        return "success";
      case "Pending":
        return "info";
      default:
        return "default";
    }
  };

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
        <Badge variant="primary">Shift {value as string}</Badge>
      ),
    },
    {
      key: "waktuKejadian",
      header: "Waktu",
      render: (value: unknown) => formatTime(value),
    },
    {
      key: "area",
      header: "Area",
      render: (value: unknown) => (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-dark-400" />
          <span className="font-medium">{value as string}</span>
        </div>
      ),
    },
    {
      key: "deskripsiMasalah",
      header: "Deskripsi Masalah",
      render: (value: unknown) => (
        <span className="line-clamp-2 max-w-xs">{value as string}</span>
      ),
    },
    { key: "pic", header: "PIC" },
    {
      key: "status",
      header: "Status",
      render: (value: unknown) => (
        <Badge variant={getStatusColor(value as string)}>
          {value as string}
        </Badge>
      ),
    },
    {
      key: "targetSelesai",
      header: "Target",
      render: (value: unknown) => formatDate(value as string),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900 dark:text-white">
            Trouble Record {currentPlant === "NPK1" ? "NPK 1" : "NPK 2"}
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Catatan masalah dan tindak lanjut
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userCanAdd && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Catat Trouble
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3 sm:p-4 border-l-4 border-l-red-500">
          <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">Open</p>
          <p className="text-lg sm:text-2xl font-bold text-red-600">{statusCounts.open}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-l-4 border-l-amber-500">
          <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">In Progress</p>
          <p className="text-lg sm:text-2xl font-bold text-amber-600">{statusCounts.progress}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-l-4 border-l-green-500">
          <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">Closed</p>
          <p className="text-lg sm:text-2xl font-bold text-green-600">{statusCounts.closed}</p>
        </Card>
        <Card className="p-3 sm:p-4 border-l-4 border-l-gray-500">
          <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400">Pending</p>
          <p className="text-lg sm:text-2xl font-bold text-gray-600 dark:text-gray-400">{statusCounts.pending}</p>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Trouble Record - Tahun {selectedYear}</CardTitle>
            <Select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              options={YEAR_OPTIONS}
              className="w-32"
            />
          </div>
        </CardHeader>
        <DataTable
          data={filteredData}
          columns={columns}
          loading={loading}
          searchable={true}
          searchPlaceholder="Cari tanggal, nomor berkas, area, masalah, PIC..."
          searchKeys={[
            "tanggal",
            "nomorBerkas",
            "area",
            "deskripsiMasalah",
            "penyebab",
            "tindakan",
            "status",
            "pic",
          ]}
          actions={(row) => (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  handleView(row);
                }}
                title="Lihat Detail"
              >
                <Eye className="h-4 w-4 text-dark-500" />
              </Button>
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
              {!userIsViewOnly && (
                <>
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
                </>
              )}
            </div>
          )}
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
        title={editingId ? "Edit Trouble Record" : "Catat Trouble Baru"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
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
              label="Shift"
              value={form.shift}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, shift: e.target.value }))
              }
              options={[
                { value: "1", label: "Shift 1" },
                { value: "2", label: "Shift 2" },
                { value: "3", label: "Shift 3" },
              ]}
              required
            />
            <Input
              label="Waktu Kejadian"
              type="time"
              value={form.waktuKejadian}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, waktuKejadian: e.target.value }))
              }
              required
            />
          </div>

          <Select
            label="Area"
            value={form.area}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, area: e.target.value }))
            }
            options={areaOptions}
            placeholder="Pilih area"
            required
          />

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Deskripsi Masalah
            </label>
            <textarea
              value={form.deskripsiMasalah}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  deskripsiMasalah: e.target.value,
                }))
              }
              placeholder="Jelaskan masalah yang terjadi..."
              className="input-field min-h-[80px]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Penyebab
            </label>
            <textarea
              value={form.penyebab}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, penyebab: e.target.value }))
              }
              placeholder="Analisa penyebab..."
              className="input-field min-h-[60px]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              Tindakan
            </label>
            <textarea
              value={form.tindakan}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tindakan: e.target.value }))
              }
              placeholder="Tindakan yang dilakukan/direncanakan..."
              className="input-field min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Select
              label="Status"
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as TroubleRecord["status"],
                }))
              }
              options={statusOptions}
              required
            />
            <Input
              label="PIC"
              type="text"
              value={form.pic}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, pic: e.target.value }))
              }
              placeholder="Nama PIC"
              required
            />
            <Input
              label="Target Selesai"
              type="date"
              value={form.targetSelesai}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, targetSelesai: e.target.value }))
              }
            />
          </div>

          <Input
            label="Keterangan"
            type="text"
            value={form.keterangan}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, keterangan: e.target.value }))
            }
            placeholder="Keterangan tambahan"
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

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewItem(null);
        }}
        title="Detail Trouble Record"
        size="lg"
      >
        {viewItem && (
          <div className="space-y-6">
            {/* Header with Status */}
            <div
              className={`rounded-2xl p-6 text-white ${
                viewItem.status === "Open"
                  ? "bg-gradient-to-r from-red-500 to-red-600"
                  : viewItem.status === "In Progress"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600"
                  : viewItem.status === "Closed"
                  ? "bg-gradient-to-r from-green-500 to-green-600"
                  : "bg-gradient-to-r from-gray-500 to-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-sm font-medium">
                    Trouble Record
                  </p>
                  <h2 className="text-2xl font-bold mt-1">{viewItem.area}</h2>
                  <p className="text-white/80 text-sm mt-1">
                    {currentPlant === "NPK1" ? "NPK 1" : "NPK 2"}
                  </p>
                </div>
                <Badge
                  variant="primary"
                  className="bg-white/20 text-white border-0 text-lg px-4 py-2"
                >
                  {viewItem.status}
                </Badge>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-dark-50 dark:bg-dark-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary-500" />
                  <p className="text-xs text-dark-500 dark:text-dark-400 uppercase tracking-wide">
                    Tanggal
                  </p>
                </div>
                <p className="font-semibold text-dark-900 dark:text-white">
                  {formatDate(viewItem.tanggal || "")}
                </p>
              </div>
              <div className="bg-dark-50 dark:bg-dark-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <p className="text-xs text-dark-500 dark:text-dark-400 uppercase tracking-wide">
                    Waktu
                  </p>
                </div>
                <p className="font-semibold text-dark-900 dark:text-white">
                  Shift {viewItem.shift} - {formatTime(viewItem.waktuKejadian)}
                </p>
              </div>
              <div className="bg-dark-50 dark:bg-dark-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-blue-500" />
                  <p className="text-xs text-dark-500 dark:text-dark-400 uppercase tracking-wide">
                    PIC
                  </p>
                </div>
                <p className="font-semibold text-dark-900 dark:text-white">
                  {viewItem.pic || "-"}
                </p>
              </div>
              <div className="bg-dark-50 dark:bg-dark-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <p className="text-xs text-dark-500 dark:text-dark-400 uppercase tracking-wide">
                    Target Selesai
                  </p>
                </div>
                <p className="font-semibold text-dark-900 dark:text-white">
                  {viewItem.targetSelesai
                    ? formatDate(viewItem.targetSelesai)
                    : "-"}
                </p>
              </div>
            </div>

            {/* Deskripsi Masalah */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-800 dark:text-red-300">
                  Deskripsi Masalah
                </h3>
              </div>
              <p className="text-dark-700 dark:text-dark-300 leading-relaxed">
                {viewItem.deskripsiMasalah || "-"}
              </p>
            </div>

            {/* Penyebab */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">
                  Analisa Penyebab
                </h3>
              </div>
              <p className="text-dark-700 dark:text-dark-300 leading-relaxed">
                {viewItem.penyebab || "-"}
              </p>
            </div>

            {/* Tindakan */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold text-green-800 dark:text-green-300">
                  Tindakan
                </h3>
              </div>
              <p className="text-dark-700 dark:text-dark-300 leading-relaxed">
                {viewItem.tindakan || "-"}
              </p>
            </div>

            {/* Keterangan */}
            {viewItem.keterangan && (
              <div className="bg-dark-50 dark:bg-dark-800 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-5 w-5 text-dark-500" />
                  <h3 className="font-semibold text-dark-700 dark:text-dark-300">
                    Keterangan Tambahan
                  </h3>
                </div>
                <p className="text-dark-600 dark:text-dark-400 leading-relaxed">
                  {viewItem.keterangan}
                </p>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-end pt-2 border-t border-dark-200 dark:border-dark-700">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowViewModal(false);
                  setViewItem(null);
                }}
              >
                Tutup
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
        onConfirm={confirmDelete}
        title="Hapus Trouble Record"
        message="Apakah Anda yakin ingin menghapus record ini?"
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
        itemName="data trouble record"
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
          currentPlant === "NPK1" ? "trouble_record_NPK1" : "trouble_record"
        }
        recordId={logRecordId}
        title="Log Aktivitas Trouble Record"
      />
    </div>
  );
};

export default TroubleRecordPage;
