import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Search, Calendar, StickyNote, Edit2, History } from "lucide-react";
import { useSaveShortcut, useDataWithLogging } from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ConfirmDialog,
  SuccessOverlay,
  ApprovalDialog,
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
import { readData, SHEETS } from "@/services/api";

// Interface for Sarana 3R
interface Sarana3R {
  id?: string;
  tanggal: string;
  judul: string;
  catatan: string;
  createdBy?: string;
}

const initialFormState: Sarana3R = {
  tanggal: getCurrentDate(),
  judul: "",
  catatan: "",
};

// Color palette for cards
const CARD_COLORS = [
  { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", accent: "bg-amber-400", text: "text-amber-700 dark:text-amber-300" },
  { bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", accent: "bg-blue-400", text: "text-blue-700 dark:text-blue-300" },
  { bg: "bg-green-50 dark:bg-green-950/30", border: "border-green-200 dark:border-green-800", accent: "bg-green-400", text: "text-green-700 dark:text-green-300" },
  { bg: "bg-purple-50 dark:bg-purple-950/30", border: "border-purple-200 dark:border-purple-800", accent: "bg-purple-400", text: "text-purple-700 dark:text-purple-300" },
  { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-200 dark:border-rose-800", accent: "bg-rose-400", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-teal-50 dark:bg-teal-950/30", border: "border-teal-200 dark:border-teal-800", accent: "bg-teal-400", text: "text-teal-700 dark:text-teal-300" },
  { bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-800", accent: "bg-orange-400", text: "text-orange-700 dark:text-orange-300" },
  { bg: "bg-indigo-50 dark:bg-indigo-950/30", border: "border-indigo-200 dark:border-indigo-800", accent: "bg-indigo-400", text: "text-indigo-700 dark:text-indigo-300" },
];

const Sarana3RPage = () => {
  const { user } = useAuthStore();
  const { createWithLog, updateWithLog, deleteWithLog } = useDataWithLogging();
  const [data, setData] = useState<Sarana3R[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<Sarana3R>(initialFormState);
  const [searchQuery, setSearchQuery] = useState("");

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">("edit");
  const [pendingEditItem, setPendingEditItem] = useState<Sarana3R | null>(null);

  // Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRecordId, setLogRecordId] = useState("");

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
      const formEl = document.querySelector("form");
      if (formEl) formEl.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await readData<Sarana3R>(SHEETS.SARANA_3R);
      if (result.success && result.data) {
        setData(result.data as Sarana3R[]);
      }
    } catch (error) {
      console.error("Error fetching sarana 3R data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter data
  const filteredData = data
    .filter((item) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.judul?.toLowerCase().includes(q) ||
        item.catatan?.toLowerCase().includes(q) ||
        item.tanggal?.includes(q)
      );
    })
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const result = await updateWithLog(SHEETS.SARANA_3R, {
          ...form,
          id: editingId,
        });
        if (result.success) {
          setShowSuccess(true);
          setShowForm(false);
          setEditingId(null);
          setForm(initialFormState);
          fetchData();
        }
      } else {
        const result = await createWithLog(SHEETS.SARANA_3R, {
          ...form,
          createdBy: user?.namaLengkap || user?.nama || user?.username || "",
        } as Sarana3R & { _plant?: string });
        if (result.success) {
          setShowSuccess(true);
          setShowForm(false);
          setForm(initialFormState);
          fetchData();
        }
      }
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle edit
  const handleEdit = (item: Sarana3R) => {
    if (isViewOnly(userRole)) return;

    if (needsApprovalForEdit(userRole)) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
      return;
    }

    setEditingId(item.id || null);
    setForm({
      tanggal: item.tanggal,
      judul: item.judul,
      catatan: item.catatan,
      createdBy: item.createdBy,
    });
    setShowForm(true);
  };

  // Handle delete
  const handleDelete = (id: string) => {
    if (isViewOnly(userRole)) return;

    if (needsApprovalForDelete(userRole)) {
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

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);

    try {
      const result = await deleteWithLog(SHEETS.SARANA_3R, {
        id: deleteId,
      });
      if (result.success) {
        setData((prev) => prev.filter((item) => item.id !== deleteId));
        setShowSuccess(true);
        setShowDeleteConfirm(false);
        setDeleteId(null);
        setTimeout(() => setShowSuccess(false), 2000);
      }
    } catch (error) {
      console.error("Error deleting data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle approval submit
  const handleApprovalSubmit = async (reason: string) => {
    if (!pendingEditItem || !user) return;

    setLoading(true);
    try {
      const API_URL = import.meta.env.VITE_API_URL;

      const approvalData = {
        action: "create",
        sheet: "APPROVAL_REQUESTS",
        data: {
          requestedBy: user.nama,
          requestedByRole: user.role,
          requestedByPlant: user.plant,
          actionType: approvalAction,
          targetSheet: "SARANA_3R",
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

  const getCardColor = (index: number) => CARD_COLORS[index % CARD_COLORS.length];

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/25">
                <StickyNote className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">Sarana 3R</CardTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Catatan Sarana Reduce, Reuse, Recycle
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari catatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              {userCanAdd && (
                <Button
                  onClick={() => {
                    setEditingId(null);
                    setForm(initialFormState);
                    setShowForm(true);
                  }}
                  className="gap-2 whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  Tambah
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg shadow-green-500/20">
          <p className="text-green-100 text-xs font-medium">Total Catatan</p>
          <p className="text-2xl font-bold mt-1">{data.length}</p>
        </div>
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg shadow-blue-500/20">
          <p className="text-blue-100 text-xs font-medium">Bulan Ini</p>
          <p className="text-2xl font-bold mt-1">
            {data.filter((d) => {
              const now = new Date();
              const date = new Date(d.tanggal);
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl p-4 text-white shadow-lg shadow-purple-500/20">
          <p className="text-purple-100 text-xs font-medium">Minggu Ini</p>
          <p className="text-2xl font-bold mt-1">
            {data.filter((d) => {
              const now = new Date();
              const date = new Date(d.tanggal);
              const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
              return diffDays <= 7;
            }).length}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-4 text-white shadow-lg shadow-amber-500/20">
          <p className="text-amber-100 text-xs font-medium">Hasil Pencarian</p>
          <p className="text-2xl font-bold mt-1">{filteredData.length}</p>
        </div>
      </div>

      {/* Notes Grid */}
      {loading && data.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Memuat catatan...</p>
          </div>
        </div>
      ) : filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <StickyNote className="h-16 w-16 mb-4 opacity-30" />
          <p className="text-lg font-medium">Belum ada catatan</p>
          <p className="text-sm mt-1">
            {searchQuery ? "Tidak ditemukan catatan yang sesuai" : "Klik tombol Tambah untuk membuat catatan baru"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredData.map((item, index) => {
            const color = getCardColor(index);
            return (
              <div
                key={item.id || index}
                className={`group relative rounded-xl border-2 ${color.border} ${color.bg} p-5 transition-all duration-300 hover:shadow-lg hover:-translate-y-1`}
              >
                {/* Accent strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-xl ${color.accent}`} />

                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className={`h-4 w-4 ${color.text}`} />
                    <span className={`text-xs font-semibold ${color.text}`}>
                      {formatDate(item.tanggal)}
                    </span>
                  </div>
                  {!isViewOnly(userRole) && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.id && (
                        <button
                          onClick={() => handleViewLog(item.id!)}
                          className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                          title="Lihat Log"
                        >
                          <History className="h-3.5 w-3.5 text-muted-foreground" />
                        </button>
                      )}
                      <button
                        onClick={() => handleEdit(item)}
                        className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button
                        onClick={() => item.id && handleDelete(item.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="font-semibold text-foreground text-base mb-2 line-clamp-2">
                  {item.judul}
                </h3>

                {/* Content */}
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {item.catatan}
                </p>

                {/* Footer */}
                {item.createdBy && (
                  <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5">
                    <p className="text-[11px] text-muted-foreground/70">
                      Dibuat oleh: {item.createdBy}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingId(null);
          setForm(initialFormState);
        }}
        title={editingId ? "Edit Catatan" : "Tambah Catatan"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Tanggal</label>
            <Input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Judul</label>
            <Input
              placeholder="Judul catatan..."
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Catatan</label>
            <textarea
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[120px] resize-y"
              placeholder="Tulis catatan sarana 3R..."
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
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
              {loading ? "Menyimpan..." : editingId ? "Simpan" : "Tambah"}
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
        title="Hapus Catatan"
        message="Apakah Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan."
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
        loading={loading}
      />

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={showLogModal}
        onClose={() => setShowLogModal(false)}
        sheetName={SHEETS.SARANA_3R}
        recordId={logRecordId}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default Sarana3RPage;
