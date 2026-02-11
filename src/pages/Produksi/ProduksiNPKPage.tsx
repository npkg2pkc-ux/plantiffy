import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  CalendarDays,
  History,
} from "lucide-react";
import { useSaveShortcut, useDataWithLogging, useOptimisticList, generateTempId } from "@/hooks";
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
import type { ProduksiNPK } from "@/types";

// Initial form state
const initialFormState: ProduksiNPK = {
  tanggal: getCurrentDate(),
  shiftMalamOnspek: 0,
  shiftMalamOffspek: 0,
  shiftPagiOnspek: 0,
  shiftPagiOffspek: 0,
  shiftSoreOnspek: 0,
  shiftSoreOffspek: 0,
  totalOnspek: 0,
  totalOffspek: 0,
  total: 0,
};

interface ProduksiNPKPageProps {
  plant: "NPK1" | "NPK2";
}

const ProduksiNPKPage = ({ plant }: ProduksiNPKPageProps) => {
  const { user } = useAuthStore();
  const { createWithLog, updateWithLog, deleteWithLog } = useDataWithLogging();
  const { optimisticAdd, optimisticUpdate, optimisticDelete, confirmAdd, confirmUpdate } = useOptimisticList<ProduksiNPK>();
  const [data, setData] = useState<ProduksiNPK[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProduksiNPK>(initialFormState);
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
  const [pendingEditItem, setPendingEditItem] = useState<ProduksiNPK | null>(
    null
  );

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

  // Fetch data from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(SHEETS.PRODUKSI_NPK, plant);
        const result = await readData<ProduksiNPK>(sheetName);
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

    const totalOnspek = thisMonthData.reduce(
      (sum, item) => sum + parseNumber(item.totalOnspek),
      0
    );
    const totalOffspek = thisMonthData.reduce(
      (sum, item) => sum + parseNumber(item.totalOffspek),
      0
    );
    const total = thisMonthData.reduce(
      (sum, item) => sum + parseNumber(item.total),
      0
    );

    return {
      monthName: MONTH_NAMES[selectedMonth],
      year: selectedYear,
      totalOnspek,
      totalOffspek,
      total,
      entryCount: thisMonthData.length,
    };
  }, [filteredByYear, selectedYear, selectedMonth]);

  // Auto calculate totals
  useEffect(() => {
    const totalOnspek =
      (form.shiftMalamOnspek || 0) +
      (form.shiftPagiOnspek || 0) +
      (form.shiftSoreOnspek || 0);
    const totalOffspek =
      (form.shiftMalamOffspek || 0) +
      (form.shiftPagiOffspek || 0) +
      (form.shiftSoreOffspek || 0);
    setForm((prev) => ({
      ...prev,
      totalOnspek,
      totalOffspek,
      total: totalOnspek + totalOffspek,
    }));
  }, [
    form.shiftMalamOnspek,
    form.shiftMalamOffspek,
    form.shiftPagiOnspek,
    form.shiftPagiOffspek,
    form.shiftSoreOnspek,
    form.shiftSoreOffspek,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Close form immediately for faster UX
    setShowForm(false);
    setShowSuccess(true);

    if (editingId) {
      // OPTIMISTIC UPDATE - Update UI immediately
      const itemToUpdate: ProduksiNPK = { ...form, id: editingId, _plant: plant };
      const { rollback } = optimisticUpdate(data, itemToUpdate);
      setData((prev) =>
        prev.map((item) =>
          item.id === editingId ? { ...itemToUpdate, _isPending: true } : item
        )
      );

      // Update in background
      updateWithLog<ProduksiNPK>("produksi_npk", {
        ...form,
        id: editingId,
        _plant: plant,
      })
        .then((result) => {
          if (result.success) {
            setData((prev) => confirmUpdate(prev, editingId));
          } else {
            setData(rollback());
            alert(result.error || "Gagal mengupdate data");
          }
        })
        .catch(() => {
          setData(rollback());
          alert("Terjadi kesalahan saat mengupdate data");
        });
    } else {
      // OPTIMISTIC ADD - Add to UI immediately with temp ID
      const tempId = generateTempId();
      const newItem: ProduksiNPK = { ...form, id: tempId, _plant: plant, _isPending: true };
      const { rollback } = optimisticAdd(data, newItem, tempId);
      setData((prev) => [newItem, ...prev]);

      // Create in background
      createWithLog<ProduksiNPK>("produksi_npk", { ...form, _plant: plant })
        .then((result) => {
          if (result.success && result.data) {
            setData((prev) => confirmAdd(prev, tempId, result.data!.id || tempId));
          } else {
            setData(rollback());
            alert(result.error || "Gagal menyimpan data");
          }
        })
        .catch(() => {
          setData(rollback());
          alert("Terjadi kesalahan saat menyimpan data");
        });
    }

    setForm(initialFormState);
    setEditingId(null);
    setTimeout(() => setShowSuccess(false), 1500);
  };

  const handleEdit = (item: ProduksiNPK) => {
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
        type: "produksi_npk" as const,
        action: approvalAction,
        itemId: pendingEditItem.id,
        itemData: pendingEditItem,
        targetSheet: plant === "NPK1" ? "produksi_npk_NPK1" : "produksi_npk",
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

    // OPTIMISTIC DELETE - Remove from UI immediately
    const { rollback } = optimisticDelete(data, deleteId);
    setData((prev) => prev.filter((item) => item.id !== deleteId));
    setShowDeleteConfirm(false);
    setShowSuccess(true);

    // Delete in background
    deleteWithLog("produksi_npk", {
      id: deleteId,
      _plant: plant,
    })
      .then((result) => {
        if (!result.success) {
          setData(rollback());
          alert(result.error || "Gagal menghapus data");
        }
      })
      .catch(() => {
        setData(rollback());
        alert("Terjadi kesalahan saat menghapus data");
      });

    setDeleteId(null);
    setTimeout(() => setShowSuccess(false), 1500);
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
    {
      key: "shiftMalamOnspek",
      header: "Malam Onspek",
      render: (value: unknown) => formatNumber(parseNumber(value as number)),
    },
    {
      key: "shiftMalamOffspek",
      header: "Malam Offspek",
      render: (value: unknown) => formatNumber(parseNumber(value as number)),
    },
    {
      key: "shiftPagiOnspek",
      header: "Pagi Onspek",
      render: (value: unknown) => formatNumber(parseNumber(value as number)),
    },
    {
      key: "shiftPagiOffspek",
      header: "Pagi Offspek",
      render: (value: unknown) => formatNumber(parseNumber(value as number)),
    },
    {
      key: "shiftSoreOnspek",
      header: "Sore Onspek",
      render: (value: unknown) => formatNumber(parseNumber(value as number)),
    },
    {
      key: "shiftSoreOffspek",
      header: "Sore Offspek",
      render: (value: unknown) => formatNumber(parseNumber(value as number)),
    },
    {
      key: "total",
      header: "Total",
      render: (value: unknown) => (
        <span className="font-semibold text-primary-600">
          {formatNumber(parseNumber(value as number))}
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
              Produksi NPK Granul
            </h1>
            <Badge variant={plant === "NPK1" ? "primary" : "success"}>
              {plant}
            </Badge>
          </div>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Kelola data produksi NPK Granul untuk {plant}
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
      <div
        className={`rounded-xl p-5 text-white shadow-md ${
          plant === "NPK1"
            ? "bg-gradient-to-r from-primary-500 to-primary-600"
            : "bg-gradient-to-r from-green-500 to-green-600"
        }`}
      >
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
              <p className="text-white/80 text-xs uppercase">Onspek</p>
              <p className="text-xl font-bold">
                {formatNumber(currentMonthProduksi.totalOnspek)}{" "}
                <span className="text-sm font-normal">Ton</span>
              </p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <p className="text-white/80 text-xs uppercase">Offspek</p>
              <p className="text-xl font-bold">
                {formatNumber(currentMonthProduksi.totalOffspek)}{" "}
                <span className="text-sm font-normal">Ton</span>
              </p>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
              <p className="text-white/80 text-xs uppercase">Total</p>
              <p className="text-xl font-bold">
                {formatNumber(currentMonthProduksi.total)}{" "}
                <span className="text-sm font-normal">Ton</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Total Onspek ({selectedYear})
          </p>
          <p className="text-2xl font-bold text-primary-600">
            {formatNumber(
              filteredByYear.reduce(
                (sum, item) => sum + parseNumber(item.totalOnspek),
                0
              )
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Total Offspek ({selectedYear})
          </p>
          <p className="text-2xl font-bold text-red-600">
            {formatNumber(
              filteredByYear.reduce(
                (sum, item) => sum + parseNumber(item.totalOffspek),
                0
              )
            )}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-dark-500 dark:text-dark-400">
            Total Produksi ({selectedYear})
          </p>
          <p className="text-2xl font-bold text-dark-900 dark:text-white">
            {formatNumber(
              filteredByYear.reduce(
                (sum, item) => sum + parseNumber(item.total),
                0
              )
            )}
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
            <CardTitle>Data Produksi</CardTitle>
          </div>
        </CardHeader>
        <DataTable
          data={data}
          columns={columns}
          loading={loading}
          searchable={true}
          searchPlaceholder="Cari tanggal, shift, total produksi..."
          searchKeys={[
            "tanggal",
            "shiftMalamOnspek",
            "shiftMalamOffspek",
            "shiftPagiOnspek",
            "shiftPagiOffspek",
            "shiftSoreOnspek",
            "shiftSoreOffspek",
            "total",
          ]}
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
        title={editingId ? "Edit Data Produksi" : "Tambah Data Produksi"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tanggal: e.target.value }))
              }
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium text-dark-700 border-b pb-2">
                Shift Malam
              </h4>
              <Input
                label="Onspek (Ton)"
                type="number"
                value={form.shiftMalamOnspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftMalamOnspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
              <Input
                label="Offspek (Ton)"
                type="number"
                value={form.shiftMalamOffspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftMalamOffspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-dark-700 border-b pb-2">
                Shift Pagi
              </h4>
              <Input
                label="Onspek (Ton)"
                type="number"
                value={form.shiftPagiOnspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftPagiOnspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
              <Input
                label="Offspek (Ton)"
                type="number"
                value={form.shiftPagiOffspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftPagiOffspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-dark-700 border-b pb-2">
                Shift Sore
              </h4>
              <Input
                label="Onspek (Ton)"
                type="number"
                value={form.shiftSoreOnspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftSoreOnspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
              <Input
                label="Offspek (Ton)"
                type="number"
                value={form.shiftSoreOffspek}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    shiftSoreOffspek: Number(e.target.value),
                  }))
                }
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-dark-700 border-b pb-2">
                Total (Auto)
              </h4>
              <div className="p-4 bg-dark-50 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-dark-500 dark:text-dark-400">
                    Total Onspek:
                  </span>
                  <span className="font-semibold text-primary-600">
                    {formatNumber(form.totalOnspek || 0)} Ton
                  </span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-dark-500 dark:text-dark-400">
                    Total Offspek:
                  </span>
                  <span className="font-semibold text-red-600">
                    {formatNumber(form.totalOffspek || 0)} Ton
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="font-medium text-dark-700">Total:</span>
                  <span className="font-bold text-dark-900 dark:text-white">
                    {formatNumber(form.total || 0)} Ton
                  </span>
                </div>
              </div>
            </div>
          </div>

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
        message="Apakah Anda yakin ingin menghapus data ini? Tindakan ini tidak dapat dibatalkan."
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
        itemName="data produksi NPK"
        loading={loading}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccess}
        message={
          editingId ? "Data berhasil diupdate!" : "Data berhasil disimpan!"
        }
        onClose={() => setShowSuccess(false)}
      />

      {/* Print Modal */}
      <PrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title={`Produksi NPK Granul ${plant === "NPK1" ? "1" : "2"}`}
        plant={plant === "NPK1" ? "NPK Plant 1" : "NPK Plant 2"}
        compactMode={true}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: "tanggal",
            header: "Tanggal",
            render: (v) => formatDate(v as string),
            width: "80px",
          },
          {
            key: "shiftMalamOnspek",
            header: "Malam Onspek",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "70px",
          },
          {
            key: "shiftMalamOffspek",
            header: "Malam Offspek",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "70px",
          },
          {
            key: "shiftPagiOnspek",
            header: "Pagi Onspek",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "65px",
          },
          {
            key: "shiftPagiOffspek",
            header: "Pagi Offspek",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "65px",
          },
          {
            key: "shiftSoreOnspek",
            header: "Sore Onspek",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "65px",
          },
          {
            key: "shiftSoreOffspek",
            header: "Sore Offspek",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "45px",
          },
          {
            key: "totalOnspek",
            header: "Total Onspek",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "70px",
          },
          {
            key: "totalOffspek",
            header: "Total Offspek",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "70px",
          },
          {
            key: "total",
            header: "S. Total",
            render: (v) => formatNumber(parseNumber(v as number)),
            align: "right",
            width: "60px",
          },
        ]}
        signatures={[{ role: "mengetahui", label: "Mengetahui" }]}
        summaryRows={[
          {
            label: "Total Onspek:",
            getValue: (d) =>
              formatNumber(
                d.reduce((s, i) => s + parseNumber(i.totalOnspek as number), 0)
              ) + " Ton",
          },
          {
            label: "Total Offspek:",
            getValue: (d) =>
              formatNumber(
                d.reduce((s, i) => s + parseNumber(i.totalOffspek as number), 0)
              ) + " Ton",
          },
          {
            label: "Grand Total:",
            getValue: (d) =>
              formatNumber(
                d.reduce((s, i) => s + parseNumber(i.total as number), 0)
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
        sheetName={plant === "NPK1" ? "produksi_npk_NPK1" : "produksi_npk"}
        recordId={logRecordId}
        title="Log Aktivitas Produksi NPK"
      />
    </div>
  );
};

export default ProduksiNPKPage;
