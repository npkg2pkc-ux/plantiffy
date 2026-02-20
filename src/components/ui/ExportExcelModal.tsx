import { useState } from "react";
import { Download, FileSpreadsheet, Package, Calendar, CheckSquare, Square } from "lucide-react";
import { Modal } from "./Modal";
import { Button } from "./Button";
import { Input } from "./Input";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

interface BahanBakuNPKEntry {
  berat: number;
  unit: string;
}

interface BahanBakuNPKData {
  id?: string;
  tanggal: string;
  bahanBaku: string;
  entries: BahanBakuNPKEntry[] | string;
  totalBerat: number;
  _plant?: string;
}

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: BahanBakuNPKData[];
  plantName: string;
  bahanBakuOptions: { value: string; label: string }[];
}

export function ExportExcelModal({
  isOpen,
  onClose,
  data,
  plantName,
  bahanBakuOptions,
}: ExportExcelModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split("T")[0];

  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [selectedBahanBaku, setSelectedBahanBaku] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(true);
  const [exporting, setExporting] = useState(false);

  const toggleBahanBaku = (value: string) => {
    setSelectAll(false);
    setSelectedBahanBaku((prev) =>
      prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectAll(false);
      setSelectedBahanBaku([]);
    } else {
      setSelectAll(true);
      setSelectedBahanBaku([]);
    }
  };

  const parseEntries = (entries: BahanBakuNPKEntry[] | string): BahanBakuNPKEntry[] => {
    if (typeof entries === "string") {
      try {
        return JSON.parse(entries);
      } catch {
        return [];
      }
    }
    return entries || [];
  };

  const formatEntries = (entries: BahanBakuNPKEntry[]): string => {
    return entries
      .map((e) => `${e.berat} ${e.unit}`)
      .join(", ");
  };

  const getFilteredData = () => {
    return data.filter((item) => {
      const itemDate = new Date(item.tanggal);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      // Reset time for comparison
      itemDate.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      const matchesDate = itemDate >= start && itemDate <= end;
      const matchesBahanBaku = selectAll || selectedBahanBaku.includes(item.bahanBaku);

      return matchesDate && matchesBahanBaku;
    });
  };

  const filteredCount = getFilteredData().length;

  const handleExport = () => {
    setExporting(true);

    try {
      const filtered = getFilteredData();

      if (filtered.length === 0) {
        alert("Tidak ada data untuk diekspor dengan filter yang dipilih.");
        setExporting(false);
        return;
      }

      // Sort by date ascending
      const sorted = [...filtered].sort(
        (a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime()
      );

      // Prepare rows for Excel
      const rows = sorted.map((item, index) => {
        const entries = parseEntries(item.entries);
        return {
          No: index + 1,
          Tanggal: formatDateForExcel(item.tanggal),
          "Bahan Baku": item.bahanBaku,
          "Detail Berat & Unit": formatEntries(entries),
          "Total Berat": item.totalBerat || 0,
        };
      });

      // Calculate summary per bahan baku
      const summary: Record<string, number> = {};
      sorted.forEach((item) => {
        const key = item.bahanBaku || "Unknown";
        summary[key] = (summary[key] || 0) + (item.totalBerat || 0);
      });

      // Create workbook
      const wb = XLSX.utils.book_new();

      // --- Sheet 1: Data detail ---
      const wsData: (string | number)[][] = [];

      // Title rows
      wsData.push([`Data Penerimaan Bahan Baku - ${plantName}`]);
      wsData.push([
        `Periode: ${formatDateForExcel(startDate)} s/d ${formatDateForExcel(endDate)}`,
      ]);
      wsData.push([
        `Filter: ${selectAll ? "Semua Bahan Baku" : selectedBahanBaku.join(", ")}`,
      ]);
      wsData.push([]); // Empty row

      // Header
      wsData.push(["No", "Tanggal", "Bahan Baku", "Detail Berat & Unit", "Total Berat"]);

      // Data rows
      rows.forEach((row) => {
        wsData.push([
          row.No,
          row.Tanggal,
          row["Bahan Baku"],
          row["Detail Berat & Unit"],
          row["Total Berat"],
        ]);
      });

      // Empty row before summary
      wsData.push([]);
      wsData.push(["", "", "", "Grand Total", sorted.reduce((sum, item) => sum + (item.totalBerat || 0), 0)]);

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Set column widths
      ws["!cols"] = [
        { wch: 5 },   // No
        { wch: 15 },  // Tanggal
        { wch: 18 },  // Bahan Baku
        { wch: 35 },  // Detail Berat & Unit
        { wch: 15 },  // Total Berat
      ];

      // Merge title cells
      ws["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }, // Title
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } }, // Period
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } }, // Filter
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Data Bahan Baku");

      // --- Sheet 2: Rekap per Bahan Baku ---
      const wsRekap: (string | number)[][] = [];
      wsRekap.push([`Rekap Penerimaan Bahan Baku - ${plantName}`]);
      wsRekap.push([
        `Periode: ${formatDateForExcel(startDate)} s/d ${formatDateForExcel(endDate)}`,
      ]);
      wsRekap.push([]);
      wsRekap.push(["No", "Bahan Baku", "Jumlah Penerimaan", "Total Berat"]);

      let rekapNo = 1;
      let grandTotal = 0;
      Object.entries(summary)
        .sort(([a], [b]) => a.localeCompare(b))
        .forEach(([bahan, total]) => {
          const count = sorted.filter((item) => item.bahanBaku === bahan).length;
          wsRekap.push([rekapNo++, bahan, count, total]);
          grandTotal += total;
        });

      wsRekap.push([]);
      wsRekap.push(["", "Total", sorted.length, grandTotal]);

      const wsRekapSheet = XLSX.utils.aoa_to_sheet(wsRekap);
      wsRekapSheet["!cols"] = [
        { wch: 5 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
      ];
      wsRekapSheet["!merges"] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
      ];

      XLSX.utils.book_append_sheet(wb, wsRekapSheet, "Rekap Bahan Baku");

      // Generate filename 
      const dateStr = `${startDate.replace(/-/g, "")}_${endDate.replace(/-/g, "")}`;
      const bahanStr = selectAll
        ? "Semua"
        : selectedBahanBaku.length <= 2
        ? selectedBahanBaku.join("_")
        : `${selectedBahanBaku.length}_BahanBaku`;
      const filename = `BahanBaku_${plantName}_${bahanStr}_${dateStr}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      // Close modal after export
      onClose();
    } catch (error) {
      console.error("Export error:", error);
      alert("Gagal mengekspor data. Silakan coba lagi.");
    } finally {
      setExporting(false);
    }
  };

  const formatDateForExcel = (dateStr: string): string => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
    >
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center pb-4 border-b border-border">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/40 mb-3">
            <FileSpreadsheet className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Export ke Excel</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Data Penerimaan Bahan Baku - {plantName}
          </p>
        </div>

        {/* Date Range */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Calendar className="h-4 w-4 text-primary-500" />
            Rentang Tanggal
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Dari Tanggal"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <Input
              label="Sampai Tanggal"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>

        {/* Bahan Baku Selection */}
        <div className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Package className="h-4 w-4 text-primary-500" />
            Pilih Bahan Baku
          </label>

          {/* Select All */}
          <button
            type="button"
            onClick={handleSelectAll}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-150",
              selectAll
                ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700"
                : "border-border bg-card hover:border-primary-300 dark:hover:border-primary-700"
            )}
          >
            {selectAll ? (
              <CheckSquare className="h-5 w-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
            ) : (
              <Square className="h-5 w-5 text-muted-foreground flex-shrink-0" />
            )}
            <span className={cn(
              "text-sm font-medium",
              selectAll ? "text-primary-700 dark:text-primary-300" : "text-foreground"
            )}>
              Semua Bahan Baku
            </span>
          </button>

          {/* Individual Bahan Baku */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {bahanBakuOptions.map((option) => {
              const isSelected = !selectAll && selectedBahanBaku.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleBahanBaku(option.value)}
                  disabled={selectAll}
                  className={cn(
                    "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all duration-150",
                    selectAll
                      ? "border-primary-200 bg-primary-50/50 dark:bg-primary-900/10 dark:border-primary-800 opacity-60"
                      : isSelected
                      ? "border-primary-400 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700"
                      : "border-border bg-card hover:border-primary-300 dark:hover:border-primary-700"
                  )}
                >
                  {selectAll || isSelected ? (
                    <CheckSquare className="h-4 w-4 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={cn(
                    "text-xs font-medium truncate",
                    selectAll || isSelected ? "text-primary-700 dark:text-primary-300" : "text-foreground"
                  )}>
                    {option.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Preview count */}
        <div className="flex items-center justify-between p-3 bg-dark-50 dark:bg-dark-800 rounded-lg border border-border">
          <span className="text-sm text-muted-foreground">Data yang akan diekspor:</span>
          <span className={cn(
            "text-sm font-bold",
            filteredCount > 0 ? "text-green-600 dark:text-green-400" : "text-red-500"
          )}>
            {filteredCount} data
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Batal
          </Button>
          <Button
            onClick={handleExport}
            disabled={filteredCount === 0 || (!selectAll && selectedBahanBaku.length === 0)}
            isLoading={exporting}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Excel ({filteredCount})
          </Button>
        </div>
      </div>
    </Modal>
  );
}
