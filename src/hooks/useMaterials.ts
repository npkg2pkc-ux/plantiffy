import { useState, useEffect, useCallback } from "react";
import type {
  Material,
  MaterialTransactionFilter,
  MaterialTransaction,
} from "@/types";
import {
  getMaterials,
  addMaterialWithLog,
  updateMaterialWithLog,
  deleteMaterialWithLog,
  updateStockMasukWithLog,
  updateStockKeluarWithLog,
  getMaterialTransactions,
  type UserInfoForLog,
} from "@/services/api";
import { useAuthStore } from "@/stores";

// ============================================
// useMaterials Hook
// ============================================
export function useMaterials() {
  const { user } = useAuthStore();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user info for logging
  const getUserInfo = useCallback((): UserInfoForLog => {
    return {
      username: user?.username || "",
      namaLengkap: user?.namaLengkap || user?.nama || "",
      nama: user?.nama || "",
      role: user?.role || "",
    };
  }, [user]);

  // Fetch all materials
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMaterials();
      if (result.success && result.data) {
        // Sort by nama_material
        const sorted = [...result.data].sort((a, b) =>
          a.nama_material.localeCompare(b.nama_material)
        );
        setMaterials(sorted);
      } else {
        setError(result.error || "Gagal mengambil data material");
        setMaterials([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Add new material
  const handleAddMaterial = useCallback(
    async (data: Omit<Material, "id" | "created_at" | "updated_at">) => {
      setLoading(true);
      setError(null);
      try {
        const userInfo = getUserInfo();
        const result = await addMaterialWithLog(data, userInfo);
        if (result.success && result.data) {
          setMaterials((prev) =>
            [...prev, result.data as Material].sort((a, b) =>
              a.nama_material.localeCompare(b.nama_material)
            )
          );
          return { success: true, data: result.data };
        } else {
          setError(result.error || "Gagal menambah material");
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [getUserInfo]
  );

  // Update material
  const handleUpdateMaterial = useCallback(
    async (data: Partial<Material> & { id: string }) => {
      setLoading(true);
      setError(null);
      try {
        const userInfo = getUserInfo();
        const result = await updateMaterialWithLog(data, userInfo);
        if (result.success) {
          setMaterials((prev) =>
            prev
              .map((m) => (m.id === data.id ? { ...m, ...data } : m))
              .sort((a, b) => a.nama_material.localeCompare(b.nama_material))
          );
          return { success: true };
        } else {
          setError(result.error || "Gagal mengupdate material");
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [getUserInfo]
  );

  // Delete material
  const handleDeleteMaterial = useCallback(async (materialId: string) => {
    setLoading(true);
    setError(null);
    try {
      const userInfo = getUserInfo();
      const result = await deleteMaterialWithLog(materialId, userInfo);
      if (result.success) {
        setMaterials((prev) => prev.filter((m) => m.id !== materialId));
        return { success: true };
      } else {
        setError(result.error || "Gagal menghapus material");
        return { success: false, error: result.error };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, [getUserInfo]);

  // Update stock - MASUK
  const handleStockMasuk = useCallback(
    async (materialId: string, jumlah: number, keterangan: string) => {
      setLoading(true);
      setError(null);
      try {
        const userInfo = getUserInfo();
        const result = await updateStockMasukWithLog(materialId, jumlah, keterangan, userInfo);
        if (result.success && result.data) {
          // Update local state with new stock
          setMaterials((prev) =>
            prev.map((m) =>
              m.id === materialId ? { ...m, stok: result.data!.stok_baru } : m
            )
          );
          return { success: true, data: result.data };
        } else {
          setError(result.error || "Gagal menambah stok");
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [getUserInfo]
  );

  // Update stock - KELUAR
  const handleStockKeluar = useCallback(
    async (materialId: string, jumlah: number, keterangan: string) => {
      setLoading(true);
      setError(null);
      try {
        const userInfo = getUserInfo();
        const result = await updateStockKeluarWithLog(materialId, jumlah, keterangan, userInfo);
        if (result.success && result.data) {
          // Update local state with new stock
          setMaterials((prev) =>
            prev.map((m) =>
              m.id === materialId ? { ...m, stok: result.data!.stok_baru } : m
            )
          );
          return { success: true, data: result.data };
        } else {
          setError(result.error || "Gagal mengurangi stok");
          return { success: false, error: result.error };
        }
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      } finally {
        setLoading(false);
      }
    },
    [getUserInfo]
  );

  // Load materials on mount
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  return {
    materials,
    loading,
    error,
    refetch: fetchMaterials,
    addMaterial: handleAddMaterial,
    updateMaterial: handleUpdateMaterial,
    deleteMaterial: handleDeleteMaterial,
    stockMasuk: handleStockMasuk,
    stockKeluar: handleStockKeluar,
  };
}

// ============================================
// useMaterialTransactions Hook
// ============================================
export function useMaterialTransactions(
  initialFilters?: MaterialTransactionFilter
) {
  const [transactions, setTransactions] = useState<MaterialTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MaterialTransactionFilter | undefined>(
    initialFilters
  );

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (newFilters?: MaterialTransactionFilter) => {
      setLoading(true);
      setError(null);
      try {
        const result = await getMaterialTransactions(newFilters || filters);
        if (result.success && result.data) {
          setTransactions(result.data);
        } else {
          setError(result.error || "Gagal mengambil data transaksi");
          setTransactions([]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Terjadi kesalahan");
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // Update filters and refetch
  const updateFilters = useCallback(
    (newFilters: MaterialTransactionFilter) => {
      setFilters(newFilters);
      fetchTransactions(newFilters);
    },
    [fetchTransactions]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(undefined);
    fetchTransactions(undefined);
  }, [fetchTransactions]);

  // Load transactions on mount
  useEffect(() => {
    fetchTransactions();
  }, []);

  return {
    transactions,
    loading,
    error,
    filters,
    refetch: fetchTransactions,
    updateFilters,
    clearFilters,
  };
}
