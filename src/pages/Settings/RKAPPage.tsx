import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Target,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { useSaveShortcut } from "@/hooks";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  Badge,
  SuccessOverlay,
} from "@/components/ui";
import { useAuthStore } from "@/stores";
import { formatNumber, parseNumber } from "@/lib/utils";
import type { RKAP, PlantType, ProduksiNPK } from "@/types";

const MONTHS = [
  { key: "januari", label: "Januari" },
  { key: "februari", label: "Februari" },
  { key: "maret", label: "Maret" },
  { key: "april", label: "April" },
  { key: "mei", label: "Mei" },
  { key: "juni", label: "Juni" },
  { key: "juli", label: "Juli" },
  { key: "agustus", label: "Agustus" },
  { key: "september", label: "September" },
  { key: "oktober", label: "Oktober" },
  { key: "november", label: "November" },
  { key: "desember", label: "Desember" },
];

const initialFormState: RKAP = {
  tahun: new Date().getFullYear().toString(),
  plant: "NPK2",
  januari: 0,
  februari: 0,
  maret: 0,
  april: 0,
  mei: 0,
  juni: 0,
  juli: 0,
  agustus: 0,
  september: 0,
  oktober: 0,
  november: 0,
  desember: 0,
  total: 0,
};

const yearOptions = [
  { value: "2023", label: "2023" },
  { value: "2024", label: "2024" },
  { value: "2025", label: "2025" },
  { value: "2026", label: "2026" },
  { value: "2027", label: "2027" },
];

