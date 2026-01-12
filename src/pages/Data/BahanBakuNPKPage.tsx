import { useState, useEffect, useCallback } from "react";
import { Plus, Edit2, Trash2, Search, Package, History, X } from "lucide-react";
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
  DataTable,
  SuccessOverlay,
  ApprovalDialog,
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
import { SHEETS } from "@/services/api";
import type { PlantType } from "@/types";

// Interface for Bahan Baku NPK
interface BahanBakuNPKEntry {
  berat: number;
  unit: string;
}

interface BahanBakuNPK {
  id?: string;
  tanggal: string;
  bahanBaku: string;
  entries: BahanBakuNPKEntry[]; // Array of berat and unit
  totalBerat: number;
  _plant?: PlantType;
}

// Generate year options from 2023 to current year + 1
const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [
  ...Array.from({ length: currentYear - 2022 }, (_, i) => ({
    value: String(2023 + i),
    label: String(2023 + i),
  })),
  { value: String(currentYear + 1), label: String(currentYear + 1) },
];

const BAHAN_BAKU_OPTIONS = [
  { value: "Urea", label: "Urea" },
  { value: "DAP", label: "DAP" },
  { value: "KCL", label: "KCL" },
  { value: "ZA", label: "ZA" },
  { value: "Clay", label: "Clay" },
  { value: "Dolomite", label: "Dolomite" },
  { value: "Coating Oil", label: "Coating Oil" },
  { value: "Pewarna", label: "Pewarna" },
  { value: "Silika", label: "Silika" },
  { value: "Amnit", label: "Amnit" },
];

const UNIT_OPTIONS = [
  { value: "Ton", label: "Ton" },
  { value: "Pallet", label: "Pallet" },
  { value: "Jumbo", label: "Jumbo" },
];

const initialFormState: BahanBakuNPK = {
  tanggal: getCurrentDate(),
  bahanBaku: "",
  entries: [{ berat: 0, unit: "Ton" }],
  totalBerat: 0,
};

interface BahanBakuNPKPageProps {
  plant: PlantType;
}

