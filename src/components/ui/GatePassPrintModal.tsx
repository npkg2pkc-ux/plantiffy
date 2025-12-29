import { useRef } from "react";
import { X, Printer, FileText } from "lucide-react";
import type { GatePass } from "@/types";

interface GatePassPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: GatePass;
  plant: string;
}

const GatePassPrintModal = ({
  isOpen,
  onClose,
  data,
  plant,
}: GatePassPrintModalProps) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const formatCurrentDate = () => {
    const months = [
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
    const now = new Date();
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
  };

  const formatGatePassDate = (dateString: string) => {
    const months = [
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
    const date = new Date(dateString);
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Gate Pass - ${data.nomorGatePass}</title>
        <style>
          @page {
            size: A4;
            margin: 5mm;
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 8pt;
            line-height: 1.2;
            color: #1a1a2e;
            background: #fff;
          }
          .page-wrapper {
            width: 100%;
            height: 287mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .print-container {
            width: 100%;
            max-width: 190mm;
            margin: 0 auto;
            padding: 5px 8px;
            height: 140mm;
            overflow: hidden;
          }
          .divider-line {
            width: 100%;
            border-top: 1px dashed #94a3b8;
            margin: 2mm 0;
            position: relative;
          }
          .divider-line::before {
            content: '✂ potong di sini';
            position: absolute;
            top: -8px;
            left: 50%;
            transform: translateX(-50%);
            background: white;
            padding: 0 10px;
            font-size: 7pt;
            color: #94a3b8;
          }
          
          /* Header Styles */
          .header {
            text-align: center;
            margin-bottom: 6px;
            padding-bottom: 5px;
            border-bottom: 1.5px solid #1e40af;
            position: relative;
          }
          .header::after {
            content: '';
            position: absolute;
            bottom: -1.5px;
            left: 50%;
            transform: translateX(-50%);
            width: 60px;
            height: 1.5px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
          }
          .header h1 {
            font-size: 13pt;
            font-weight: 800;
            color: #1e40af;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 2px;
          }
          .header .subtitle {
            font-size: 7pt;
            color: #64748b;
            font-weight: 500;
          }
          .header .plant-badge {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 2px 10px;
            border-radius: 12px;
            font-size: 7pt;
            font-weight: 600;
            margin-top: 3px;
            box-shadow: 0 1px 3px rgba(59, 130, 246, 0.3);
          }
          
          /* Gate Pass Number */
          .gatepass-number {
            text-align: center;
            margin: 6px 0;
            padding: 5px;
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            border: 1.5px solid #f59e0b;
            border-radius: 6px;
          }
          .gatepass-number label {
            font-size: 6pt;
            color: #92400e;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: block;
            margin-bottom: 1px;
          }
          .gatepass-number .number {
            font-size: 11pt;
            font-weight: 800;
            color: #92400e;
            font-family: 'Consolas', monospace;
            letter-spacing: 2px;
          }
          
          /* Info Grid */
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4px;
            margin-bottom: 6px;
          }
          .info-item {
            padding: 4px 6px;
            background: #f8fafc;
            border-radius: 4px;
            border-left: 2px solid #3b82f6;
          }
          .info-item.full-width {
            grid-column: span 2;
          }
          .info-item label {
            font-size: 6pt;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: block;
            margin-bottom: 1px;
            font-weight: 600;
          }
          .info-item .value {
            font-size: 8pt;
            color: #1e293b;
            font-weight: 500;
          }
          
          /* Description Section */
          .description-section {
            margin: 6px 0;
            padding: 6px 8px;
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            border-radius: 5px;
            border: 1px solid #7dd3fc;
          }
          .description-section h3 {
            font-size: 7pt;
            color: #0369a1;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 3px;
            padding-bottom: 2px;
            border-bottom: 1px solid #7dd3fc;
          }
          .description-section p {
            font-size: 8pt;
            color: #1e293b;
            white-space: pre-wrap;
            line-height: 1.3;
          }
          
          /* Reason Section */
          .reason-section {
            margin: 6px 0;
            padding: 6px 8px;
            background: linear-gradient(135deg, #fef3c7, #fef9c3);
            border-radius: 5px;
            border: 1px solid #fcd34d;
          }
          .reason-section h3 {
            font-size: 7pt;
            color: #a16207;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 3px;
            padding-bottom: 2px;
            border-bottom: 1px solid #fcd34d;
          }
          .reason-section p {
            font-size: 8pt;
            color: #1e293b;
            white-space: pre-wrap;
            line-height: 1.3;
          }
          
          /* Footer & Signatures */
          .footer {
            margin-top: 8px;
          }
          .print-date {
            text-align: right;
            font-size: 7pt;
            color: #64748b;
            font-style: italic;
            margin-bottom: 6px;
          }
          
          .signatures-container {
            display: flex;
            justify-content: space-between;
            margin-top: 6px;
            padding: 0 10px;
          }
          
          .signature-box {
            text-align: center;
            min-width: 120px;
            padding: 5px;
            background: #fafafa;
            border-radius: 5px;
            border: 1px dashed #cbd5e1;
          }
          
          .signature-label {
            font-size: 7pt;
            color: #64748b;
            margin-bottom: 2px;
            font-weight: 500;
          }
          
          .signature-jabatan {
            font-size: 7pt;
            font-weight: 600;
            color: #1e40af;
            margin-bottom: 20px;
            min-height: 10px;
          }
          
          .signature-space {
            height: 25px;
            margin-bottom: 3px;
          }
          
          .signature-line {
            width: 100px;
            height: 1px;
            background: #1e293b;
            margin: 0 auto 3px auto;
          }
          
          .signature-name {
            font-size: 8pt;
            font-weight: 700;
            color: #1a1a2e;
            margin-bottom: 1px;
            min-height: 10px;
          }
          
          .signature-badge {
            font-size: 6pt;
            color: #475569;
            font-weight: 500;
            min-height: 8px;
          }
          
          /* Stamp/Seal Style (Optional visual) */
          .official-stamp {
            text-align: center;
            margin-top: 5px;
            padding-top: 4px;
            border-top: 1px dashed #e2e8f0;
          }
          .official-stamp p {
            font-size: 6pt;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
          }

          /* Copy Label */
          .copy-label {
            position: absolute;
            top: 3px;
            right: 5px;
            font-size: 6pt;
            color: #64748b;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            background: #e2e8f0;
            padding: 2px 6px;
            border-radius: 3px;
          }
          .print-container {
            position: relative;
          }
          
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="page-wrapper">
          <div class="print-container">
            <div class="copy-label">Lembar 1 - Arsip</div>
            ${printContent.innerHTML
              .replace('<div class="print-container">', "")
              .replace(/<\/div>\s*$/, "")}
          </div>
          <div class="divider-line"></div>
          <div class="print-container">
            <div class="copy-label">Lembar 2 - Pembawa</div>
            ${printContent.innerHTML
              .replace('<div class="print-container">', "")
              .replace(/<\/div>\s*$/, "")}
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
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Cetak Gate Pass</h2>
              <p className="text-blue-100 text-sm">{data.nomorGatePass}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Settings Form */}
        <div className="p-5 border-b bg-gradient-to-b from-blue-50 to-white flex items-center justify-end">
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg shadow-blue-500/30 transition-all"
          >
            <Printer className="h-5 w-5" />
            Cetak Gate Pass
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-5 bg-gray-100">
          <div
            ref={printRef}
            className="bg-white p-10 shadow-xl mx-auto rounded-lg"
            style={{ maxWidth: "210mm", minHeight: "297mm" }}
          >
            <div className="print-container">
              {/* Header */}
              <div className="header">
                <h1>GATE PASS</h1>
                <div className="subtitle">Surat Izin Keluar Barang</div>
                <div className="plant-badge">
                  PT. PUPUK KUJANG CIKAMPEK - {plant}
                </div>
              </div>

              {/* Gate Pass Number */}
              <div className="gatepass-number">
                <label>Nomor Gate Pass</label>
                <div className="number">{data.nomorGatePass}</div>
              </div>

              {/* Info Grid */}
              <div className="info-grid">
                <div className="info-item">
                  <label>Tanggal</label>
                  <div className="value">
                    {formatGatePassDate(data.tanggal)}
                  </div>
                </div>
                <div className="info-item">
                  <label>No Polisi</label>
                  <div className="value">{data.noPolisi || "-"}</div>
                </div>
                <div className="info-item">
                  <label>Pemilik Barang</label>
                  <div className="value">{data.pemilikBarang || "-"}</div>
                </div>
                <div className="info-item">
                  <label>Nama Pembawa</label>
                  <div className="value">{data.namaPembawa || "-"}</div>
                </div>
              </div>

              {/* Description Section */}
              <div className="description-section">
                <h3>Deskripsi Barang</h3>
                <p>{data.deskripsiBarang || "-"}</p>
              </div>

              {/* Alasan Keluar */}
              <div className="reason-section">
                <h3>Alasan Mengeluarkan</h3>
                <p>{data.alasanKeluar || "-"}</p>
              </div>

              {/* Footer */}
              <div className="footer">
                <div className="print-date">
                  Cikampek, {formatCurrentDate()}
                </div>

                <div className="signatures-container">
                  <div className="signature-box">
                    <div className="signature-label">Pembawa,</div>
                    <div className="signature-space"></div>
                    <div className="signature-line"></div>
                    <div className="signature-name">
                      {data.namaPembawa || "\u00A0"}
                    </div>
                  </div>

                  <div className="signature-box">
                    <div className="signature-label">Mengetahui,</div>
                    <div className="signature-space"></div>
                    <div className="signature-line"></div>
                    <div className="signature-name">
                      {data.mengetahui || "\u00A0"}
                    </div>
                  </div>
                </div>

                {/* Official Stamp */}
                <div className="official-stamp">
                  <p>Dokumen ini tidak sah tanpa tanda tangan basah</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GatePassPrintModal;