const RKAPPage = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<RKAP[]>([]);
  const [produksiData, setProduksiData] = useState<ProduksiNPK[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<RKAP>(initialFormState);
  const [plantFilter, setPlantFilter] = useState<PlantType>(
    user?.plant || "ALL"
  );
  const [yearFilter, setYearFilter] = useState(
    new Date().getFullYear().toString()
  );

  // Fetch RKAP and Produksi data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, fetchDataByPlant, SHEETS } = await import(
          "@/services/api"
        );

        // Fetch RKAP data
        const rkapResult = await readData<RKAP>(SHEETS.RKAP);
        if (rkapResult.success && rkapResult.data) {
          setData(rkapResult.data);
        } else {
          setData([]);
        }

        // Fetch Produksi data for comparison
        const produksiResult = await fetchDataByPlant<ProduksiNPK>(
          SHEETS.PRODUKSI_NPK
        );
        if (produksiResult.success && produksiResult.data) {
          setProduksiData(produksiResult.data);
        } else {
          setProduksiData([]);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setData([]);
        setProduksiData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate total when form changes
  useEffect(() => {
    const total = MONTHS.reduce((sum, month) => {
      return sum + (Number(form[month.key as keyof RKAP]) || 0);
    }, 0);
    setForm((prev) => ({ ...prev, total }));
  }, [
    form.januari,
    form.februari,
    form.maret,
    form.april,
    form.mei,
    form.juni,
    form.juli,
    form.agustus,
    form.september,
    form.oktober,
    form.november,
    form.desember,
  ]);

  // Calculate monthly production from produksiData
  const monthlyProduksi = useMemo(() => {
    const result: { [key: string]: number } = {};

    const filteredProduksi = produksiData.filter((item) => {
      const year = new Date(item.tanggal).getFullYear().toString();
      const matchesYear = year === yearFilter;
      const matchesPlant = plantFilter === "ALL" || item._plant === plantFilter;
      return matchesYear && matchesPlant;
    });

    MONTHS.forEach((month, index) => {
      const monthProduksi = filteredProduksi.filter((item) => {
        const monthIndex = new Date(item.tanggal).getMonth();
        return monthIndex === index;
      });

      result[month.key] = monthProduksi.reduce((sum, item) => {
        return (
          sum +
          (parseNumber(item.total) ||
            parseNumber(item.shiftMalamOnspek) +
              parseNumber(item.shiftMalamOffspek) +
              parseNumber(item.shiftPagiOnspek) +
              parseNumber(item.shiftPagiOffspek) +
              parseNumber(item.shiftSoreOnspek) +
              parseNumber(item.shiftSoreOffspek))
        );
      }, 0);
    });

    return result;
  }, [produksiData, yearFilter, plantFilter]);

  // Get filtered RKAP data
  const filteredRKAP = useMemo(() => {
    return data.filter((item) => {
      const matchesYear = item.tahun?.toString() === yearFilter;
      const matchesPlant = plantFilter === "ALL" || item.plant === plantFilter;
      return matchesYear && matchesPlant;
    });
  }, [data, yearFilter, plantFilter]);

  // Get separate RKAP for NPK1 and NPK2
  const rkapNPK1 = useMemo(() => {
    return data.find(
      (item) => item.tahun?.toString() === yearFilter && item.plant === "NPK1"
    );
  }, [data, yearFilter]);

  const rkapNPK2 = useMemo(() => {
    return data.find(
      (item) => item.tahun?.toString() === yearFilter && item.plant === "NPK2"
    );
  }, [data, yearFilter]);

  // Monthly production per plant
  const monthlyProduksiPerPlant = useMemo(() => {
    const result: {
      NPK1: { [key: string]: number };
      NPK2: { [key: string]: number };
    } = {
      NPK1: {},
      NPK2: {},
    };

    ["NPK1", "NPK2"].forEach((plant) => {
      const filteredProduksi = produksiData.filter((item) => {
        const year = new Date(item.tanggal).getFullYear().toString();
        return year === yearFilter && item._plant === plant;
      });

      MONTHS.forEach((month, index) => {
        const monthProduksi = filteredProduksi.filter((item) => {
          const monthIndex = new Date(item.tanggal).getMonth();
          return monthIndex === index;
        });

        result[plant as "NPK1" | "NPK2"][month.key] = monthProduksi.reduce(
          (sum, item) => {
            return (
              sum +
              (parseNumber(item.total) ||
                parseNumber(item.shiftMalamOnspek) +
                  parseNumber(item.shiftMalamOffspek) +
                  parseNumber(item.shiftPagiOnspek) +
                  parseNumber(item.shiftPagiOffspek) +
                  parseNumber(item.shiftSoreOnspek) +
                  parseNumber(item.shiftSoreOffspek))
            );
          },
          0
        );
      });
    });

    return result;
  }, [produksiData, yearFilter]);

  // Get current RKAP (should be one per year per plant)
  const currentRKAP = filteredRKAP[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS } = await import("@/services/api");

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId };
        const updateResult = await updateData<RKAP>(SHEETS.RKAP, dataToUpdate);
        if (updateResult.success) {
          setData((prev) =>
            prev.map((item) =>
              item.id === editingId ? { ...form, id: editingId } : item
            )
          );
        } else {
          throw new Error(updateResult.error || "Gagal mengupdate data");
        }
      } else {
        const createResult = await createData<RKAP>(SHEETS.RKAP, form);
        if (createResult.success && createResult.data) {
          setData((prev) => [createResult.data!, ...prev]);
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

  const handleEdit = (item: RKAP) => {
    setForm(item);
    setEditingId(item.id || null);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    setLoading(true);
    try {
      const { deleteData, SHEETS } = await import("@/services/api");
      const deleteResult = await deleteData(SHEETS.RKAP, deleteId);
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
    setForm({
      ...initialFormState,
      tahun: yearFilter,
      plant: plantFilter === "ALL" ? "NPK2" : plantFilter,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const handleMonthChange = (monthKey: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      [monthKey]: parseFloat(value) || 0,
    }));
  };

  // Calculate totals
  const totalTargetNPK1 = rkapNPK1?.total || 0;
  const totalTargetNPK2 = rkapNPK2?.total || 0;
  const totalTarget =
    plantFilter === "ALL"
      ? totalTargetNPK1 + totalTargetNPK2
      : currentRKAP?.total || 0;

  const totalProduksiNPK1 = Object.values(monthlyProduksiPerPlant.NPK1).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalProduksiNPK2 = Object.values(monthlyProduksiPerPlant.NPK2).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalProduksi =
    plantFilter === "ALL"
      ? totalProduksiNPK1 + totalProduksiNPK2
      : Object.values(monthlyProduksi).reduce((sum, val) => sum + val, 0);

  const percentage =
    totalTarget > 0 ? ((totalProduksi / totalTarget) * 100).toFixed(1) : "0";
  const percentageNPK1 =
    totalTargetNPK1 > 0
      ? ((totalProduksiNPK1 / totalTargetNPK1) * 100).toFixed(1)
      : "0";
  const percentageNPK2 =
    totalTargetNPK2 > 0
      ? ((totalProduksiNPK2 / totalTargetNPK2) * 100).toFixed(1)
      : "0";

  const isAdmin =
    user?.role === "admin" || user?.role === "manager" || user?.role === "avp";

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const form = document.querySelector("form");
      if (form) form.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const plantLabel =
    plantFilter === "ALL"
      ? "Semua Plant"
      : plantFilter === "NPK1"
      ? "NPK Plant 1"
      : "NPK Plant 2";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-dark-900 dark:text-white">
            RKAP (Target Produksi)
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Rencana Kerja dan Anggaran Perusahaan - {plantLabel}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            options={yearOptions}
            className="w-32"
          />
          {user?.plant === "ALL" && (
            <Select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value as PlantType)}
              options={[
                { value: "ALL", label: "Semua Plant" },
                { value: "NPK1", label: "NPK 1" },
                { value: "NPK2", label: "NPK 2" },
              ]}
              className="w-40"
            />
          )}
          {isAdmin &&
            plantFilter !== "ALL" &&
            (currentRKAP ? (
              <Button onClick={() => handleEdit(currentRKAP)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Target
              </Button>
            ) : (
              <Button onClick={openAddForm}>
                <Plus className="h-4 w-4 mr-2" />
                Buat Target
              </Button>
            ))}
        </div>
      </div>

      {/* Summary Cards */}
      {plantFilter === "ALL" ? (
        <>
          {/* Show NPK1 and NPK2 separately */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* NPK 1 Card */}
            <Card className="p-5 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 dark:from-blue-900/20 dark:to-indigo-900/20 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-blue-900 dark:text-blue-100">
                      NPK Plant 1
                    </h3>
                    <p className="text-sm text-blue-600 dark:text-blue-300">
                      RKAP {yearFilter}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant={rkapNPK1 ? "secondary" : "primary"}
                    onClick={() => {
                      if (rkapNPK1) {
                        handleEdit(rkapNPK1);
                      } else {
                        setForm({
                          ...initialFormState,
                          tahun: yearFilter,
                          plant: "NPK1",
                        });
                        setEditingId(null);
                        setShowForm(true);
                      }
                    }}
                  >
                    {rkapNPK1 ? (
                      <>
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" />
                        Buat
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mb-1">
                    Target
                  </p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {formatNumber(totalTargetNPK1)}
                  </p>
                  <p className="text-xs text-blue-500">Ton</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mb-1">
                    Realisasi
                  </p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                    {formatNumber(totalProduksiNPK1)}
                  </p>
                  <p className="text-xs text-blue-500">Ton</p>
                </div>
                <div>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mb-1">
                    Pencapaian
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      Number(percentageNPK1) >= 100
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}
                  >
                    {percentageNPK1}%
                  </p>
                  <Badge variant={rkapNPK1 ? "success" : "warning"} size="sm">
                    {rkapNPK1 ? "Target Ada" : "Belum Ada"}
                  </Badge>
                </div>
              </div>
            </Card>

            {/* NPK 2 Card */}
            <Card className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 dark:from-amber-900/20 dark:to-orange-900/20 dark:border-amber-800">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-xl">
                    <Target className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-amber-900 dark:text-amber-100">
                      NPK Plant 2
                    </h3>
                    <p className="text-sm text-amber-600 dark:text-amber-300">
                      RKAP {yearFilter}
                    </p>
                  </div>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant={rkapNPK2 ? "secondary" : "primary"}
                    onClick={() => {
                      if (rkapNPK2) {
                        handleEdit(rkapNPK2);
                      } else {
                        setForm({
                          ...initialFormState,
                          tahun: yearFilter,
                          plant: "NPK2",
                        });
                        setEditingId(null);
                        setShowForm(true);
                      }
                    }}
                  >
                    {rkapNPK2 ? (
                      <>
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </>
                    ) : (
                      <>
                        <Plus className="h-3 w-3 mr-1" />
                        Buat
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mb-1">
                    Target
                  </p>
                  <p className="text-xl font-bold text-amber-900 dark:text-amber-100">
                    {formatNumber(totalTargetNPK2)}
                  </p>
                  <p className="text-xs text-amber-500">Ton</p>
                </div>
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mb-1">
                    Realisasi
                  </p>
                  <p className="text-xl font-bold text-amber-900 dark:text-amber-100">
                    {formatNumber(totalProduksiNPK2)}
                  </p>
                  <p className="text-xs text-amber-500">Ton</p>
                </div>
                <div>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mb-1">
                    Pencapaian
                  </p>
                  <p
                    className={`text-xl font-bold ${
                      Number(percentageNPK2) >= 100
                        ? "text-green-600"
                        : "text-amber-600"
                    }`}
                  >
                    {percentageNPK2}%
                  </p>
                  <Badge variant={rkapNPK2 ? "success" : "warning"} size="sm">
                    {rkapNPK2 ? "Target Ada" : "Belum Ada"}
                  </Badge>
                </div>
              </div>
            </Card>
          </div>

          {/* Combined Total */}
          <Card className="p-4 bg-gradient-to-r from-dark-100 to-dark-200 dark:from-dark-800 dark:to-dark-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-dark-200 dark:bg-dark-600 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-dark-600 dark:text-dark-300" />
                </div>
                <div>
                  <p className="text-sm text-dark-500 dark:text-dark-400">
                    Total Gabungan NPK 1 + NPK 2
                  </p>
                  <div className="flex items-center gap-4">
                    <span className="text-xl font-bold text-dark-900 dark:text-white">
                      {formatNumber(totalProduksi)} /{" "}
                      {formatNumber(totalTarget)} Ton
                    </span>
                    <Badge
                      variant={
                        Number(percentage) >= 100 ? "success" : "warning"
                      }
                    >
                      {percentage}%
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 bg-gradient-to-br from-primary-50 to-indigo-50 border-primary-200">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 rounded-xl">
                <Target className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">
                  Total Target RKAP {yearFilter}
                </p>
                <p className="text-2xl font-bold text-primary-600">
                  {formatNumber(totalTarget)} Ton
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-secondary-100 rounded-xl">
                <TrendingUp className="h-6 w-6 text-secondary-600" />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">
                  Total Realisasi
                </p>
                <p className="text-2xl font-bold text-secondary-600">
                  {formatNumber(totalProduksi)} Ton
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-xl ${
                  Number(percentage) >= 100 ? "bg-green-100" : "bg-amber-100"
                }`}
              >
                <Calendar
                  className={`h-6 w-6 ${
                    Number(percentage) >= 100
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                />
              </div>
              <div>
                <p className="text-sm text-dark-500 dark:text-dark-400">
                  Pencapaian
                </p>
                <p
                  className={`text-2xl font-bold ${
                    Number(percentage) >= 100
                      ? "text-green-600"
                      : "text-amber-600"
                  }`}
                >
                  {percentage}%
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Monthly Comparison Table */}
      {plantFilter === "ALL" ? (
        <>
          {/* NPK 1 Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-blue-700 dark:text-blue-400">
                  NPK Plant 1 - Perbandingan Target vs Realisasi {yearFilter}
                </CardTitle>
                <Badge variant={rkapNPK1 ? "success" : "warning"}>
                  {rkapNPK1 ? "Target Tersedia" : "Belum Ada Target"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-3 px-4 font-semibold text-dark-600">
                        Bulan
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-blue-600">
                        Target NPK 1 (Ton)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-dark-600">
                        Realisasi (Ton)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-dark-600">
                        Selisih (Ton)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-dark-600">
                        Pencapaian
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map((month) => {
                      const target =
                        Number(rkapNPK1?.[month.key as keyof RKAP]) || 0;
                      const realisasi =
                        monthlyProduksiPerPlant.NPK1[month.key] || 0;
                      const selisih = realisasi - target;
                      const pct =
                        target > 0
                          ? ((realisasi / target) * 100).toFixed(1)
                          : "0";

                      return (
                        <tr
                          key={month.key}
                          className="border-b border-dark-100 hover:bg-blue-50 dark:hover:bg-blue-900/10"
                        >
                          <td className="py-3 px-4 font-medium">
                            {month.label}
                          </td>
                          <td className="py-3 px-4 text-right text-blue-600 font-semibold">
                            {formatNumber(target)}
                          </td>
                          <td className="py-3 px-4 text-right text-secondary-600 font-semibold">
                            {formatNumber(realisasi)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              selisih >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {selisih >= 0 ? "+" : ""}
                            {formatNumber(selisih)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge
                              variant={
                                Number(pct) >= 100
                                  ? "success"
                                  : Number(pct) >= 80
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {pct}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-blue-100 dark:bg-blue-900/20 font-bold">
                      <td className="py-3 px-4">TOTAL NPK 1</td>
                      <td className="py-3 px-4 text-right text-blue-700">
                        {formatNumber(totalTargetNPK1)}
                      </td>
                      <td className="py-3 px-4 text-right text-secondary-700">
                        {formatNumber(totalProduksiNPK1)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right ${
                          totalProduksiNPK1 - totalTargetNPK1 >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {totalProduksiNPK1 - totalTargetNPK1 >= 0 ? "+" : ""}
                        {formatNumber(totalProduksiNPK1 - totalTargetNPK1)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={
                            Number(percentageNPK1) >= 100
                              ? "success"
                              : "warning"
                          }
                          className="text-base"
                        >
                          {percentageNPK1}%
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* NPK 2 Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-amber-700 dark:text-amber-400">
                  NPK Plant 2 - Perbandingan Target vs Realisasi {yearFilter}
                </CardTitle>
                <Badge variant={rkapNPK2 ? "success" : "warning"}>
                  {rkapNPK2 ? "Target Tersedia" : "Belum Ada Target"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-200">
                      <th className="text-left py-3 px-4 font-semibold text-dark-600">
                        Bulan
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-amber-600">
                        Target NPK 2 (Ton)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-dark-600">
                        Realisasi (Ton)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-dark-600">
                        Selisih (Ton)
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-dark-600">
                        Pencapaian
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {MONTHS.map((month) => {
                      const target =
                        Number(rkapNPK2?.[month.key as keyof RKAP]) || 0;
                      const realisasi =
                        monthlyProduksiPerPlant.NPK2[month.key] || 0;
                      const selisih = realisasi - target;
                      const pct =
                        target > 0
                          ? ((realisasi / target) * 100).toFixed(1)
                          : "0";

                      return (
                        <tr
                          key={month.key}
                          className="border-b border-dark-100 hover:bg-amber-50 dark:hover:bg-amber-900/10"
                        >
                          <td className="py-3 px-4 font-medium">
                            {month.label}
                          </td>
                          <td className="py-3 px-4 text-right text-amber-600 font-semibold">
                            {formatNumber(target)}
                          </td>
                          <td className="py-3 px-4 text-right text-secondary-600 font-semibold">
                            {formatNumber(realisasi)}
                          </td>
                          <td
                            className={`py-3 px-4 text-right font-semibold ${
                              selisih >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {selisih >= 0 ? "+" : ""}
                            {formatNumber(selisih)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Badge
                              variant={
                                Number(pct) >= 100
                                  ? "success"
                                  : Number(pct) >= 80
                                  ? "warning"
                                  : "danger"
                              }
                            >
                              {pct}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Total Row */}
                    <tr className="bg-amber-100 dark:bg-amber-900/20 font-bold">
                      <td className="py-3 px-4">TOTAL NPK 2</td>
                      <td className="py-3 px-4 text-right text-amber-700">
                        {formatNumber(totalTargetNPK2)}
                      </td>
                      <td className="py-3 px-4 text-right text-secondary-700">
                        {formatNumber(totalProduksiNPK2)}
                      </td>
                      <td
                        className={`py-3 px-4 text-right ${
                          totalProduksiNPK2 - totalTargetNPK2 >= 0
                            ? "text-green-700"
                            : "text-red-700"
                        }`}
                      >
                        {totalProduksiNPK2 - totalTargetNPK2 >= 0 ? "+" : ""}
                        {formatNumber(totalProduksiNPK2 - totalTargetNPK2)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Badge
                          variant={
                            Number(percentageNPK2) >= 100
                              ? "success"
                              : "warning"
                          }
                          className="text-base"
                        >
                          {percentageNPK2}%
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Perbandingan Target vs Realisasi Bulanan - {yearFilter}
              </CardTitle>
              <Badge variant={currentRKAP ? "success" : "warning"}>
                {currentRKAP ? "Target Tersedia" : "Belum Ada Target"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-200">
                    <th className="text-left py-3 px-4 font-semibold text-dark-600">
                      Bulan
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-dark-600">
                      Target RKAP (Ton)
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-dark-600">
                      Realisasi (Ton)
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-dark-600">
                      Selisih (Ton)
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-dark-600">
                      Pencapaian
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {MONTHS.map((month) => {
                    const target =
                      Number(currentRKAP?.[month.key as keyof RKAP]) || 0;
                    const realisasi = monthlyProduksi[month.key] || 0;
                    const selisih = realisasi - target;
                    const pct =
                      target > 0
                        ? ((realisasi / target) * 100).toFixed(1)
                        : "0";

                    return (
                      <tr
                        key={month.key}
                        className="border-b border-dark-100 hover:bg-dark-50"
                      >
                        <td className="py-3 px-4 font-medium">{month.label}</td>
                        <td className="py-3 px-4 text-right text-primary-600 font-semibold">
                          {formatNumber(target)}
                        </td>
                        <td className="py-3 px-4 text-right text-secondary-600 font-semibold">
                          {formatNumber(realisasi)}
                        </td>
                        <td
                          className={`py-3 px-4 text-right font-semibold ${
                            selisih >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {selisih >= 0 ? "+" : ""}
                          {formatNumber(selisih)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Badge
                            variant={
                              Number(pct) >= 100
                                ? "success"
                                : Number(pct) >= 80
                                ? "warning"
                                : "danger"
                            }
                          >
                            {pct}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                  {/* Total Row */}
                  <tr className="bg-dark-100 font-bold">
                    <td className="py-3 px-4">TOTAL</td>
                    <td className="py-3 px-4 text-right text-primary-700">
                      {formatNumber(totalTarget)}
                    </td>
                    <td className="py-3 px-4 text-right text-secondary-700">
                      {formatNumber(totalProduksi)}
                    </td>
                    <td
                      className={`py-3 px-4 text-right ${
                        totalProduksi - totalTarget >= 0
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {totalProduksi - totalTarget >= 0 ? "+" : ""}
                      {formatNumber(totalProduksi - totalTarget)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Badge
                        variant={
                          Number(percentage) >= 100 ? "success" : "warning"
                        }
                        className="text-base"
                      >
                        {percentage}%
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Button for existing RKAP */}
      {isAdmin && plantFilter !== "ALL" && currentRKAP && (
        <div className="flex justify-end">
          <Button
            variant="danger"
            onClick={() => handleDelete(currentRKAP.id!)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Hapus Target RKAP {yearFilter}
          </Button>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setForm(initialFormState);
          setEditingId(null);
        }}
        title={
          editingId ? `Edit Target RKAP ${form.tahun}` : "Buat Target RKAP Baru"
        }
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tahun dan Plant */}
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tahun"
              value={form.tahun?.toString() || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, tahun: e.target.value }))
              }
              options={yearOptions}
              required
              disabled={!!editingId}
            />
            <Select
              label="Plant"
              value={form.plant || "NPK2"}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  plant: e.target.value as PlantType,
                }))
              }
              options={[
                { value: "NPK1", label: "NPK Plant 1" },
                { value: "NPK2", label: "NPK Plant 2" },
              ]}
              required
              disabled={!!editingId}
            />
          </div>

          {/* Monthly Targets */}
          <div className="space-y-3">
            <h3 className="font-semibold text-dark-700 border-b pb-2">
              Target Bulanan (Ton)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {MONTHS.map((month) => (
                <Input
                  key={month.key}
                  label={month.label}
                  type="number"
                  value={form[month.key as keyof RKAP] || ""}
                  onChange={(e) => handleMonthChange(month.key, e.target.value)}
                  placeholder="0"
                  min="0"
                />
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="bg-primary-50 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-dark-700">
                Total Target Tahunan:
              </span>
              <span className="text-2xl font-bold text-primary-600">
                {formatNumber(form.total || 0)} Ton
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
        title="Hapus Target RKAP"
        message={`Apakah Anda yakin ingin menghapus target RKAP tahun ${yearFilter}?`}
        confirmText="Hapus"
        variant="danger"
        isLoading={loading}
      />

      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
        onClose={() => setShowSuccess(false)}
      />
    </div>
  );
};

export default RKAPPage;