const BahanBakuNPKPage = ({ plant }: BahanBakuNPKPageProps) => {
  const { user } = useAuthStore();
  const { createWithLog, updateWithLog, deleteWithLog } = useDataWithLogging();
  const [data, setData] = useState<BahanBakuNPK[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<BahanBakuNPK>(initialFormState);
  const [selectedYear, setSelectedYear] = useState<string>(
    String(new Date().getFullYear())
  );
  const currentPlant = plant;

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<BahanBakuNPK | null>(
    null
  );

  // Log modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRecordId, setLogRecordId] = useState<string>("");

  // Handle view log
  const handleViewLog = (id: string) => {
    setLogRecordId(id);
    setShowLogModal(true);
  };

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

  const userNeedsApprovalEdit = needsApprovalForEdit(user?.role || "");
  const userNeedsApprovalDelete = needsApprovalForDelete(user?.role || "");

  // Calculate total berat from entries
  const calculateTotalBerat = (entries: BahanBakuNPKEntry[]): number => {
    return entries.reduce((sum, entry) => sum + (entry.berat || 0), 0);
  };

  // Update form entries
  const updateEntry = (
    index: number,
    field: keyof BahanBakuNPKEntry,
    value: string | number
  ) => {
    setForm((prev) => {
      const newEntries = [...prev.entries];
      newEntries[index] = {
        ...newEntries[index],
        [field]: field === "berat" ? parseFloat(value as string) || 0 : value,
      };
      return {
        ...prev,
        entries: newEntries,
        totalBerat: calculateTotalBerat(newEntries),
      };
    });
  };

  // Add new entry
  const addEntry = () => {
    setForm((prev) => ({
      ...prev,
      entries: [...prev.entries, { berat: 0, unit: "Ton" }],
    }));
  };

  // Remove entry
  const removeEntry = (index: number) => {
    if (form.entries.length <= 1) return;
    setForm((prev) => {
      const newEntries = prev.entries.filter((_, i) => i !== index);
      return {
        ...prev,
        entries: newEntries,
        totalBerat: calculateTotalBerat(newEntries),
      };
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        // Use plant-specific sheet name to fetch only data for current plant
        const sheetName = getSheetNameByPlant(
          SHEETS.BAHAN_BAKU_NPK,
          currentPlant
        );
        const result = await readData<BahanBakuNPK>(sheetName);
        if (result.success && result.data) {
          // Parse entries JSON if stored as string
          const parsedData = result.data.map((item) => ({
            ...item,
            entries:
              typeof item.entries === "string"
                ? JSON.parse(item.entries)
                : item.entries || [{ berat: 0, unit: "Ton" }],
            totalBerat: item.totalBerat || 0,
            _plant: currentPlant, // Add plant info
          }));
          const sortedData = [...parsedData].sort(
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
  }, [currentPlant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // VALIDATION: Check required fields before submitting
    if (!form.tanggal) {
      alert("Tanggal wajib diisi!");
      return;
    }
    if (!form.bahanBaku) {
      alert("Bahan Baku wajib dipilih!");
      return;
    }
    if (
      form.entries.length === 0 ||
      form.entries.every((entry) => entry.berat === 0)
    ) {
      alert("Minimal satu entry berat harus diisi!");
      return;
    }

    setLoading(true);

    try {
      // Prepare data with entries as JSON string for storage
      const dataToSave = {
        ...form,
        entries: JSON.stringify(form.entries),
        totalBerat: calculateTotalBerat(form.entries),
        _plant: currentPlant,
      };

      console.log("Sending data to save:", dataToSave);

      if (editingId) {
        // Update with logging
        const dataToUpdate = { ...dataToSave, id: editingId };
        const updateResult = await updateWithLog<typeof dataToUpdate>(
          SHEETS.BAHAN_BAKU_NPK,
          dataToUpdate
        );
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId
                ? {
                    ...form,
                    id: editingId,
                    _plant: currentPlant,
                    totalBerat: calculateTotalBerat(form.entries),
                  }
                : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        // Create with logging
        const createResult = await createWithLog<typeof dataToSave>(
          SHEETS.BAHAN_BAKU_NPK,
          dataToSave
        );
        if (createResult.success && createResult.data) {
          const newItem: BahanBakuNPK = {
            ...form,
            id: createResult.data.id,
            _plant: currentPlant,
            totalBerat: calculateTotalBerat(form.entries),
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

  const handleEdit = (item: BahanBakuNPK) => {
    if (userNeedsApprovalEdit) {
      setPendingEditItem(item);
      setApprovalAction("edit");
      setShowApprovalDialog(true);
      return;
    }
    // Parse entries if string
    const parsedEntries =
      typeof item.entries === "string"
        ? JSON.parse(item.entries)
        : item.entries || [{ berat: 0, unit: "Ton" }];

    setForm({
      ...item,
      entries: parsedEntries,
      totalBerat: calculateTotalBerat(parsedEntries),
    });
    setEditingId(item.id || null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (userNeedsApprovalDelete) {
      setDeleteId(id);
      setApprovalAction("delete");
      setShowApprovalDialog(true);
      return;
    }
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const handleApprovalSubmit = async (reason: string) => {
    setLoading(true);
    try {
      const { createData, SHEETS } = await import("@/services/api");
      const approvalData = {
        type: "BAHAN_BAKU_NPK" as const,
        action: approvalAction,
        itemId: approvalAction === "edit" ? pendingEditItem?.id : deleteId,
        itemData:
          approvalAction === "edit"
            ? pendingEditItem
            : data.find((d) => d.id === deleteId),
        reason,
        submittedBy: user?.nama || user?.email || "Unknown",
        submittedAt: new Date().toISOString(),
        status: "pending" as const,
      };
      const result = await createData(SHEETS.APPROVAL_REQUESTS, approvalData);
      if (result.success) {
        setShowApprovalDialog(false);
        setPendingEditItem(null);
        setDeleteId(null);
        alert("Permintaan telah dikirim dan menunggu persetujuan");
      } else {
        throw new Error(result.error || "Gagal mengirim permintaan");
      }
    } catch (error) {
      console.error("Error submitting approval:", error);
      alert(error instanceof Error ? error.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const itemToDelete = data.find((item) => item.id === deleteId);

      // Delete with logging
      const deleteResult = await deleteWithLog(SHEETS.BAHAN_BAKU_NPK, {
        id: deleteId,
        _plant: itemToDelete?._plant,
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
    const itemYear = new Date(item.tanggal).getFullYear();
    const matchesYear = itemYear === parseInt(selectedYear);

    return matchesPlant && matchesYear;
  });

  // Calculate totals per bahan baku
  const totalsByBahanBaku = filteredData.reduce((acc, item) => {
    const key = item.bahanBaku || "Unknown";
    acc[key] = (acc[key] || 0) + (item.totalBerat || 0);
    return acc;
  }, {} as Record<string, number>);

  // Format entries for display
  const formatEntries = (entries: BahanBakuNPKEntry[] | string) => {
    const parsedEntries =
      typeof entries === "string" ? JSON.parse(entries) : entries;
    if (!parsedEntries || !Array.isArray(parsedEntries)) return "-";
    return parsedEntries
      .map((e: BahanBakuNPKEntry) => `${formatNumber(e.berat)} ${e.unit}`)
      .join(", ");
  };

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
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-dark-400" />
          <span className="font-medium">{value as string}</span>
        </div>
      ),
    },
    {
      key: "entries",
      header: "Detail Berat & Unit",
      render: (value: unknown) => (
        <span className="text-sm text-dark-600 dark:text-dark-300">
          {formatEntries(value as BahanBakuNPKEntry[] | string)}
        </span>
      ),
    },
    {
      key: "totalBerat",
      header: "Total Berat",
      render: (value: unknown) => (
        <span className="font-semibold text-primary-600 dark:text-primary-400">
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
          <h1 className="text-2xl font-display font-bold text-dark-900 dark:text-white">
            Data Bahan Baku NPK {currentPlant === "NPK1" ? "1" : "2"}
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Kelola data penerimaan bahan baku NPK
          </p>
        </div>

        <div className="flex items-center gap-3">
          {userCanAdd && (
            <Button onClick={openAddForm}>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Data
            </Button>
          )}
        </div>
      </div>

      {/* Summary - Top Items */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {Object.entries(totalsByBahanBaku)
          .slice(0, 5)
          .map(([name, total]) => (
            <Card key={name} className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <Package className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm text-dark-500 dark:text-dark-400">
                    {name}
                  </p>
                  <p className="text-lg font-bold text-dark-900 dark:text-white">
                    {formatNumber(total)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
      </div>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Data Bahan Baku NPK - Tahun {selectedYear}</CardTitle>
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
          searchPlaceholder="Cari tanggal, bahan baku, total berat..."
          searchKeys={["tanggal", "bahanBaku", "totalBerat"]}
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
                      <History className="h-4 w-4 text-blue-600" />
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
                      <History className="h-4 w-4 text-blue-600" />
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
          editingId ? "Edit Data Bahan Baku NPK" : "Tambah Data Bahan Baku NPK"
        }
        size="lg"
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
            label="Bahan Baku"
            value={form.bahanBaku}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, bahanBaku: e.target.value }))
            }
            options={BAHAN_BAKU_OPTIONS}
            placeholder="Pilih bahan baku"
            required
          />

          {/* Entries Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-dark-700 dark:text-dark-300">
                Detail Berat & Unit
              </label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addEntry}
              >
                <Plus className="h-4 w-4 mr-1" />
                Tambah
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {form.entries.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-dark-50 dark:bg-dark-800 rounded-lg"
                >
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={entry.berat || ""}
                      onChange={(e) =>
                        updateEntry(index, "berat", e.target.value)
                      }
                      placeholder="Berat"
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      value={entry.unit}
                      onChange={(e) =>
                        updateEntry(index, "unit", e.target.value)
                      }
                      options={UNIT_OPTIONS}
                      required
                    />
                  </div>
                  {form.entries.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeEntry(index)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Total Display */}
            <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <span className="font-medium text-dark-700 dark:text-dark-300">
                Total Berat:
              </span>
              <span className="text-xl font-bold text-primary-600 dark:text-primary-400">
                {formatNumber(calculateTotalBerat(form.entries))}
              </span>
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
        message="Apakah Anda yakin ingin menghapus data ini?"
        confirmText="Hapus"
        variant="danger"
        isLoading={loading}
      />

      <ApprovalDialog
        isOpen={showApprovalDialog}
        onClose={() => {
          setShowApprovalDialog(false);
          setPendingEditItem(null);
          setDeleteId(null);
        }}
        onSubmit={handleApprovalSubmit}
        action={approvalAction}
        itemName="data bahan baku NPK"
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
          currentPlant === "NPK1" ? "bahanbaku_npk_NPK1" : "bahanbaku_npk"
        }
        recordId={logRecordId}
        title="Log Aktivitas Bahan Baku NPK"
      />
    </div>
  );
};

export default BahanBakuNPKPage;
