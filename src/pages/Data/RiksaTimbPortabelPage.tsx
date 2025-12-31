import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  Scale,
  Eye,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useSaveShortcut } from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  DataTable,
  SuccessOverlay,
  ApprovalDialog,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatDate,
  parseNumber,
  canAdd,
  canEditDirect,
  canDeleteDirect,
  needsApprovalForEdit,
  needsApprovalForDelete,
  isViewOnly,
  getCurrentDate,
  cn,
} from "@/lib/utils";
import type { PlantType } from "@/types";

// Type definition for Riksa Timbangan Portabel
export interface RiksaTimbPortabel {
  id?: string;
  tanggal: string;
  area: string;
  // Uji Penambahan
  ujiPenambahan10: number;
  ujiPenambahan20: number;
  ujiPenambahan30: number;
  ujiPenambahan40: number;
  ujiPenambahan50: number;
  // Uji Pengurangan
  ujiPengurangan50: number;
  ujiPengurangan40: number;
  ujiPengurangan30: number;
  ujiPengurangan20: number;
  ujiPengurangan10: number;
  // Selisih (calculated)
  selisihPenambahan10?: number;
  selisihPenambahan20?: number;
  selisihPenambahan30?: number;
  selisihPenambahan40?: number;
  selisihPenambahan50?: number;
  selisihPengurangan50?: number;
  selisihPengurangan40?: number;
  selisihPengurangan30?: number;
  selisihPengurangan20?: number;
  selisihPengurangan10?: number;
  totalSelisih?: number;
  rataRataSelisih?: number;
  _plant?: PlantType;
}

const initialFormState: RiksaTimbPortabel = {
  tanggal: getCurrentDate(),
  area: "",
  ujiPenambahan10: 0,
  ujiPenambahan20: 0,
  ujiPenambahan30: 0,
  ujiPenambahan40: 0,
  ujiPenambahan50: 0,
  ujiPengurangan50: 0,
  ujiPengurangan40: 0,
  ujiPengurangan30: 0,
  ujiPengurangan20: 0,
  ujiPengurangan10: 0,
};

