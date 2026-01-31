import { useState, useCallback, useMemo } from "react";
import {
  Package,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  Search,
  History,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import {
  useMaterials,
  useMaterialTransactions,
  useSaveShortcut,
} from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  ConfirmDialog,
  DataTable,
  SuccessOverlay,
  Badge,
  Select,
  ActivityLogModal,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import {
  formatNumber,
  parseNumber,
  formatDateTime,
  canAdd,
  canEditDirect,
  canDeleteDirect,
  isViewOnly,
} from "@/lib/utils";
import type { Material, MaterialTransaction } from "@/types";

// ============================================
// MODAL: TAMBAH MATERIAL BARU
// ============================================
interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (
    data: Omit<Material, "id" | "created_at" | "updated_at">
  ) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const AddMaterialModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: AddMaterialModalProps) => {
  const [form, setForm] = useState({
    kode_material: "",
    nama_material: "",
    satuan: "pcs",
    stok: 0,
    stok_minimum: 0,
  });

  const satuanOptions = [
    { value: "pcs", label: "Pcs" },
    { value: "unit", label: "Unit" },
    { value: "kg", label: "Kg" },
    { value: "liter", label: "Liter" },
    { value: "meter", label: "Meter" },
    { value: "roll", label: "Roll" },
    { value: "box", label: "Box" },
    { value: "set", label: "Set" },
    { value: "lembar", label: "Lembar" },
    { value: "batang", label: "Batang" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await onSubmit(form);
    if (result.success) {
      setForm({
        kode_material: "",
        nama_material: "",
        satuan: "pcs",
        stok: 0,
        stok_minimum: 0,
      });
      onClose();
    } else {
      alert(result.error || "Gagal menambah material");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Material Baru"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Kode Material"
          value={form.kode_material}
          onChange={(e) => setForm({ ...form, kode_material: e.target.value })}
          placeholder="Contoh: MTL-001"
          required
        />
        <Input
          label="Nama Material"
          value={form.nama_material}
          onChange={(e) => setForm({ ...form, nama_material: e.target.value })}
          placeholder="Contoh: Bearing SKF 6205"
          required
        />
        <Select
          label="Satuan"
          value={form.satuan}
          onChange={(e) => setForm({ ...form, satuan: e.target.value })}
          options={satuanOptions}
        />
        <Input
          label="Stok Awal"
          type="number"
          value={form.stok.toString()}
          onChange={(e) =>
            setForm({ ...form, stok: parseNumber(e.target.value) })
          }
          min={0}
        />
        <Input
          label="Stok Minimum (Alert)"
          type="number"
          value={form.stok_minimum.toString()}
          onChange={(e) =>
            setForm({ ...form, stok_minimum: parseNumber(e.target.value) })
          }
          min={0}
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" isLoading={loading}>
            Simpan
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// MODAL: EDIT MATERIAL
// ============================================
interface EditMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  onSubmit: (
    data: Partial<Material> & { id: string }
  ) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const EditMaterialModal = ({
  isOpen,
  onClose,
  material,
  onSubmit,
  loading,
}: EditMaterialModalProps) => {
  const [form, setForm] = useState({
    kode_material: "",
    nama_material: "",
    satuan: "pcs",
    stok_minimum: 0,
  });

  // Update form when material changes
  useState(() => {
    if (material) {
      setForm({
        kode_material: material.kode_material,
        nama_material: material.nama_material,
        satuan: material.satuan,
        stok_minimum: material.stok_minimum,
      });
    }
  });

  // Effect to sync form with material
  useMemo(() => {
    if (material) {
      setForm({
        kode_material: material.kode_material,
        nama_material: material.nama_material,
        satuan: material.satuan,
        stok_minimum: material.stok_minimum,
      });
    }
  }, [material]);

  const satuanOptions = [
    { value: "pcs", label: "Pcs" },
    { value: "unit", label: "Unit" },
    { value: "kg", label: "Kg" },
    { value: "liter", label: "Liter" },
    { value: "meter", label: "Meter" },
    { value: "roll", label: "Roll" },
    { value: "box", label: "Box" },
    { value: "set", label: "Set" },
    { value: "lembar", label: "Lembar" },
    { value: "batang", label: "Batang" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!material?.id) return;

    const result = await onSubmit({ id: material.id, ...form });
    if (result.success) {
      onClose();
    } else {
      alert(result.error || "Gagal mengupdate material");
    }
  };

  if (!material) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Material" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Kode Material"
          value={form.kode_material}
          onChange={(e) => setForm({ ...form, kode_material: e.target.value })}
          required
        />
        <Input
          label="Nama Material"
          value={form.nama_material}
          onChange={(e) => setForm({ ...form, nama_material: e.target.value })}
          required
        />
        <Select
          label="Satuan"
          value={form.satuan}
          onChange={(e) => setForm({ ...form, satuan: e.target.value })}
          options={satuanOptions}
        />
        <Input
          label="Stok Minimum (Alert)"
          type="number"
          value={form.stok_minimum.toString()}
          onChange={(e) =>
            setForm({ ...form, stok_minimum: parseNumber(e.target.value) })
          }
          min={0}
        />
        <div className="text-sm text-dark-500 dark:text-dark-400 bg-dark-50 dark:bg-dark-700 p-3 rounded-lg">
          <p>
            Stok saat ini:{" "}
            <strong>
              {formatNumber(material.stok)} {material.satuan}
            </strong>
          </p>
          <p className="text-xs mt-1">
            Untuk mengubah stok, gunakan menu Tambah Stok atau Ambil Stok.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button type="submit" isLoading={loading}>
            Update
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// MODAL: TAMBAH STOK (MASUK)
// ============================================
interface TambahStokModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  onSubmit: (
    materialId: string,
    jumlah: number,
    keterangan: string
  ) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const TambahStokModal = ({
  isOpen,
  onClose,
  materials,
  onSubmit,
  loading,
}: TambahStokModalProps) => {
  const [form, setForm] = useState({
    materialId: "",
    jumlah: 0,
    keterangan: "",
  });

  const materialOptions = materials.map((m) => ({
    value: m.id || "",
    label: `${m.kode_material} - ${m.nama_material} (Stok: ${formatNumber(
      m.stok
    )} ${m.satuan})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.materialId || form.jumlah <= 0) {
      alert("Pilih material dan masukkan jumlah yang valid");
      return;
    }
    const result = await onSubmit(
      form.materialId,
      form.jumlah,
      form.keterangan
    );
    if (result.success) {
      setForm({ materialId: "", jumlah: 0, keterangan: "" });
      onClose();
    } else {
      alert(result.error || "Gagal menambah stok");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tambah Stok Material"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
          <ArrowDownCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          <span className="text-green-800 dark:text-green-300 text-sm font-medium">
            Stok Masuk
          </span>
        </div>
        <Select
          label="Pilih Material"
          value={form.materialId}
          onChange={(e) => setForm({ ...form, materialId: e.target.value })}
          options={[
            { value: "", label: "-- Pilih Material --" },
            ...materialOptions,
          ]}
          required
        />
        <Input
          label="Jumlah"
          type="number"
          value={form.jumlah.toString()}
          onChange={(e) =>
            setForm({ ...form, jumlah: parseNumber(e.target.value) })
          }
          min={1}
          required
        />
        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
          placeholder="Contoh: Pembelian dari vendor X"
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            <ArrowDownCircle className="h-4 w-4 mr-2" />
            Tambah Stok
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// MODAL: AMBIL STOK (KELUAR)
// ============================================
interface AmbilStokModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
  onSubmit: (
    materialId: string,
    jumlah: number,
    keterangan: string
  ) => Promise<{ success: boolean; error?: string }>;
  loading: boolean;
}

const AmbilStokModal = ({
  isOpen,
  onClose,
  materials,
  onSubmit,
  loading,
}: AmbilStokModalProps) => {
  const [form, setForm] = useState({
    materialId: "",
    jumlah: 0,
    keterangan: "",
  });
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(
    null
  );

  const materialOptions = materials.map((m) => ({
    value: m.id || "",
    label: `${m.kode_material} - ${m.nama_material} (Stok: ${formatNumber(
      m.stok
    )} ${m.satuan})`,
  }));

  const handleMaterialChange = (materialId: string) => {
    setForm({ ...form, materialId });
    const material = materials.find((m) => m.id === materialId) || null;
    setSelectedMaterial(material);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.materialId || form.jumlah <= 0) {
      alert("Pilih material dan masukkan jumlah yang valid");
      return;
    }

    // Client-side validation
    if (selectedMaterial && form.jumlah > selectedMaterial.stok) {
      alert(
        `Stok tidak cukup! Stok tersedia: ${formatNumber(
          selectedMaterial.stok
        )} ${selectedMaterial.satuan}`
      );
      return;
    }

    const result = await onSubmit(
      form.materialId,
      form.jumlah,
      form.keterangan
    );
    if (result.success) {
      setForm({ materialId: "", jumlah: 0, keterangan: "" });
      setSelectedMaterial(null);
      onClose();
    } else {
      alert(result.error || "Gagal mengambil stok");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ambil Stok Material"
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-center gap-2">
          <ArrowUpCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="text-red-800 dark:text-red-300 text-sm font-medium">
            Stok Keluar
          </span>
        </div>
        <Select
          label="Pilih Material"
          value={form.materialId}
          onChange={(e) => handleMaterialChange(e.target.value)}
          options={[
            { value: "", label: "-- Pilih Material --" },
            ...materialOptions,
          ]}
          required
        />
        {selectedMaterial && (
          <div className="bg-dark-50 dark:bg-dark-700 p-3 rounded-lg text-sm">
            <p>
              Stok tersedia:{" "}
              <strong className="text-primary-600">
                {formatNumber(selectedMaterial.stok)} {selectedMaterial.satuan}
              </strong>
            </p>
          </div>
        )}
        <Input
          label="Jumlah"
          type="number"
          value={form.jumlah.toString()}
          onChange={(e) =>
            setForm({ ...form, jumlah: parseNumber(e.target.value) })
          }
          min={1}
          max={selectedMaterial?.stok || undefined}
          required
        />
        <Input
          label="Keterangan"
          value={form.keterangan}
          onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
          placeholder="Contoh: Pemakaian untuk maintenance pump"
          required
        />
        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button
            type="submit"
            isLoading={loading}
            className="bg-red-600 hover:bg-red-700"
          >
            <ArrowUpCircle className="h-4 w-4 mr-2" />
            Ambil Stok
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// MODAL: RIWAYAT TRANSAKSI
// ============================================
interface RiwayatTransaksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: Material[];
}

const RiwayatTransaksiModal = ({
  isOpen,
  onClose,
  materials,
}: RiwayatTransaksiModalProps) => {
  const { transactions, loading, updateFilters, clearFilters } =
    useMaterialTransactions();
  const [localFilters, setLocalFilters] = useState({
    material_id: "",
    start_date: "",
    end_date: "",
  });

  const materialOptions = materials.map((m) => ({
    value: m.id || "",
    label: `${m.kode_material} - ${m.nama_material}`,
  }));

  const getMaterialName = (materialId: string) => {
    const material = materials.find((m) => m.id === materialId);
    return material
      ? `${material.kode_material} - ${material.nama_material}`
      : materialId;
  };

  const handleApplyFilters = () => {
    updateFilters({
      material_id: localFilters.material_id || undefined,
      start_date: localFilters.start_date || undefined,
      end_date: localFilters.end_date || undefined,
    });
  };

  const handleClearFilters = () => {
    setLocalFilters({ material_id: "", start_date: "", end_date: "" });
    clearFilters();
  };

  const columns = [
    {
      key: "created_at",
      header: "Tanggal",
      render: (_value: unknown, row: MaterialTransaction) =>
        formatDateTime(row.created_at || ""),
    },
    {
      key: "material_id",
      header: "Material",
      render: (_value: unknown, row: MaterialTransaction) =>
        getMaterialName(row.material_id),
    },
    {
      key: "tipe_transaksi",
      header: "Tipe",
      render: (_value: unknown, row: MaterialTransaction) => (
        <Badge variant={row.tipe_transaksi === "masuk" ? "success" : "danger"}>
          {row.tipe_transaksi === "masuk" ? "Masuk" : "Keluar"}
        </Badge>
      ),
    },
    {
      key: "jumlah",
      header: "Jumlah",
      render: (_value: unknown, row: MaterialTransaction) =>
        formatNumber(row.jumlah),
    },
    {
      key: "keterangan",
      header: "Keterangan",
      render: (_value: unknown, row: MaterialTransaction) =>
        row.keterangan || "-",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Riwayat Transaksi Material"
      size="xl"
    >
      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-dark-50 dark:bg-dark-700 p-4 rounded-lg">
          <Select
            label="Material"
            value={localFilters.material_id}
            onChange={(e) =>
              setLocalFilters({ ...localFilters, material_id: e.target.value })
            }
            options={[
              { value: "", label: "Semua Material" },
              ...materialOptions,
            ]}
          />
          <Input
            label="Dari Tanggal"
            type="date"
            value={localFilters.start_date}
            onChange={(e) =>
              setLocalFilters({ ...localFilters, start_date: e.target.value })
            }
          />
          <Input
            label="Sampai Tanggal"
            type="date"
            value={localFilters.end_date}
            onChange={(e) =>
              setLocalFilters({ ...localFilters, end_date: e.target.value })
            }
          />
          <div className="flex items-end gap-2">
            <Button onClick={handleApplyFilters} variant="primary" size="sm">
              <Search className="h-4 w-4 mr-1" />
              Filter
            </Button>
            <Button onClick={handleClearFilters} variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="max-h-96 overflow-y-auto">
          <DataTable
            data={transactions}
            columns={columns}
            loading={loading}
            emptyMessage="Belum ada transaksi"
            searchable={true}
            searchPlaceholder="Cari kode, nama material, jenis, keterangan..."
            searchKeys={[
              "kode_material",
              "nama_material",
              "jenis",
              "keterangan",
            ]}
          />
        </div>

        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Tutup</Button>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// MAIN PAGE COMPONENT
// ============================================
const InventarisPage = () => {
  const { user } = useAuthStore();
  const {
    materials,
    loading,
    error,
    refetch,
    addMaterial,
    updateMaterial,
    deleteMaterial,
    stockMasuk,
    stockKeluar,
  } = useMaterials();

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTambahStokModal, setShowTambahStokModal] = useState(false);
  const [showAmbilStokModal, setShowAmbilStokModal] = useState(false);
  const [showRiwayatModal, setShowRiwayatModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [logRecordId, setLogRecordId] = useState("");

  // Selected item states
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Search and pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Permissions
  const userIsViewOnly = isViewOnly(user?.role || "");
  const userCanAdd = canAdd(user?.role || "") && !userIsViewOnly;
  const userCanEdit = canEditDirect(user?.role || "") && !userIsViewOnly;
  const userCanDelete = canDeleteDirect(user?.role || "") && !userIsViewOnly;

  // Filtered and paginated data
  const filteredMaterials = useMemo(() => {
    return [...materials];
  }, [materials]);

  const paginatedMaterials = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredMaterials.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredMaterials, currentPage]);

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);

  // Handlers
  const handleEdit = (material: Material) => {
    setEditingMaterial(material);
    setShowEditModal(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    const result = await deleteMaterial(deleteId);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } else {
      alert(result.error || "Gagal menghapus material");
    }
    setShowDeleteConfirm(false);
    setDeleteId(null);
  };

  const handleAddMaterialSubmit = async (
    data: Omit<Material, "id" | "created_at" | "updated_at">
  ) => {
    const result = await addMaterial(data);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    return result;
  };

  const handleUpdateMaterialSubmit = async (
    data: Partial<Material> & { id: string }
  ) => {
    const result = await updateMaterial(data);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    return result;
  };

  const handleStockMasukSubmit = async (
    materialId: string,
    jumlah: number,
    keterangan: string
  ) => {
    const result = await stockMasuk(materialId, jumlah, keterangan);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    return result;
  };

  const handleStockKeluarSubmit = async (
    materialId: string,
    jumlah: number,
    keterangan: string
  ) => {
    const result = await stockKeluar(materialId, jumlah, keterangan);
    if (result.success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
    return result;
  };

  // Alt+S shortcut
  const triggerSave = useCallback(() => {
    // This can be implemented if needed for form submission
  }, []);
  useSaveShortcut(
    triggerSave,
    showAddModal || showEditModal || showTambahStokModal || showAmbilStokModal
  );

  // Table columns
  const columns = [
    {
      key: "kode_material",
      header: "Kode",
      render: (_value: unknown, row: Material) => (
        <span className="font-mono text-primary-600 dark:text-primary-400">
          {row.kode_material}
        </span>
      ),
    },
    {
      key: "nama_material",
      header: "Nama Material",
    },
    {
      key: "satuan",
      header: "Satuan",
      render: (_value: unknown, row: Material) => row.satuan.toUpperCase(),
    },
    {
      key: "stok",
      header: "Stok",
      render: (_value: unknown, row: Material) => {
        const isLowStock = row.stok <= row.stok_minimum;
        return (
          <div className="flex items-center gap-2">
            <span
              className={
                isLowStock ? "text-red-600 dark:text-red-400 font-bold" : ""
              }
            >
              {formatNumber(row.stok)}
            </span>
            {isLowStock && (
              <Badge variant="danger" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                Menipis
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "stok_minimum",
      header: "Min. Stok",
      render: (_value: unknown, row: Material) =>
        formatNumber(row.stok_minimum),
    },
    {
      key: "actions",
      header: "Aksi",
      render: (_value: unknown, row: Material) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setLogRecordId(row.id || "");
              setShowLogModal(true);
            }}
            className="p-1.5 text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900/30 rounded-lg transition-colors"
            title="Lihat Log Aktivitas"
          >
            <History className="h-4 w-4" />
          </button>
          {userCanEdit && (
            <button
              onClick={() => handleEdit(row)}
              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Edit Material"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          )}
          {userCanDelete && (
            <button
              onClick={() => handleDelete(row.id || "")}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Hapus Material"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  // Count low stock items
  const lowStockCount = materials.filter(
    (m) => m.stok <= m.stok_minimum
  ).length;

  return (
    <div className="space-y-6">
      {/* Success Overlay */}
      <SuccessOverlay isVisible={showSuccess} message="Berhasil!" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900 dark:text-white flex items-center gap-3">
            <Package className="h-7 w-7 text-primary-600" />
            Inventaris Stok Material
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Kelola stok material consumable
          </p>
        </div>
        {lowStockCount > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <span className="text-red-700 dark:text-red-300 text-sm font-medium">
              {lowStockCount} material stok menipis
            </span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Action Buttons */}
      <Card>
        <div className="p-4 flex flex-wrap gap-3">
          {userCanAdd && (
            <>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tambah Material
              </Button>
              <Button
                onClick={() => setShowTambahStokModal(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Tambah Stok
              </Button>
              <Button
                onClick={() => setShowAmbilStokModal(true)}
                className="bg-red-600 hover:bg-red-700"
              >
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Ambil Stok
              </Button>
            </>
          )}
          <Button variant="outline" onClick={() => setShowRiwayatModal(true)}>
            <History className="h-4 w-4 mr-2" />
            Riwayat Transaksi
          </Button>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Daftar Material ({filteredMaterials.length})</span>
          </CardTitle>
        </CardHeader>
        <div className="p-4">
          <DataTable
            data={paginatedMaterials}
            columns={columns}
            loading={loading}
            emptyMessage="Belum ada data material"
            searchable={true}
            searchPlaceholder="Cari kode, nama material, satuan..."
            searchKeys={[
              "kode_material",
              "nama_material",
              "satuan",
              "stok_awal",
              "stok_akhir",
            ]}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-dark-200 dark:border-dark-700">
              <span className="text-sm text-dark-500 dark:text-dark-400">
                Halaman {currentPage} dari {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Modals */}
      <AddMaterialModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddMaterialSubmit}
        loading={loading}
      />

      <EditMaterialModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingMaterial(null);
        }}
        material={editingMaterial}
        onSubmit={handleUpdateMaterialSubmit}
        loading={loading}
      />

      <TambahStokModal
        isOpen={showTambahStokModal}
        onClose={() => setShowTambahStokModal(false)}
        materials={materials}
        onSubmit={handleStockMasukSubmit}
        loading={loading}
      />

      <AmbilStokModal
        isOpen={showAmbilStokModal}
        onClose={() => setShowAmbilStokModal(false)}
        materials={materials}
        onSubmit={handleStockKeluarSubmit}
        loading={loading}
      />

      <RiwayatTransaksiModal
        isOpen={showRiwayatModal}
        onClose={() => setShowRiwayatModal(false)}
        materials={materials}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Hapus Material"
        message="Apakah Anda yakin ingin menghapus material ini? Semua riwayat transaksi material ini akan tetap tersimpan."
        confirmText="Hapus"
        cancelText="Batal"
        variant="danger"
      />

      {/* Activity Log Modal */}
      <ActivityLogModal
        isOpen={showLogModal}
        onClose={() => {
          setShowLogModal(false);
          setLogRecordId("");
        }}
        sheetName="materials"
        recordId={logRecordId}
        title="Log Aktivitas Material"
      />
    </div>
  );
};

export default InventarisPage;
