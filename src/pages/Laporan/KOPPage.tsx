import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Printer,
  Search,
  Save,
  Gauge,
  Zap,
  Flame,
  Users,
  FileText,
  Calendar,
} from "lucide-react";
import { useSaveShortcut } from "@/hooks";
import {
  Button,
  Card,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  Badge,
  SuccessOverlay,
  ApprovalDialog,
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

// Interfaces
interface ShiftPersonel {
  sectionHead: string;
  operatorPanel: string;
}

interface ParameterValue {
  malam: string;
  pagi: string;
  sore: string;
}

interface KOPEntry {
  id?: string;
  tanggal: string;
  jenisOperasi: string;
  // Personel per shift
  shiftMalam: ShiftPersonel;
  shiftPagi: ShiftPersonel;
  shiftSore: ShiftPersonel;
  // Granulator Parameters
  granulatorFolwSteam: ParameterValue;
  // Dryer Parameters
  dryerFlowGas: ParameterValue;
  dryerTempProdukOut: ParameterValue;
  // Produk NPK Parameters
  produkN: ParameterValue;
  produkP: ParameterValue;
  produkK: ParameterValue;
  produkMoisture: ParameterValue;
  produkKekerasan: ParameterValue;
  produkTimbangan: ParameterValue;
  produkTonase: ParameterValue;
  // Energy Consumption
  steamKgH: string;
  steamM3H: string;
  steamTotal: string;
  gasNm3H: string;
  gasTotal: string;
  // Cost Summary
  totalSteamRp: string;
  totalGasRp: string;
  // Meta
  _plant?: "NPK1" | "NPK2";
}

const emptyShiftPersonel: ShiftPersonel = {
  sectionHead: "",
  operatorPanel: "",
};
const emptyParameterValue: ParameterValue = { malam: "", pagi: "", sore: "" };

const initialFormState: KOPEntry = {
  tanggal: getCurrentDate(),
  jenisOperasi: "NORMAL OPERASI",
  shiftMalam: { ...emptyShiftPersonel },
  shiftPagi: { ...emptyShiftPersonel },
  shiftSore: { ...emptyShiftPersonel },
  granulatorFolwSteam: { ...emptyParameterValue },
  dryerFlowGas: { ...emptyParameterValue },
  dryerTempProdukOut: { ...emptyParameterValue },
  produkN: { ...emptyParameterValue },
  produkP: { ...emptyParameterValue },
  produkK: { ...emptyParameterValue },
  produkMoisture: { ...emptyParameterValue },
  produkKekerasan: { ...emptyParameterValue },
  produkTimbangan: { ...emptyParameterValue },
  produkTonase: { ...emptyParameterValue },
  steamKgH: "",
  steamM3H: "",
  steamTotal: "",
  gasNm3H: "",
  gasTotal: "",
  totalSteamRp: "",
  totalGasRp: "",
};

// Target values for reference
const TARGETS = {
  folwSteam: { min: 0.5, max: 2.5, unit: "M3/H", label: "0.5 - 2.5" },
  flowGas: { min: 200, max: 300, unit: "NM3/H", label: "200 - 300" },
  tempProdukOut: { min: 55, max: 70, unit: "°C", label: "55 - 70" },
  produkN: { min: 13.8, max: 16.2, unit: "%", label: "13.8 - 16.2" },
  produkP: { min: 13.8, max: 16.2, unit: "%", label: "13.8 - 16.2" },
  produkK: { min: 13.8, max: 16.2, unit: "%", label: "13.8 - 16.2" },
  moisture: { min: 0, max: 3, unit: "%", label: "Maks. 3" },
  kekerasan: { min: 1, max: 999, unit: "Kgf", label: "Min. 1" },
  timbangan: { min: 50.0, max: 50.3, unit: "Kg/Karung", label: "50.00 - 50.3" },
  tonase: { min: 110, max: 999, unit: "Ton/Shift", label: "Min 110 Ton/Shift" },
};

interface KOPPageProps {
  plant: "NPK1" | "NPK2";
}

const KOPPage = ({ plant }: KOPPageProps) => {
  const { user } = useAuthStore();
  const [data, setData] = useState<KOPEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [printItem, setPrintItem] = useState<KOPEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<KOPEntry>(initialFormState);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");

  // Approval states
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<"edit" | "delete">(
    "edit"
  );
  const [pendingEditItem, setPendingEditItem] = useState<KOPEntry | null>(null);

  // Permission checks
  const userRole = user?.role || "";
  const userCanAdd = canAdd(userRole);
  const userNeedsApprovalEdit = needsApprovalForEdit(userRole);
  const userNeedsApprovalDelete = needsApprovalForDelete(userRole);
  const userIsViewOnly = isViewOnly(userRole);

  // Alt+S shortcut to save
  const triggerSave = useCallback(() => {
    if (showForm && !loading) {
      const formEl = document.querySelector("form");
      if (formEl) formEl.requestSubmit();
    }
  }, [showForm, loading]);
  useSaveShortcut(triggerSave, showForm);

  const jenisOperasiOptions = [
    { value: "NORMAL OPERASI", label: "NORMAL OPERASI" },
    { value: "ABNORMAL", label: "ABNORMAL" },
    { value: "SHUTDOWN", label: "SHUTDOWN" },
    { value: "START UP", label: "START UP" },
  ];

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { readData, SHEETS, getSheetNameByPlant } = await import(
          "@/services/api"
        );
        const sheetName = getSheetNameByPlant(SHEETS.KOP, plant);
        const result = await readData<KOPEntry>(sheetName);
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
        console.error("Error fetching KOP data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [plant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { createData, updateData, SHEETS, getSheetNameByPlant } =
        await import("@/services/api");
      const sheetName = getSheetNameByPlant(SHEETS.KOP, plant);

      if (editingId) {
        const dataToUpdate = { ...form, id: editingId, _plant: plant };
        const updateResult = await updateData<KOPEntry>(
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
        const createResult = await createData<KOPEntry>(sheetName, newData);
        if (createResult.success && createResult.data) {
          const newItem: KOPEntry = { ...createResult.data, _plant: plant };
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
      console.error("Error saving KOP data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: KOPEntry) => {
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

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      const { deleteData, SHEETS, getSheetNameByPlant } = await import(
        "@/services/api"
      );
      const sheetName = getSheetNameByPlant(SHEETS.KOP, plant);
      const deleteResult = await deleteData(sheetName, deleteId);
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
      console.error("Error deleting KOP data:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menghapus data"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSubmit = async (reason: string) => {
    if (!pendingEditItem || !user) return;
    setLoading(true);
    try {
      const { createData, SHEETS } = await import("@/services/api");
      await createData(SHEETS.APPROVAL_REQUESTS, {
        requestedBy: user.nama || user.namaLengkap,
        requestedByRole: user.role,
        requestedByPlant: user.plant,
        actionType: approvalAction,
        targetSheet: "KOP",
        targetId: pendingEditItem.id,
        targetData: JSON.stringify(pendingEditItem),
        reason: reason,
        status: "pending",
        requestedAt: new Date().toISOString(),
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

  const openAddForm = () => {
    setForm(initialFormState);
    setEditingId(null);
    setShowForm(true);
  };

  const handlePrint = (item: KOPEntry) => {
    setPrintItem(item);
    setShowPrintPreview(true);
  };

  const executePrint = () => {
    if (!printItem) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const totalTonase =
      parseNumber(printItem.produkTonase?.malam || "0") +
      parseNumber(printItem.produkTonase?.pagi || "0") +
      parseNumber(printItem.produkTonase?.sore || "0");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>KOP - ${formatDate(printItem.tanggal)}</title>
        <style>
          @page { size: A4 landscape; margin: 10mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 9pt; color: #000; }
          .container { width: 100%; }
          .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
          .header-left { font-weight: bold; }
          .header-right { text-align: right; }
          .title { font-size: 11pt; font-weight: bold; margin-bottom: 3px; }
          .subtitle { font-size: 9pt; color: #333; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th, td { border: 1px solid #000; padding: 3px 5px; text-align: center; font-size: 8pt; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .section-header { background-color: #e8e8e8; font-weight: bold; text-align: left !important; }
          .param-name { text-align: left !important; }
          .number { text-align: right !important; }
          .highlight-orange { background-color: #FFB84D; }
          .highlight-cyan { background-color: #4DD0E1; }
          .highlight-yellow { background-color: #FFEB3B; }
          .energy-table { margin-top: 10px; }
          .energy-table td { padding: 4px 8px; }
          .summary { margin-top: 15px; }
          .summary-row { display: flex; gap: 20px; margin-bottom: 5px; }
          .footer { margin-top: 20px; text-align: right; font-style: italic; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-left">
              <div class="title">KEY OPERATING PARAMETER (KOP)</div>
              <div class="subtitle">${printItem.jenisOperasi}</div>
              <div class="subtitle">PABRIK NPK GRANULAR ${
                plant === "NPK1" ? "1" : "2"
              }</div>
            </div>
            <div class="header-right">
              <div class="title">${formatDate(printItem.tanggal)}</div>
              <table style="width: auto; margin-left: auto;">
                <tr>
                  <th></th>
                  <th>23:00 - 07:00</th>
                  <th>07:00 - 15:00</th>
                  <th>15:00 - 23:00</th>
                </tr>
                <tr>
                  <td class="param-name"><strong>Section Head</strong></td>
                  <td class="highlight-cyan">${
                    printItem.shiftMalam?.sectionHead || ""
                  }</td>
                  <td class="highlight-cyan">${
                    printItem.shiftPagi?.sectionHead || ""
                  }</td>
                  <td class="highlight-cyan">${
                    printItem.shiftSore?.sectionHead || ""
                  }</td>
                </tr>
                <tr>
                  <td class="param-name"><strong>Operator Panel</strong></td>
                  <td class="highlight-cyan">${
                    printItem.shiftMalam?.operatorPanel || ""
                  }</td>
                  <td class="highlight-cyan">${
                    printItem.shiftPagi?.operatorPanel || ""
                  }</td>
                  <td class="highlight-cyan">${
                    printItem.shiftSore?.operatorPanel || ""
                  }</td>
                </tr>
              </table>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">NO</th>
                <th style="width: 150px;">PARAMETER</th>
                <th style="width: 80px;">INDIKATOR</th>
                <th style="width: 70px;">SATUAN</th>
                <th style="width: 90px;">TARGET</th>
                <th colspan="3">AKTUAL</th>
              </tr>
              <tr>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th></th>
                <th>MALAM</th>
                <th>PAGI</th>
                <th>SORE</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td class="section-header" colspan="7">Granulator</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">1.1. Folw steam</td>
                <td>FI</td>
                <td>M3/H</td>
                <td>${TARGETS.folwSteam.label}</td>
                <td>${printItem.granulatorFolwSteam?.malam || ""} M3/H</td>
                <td>${printItem.granulatorFolwSteam?.pagi || ""} M3/H</td>
                <td>${printItem.granulatorFolwSteam?.sore || ""} M3/H</td>
              </tr>
              <tr>
                <td>2</td>
                <td class="section-header" colspan="7">Dryer</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">2.1. Flow Gas</td>
                <td>FT-202</td>
                <td>NM3/H</td>
                <td>${TARGETS.flowGas.label}</td>
                <td>${printItem.dryerFlowGas?.malam || ""} Nm3/H</td>
                <td>${printItem.dryerFlowGas?.pagi || ""} Nm3/H</td>
                <td>${printItem.dryerFlowGas?.sore || ""} Nm3/H</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">2.2. Temperatur Produk Out</td>
                <td>Temp R-002</td>
                <td>Deg.C</td>
                <td>${TARGETS.tempProdukOut.label}</td>
                <td>${printItem.dryerTempProdukOut?.malam || ""}</td>
                <td>${printItem.dryerTempProdukOut?.pagi || ""}</td>
                <td>${printItem.dryerTempProdukOut?.sore || ""}</td>
              </tr>
              <tr>
                <td>3</td>
                <td class="section-header" colspan="7">Produk NPK (15-10-12)</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.1. N</td>
                <td>Laporan LAB</td>
                <td>%</td>
                <td>${TARGETS.produkN.label}</td>
                <td>${printItem.produkN?.malam || ""}</td>
                <td>${printItem.produkN?.pagi || ""}</td>
                <td>${printItem.produkN?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.2. P</td>
                <td>Laporan LAB</td>
                <td>%</td>
                <td>${TARGETS.produkP.label}</td>
                <td>${printItem.produkP?.malam || ""}</td>
                <td>${printItem.produkP?.pagi || ""}</td>
                <td>${printItem.produkP?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.3. K</td>
                <td>Laporan LAB</td>
                <td>%</td>
                <td>${TARGETS.produkK.label}</td>
                <td>${printItem.produkK?.malam || ""}</td>
                <td>${printItem.produkK?.pagi || ""}</td>
                <td>${printItem.produkK?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.4. Moisture (H2O)</td>
                <td>Laporan LAB</td>
                <td>%</td>
                <td>${TARGETS.moisture.label}</td>
                <td>${printItem.produkMoisture?.malam || ""}</td>
                <td>${printItem.produkMoisture?.pagi || ""}</td>
                <td>${printItem.produkMoisture?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.5. Kekerasan</td>
                <td>Laporan LAB</td>
                <td>Kgf</td>
                <td>${TARGETS.kekerasan.label}</td>
                <td>${printItem.produkKekerasan?.malam || ""}</td>
                <td>${printItem.produkKekerasan?.pagi || ""}</td>
                <td>${printItem.produkKekerasan?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.6. Timbangan</td>
                <td>Laporan Shift</td>
                <td>Kg / Karung</td>
                <td>${TARGETS.timbangan.label}</td>
                <td>${printItem.produkTimbangan?.malam || ""}</td>
                <td>${printItem.produkTimbangan?.pagi || ""}</td>
                <td>${printItem.produkTimbangan?.sore || ""}</td>
              </tr>
              <tr>
                <td></td>
                <td class="param-name">3.7. Tonase</td>
                <td>Laporan Shift</td>
                <td>Tonase / Shift</td>
                <td>${TARGETS.tonase.label}</td>
                <td><strong>${
                  printItem.produkTonase?.malam || ""
                } TON</strong></td>
                <td><strong>${
                  printItem.produkTonase?.pagi || ""
                } TON</strong></td>
                <td><strong>${
                  printItem.produkTonase?.sore || ""
                } TON</strong></td>
              </tr>
            </tbody>
          </table>

          <div class="summary">
            <table style="width: auto;">
              <tr>
                <td style="border: none;"><strong>* Total Steam Dalam Satu Hari</strong></td>
                <td style="border: none;">Rp</td>
                <td style="border: none; text-align: right;"><strong>${formatNumber(
                  parseNumber(printItem.totalSteamRp || "0")
                )}</strong></td>
              </tr>
              <tr>
                <td style="border: none;"><strong>* Total Gas Dalam Satu Hari</strong></td>
                <td style="border: none;">Rp</td>
                <td style="border: none; text-align: right;"><strong>${formatNumber(
                  parseNumber(printItem.totalGasRp || "0")
                )}</strong></td>
              </tr>
              <tr>
                <td style="border: none;"><strong>* Total Tonase</strong></td>
                <td style="border: none;"></td>
                <td style="border: none; text-align: right;"><strong>${formatNumber(
                  totalTonase
                )} TON</strong></td>
              </tr>
            </table>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
    setShowPrintPreview(false);
  };

  // Filtered data
  const filteredData = data.filter((item) => {
    const matchesSearch =
      item.tanggal?.includes(searchTerm) ||
      item.jenisOperasi?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMonth = filterMonth
      ? item.tanggal?.startsWith(filterMonth)
      : true;
    return matchesSearch && matchesMonth;
  });

  // Helper component for parameter input row
  const ParameterInputRow = ({
    label,
    target,
    value,
    onChange,
    indikator,
    satuan,
  }: {
    label: string;
    target: string;
    value: ParameterValue;
    onChange: (val: ParameterValue) => void;
    indikator: string;
    satuan: string;
  }) => (
    <div className="grid grid-cols-7 gap-2 items-center py-2 border-b border-dark-100">
      <div className="col-span-2">
        <span className="text-sm font-medium text-dark-700">{label}</span>
        <p className="text-xs text-dark-400">
          {indikator} | {satuan}
        </p>
      </div>
      <div className="text-center">
        <span className="text-xs text-dark-500 bg-dark-100 px-2 py-1 rounded">
          {target}
        </span>
      </div>
      <div>
        <Input
          type="number"
          step="0.01"
          placeholder="Malam"
          value={value.malam}
          onChange={(e) => onChange({ ...value, malam: e.target.value })}
          className="text-sm"
        />
      </div>
      <div>
        <Input
          type="number"
          step="0.01"
          placeholder="Pagi"
          value={value.pagi}
          onChange={(e) => onChange({ ...value, pagi: e.target.value })}
          className="text-sm"
        />
      </div>
      <div>
        <Input
          type="number"
          step="0.01"
          placeholder="Sore"
          value={value.sore}
          onChange={(e) => onChange({ ...value, sore: e.target.value })}
          className="text-sm"
        />
      </div>
      <div></div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-dark-900">
              Key Operating Parameter (KOP)
            </h1>
            <Badge variant={plant === "NPK1" ? "primary" : "success"}>
              {plant}
            </Badge>
          </div>
          <p className="text-dark-500 mt-1">
            Pabrik NPK Granular {plant === "NPK1" ? "1" : "2"}
          </p>
        </div>
        {!userIsViewOnly && userCanAdd && (
          <Button onClick={openAddForm} className="gap-2">
            <Plus className="h-4 w-4" />
            Tambah KOP
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-400" />
              <Input
                placeholder="Cari berdasarkan tanggal atau jenis operasi..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              placeholder="Filter Bulan"
            />
          </div>
        </div>
      </Card>

      {/* Data Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-50 border-b border-dark-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Tanggal
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Jenis Operasi
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Total Tonase
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Steam (Rp)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-dark-600 uppercase">
                  Gas (Rp)
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-dark-600 uppercase">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-dark-400"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <div className="h-5 w-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-dark-400"
                  >
                    <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    Tidak ada data KOP
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const totalTonase =
                    parseNumber(item.produkTonase?.malam || "0") +
                    parseNumber(item.produkTonase?.pagi || "0") +
                    parseNumber(item.produkTonase?.sore || "0");

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-dark-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-dark-900">
                          {formatDate(item.tanggal)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.jenisOperasi === "NORMAL OPERASI"
                              ? "success"
                              : "warning"
                          }
                        >
                          {item.jenisOperasi}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary-600">
                        {formatNumber(totalTonase)} TON
                      </td>
                      <td className="px-4 py-3 text-dark-700">
                        Rp {formatNumber(parseNumber(item.totalSteamRp || "0"))}
                      </td>
                      <td className="px-4 py-3 text-dark-700">
                        Rp {formatNumber(parseNumber(item.totalGasRp || "0"))}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handlePrint(item)}
                            className="p-2 text-dark-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Print"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          {!userIsViewOnly && (
                            <>
                              <button
                                onClick={() => handleEdit(item)}
                                className="p-2 text-dark-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id!)}
                                className="p-2 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editingId ? "Edit KOP" : "Tambah KOP Baru"}
        size="full"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tanggal"
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              required
            />
            <Select
              label="Jenis Operasi"
              value={form.jenisOperasi}
              onChange={(e) =>
                setForm({ ...form, jenisOperasi: e.target.value })
              }
              options={jenisOperasiOptions}
            />
          </div>

          {/* Personel per Shift */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-dark-900">
                Personel Shift
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Shift Malam */}
              <div className="p-4 bg-dark-50 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Malam (23:00 - 07:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Section Head"
                    value={form.shiftMalam?.sectionHead || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftMalam: {
                          ...form.shiftMalam,
                          sectionHead: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Section Head"
                  />
                  <Input
                    label="Operator Panel"
                    value={form.shiftMalam?.operatorPanel || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftMalam: {
                          ...form.shiftMalam,
                          operatorPanel: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Operator Panel"
                  />
                </div>
              </div>

              {/* Shift Pagi */}
              <div className="p-4 bg-amber-50 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Pagi (07:00 - 15:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Section Head"
                    value={form.shiftPagi?.sectionHead || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftPagi: {
                          ...form.shiftPagi,
                          sectionHead: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Section Head"
                  />
                  <Input
                    label="Operator Panel"
                    value={form.shiftPagi?.operatorPanel || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftPagi: {
                          ...form.shiftPagi,
                          operatorPanel: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Operator Panel"
                  />
                </div>
              </div>

              {/* Shift Sore */}
              <div className="p-4 bg-orange-50 rounded-xl">
                <h4 className="font-medium text-dark-700 mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> Sore (15:00 - 23:00)
                </h4>
                <div className="space-y-3">
                  <Input
                    label="Section Head"
                    value={form.shiftSore?.sectionHead || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftSore: {
                          ...form.shiftSore,
                          sectionHead: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Section Head"
                  />
                  <Input
                    label="Operator Panel"
                    value={form.shiftSore?.operatorPanel || ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        shiftSore: {
                          ...form.shiftSore,
                          operatorPanel: e.target.value,
                        },
                      })
                    }
                    placeholder="Nama Operator Panel"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Parameter Operasi */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Gauge className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-dark-900">
                Parameter Operasi
              </h3>
            </div>

            {/* Header */}
            <div className="grid grid-cols-7 gap-2 py-2 bg-dark-100 rounded-lg mb-2 px-2">
              <div className="col-span-2 text-xs font-semibold text-dark-600">
                PARAMETER
              </div>
              <div className="text-xs font-semibold text-dark-600 text-center">
                TARGET
              </div>
              <div className="text-xs font-semibold text-dark-600 text-center">
                MALAM
              </div>
              <div className="text-xs font-semibold text-dark-600 text-center">
                PAGI
              </div>
              <div className="text-xs font-semibold text-dark-600 text-center">
                SORE
              </div>
              <div></div>
            </div>

            {/* Granulator Section */}
            <div className="mb-4">
              <div className="bg-primary-50 text-primary-700 font-semibold px-3 py-2 rounded-lg mb-2">
                1. Granulator
              </div>
              <ParameterInputRow
                label="1.1. Folw Steam"
                indikator="FI"
                satuan="M3/H"
                target={TARGETS.folwSteam.label}
                value={form.granulatorFolwSteam || emptyParameterValue}
                onChange={(val) =>
                  setForm({ ...form, granulatorFolwSteam: val })
                }
              />
            </div>

            {/* Dryer Section */}
            <div className="mb-4">
              <div className="bg-secondary-50 text-secondary-700 font-semibold px-3 py-2 rounded-lg mb-2">
                2. Dryer
              </div>
              <ParameterInputRow
                label="2.1. Flow Gas"
                indikator="FT-202"
                satuan="NM3/H"
                target={TARGETS.flowGas.label}
                value={form.dryerFlowGas || emptyParameterValue}
                onChange={(val) => setForm({ ...form, dryerFlowGas: val })}
              />
              <ParameterInputRow
                label="2.2. Temperatur Produk Out"
                indikator="Temp R-002"
                satuan="Deg.C"
                target={TARGETS.tempProdukOut.label}
                value={form.dryerTempProdukOut || emptyParameterValue}
                onChange={(val) =>
                  setForm({ ...form, dryerTempProdukOut: val })
                }
              />
            </div>

            {/* Produk NPK Section */}
            <div className="mb-4">
              <div className="bg-amber-50 text-amber-700 font-semibold px-3 py-2 rounded-lg mb-2">
                3. Produk NPK (15-10-12)
              </div>
              <ParameterInputRow
                label="3.1. N"
                indikator="Laporan LAB"
                satuan="%"
                target={TARGETS.produkN.label}
                value={form.produkN || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkN: val })}
              />
              <ParameterInputRow
                label="3.2. P"
                indikator="Laporan LAB"
                satuan="%"
                target={TARGETS.produkP.label}
                value={form.produkP || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkP: val })}
              />
              <ParameterInputRow
                label="3.3. K"
                indikator="Laporan LAB"
                satuan="%"
                target={TARGETS.produkK.label}
                value={form.produkK || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkK: val })}
              />
              <ParameterInputRow
                label="3.4. Moisture (H2O)"
                indikator="Laporan LAB"
                satuan="%"
                target={TARGETS.moisture.label}
                value={form.produkMoisture || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkMoisture: val })}
              />
              <ParameterInputRow
                label="3.5. Kekerasan"
                indikator="Laporan LAB"
                satuan="Kgf"
                target={TARGETS.kekerasan.label}
                value={form.produkKekerasan || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkKekerasan: val })}
              />
              <ParameterInputRow
                label="3.6. Timbangan"
                indikator="Laporan Shift"
                satuan="Kg/Karung"
                target={TARGETS.timbangan.label}
                value={form.produkTimbangan || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkTimbangan: val })}
              />
              <ParameterInputRow
                label="3.7. Tonase"
                indikator="Laporan Shift"
                satuan="Ton/Shift"
                target={TARGETS.tonase.label}
                value={form.produkTonase || emptyParameterValue}
                onChange={(val) => setForm({ ...form, produkTonase: val })}
              />
            </div>
          </Card>

          {/* Energy Consumption */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-dark-900">
                Perhitungan Konsumsi Energy
              </h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Input
                label="Steam (Kg/H)"
                type="number"
                step="0.01"
                value={form.steamKgH}
                onChange={(e) => setForm({ ...form, steamKgH: e.target.value })}
              />
              <Input
                label="Steam (M3/H)"
                type="number"
                step="0.01"
                value={form.steamM3H}
                onChange={(e) => setForm({ ...form, steamM3H: e.target.value })}
              />
              <Input
                label="Gas (Nm3/H)"
                type="number"
                step="0.01"
                value={form.gasNm3H}
                onChange={(e) => setForm({ ...form, gasNm3H: e.target.value })}
              />
              <Input
                label="Total Steam"
                value={form.steamTotal}
                onChange={(e) =>
                  setForm({ ...form, steamTotal: e.target.value })
                }
              />
            </div>
          </Card>

          {/* Cost Summary */}
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="h-5 w-5 text-primary-600" />
              <h3 className="text-lg font-semibold text-dark-900">
                Total Biaya Harian
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Total Steam Dalam Satu Hari (Rp)"
                type="number"
                step="0.01"
                value={form.totalSteamRp}
                onChange={(e) =>
                  setForm({ ...form, totalSteamRp: e.target.value })
                }
                placeholder="Contoh: 3946017.66"
              />
              <Input
                label="Total Gas Dalam Satu Hari (Rp)"
                type="number"
                step="0.01"
                value={form.totalGasRp}
                onChange={(e) =>
                  setForm({ ...form, totalGasRp: e.target.value })
                }
                placeholder="Contoh: 21302.19"
              />
            </div>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-dark-100">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowForm(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              <Save className="h-4 w-4" />
              {loading ? "Menyimpan..." : editingId ? "Perbarui" : "Simpan"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Print Preview Modal */}
      <Modal
        isOpen={showPrintPreview}
        onClose={() => setShowPrintPreview(false)}
        title="Preview Print KOP"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-dark-600">
            Anda akan mencetak KOP untuk tanggal{" "}
            <strong>{printItem && formatDate(printItem.tanggal)}</strong>
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowPrintPreview(false)}
            >
              Batal
            </Button>
            <Button onClick={executePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Cetak Sekarang
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Hapus Data KOP"
        message="Apakah Anda yakin ingin menghapus data KOP ini? Tindakan ini tidak dapat dibatalkan."
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
        itemName="data KOP"
        loading={loading}
      />

      {/* Success Overlay */}
      <SuccessOverlay
        isVisible={showSuccess}
        message="Data berhasil disimpan!"
      />
    </div>
  );
};

export default KOPPage;