const RiksaTimbPortabelPage = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<RiksaTimbPortabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewItem, setViewItem] = useState<RiksaTimbPortabel | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<RiksaTimbPortabel>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<RiksaTimbPortabel | null>(null);

  // Check if user is view only
  const userIsViewOnly = isViewOnly(user?.role || "");
  const userCanAdd = canAdd(user?.role || "") && !userIsViewOnly;

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const formEl = document.querySelector("form");
      if (formEl) formEl.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const userCanEditDirect = canEditDirect(user?.role || "");
  const userCanDeleteDirect = canDeleteDirect(user?.role || "");
  const userNeedsApprovalEdit = needsApprovalForEdit(user?.role || "");
  const userNeedsApprovalDelete = needsApprovalForDelete(user?.role || "");

  const areaOptions = [
    { value: "NPK 2", label: "NPK 2" },
    { value: "Blending", label: "Blending" },
    { value: "NPK Mini", label: "NPK Mini" },
  ];

  // Format weight with 2 decimal places using period (.) as decimal separator
  const formatWeight = (num: number | undefined | null): string => {
    if (num === undefined || num === null) return "0.00";
    return num.toFixed(2);
  };

  // Calculate selisih (difference) for each test
  const calculateSelisih = (item: RiksaTimbPortabel) => {
    const selisihPenambahan10 = item.ujiPenambahan10 - 10;
    const selisihPenambahan20 = item.ujiPenambahan20 - 20;
    const selisihPenambahan30 = item.ujiPenambahan30 - 30;
    const selisihPenambahan40 = item.ujiPenambahan40 - 40;
    const selisihPenambahan50 = item.ujiPenambahan50 - 50;
    const selisihPengurangan50 = item.ujiPengurangan50 - 50;
    const selisihPengurangan40 = item.ujiPengurangan40 - 40;
    const selisihPengurangan30 = item.ujiPengurangan30 - 30;
    const selisihPengurangan20 = item.ujiPengurangan20 - 20;
    const selisihPengurangan10 = item.ujiPengurangan10 - 10;

    const allSelisih = [
      selisihPenambahan10,
      selisihPenambahan20,
      selisihPenambahan30,
      selisihPenambahan40,
      selisihPenambahan50,
      selisihPengurangan50,
      selisihPengurangan40,
      selisihPengurangan30,
      selisihPengurangan20,
      selisihPengurangan10,
    ];

    const totalSelisih = allSelisih.reduce(
      (acc, val) => acc + Math.abs(val),
      0
    );
    const rataRataSelisih = totalSelisih / allSelisih.length;

    return {
      selisihPenambahan10,
      selisihPenambahan20,
      selisihPenambahan30,
      selisihPenambahan40,
      selisihPenambahan50,
      selisihPengurangan50,
      selisihPengurangan40,
      selisihPengurangan30,
      selisihPengurangan20,
      selisihPengurangan10,
      totalSelisih,
      rataRataSelisih,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS } = await import("@/services/api");
        const result = await readData<RiksaTimbPortabel>(
          SHEETS.RIKSA_TIMB_PORTABEL
        );
        if (result.success && result.data) {
          const processedData = result.data.map((item) => ({
            ...item,
            ...calculateSelisih(item),
          }));
          const sortedData = [...processedData].sort(
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
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS } = await import("@/services/api");

      const calculatedSelisih = calculateSelisih(form);
      const dataToSave = { ...form, ...calculatedSelisih };

      if (editingId) {
        const dataToUpdate = { ...dataToSave, id: editingId };
        const updateResult = await updateData<RiksaTimbPortabel>(
          SHEETS.RIKSA_TIMB_PORTABEL,
          dataToUpdate
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId ? { ...dataToSave, id: editingId } : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const createResult = await createData<RiksaTimbPortabel>(
          SHEETS.RIKSA_TIMB_PORTABEL,
          dataToSave
        );
        if (createResult.success && createResult.data) {
          const newItem: RiksaTimbPortabel = {
            ...createResult.data,
            ...calculatedSelisih,
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

  const handleEdit = (item: RiksaTimbPortabel) => {
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
      const itemToDelete = data.find((item) => item.id === id);
      if (itemToDelete) {
        setPendingEditItem(itemToDelete);
        setApprovalAction("delete");
        setShowApprovalDialog(true);
      }
      return;
    }
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);

    try {
      const { deleteData, SHEETS } = await import("@/services/api");
      const result = await deleteData(SHEETS.RIKSA_TIMB_PORTABEL, deleteId);

      if (result.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } else {
        throw new Error(result.error || "Gagal menghapus data");
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
      setShowDeleteConfirm(false);
      setDeleteId(null);
    }
  };

  const handleApprovalSubmit = async (reason: string) => {
    if (!pendingEditItem) return;

    try {
      const { createData, SHEETS } = await import("@/services/api");

      const approvalRequest = {
        requestBy: user?.username || "",
        requestByName: user?.namaLengkap || user?.nama || "",
        requestDate: new Date().toISOString(),
        action: approvalAction,
        sheetType: "riksa_timb_portabel",
        dataId: pendingEditItem.id || "",
        dataPreview: `${formatDate(pendingEditItem.tanggal)} - ${
          pendingEditItem.area
        }`,
        reason,
        status: "pending",
        requesterPlant: user?.plant || "NPK2",
      };

      await createData(SHEETS.APPROVAL_REQUESTS, approvalRequest);

      alert("Permintaan approval telah dikirim");
      setShowApprovalDialog(false);
      setPendingEditItem(null);
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert("Gagal mengirim permintaan approval");
    }
  };

  const handleView = (item: RiksaTimbPortabel) => {
    const calculatedItem = {
      ...item,
      ...calculateSelisih(item),
    };
    setViewItem(calculatedItem);
    setShowViewModal(true);
  };

  const filteredData = data.filter(
    (item) =>
      item.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tanggal.includes(searchTerm)
  );

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      render: (value: unknown) => formatDate(value as string),
      sortable: true,
    },
    {
      key: "area",
      header: "Area",
      sortable: true,
    },
    {
      key: "rataRataSelisih",
      header: "Rata-rata Selisih",
      render: (value: unknown) => (
        <span
          className={cn(
            "font-semibold",
            Math.abs(value as number) <= 0.5
              ? "text-green-600"
              : Math.abs(value as number) <= 1
              ? "text-yellow-600"
              : "text-red-600"
          )}
        >
          {formatWeight(value as number)} kg
        </span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "Aksi",
      render: (_: unknown, row: RiksaTimbPortabel) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleView(row)}
            title="Lihat Detail"
          >
            <Eye className="h-4 w-4 text-blue-500" />
          </Button>
          {(userCanEditDirect || userNeedsApprovalEdit) && !userIsViewOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(row)}
              title="Edit"
            >
              <Edit2 className="h-4 w-4 text-primary-600" />
            </Button>
          )}
          {(userCanDeleteDirect || userNeedsApprovalDelete) &&
            !userIsViewOnly && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(row.id!)}
                title="Hapus"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            )}
        </div>
      ),
    },
  ];

  // Helper component for displaying selisih with visual indicator
  const SelisihBadge = ({ value, label }: { value: number; label: string }) => {
    const isGood = Math.abs(value) <= 0.5;
    const isWarning = Math.abs(value) > 0.5 && Math.abs(value) <= 1;

    return (
      <div
        className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          isGood
            ? "bg-green-50 border border-green-200"
            : isWarning
            ? "bg-yellow-50 border border-yellow-200"
            : "bg-red-50 border border-red-200"
        )}
      >
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <div className="flex items-center gap-2">
          {value >= 0 ? (
            <TrendingUp
              className={cn(
                "h-4 w-4",
                isGood
                  ? "text-green-500"
                  : isWarning
                  ? "text-yellow-500"
                  : "text-red-500"
              )}
            />
          ) : (
            <TrendingDown
              className={cn(
                "h-4 w-4",
                isGood
                  ? "text-green-500"
                  : isWarning
                  ? "text-yellow-500"
                  : "text-red-500"
              )}
            />
          )}
          <span
            className={cn(
              "font-bold",
              isGood
                ? "text-green-600"
                : isWarning
                ? "text-yellow-600"
                : "text-red-600"
            )}
          >
            {value >= 0 ? "+" : ""}
            {formatWeight(value)} kg
          </span>
        </div>
      </div>
    );
  };

  // View Modal Component
  const ViewModal = () => {
    if (!viewItem) return null;

    const calculated = calculateSelisih(viewItem);
    const allGood = calculated.rataRataSelisih <= 0.5;
    const hasWarning =
      calculated.rataRataSelisih > 0.5 && calculated.rataRataSelisih <= 1;

    return (
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title=""
        size="xl"
      >
        <div className="space-y-6">
          {/* Header */}
          <div
            className={cn(
              "p-6 rounded-xl text-center",
              allGood
                ? "bg-gradient-to-r from-green-500 to-emerald-600"
                : hasWarning
                ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                : "bg-gradient-to-r from-red-500 to-rose-600"
            )}
          >
            <Scale className="h-12 w-12 mx-auto text-white mb-3" />
            <h2 className="text-2xl font-bold text-white">
              Hasil Riksa Timbangan Portabel
            </h2>
            <p className="text-white/90 mt-1">
              {viewItem.area} • {formatDate(viewItem.tanggal)}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              {allGood ? (
                <CheckCircle2 className="h-5 w-5 text-white" />
              ) : (
                <XCircle className="h-5 w-5 text-white" />
              )}
              <span className="font-semibold text-white">
                {allGood
                  ? "Kalibrasi BAIK"
                  : hasWarning
                  ? "Perlu Perhatian"
                  : "Perlu Kalibrasi Ulang"}
              </span>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">
                Total Selisih Absolut
              </p>
              <p className="text-2xl font-bold text-indigo-700">
                {formatWeight(calculated.totalSelisih)} kg
              </p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-pink-100 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Rata-rata Selisih</p>
              <p className="text-2xl font-bold text-purple-700">
                {formatWeight(calculated.rataRataSelisih)} kg
              </p>
            </div>
          </div>

          {/* Uji Penambahan */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Uji Penambahan
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-500 px-3">
                <span>Beban Standar</span>
                <span className="text-center">Hasil Ukur</span>
                <span className="text-right">Selisih</span>
              </div>
              {[
                {
                  std: 10,
                  hasil: viewItem.ujiPenambahan10,
                  selisih: calculated.selisihPenambahan10,
                },
                {
                  std: 20,
                  hasil: viewItem.ujiPenambahan20,
                  selisih: calculated.selisihPenambahan20,
                },
                {
                  std: 30,
                  hasil: viewItem.ujiPenambahan30,
                  selisih: calculated.selisihPenambahan30,
                },
                {
                  std: 40,
                  hasil: viewItem.ujiPenambahan40,
                  selisih: calculated.selisihPenambahan40,
                },
                {
                  std: 50,
                  hasil: viewItem.ujiPenambahan50,
                  selisih: calculated.selisihPenambahan50,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "grid grid-cols-3 gap-2 p-3 rounded-lg",
                    Math.abs(item.selisih) <= 0.5
                      ? "bg-green-50"
                      : Math.abs(item.selisih) <= 1
                      ? "bg-yellow-50"
                      : "bg-red-50"
                  )}
                >
                  <span className="font-medium">{item.std} kg</span>
                  <span className="text-center font-semibold">
                    {formatWeight(item.hasil)} kg
                  </span>
                  <span
                    className={cn(
                      "text-right font-bold",
                      Math.abs(item.selisih) <= 0.5
                        ? "text-green-600"
                        : Math.abs(item.selisih) <= 1
                        ? "text-yellow-600"
                        : "text-red-600"
                    )}
                  >
                    {item.selisih >= 0 ? "+" : ""}
                    {formatWeight(item.selisih)} kg
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Uji Pengurangan */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Uji Pengurangan
            </h3>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-sm font-medium text-gray-500 px-3">
                <span>Beban Standar</span>
                <span className="text-center">Hasil Ukur</span>
                <span className="text-right">Selisih</span>
              </div>
              {[
                {
                  std: 50,
                  hasil: viewItem.ujiPengurangan50,
                  selisih: calculated.selisihPengurangan50,
                },
                {
                  std: 40,
                  hasil: viewItem.ujiPengurangan40,
                  selisih: calculated.selisihPengurangan40,
                },
                {
                  std: 30,
                  hasil: viewItem.ujiPengurangan30,
                  selisih: calculated.selisihPengurangan30,
                },
                {
                  std: 20,
                  hasil: viewItem.ujiPengurangan20,
                  selisih: calculated.selisihPengurangan20,
                },
                {
                  std: 10,
                  hasil: viewItem.ujiPengurangan10,
                  selisih: calculated.selisihPengurangan10,
                },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "grid grid-cols-3 gap-2 p-3 rounded-lg",
                    Math.abs(item.selisih) <= 0.5
                      ? "bg-green-50"
                      : Math.abs(item.selisih) <= 1
                      ? "bg-yellow-50"
                      : "bg-red-50"
                  )}
                >
                  <span className="font-medium">{item.std} kg</span>
                  <span className="text-center font-semibold">
                    {formatWeight(item.hasil)} kg
                  </span>
                  <span
                    className={cn(
                      "text-right font-bold",
                      Math.abs(item.selisih) <= 0.5
                        ? "text-green-600"
                        : Math.abs(item.selisih) <= 1
                        ? "text-yellow-600"
                        : "text-red-600"
                    )}
                  >
                    {item.selisih >= 0 ? "+" : ""}
                    {formatWeight(item.selisih)} kg
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 justify-center pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-gray-600">Baik (≤ 0.5 kg)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span className="text-sm text-gray-600">
                Perhatian (0.5 - 1 kg)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-gray-600">Buruk ({"> "}1 kg)</span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => setShowViewModal(false)}>Tutup</Button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl shadow-lg">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle>Riksa Timbangan Portabel</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                Data pengujian kalibrasi timbangan portabel
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            {userCanAdd && (
              <Button onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Data
              </Button>
            )}
          </div>
        </CardHeader>

        <DataTable
          columns={columns}
          data={filteredData}
          loading={loading}
          emptyMessage="Belum ada data riksa timbangan portabel"
        />
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setForm(initialFormState);
          setEditingId(null);
        }}
        title={
          editingId
            ? "Edit Data Riksa Timbangan"
            : "Tambah Data Riksa Timbangan"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              required
            />
            <Select
              label="Area"
              value={form.area}
              onChange={(e) => setForm({ ...form, area: e.target.value })}
              options={areaOptions}
              required
            />
          </div>

          {/* Uji Penambahan Section */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
            <h3 className="text-lg font-semibold text-green-800 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Uji Penambahan
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Input
                label="10 Kg"
                type="number"
                step="0.01"
                value={form.ujiPenambahan10 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPenambahan10: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
              <Input
                label="20 Kg"
                type="number"
                step="0.01"
                value={form.ujiPenambahan20 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPenambahan20: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
              <Input
                label="30 Kg"
                type="number"
                step="0.01"
                value={form.ujiPenambahan30 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPenambahan30: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
              <Input
                label="40 Kg"
                type="number"
                step="0.01"
                value={form.ujiPenambahan40 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPenambahan40: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
              <Input
                label="50 Kg"
                type="number"
                step="0.01"
                value={form.ujiPenambahan50 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPenambahan50: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
            </div>
          </div>

          {/* Uji Pengurangan Section */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 border border-red-100">
            <h3 className="text-lg font-semibold text-red-800 mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Uji Pengurangan
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Input
                label="50 Kg"
                type="number"
                step="0.01"
                value={form.ujiPengurangan50 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPengurangan50: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
              <Input
                label="40 Kg"
                type="number"
                step="0.01"
                value={form.ujiPengurangan40 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPengurangan40: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
              <Input
                label="30 Kg"
                type="number"
                step="0.01"
                value={form.ujiPengurangan30 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPengurangan30: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
              <Input
                label="20 Kg"
                type="number"
                step="0.01"
                value={form.ujiPengurangan20 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPengurangan20: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
              <Input
                label="10 Kg"
                type="number"
                step="0.01"
                value={form.ujiPengurangan10 || ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    ujiPengurangan10: parseNumber(e.target.value),
                  })
                }
                placeholder="Hasil ukur"
                required
              />
            </div>
          </div>

          {/* Preview Selisih */}
          {(form.ujiPenambahan10 > 0 || form.ujiPengurangan10 > 0) && (
            <div className="bg-gray-50 rounded-xl p-4 border">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Preview Selisih
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {form.ujiPenambahan10 > 0 && (
                  <SelisihBadge
                    value={form.ujiPenambahan10 - 10}
                    label="+10kg"
                  />
                )}
                {form.ujiPenambahan20 > 0 && (
                  <SelisihBadge
                    value={form.ujiPenambahan20 - 20}
                    label="+20kg"
                  />
                )}
                {form.ujiPenambahan30 > 0 && (
                  <SelisihBadge
                    value={form.ujiPenambahan30 - 30}
                    label="+30kg"
                  />
                )}
                {form.ujiPenambahan40 > 0 && (
                  <SelisihBadge
                    value={form.ujiPenambahan40 - 40}
                    label="+40kg"
                  />
                )}
                {form.ujiPenambahan50 > 0 && (
                  <SelisihBadge
                    value={form.ujiPenambahan50 - 50}
                    label="+50kg"
                  />
                )}
                {form.ujiPengurangan50 > 0 && (
                  <SelisihBadge
                    value={form.ujiPengurangan50 - 50}
                    label="-50kg"
                  />
                )}
                {form.ujiPengurangan40 > 0 && (
                  <SelisihBadge
                    value={form.ujiPengurangan40 - 40}
                    label="-40kg"
                  />
                )}
                {form.ujiPengurangan30 > 0 && (
                  <SelisihBadge
                    value={form.ujiPengurangan30 - 30}
                    label="-30kg"
                  />
                )}
                {form.ujiPengurangan20 > 0 && (
                  <SelisihBadge
                    value={form.ujiPengurangan20 - 20}
                    label="-20kg"
                  />
                )}
                {form.ujiPengurangan10 > 0 && (
                  <SelisihBadge
                    value={form.ujiPengurangan10 - 10}
                    label="-10kg"
                  />
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setForm(initialFormState);
                setEditingId(null);
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

      {/* View Modal */}
      <ViewModal />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Hapus Data"
        message="Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan."
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
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
        itemName={
          pendingEditItem
            ? `${formatDate(pendingEditItem.tanggal)} - ${pendingEditItem.area}`
            : "data ini"
        }
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
      />
    </div>
  );
};

export default RiksaTimbPortabelPage;
