import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Printer,
  CalendarDays,
  History,
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
import type { ProduksiNPKMini } from "@/types";

const initialFormState: ProduksiNPKMini = {
  tanggal: getCurrentDate(),
  formulasi: "",
  tonase: 0,
};

const ProduksiNPKMiniPage = () => {
  const { user } = useAuthStore();
  const { createWithLog, updateWithLog, deleteWithLog } = useDataWithLogging();
  const [data, setData] = useState<ProduksiNPKMini[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProduksiNPKMini>(initialFormState);
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] =
    useState<ProduksiNPKMini | null>(null);

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

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS } = await import("@/services/api");
        const result = await readData<ProduksiNPKMini>(
          SHEETS.PRODUKSI_NPK_MINI
        );
        if (result.success && result.data) {
          const sortedData = result.data
            .map((item) => ({ ...item, _plant: "NPK2" as const }))
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
  }, []);

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

  // Filter data by selected year for summary cards
  const filteredByYear = useMemo(() => {
    return data.filter((item) => {
      const itemDate = new Date(item.tanggal);
      return (
        !isNaN(itemDate.getTime()) && itemDate.getFullYear() === selectedYear
      );
    });
  }, [data, selectedYear]);

  const currentMonthProduksi = useMemo(() => {
    const thisMonthData = filteredByYear.filter((item) => {
      const itemDate = new Date(item.tanggal);
      return itemDate.getMonth() === selectedMonth;
    });

    const total = thisMonthData.reduce(
      (sum, item) => sum + parseNumber(item.tonase),
      0
    );
    const formulasiCount = new Set(thisMonthData.map((i) => i.formulasi)).size;

    return {
      monthName: MONTH_NAMES[selectedMonth],
      year: selectedYear,
      total,
      formulasiCount,
      entryCount: thisMonthData.length,
    };
  }, [filteredByYear, selectedYear, selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const updateResult = await updateWithLog<ProduksiNPKMini>(
          "produksi_npk_mini",
          {
            ...form,
            id: editingId,
            _plant: "NPK2",
          }
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId
                ? { ...form, id: editingId, _plant: "NPK2" }
                : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const newData = { ...form, _plant: "NPK2" as const };
        const createResult = await createWithLog<ProduksiNPKMini>(
          "produksi_npk_mini",
          newData
        );
        if (createResult.success && createResult.data) {
          const newItem: ProduksiNPKMini = {
            ...createResult.data,
            _plant: "NPK2",
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

  const handleEdit = (item: ProduksiNPKMini) => {
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
        type: "produksi_npk_mini" as const,
        action: approvalAction,
        itemId: pendingEditItem.id,
        itemData: pendingEditItem,
        targetSheet: "produksi_npk_mini",
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
      const deleteResult = await deleteWithLog("produksi_npk_mini", {
        id: deleteId,
        _plant: "NPK2",
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

  const columns = [
    {
      key: "tanggal",
      header: "Tanggal",
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
    { key: "formulasi", header: "Formulasi" },
    {
      key: "tonase",
      header: "Tonase",
      render: (value: unknown) => (
        <span className="font-semibold text-primary-600">
          {formatNumber(parseNumber(value as number))} Ton
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-dark-900 dark:text-white">
              Produksi NPK Mini
            </h1>
            <Badge variant="success">NPK2</Badge>
          </div>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Kelola data produksi NPK Mini untuk NPK2
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

      {/* Produksi Bulan Ini */}
      <div className="rounded-xl p-5 text-white shadow-md bg-gradient-to-r from-green-500 to-green-600">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8" />
            <div>
              <h3 className="text-lg font-bold">
                Produksi Bulan {currentMonthProduksi.monthName}{" "}
                {currentMonthProduksi.year}
              </h3>
              <p className="text-white/80 text-sm">
                {currentMonthProduksi.entryCount} entry data
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 md:gap-6">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="bg-white/20 border-white/30 text-white rounded-lg px-3 py-2 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {MONTH_NAMES.map((name, index) => (
                <option key={index} value={index} className="text-dark-900">
                  {name}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white/20 border-white/30 text-white rounded-lg px-3 py-2 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {availableYears.map((y) => (
                <option key={y} value={y} className="text-dark-900">
                  {y}
                </option>
              ))}
            </select>
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <p className="text-white/80 text-xs uppercase">Total</p>
              <p className="text-xl font-bold">
                {formatNumber(currentMonthProduksi.total)}{" "}
                <span className="text-sm font-normal">Ton</span>
              </p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <p className="text-white/80 text-xs uppercase">Formulasi</p>
              <p className="text-xl font-bold">
                {currentMonthProduksi.formulasiCount}{" "}
                <span className="text-sm font-normal">Jenis</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Total Tonase ({selectedYear})
          </p>
          <p className="text-2xl font-bold text-primary-600">
            {formatNumber(
              filteredByYear.reduce(
                (sum, item) => sum + parseNumber(item.tonase),
                0
              )
            )}{" "}
            Ton
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Jumlah Formulasi ({selectedYear})
          </p>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">
            {new Set(filteredByYear.map((item) => item.formulasi)).size}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Jumlah Entry ({selectedYear})
          </p>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">
            {filteredByYear.length}
          </p>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Produksi NPK Mini</CardTitle>
          </div>
        </CardHeader>
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          searchable={true}
          searchPlaceholder="Cari tanggal, formulasi, tonase..."
          searchKeys={["tanggal", "formulasi", "tonase"]}
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
        title={editingId ? "Edit Data NPK Mini" : "Tambah Data NPK Mini"}
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

          <Input
            label="Formulasi"
            type="text"
            value={form.formulasi}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, formulasi: e.target.value }))
            }
            placeholder="Masukkan formulasi (contoh: NPK Mini 15-15-15)"
            required
          />

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
        itemName="data produksi NPK Mini"
        loading={loading}
      />

      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />

      {/* Print Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Produksi NPK Mini"
        plant="NPK Plant 2"
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: "tanggal",
            header: "Tanggal",
            render: (v) => formatDate(v as string),
            width: "100px",
          },
          { key: "formulasi", header: "Formulasi", width: "150px" },
          {
            key: "tonase",
            header: "Tonase (Ton)",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "100px",
          },
        ]}
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
        sheetName="produksi_npk_mini"
        recordId={logRecordId}
        title="Log Aktivitas Produksi NPK Mini"
      />
    </div>
  );
};

export default ProduksiNPKMiniPage;
