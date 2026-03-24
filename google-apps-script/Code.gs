/**
 * ===========================================
 * NPK WEBAPP - GOOGLE APPS SCRIPT BACKEND
 * ===========================================
 *
 * CARA SETUP:
 * 1. Buka Google Sheets baru
 * 2. Buka Extensions > Apps Script
 * 3. Copy semua code ini ke editor
 * 4. PENTING: Klik "Project Settings" (gear icon)
 * 5. Centang "Show appsscript.json manifest file in editor"
 * 6. Buka file appsscript.json dan ganti dengan:
 *    {
 *      "timeZone": "Asia/Jakarta",
 *      "dependencies": {},
 *      "exceptionLogging": "STACKDRIVER",
 *      "runtimeVersion": "V8",
 *      "oauthScopes": [
 *        "https://www.googleapis.com/auth/spreadsheets",
 *        "https://www.googleapis.com/auth/drive",
 *        "https://www.googleapis.com/auth/script.external_request"
 *      ]
 *    }
 * 7. Jalankan fungsi "authorizeScript" dari menu untuk meminta izin
 * 8. Deploy > New deployment > Web app
 * 9. Execute as: Me, Who has access: Anyone
 * 10. Copy URL deployment dan paste ke VITE_API_URL di .env
 *
 * STRUKTUR SHEETS YANG DIBUTUHKAN:
 * - users
 * - sessions
 * - produksi_npk, produksi_npk_NPK1
 * - produksi_blending, produksi_blending_NPK1
 * - produksi_npk_mini, produksi_npk_mini_NPK1
 * - timesheet_forklift, timesheet_forklift_NPK1
 * - timesheet_loader, timesheet_loader_NPK1
 * - downtime, downtime_NPK1
 * - workrequest, workrequest_NPK1
 * - bahanbaku, bahanbaku_NPK1
 * - vibrasi, vibrasi_NPK1
 * - gatepass, gatepass_NPK1
 * - perta, perta_NPK1
 * - trouble_record, trouble_record_NPK1
 * - dokumentasi_foto, dokumentasi_foto_NPK1
 * - kop, kop_NPK1
 * - rekap_bbm, rekap_bbm_NPK1
 * - pemakaian_bahan_baku, pemakaian_bahan_baku_NPK1
 * - riksa_timb_portabel (NPK2 only - NO NPK1 version)
 * - personil (shared - admin only)
 * - akun
 * - rkap
 * - approval_requests
 * - monthly_notes
 * - notifications
 * - chat_messages
 * - active_users
 */

// ============================================
// AUTHORIZATION - JALANKAN INI PERTAMA KALI
// ============================================

/**
 * Fungsi untuk memicu otorisasi Drive dan Spreadsheet
 * JALANKAN FUNGSI INI PERTAMA KALI dari editor Apps Script!
 * Klik Run > authorizeScript
 */
function authorizeScript() {
  // Trigger Spreadsheet authorization
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("Spreadsheet ID: " + ss.getId());

  // Trigger Drive authorization
  const rootFolder = DriveApp.getRootFolder();
  Logger.log("Drive Root Folder: " + rootFolder.getName());

  // Test create folder
  const testFolder = getOrCreateFolder("Dokumentasi Foto", rootFolder);
  Logger.log("Test Folder Created: " + testFolder.getName());
  Logger.log("Folder URL: " + testFolder.getUrl());

  Logger.log("=== OTORISASI BERHASIL! ===");
  Logger.log("Sekarang Anda bisa deploy ulang web app.");
}

// ============================================
// KONFIGURASI
// ============================================

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const SERVER_READ_CACHE_TTL_SECONDS = 20;

// Sheet headers configuration
const SHEET_HEADERS = {
  users: [
    "id",
    "username",
    "password",
    "nama",
    "namaLengkap",
    "email",
    "role",
    "status",
    "plant",
    "lastLogin",
    "createdAt",
    "updatedAt",
  ],
  dokumentasi_foto: [
    "id",
    "tanggal",
    "judul",
    "keterangan",
    "fileId",
    "fileUrl",
    "folderId",
    "folderUrl",
    "uploadBy",
    "plant",
    "createdAt",
  ],
  sessions: [
    "id",
    "username",
    "deviceId",
    "browser",
    "createdAt",
    "lastActivity",
  ],
  produksi_npk: [
    "id",
    "tanggal",
    "shiftMalamOnspek",
    "shiftMalamOffspek",
    "shiftPagiOnspek",
    "shiftPagiOffspek",
    "shiftSoreOnspek",
    "shiftSoreOffspek",
    "totalOnspek",
    "totalOffspek",
    "total",
  ],
  produksi_blending: ["id", "tanggal", "kategori", "formula", "tonase"],
  produksi_npk_mini: ["id", "tanggal", "formulasi", "tonase"],
  timesheet_forklift: [
    "id",
    "tanggal",
    "forklift",
    "deskripsiTemuan",
    "jamOff",
    "jamStart",
    "jamGrounded",
    "jamOperasi",
    "keterangan",
  ],
  timesheet_loader: [
    "id",
    "tanggal",
    "shift",
    "deskripsiTemuan",
    "jamOff",
    "jamStart",
    "jamGrounded",
    "jamOperasi",
    "keterangan",
  ],
  downtime: [
    "id",
    "tanggal",
    "item",
    "deskripsi",
    "jamOff",
    "jamStart",
    "downtime",
  ],
  workrequest: [
    "id",
    "tanggal",
    "nomorWR",
    "item",
    "area",
    "eksekutor",
    "include",
    "keterangan",
  ],
  bahanbaku: [
    "id",
    "tanggal",
    "namaBarang",
    "namaBarangLainnya",
    "jumlah",
    "satuan",
    "keterangan",
  ],
  bahanbaku_npk: ["id", "tanggal", "bahanBaku", "entries", "totalBerat"],
  vibrasi: [
    "id",
    "tanggal",
    "namaEquipment",
    "posisiPengukuran",
    "pointPengukuran",
    "nilaiVibrasi",
    "status",
    "keterangan",
  ],
  gatepass: [
    "id",
    "tanggal",
    "nomorGatePass",
    "noPolisi",
    "pemilikBarang",
    "namaPembawa",
    "mengetahui",
    "deskripsiBarang",
    "alasanKeluar",
  ],
  perta: [
    "id",
    "tanggal",
    "nomorPerta",
    "shift",
    "jenisBBM",
    "deskripsi",
    "volumeAwal",
    "volumePengisian",
    "volumePemakaian",
    "volumeAkhir",
    "keterangan",
    "status",
  ],
  perbaikan_tahunan: [
    "id",
    "tanggalMulai",
    "tanggalSelesai",
    "jumlahHari",
    "items",
  ],
  trouble_record: [
    "id",
    "nomorBerkas",
    "tanggal",
    "tanggalKejadian",
    "shift",
    "waktuKejadian",
    "kodePeralatan",
    "area",
    "pic",
    "deskripsiMasalah",
    "penyebab",
    "tindakan",
    "targetSelesai",
    "keterangan",
    "status",
    "tanggalSelesai",
    "catatanPenyelesaian",
  ],
  akun: [
    "id",
    "noBadge",
    "nama",
    "jabatan",
    "passwordESS",
    "passwordPismart",
    "passwordDOF",
    "tanggalUpdate",
  ],
  rkap: [
    "id",
    "tahun",
    "plant",
    "januari",
    "februari",
    "maret",
    "april",
    "mei",
    "juni",
    "juli",
    "agustus",
    "september",
    "oktober",
    "november",
    "desember",
    "total",
  ],
  approval_requests: [
    "id",
    "requestBy",
    "requestByName",
    "requestDate",
    "action",
    "sheetType",
    "dataId",
    "dataPreview",
    "reason",
    "status",
    "reviewBy",
    "reviewDate",
    "reviewNotes",
    "requesterPlant",
  ],
  monthly_notes: [
    "id",
    "bulan",
    "tahun",
    "plant",
    "catatan",
    "updatedBy",
    "updatedAt",
  ],
  notifications: [
    "id",
    "message",
    "timestamp",
    "read",
    "fromUser",
    "fromPlant",
    "toUser",
  ],
  chat_messages: ["id", "sender", "role", "message", "timestamp"],
  active_users: [
    "id",
    "username",
    "namaLengkap",
    "role",
    "plant",
    "lastActive",
    "status",
  ],
  rekap_bbm: [
    "id",
    "tanggal",
    "namaAlatBerat",
    "pengajuanSolar",
    "realisasiPengisian",
    "keterangan",
  ],
  pemakaian_bahan_baku: [
    "id",
    "tanggal",
    "shift",
    "urea",
    "dap",
    "kcl",
    "za",
    "clayJumbo",
    "clayBucket",
    "pewarna",
    "coatingOilLigno",
    "dolomite",
    "riject",
    "rekon",
    "ga",
    "tinta",
    "makeupIjp",
    "kaptan",
  ],
  riksa_timb_portabel: [
    "id",
    "tanggal",
    "area",
    "ujiPenambahan10",
    "ujiPenambahan20",
    "ujiPenambahan30",
    "ujiPenambahan40",
    "ujiPenambahan50",
    "ujiPengurangan50",
    "ujiPengurangan40",
    "ujiPengurangan30",
    "ujiPengurangan20",
    "ujiPengurangan10",
    "selisihPenambahan10",
    "selisihPenambahan20",
    "selisihPenambahan30",
    "selisihPenambahan40",
    "selisihPenambahan50",
    "selisihPengurangan50",
    "selisihPengurangan40",
    "selisihPengurangan30",
    "selisihPengurangan20",
    "selisihPengurangan10",
    "totalSelisih",
    "rataRataSelisih",
  ],
  kop: [
    "id",
    "tanggal",
    "jenisOperasi",
    // Personel per shift (JSON)
    "shiftMalam",
    "shiftPagi",
    "shiftSore",
    // Steam input per shift (JSON: {awal, akhir})
    "steamMalam",
    "steamPagi",
    "steamSore",
    // Gas input per shift (JSON: {awal, akhir})
    "gasMalam",
    "gasPagi",
    "gasSore",
    // Kurs Dollar
    "kursDollar",
    // Dryer Parameters (JSON)
    "dryerTempProdukOut",
    // Produk NPK Parameters (JSON)
    "produkN",
    "produkP",
    "produkK",
    "produkMoisture",
    "produkKekerasan",
    "produkTimbangan",
    "produkTonase",
  ],
  // Inventaris Material Consumable
  materials: [
    "id",
    "kode_material",
    "nama_material",
    "satuan",
    "stok",
    "stok_minimum",
    "created_at",
    "updated_at",
  ],
  material_transactions: [
    "id",
    "material_id",
    "tipe_transaksi",
    "jumlah",
    "keterangan",
    "created_at",
  ],
  // Data Personil (admin only)
  personil: [
    "id",
    "noBadge",
    "foto",
    "idCardPhoto",
    "jabatan",
    "nama",
    "tempatTanggalLahir",
    "alamat",
    "noTelepon",
    "mulaiBekerja",
    "status",
  ],
  // Sarana 3R
  sarana_3r: [
    "id",
    "tanggal",
    "judul",
    "catatan",
    "createdBy",
  ],
  // Activity Logs for tracking all changes
  activity_logs: [
    "id",
    "timestamp",
    "action", // "create" | "update" | "delete"
    "sheet_name", // which sheet/module
    "record_id", // ID of affected record
    "record_preview", // Short preview of data for context
    "user_id", // username who did action
    "user_name", // full name of user
    "user_role", // role of user
    "plant", // NPK1 | NPK2 | ALL
    "ip_address", // optional
    "changes", // JSON of old vs new values for updates
  ],
};

// ============================================
// MAIN HANDLERS (GET & POST)
// ============================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    // Handle CORS
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);

    let result;

    // GET request with parameters
    if (e.parameter && e.parameter.action) {
      const action = e.parameter.action;

      switch (action) {
        case "read":
          result = readSheet(e.parameter.sheet);
          break;
        case "readMany":
          result = readSheetsBatch((e.parameter.sheets || "").split(","));
          break;
        case "checkSession":
          result = checkSession(e.parameter.sessionId);
          break;
        case "getExchangeRate":
          result = getExchangeRate();
          break;
        case "getMaterials":
          result = getMaterials();
          break;
        case "getMaterialTransactions":
          result = getMaterialTransactions({
            material_id: e.parameter.material_id,
            start_date: e.parameter.start_date,
            end_date: e.parameter.end_date,
          });
          break;
        default:
          result = { success: false, error: "Unknown action" };
      }
    }
    // POST request with body
    else if (e.postData) {
      const body = JSON.parse(e.postData.contents);
      const action = body.action;

      switch (action) {
        case "create":
          result = createRecord(body.sheet, body.data);
          break;
        case "update":
          result = updateRecord(body.sheet, body.data);
          break;
        case "delete":
          result = deleteRecord(body.sheet, body.data);
          break;
        case "login":
          result = loginUser(body.data);
          break;
        case "createSession":
          result = createSession(body.data);
          break;
        case "deleteSession":
          result = deleteSession(body.data);
          break;
        case "uploadPhoto":
          result = uploadPhotoToGoogleDrive(body.data);
          break;
        case "deletePhoto":
          result = deletePhotoFromGoogleDrive(body.data);
          break;
        // Material Consumable Actions
        case "addMaterial":
          result = addMaterial(body.data);
          break;
        case "updateMaterial":
          result = updateMaterial(body.data);
          break;
        case "deleteMaterial":
          result = deleteMaterial(body.data.id);
          break;
        case "updateStockMasuk":
          result = updateStockMasuk(
            body.data.materialId,
            body.data.jumlah,
            body.data.keterangan
          );
          break;
        case "updateStockKeluar":
          result = updateStockKeluar(
            body.data.materialId,
            body.data.jumlah,
            body.data.keterangan
          );
          break;
        // Material with Logging Actions
        case "addMaterialWithLog":
          result = addMaterialWithLog(body.data, body.userInfo);
          break;
        case "updateMaterialWithLog":
          result = updateMaterialWithLog(body.data, body.userInfo);
          break;
        case "deleteMaterialWithLog":
          result = deleteMaterialWithLog(body.data.id, body.userInfo);
          break;
        case "updateStockMasukWithLog":
          result = updateStockMasukWithLog(
            body.data.materialId,
            body.data.jumlah,
            body.data.keterangan,
            body.userInfo
          );
          break;
        case "updateStockKeluarWithLog":
          result = updateStockKeluarWithLog(
            body.data.materialId,
            body.data.jumlah,
            body.data.keterangan,
            body.userInfo
          );
          break;
        // Activity Log & Notification Actions
        case "createWithLog":
          result = createRecordWithLog(body.sheet, body.data, body.userInfo);
          break;
        case "updateWithLog":
          result = updateRecordWithLog(body.sheet, body.data, body.userInfo);
          break;
        case "deleteWithLog":
          result = deleteRecordWithLog(body.sheet, body.data, body.userInfo);
          break;
        case "getActivityLogs":
          result = getActivityLogs(body.filters);
          break;
        case "sendNotificationToRoles":
          result = sendNotificationToRoles(body.data);
          break;
        default:
          result = { success: false, error: "Unknown action" };
      }
    } else {
      result = { success: false, error: "No action specified" };
    }

    output.setContent(JSON.stringify(result));
    return output;
  } catch (error) {
    const output = ContentService.createTextOutput();
    output.setMimeType(ContentService.MimeType.JSON);
    output.setContent(
      JSON.stringify({ success: false, error: error.toString() })
    );
    return output;
  }
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Read all data from a sheet
 */
function readSheet(sheetName) {
  try {
    if (!sheetName) {
      return { success: false, error: "Sheet name is required" };
    }

    const cacheKey = getSheetReadCacheKey(sheetName);
    const cached = getCachedJson(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const rows = readSheetRowsFast(sheetName);
    setCachedJson(cacheKey, rows, SERVER_READ_CACHE_TTL_SECONDS);

    return { success: true, data: rows };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Read multiple sheets in a single request to reduce Apps Script overhead
 */
function readSheetsBatch(sheetNames) {
  try {
    if (!sheetNames || !sheetNames.length) {
      return { success: false, error: "Sheets parameter is required" };
    }

    const normalizedSheets = sheetNames
      .map(function (name) {
        return String(name || "").trim();
      })
      .filter(function (name) {
        return !!name;
      });

    if (!normalizedSheets.length) {
      return { success: false, error: "No valid sheet names provided" };
    }

    const sortedForCache = normalizedSheets.slice().sort();
    const cacheKey = getReadManyCacheKey(sortedForCache);
    const cached = getCachedJson(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const result = {};
    normalizedSheets.forEach(function (sheetName) {
      result[sheetName] = readSheetRowsFast(sheetName, spreadsheet);
    });

    setCachedJson(cacheKey, result, SERVER_READ_CACHE_TTL_SECONDS);
    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Shared fast sheet reader that only reads used range.
 */
function readSheetRowsFast(sheetName, spreadsheet) {
  const sheet = getOrCreateSheet(sheetName, spreadsheet);
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();

  if (lastCol === 0 || lastRow <= 1) {
    return [];
  }

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  return mapRowsWithHeaderFormatting(headers, rows);
}

/**
 * Convert sheet rows into objects while preserving date/time formatting.
 */
function mapRowsWithHeaderFormatting(headers, rows) {

    // Columns that should be formatted as time (HH:mm)
    const timeColumns = [
      "jamOff",
      "jamStart",
      "jamMulai",
      "jamSelesai",
      "waktuMulai",
      "waktuSelesai",
    ];
    // Columns that should be formatted as date (yyyy-MM-dd)
    const dateColumns = [
      "tanggal",
      "createdAt",
      "updatedAt",
      "lastLogin",
      "lastActivity",
      "tglMasuk",
      "tglKeluar",
    ];

    const result = rows
      .map((row) => {
        const obj = {};
        headers.forEach((header, index) => {
          let value = row[index];

          // Handle Date objects
          if (value instanceof Date) {
            // Check if this is a time column
            if (timeColumns.includes(header)) {
              // Format as time HH:mm
              value = Utilities.formatDate(
                value,
                Session.getScriptTimeZone(),
                "HH:mm"
              );
            } else if (dateColumns.includes(header)) {
              // Format as date yyyy-MM-dd
              value = Utilities.formatDate(
                value,
                Session.getScriptTimeZone(),
                "yyyy-MM-dd"
              );
            } else {
              // For other date columns, check if it has meaningful time
              const hours = value.getHours();
              const minutes = value.getMinutes();
              const year = value.getFullYear();

              // If year is 1899 or 1900, it's likely a time-only value from Excel/Sheets
              if (year === 1899 || year === 1900) {
                value = Utilities.formatDate(
                  value,
                  Session.getScriptTimeZone(),
                  "HH:mm"
                );
              } else if (hours === 0 && minutes === 0) {
                // If time is midnight, probably just a date
                value = Utilities.formatDate(
                  value,
                  Session.getScriptTimeZone(),
                  "yyyy-MM-dd"
                );
              } else {
                // Has both date and time
                value = Utilities.formatDate(
                  value,
                  Session.getScriptTimeZone(),
                  "yyyy-MM-dd HH:mm"
                );
              }
            }
          }
          // Handle numbers that might be time values (0.0 - 1.0 range from Excel)
          else if (typeof value === "number" && timeColumns.includes(header)) {
            if (value > 0 && value < 1) {
              // Convert Excel serial time to HH:mm
              const totalMinutes = Math.round(value * 24 * 60);
              const hours = Math.floor(totalMinutes / 60) % 24;
              const minutes = totalMinutes % 60;
              value =
                String(hours).padStart(2, "0") +
                ":" +
                String(minutes).padStart(2, "0");
            }
          }

          obj[header] = value;
        });
        return obj;
      })
      .filter((row) => row.id); // Filter out empty rows

    return result;
}

/**
 * Create a new record
 */
function createRecord(sheetName, data) {
  try {
    // LOG: What data was received
    Logger.log("createRecord called for sheet: " + sheetName);
    Logger.log("createRecord received data: " + JSON.stringify(data));

    // VALIDATION: Check if data has required fields (not just ID)
    // For bahanbaku_npk, require tanggal and bahanBaku
    if (sheetName.includes("bahanbaku_npk")) {
      if (!data.tanggal || !data.bahanBaku) {
        Logger.log(
          "createRecord REJECTED: Missing required fields (tanggal or bahanBaku)"
        );
        return {
          success: false,
          error: "Data tidak lengkap: tanggal dan bahanBaku wajib diisi",
        };
      }
    }

    const sheet = getOrCreateSheet(sheetName);

    // Get headers from SHEET_HEADERS config for consistent column mapping
    const baseSheetName = sheetName.replace("_NPK1", "");
    const configHeaders = SHEET_HEADERS[baseSheetName];

    let headers;
    if (configHeaders && configHeaders.length > 0) {
      const lastCol = sheet.getLastColumn();
      const lastRow = sheet.getLastRow();

      if (lastCol === 0) {
        // Sheet has no columns - add headers from config
        headers = configHeaders;
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        sheet.setFrozenRows(1);
        SpreadsheetApp.flush();
        Logger.log("createRecord: Added headers to empty sheet " + sheetName);
      } else {
        // Sheet has columns - read actual headers
        const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

        // Only fix headers if there are NO data rows (lastRow <= 1)
        // Avoid rewriting headers when data exists to prevent column misalignment
        if (lastRow <= 1) {
          if (
            currentHeaders.length < configHeaders.length ||
            !configHeaders.every(function (h, i) { return currentHeaders[i] === h; })
          ) {
            headers = configHeaders;
            sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
            sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
            SpreadsheetApp.flush();
            Logger.log("createRecord: Fixed headers in empty sheet " + sheetName + 
              " - was: " + JSON.stringify(currentHeaders.slice(0, configHeaders.length)) + 
              " - now: " + JSON.stringify(headers));
          } else {
            headers = configHeaders;
          }
        } else {
          // Sheet has data rows - use ACTUAL sheet headers to append in correct column order
          headers = currentHeaders;
          Logger.log("createRecord: Using actual sheet headers for " + sheetName + 
            " (has " + (lastRow - 1) + " data rows): " + JSON.stringify(headers));
        }
      }
    } else {
      // No config - get headers from sheet or use defaults
      const lastCol = sheet.getLastColumn();
      if (lastCol === 0) {
        headers = ["id", "createdAt", "updatedAt"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
        sheet.setFrozenRows(1);
      } else {
        headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      }
    }

    // Generate ID if not provided
    if (!data.id) {
      data.id = generateId();
    }

    // Prepare row data based on headers
    const rowData = headers.map(function (header) {
      var value = data[header];
      if (value === undefined || value === null) {
        value = "";
      }
      return value;
    });

    Logger.log(
      "createRecord: Appending row to " +
        sheetName +
        " (" + headers.length + " cols): " +
        JSON.stringify(rowData)
    );

    // Append row
    const nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, 1, rowData.length).setValues([rowData]);

    invalidateSheetReadCaches(sheetName);

    return { success: true, data: data };
  } catch (error) {
    Logger.log("createRecord error for " + sheetName + ": " + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Update an existing record
 */
function updateRecord(sheetName, data) {
  try {
    if (!data.id) {
      return { success: false, error: "ID is required for update" };
    }

    const sheet = getOrCreateSheet(sheetName);
    
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastCol === 0 || lastRow <= 1) {
      return { success: false, error: "Record not found (sheet is empty)" };
    }

    const sheetHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    
    // ALWAYS use actual sheet headers for column mapping to prevent data misalignment
    const idIndex = sheetHeaders.indexOf("id");

    if (idIndex === -1) {
      return { success: false, error: "ID column not found in sheet: " + sheetName };
    }

    // Find row with matching ID - use string comparison to handle type mismatches
    const searchId = String(data.id).trim();
    const rowIndex = findRowIndexById(sheet, idIndex, searchId);

    if (rowIndex === -1) {
      Logger.log("updateRecord: Record not found. Sheet: " + sheetName + ", ID: " + searchId + ", Last row: " + lastRow);
      return { success: false, error: "Record not found (ID: " + searchId + " in " + sheetName + ")" };
    }

    // Get existing row data for preserving values
    const existingRow = sheet.getRange(rowIndex, 1, 1, lastCol).getValues()[0];

    // Map data using ACTUAL SHEET headers to ensure correct column placement
    // This prevents data corruption when config headers differ from sheet column order
    const rowData = sheetHeaders.map((header, colIdx) => {
      if (data.hasOwnProperty(header)) {
        return data[header] === undefined || data[header] === null
          ? ""
          : data[header];
      }
      // Preserve existing value at the same column position
      return existingRow[colIdx] !== undefined ? existingRow[colIdx] : "";
    });

    Logger.log("updateRecord: Updating row " + rowIndex + " in " + sheetName + " with " + sheetHeaders.length + " columns");
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);

    invalidateSheetReadCaches(sheetName);

    return { success: true, data: data };
  } catch (error) {
    Logger.log("updateRecord error for " + sheetName + ": " + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Delete a record
 */
function deleteRecord(sheetName, data) {
  try {
    if (!data.id) {
      return { success: false, error: "ID is required for delete" };
    }

    const sheet = getOrCreateSheet(sheetName);
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastCol === 0 || lastRow <= 1) {
      return { success: false, error: "Record not found (sheet is empty)" };
    }

    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const idIndex = headers.indexOf("id");

    if (idIndex === -1) {
      return { success: false, error: "ID column not found in sheet: " + sheetName };
    }

    // Find row with matching ID - use string comparison to handle type mismatches
    const searchId = String(data.id).trim();
    const rowIndex = findRowIndexById(sheet, idIndex, searchId);

    if (rowIndex === -1) {
      Logger.log("deleteRecord: Record not found. Sheet: " + sheetName + ", ID: " + searchId);
      return { success: false, error: "Record not found (ID: " + searchId + " in " + sheetName + ")" };
    }

    // Delete row
    sheet.deleteRow(rowIndex);

    invalidateSheetReadCaches(sheetName);

    return { success: true, data: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// AUTHENTICATION
// ============================================

/**
 * Login user with username and password
 */
function loginUser(data) {
  try {
    const { username, password } = data;

    if (!username || !password) {
      return { success: false, error: "Username dan password harus diisi" };
    }

    const sheet = getOrCreateSheet("users");
    const allData = sheet.getDataRange().getValues();

    if (allData.length <= 1) {
      return { success: false, error: "User tidak ditemukan" };
    }

    const headers = allData[0];
    const usernameIndex = headers.indexOf("username");
    const passwordIndex = headers.indexOf("password");
    const statusIndex = headers.indexOf("status");

    // Normalize input - trim whitespace and convert to string
    const inputUsername = String(username).trim();
    const inputPassword = String(password).trim();

    // Find user
    for (let i = 1; i < allData.length; i++) {
      // Convert stored values to string for comparison (handles numeric usernames)
      const storedUsername = String(allData[i][usernameIndex]).trim();
      const storedPassword = String(allData[i][passwordIndex]).trim();
      const storedStatus = String(allData[i][statusIndex]).trim().toLowerCase();

      if (storedUsername === inputUsername) {
        // Check password (Note: In production, use hashed passwords!)
        if (storedPassword === inputPassword) {
          // Check if user is active
          if (storedStatus !== "active") {
            return {
              success: false,
              error: "Akun tidak aktif. Hubungi admin.",
            };
          }

          // Build user object
          const user = {};
          headers.forEach((header, index) => {
            if (header !== "password") {
              let value = allData[i][index];
              // Convert date objects to ISO string
              if (value instanceof Date) {
                value = Utilities.formatDate(
                  value,
                  Session.getScriptTimeZone(),
                  "yyyy-MM-dd HH:mm:ss"
                );
              }
              user[header] = value;
            }
          });

          // Update last login
          const lastLoginIndex = headers.indexOf("lastLogin");
          if (lastLoginIndex !== -1) {
            sheet
              .getRange(i + 1, lastLoginIndex + 1)
              .setValue(new Date().toISOString());
          }

          return {
            success: true,
            data: {
              user: user,
              session: { id: generateId() },
            },
          };
        } else {
          return { success: false, error: "Username atau password salah" };
        }
      }
    }

    return { success: false, error: "Username atau password salah" };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Create a new session
 */
function createSession(data) {
  try {
    const sessionId = generateId();
    const sessionData = {
      id: sessionId,
      username: data.username,
      deviceId: data.deviceId,
      browser: data.browser,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    const result = createRecord("sessions", sessionData);

    if (result.success) {
      return { success: true, data: { sessionId: sessionId } };
    }
    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Check if session is valid
 */
function checkSession(sessionId) {
  try {
    if (!sessionId) {
      return { success: true, data: { valid: false } };
    }

    const sheet = getOrCreateSheet("sessions");
    const allData = sheet.getDataRange().getValues();

    if (allData.length <= 1) {
      return { success: true, data: { valid: false } };
    }

    const headers = allData[0];
    const idIndex = headers.indexOf("id");
    const deviceIdIndex = headers.indexOf("deviceId");
    const browserIndex = headers.indexOf("browser");

    // Use string comparison for ID matching
    const searchId = String(sessionId).trim();
    for (let i = 1; i < allData.length; i++) {
      const rowId = String(allData[i][idIndex] || "").trim();
      if (rowId === searchId) {
        // Update last activity
        const lastActivityIndex = headers.indexOf("lastActivity");
        if (lastActivityIndex !== -1) {
          sheet
            .getRange(i + 1, lastActivityIndex + 1)
            .setValue(new Date().toISOString());
        }

        return {
          success: true,
          data: {
            valid: true,
            deviceId: allData[i][deviceIdIndex],
            browser: allData[i][browserIndex],
          },
        };
      }
    }

    return { success: true, data: { valid: false } };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Delete session (logout)
 */
function deleteSession(data) {
  try {
    return deleteRecord("sessions", { id: data.sessionId });
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// PHOTO DOCUMENTATION FUNCTIONS
// ============================================

/**
 * Upload photo to Google Drive
 * Data format:
 * {
 *   judul: "C2-L-001",
 *   keterangan: "Deskripsi foto",
 *   imageBase64: "base64 string",
 *   fileName: "photo.jpg",
 *   uploadBy: "username",
 *   plant: "NPK1"
 * }
 */
function uploadPhotoToGoogleDrive(data) {
  try {
    const { judul, keterangan, imageBase64, fileName, uploadBy, plant } = data;

    if (!judul || !imageBase64 || !uploadBy) {
      return {
        success: false,
        error: "Judul, foto, dan user diperlukan",
      };
    }

    // Get or create main documentation folder
    const mainFolder = getOrCreateFolder(
      "Dokumentasi Foto",
      DriveApp.getRootFolder()
    );

    // Get or create subfolder based on judul
    const subFolder = getOrCreateFolder(judul, mainFolder);

    // Decode base64 image
    const base64Data = imageBase64.split(",")[1] || imageBase64; // Remove data:image/jpeg;base64, prefix if exists
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data),
      "image/jpeg",
      fileName || `photo_${new Date().getTime()}.jpg`
    );

    // Upload file to Google Drive
    const file = subFolder.createFile(blob);

    // Make file accessible via link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Save metadata to sheet
    const photoData = {
      id: generateId(),
      tanggal: Utilities.formatDate(
        new Date(),
        Session.getScriptTimeZone(),
        "yyyy-MM-dd"
      ),
      judul: judul,
      keterangan: keterangan || "",
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      folderId: subFolder.getId(),
      folderUrl: subFolder.getUrl(),
      uploadBy: uploadBy,
      plant: plant || "",
      createdAt: new Date().toISOString(),
    };

    const sheetName =
      plant === "NPK1" ? "dokumentasi_foto_NPK1" : "dokumentasi_foto";
    const result = createRecord(sheetName, photoData);

    if (result.success) {
      return {
        success: true,
        data: {
          ...photoData,
          thumbnailUrl: `https://drive.google.com/thumbnail?id=${file.getId()}&sz=w500`,
        },
      };
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Upload gagal: ${error.toString()}`,
    };
  }
}

/**
 * Delete photo from Google Drive and database
 */
function deletePhotoFromGoogleDrive(data) {
  try {
    const { id, fileId, plant } = data;

    if (!id || !fileId) {
      return {
        success: false,
        error: "ID dan File ID diperlukan",
      };
    }

    // Delete file from Google Drive
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true); // Move to trash instead of permanent delete
    } catch (error) {
      Logger.log(`File not found or already deleted: ${fileId}`);
    }

    // Delete record from sheet
    const sheetName =
      plant === "NPK1" ? "dokumentasi_foto_NPK1" : "dokumentasi_foto";
    const result = deleteRecord(sheetName, { id: id });

    return result;
  } catch (error) {
    return {
      success: false,
      error: `Delete gagal: ${error.toString()}`,
    };
  }
}

/**
 * Get or create folder in Google Drive
 */
function getOrCreateFolder(folderName, parentFolder) {
  const folders = parentFolder.getFoldersByName(folderName);

  if (folders.hasNext()) {
    return folders.next();
  } else {
    return parentFolder.createFolder(folderName);
  }
}

// ============================================
// EXCHANGE RATE FUNCTIONS
// ============================================

/**
 * Get real-time USD to IDR exchange rate
 * Uses multiple free APIs as fallback
 */
function getExchangeRate() {
  try {
    // Try primary API: Exchange Rate API (free tier)
    let rate = getExchangeRateFromAPI1();

    if (!rate) {
      // Fallback to secondary API
      rate = getExchangeRateFromAPI2();
    }

    if (!rate) {
      // Fallback to tertiary API
      rate = getExchangeRateFromAPI3();
    }

    if (rate) {
      return {
        success: true,
        data: {
          rate: rate,
          currency: "IDR",
          base: "USD",
          timestamp: new Date().toISOString(),
          formatted: formatCurrency(rate),
        },
      };
    }

    return {
      success: false,
      error: "Tidak dapat mengambil kurs dollar. Silakan masukkan manual.",
    };
  } catch (error) {
    return {
      success: false,
      error: `Error: ${error.toString()}`,
    };
  }
}

/**
 * Primary API: ExchangeRate-API (free tier - 1500 requests/month)
 */
function getExchangeRateFromAPI1() {
  try {
    const url = "https://api.exchangerate-api.com/v4/latest/USD";
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.rates && data.rates.IDR) {
        return Math.round(data.rates.IDR);
      }
    }
    return null;
  } catch (error) {
    Logger.log("API1 Error: " + error.toString());
    return null;
  }
}

/**
 * Secondary API: Fawaz Ahmed's Currency API (free, no key required)
 */
function getExchangeRateFromAPI2() {
  try {
    const url =
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json";
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.usd && data.usd.idr) {
        return Math.round(data.usd.idr);
      }
    }
    return null;
  } catch (error) {
    Logger.log("API2 Error: " + error.toString());
    return null;
  }
}

/**
 * Tertiary API: Open Exchange Rates alternative
 */
function getExchangeRateFromAPI3() {
  try {
    const url = "https://open.er-api.com/v6/latest/USD";
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.getResponseCode() === 200) {
      const data = JSON.parse(response.getContentText());
      if (data && data.rates && data.rates.IDR) {
        return Math.round(data.rates.IDR);
      }
    }
    return null;
  } catch (error) {
    Logger.log("API3 Error: " + error.toString());
    return null;
  }
}

/**
 * Format currency to Indonesian Rupiah format
 */
function formatCurrency(amount) {
  return "Rp " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Test function for exchange rate
 */
function testExchangeRate() {
  const result = getExchangeRate();
  Logger.log(JSON.stringify(result, null, 2));
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get or create a sheet with proper headers
 * Also validates and fixes headers if sheet already exists
 */
function getOrCreateSheet(sheetName, spreadsheetOverride) {
  const spreadsheet = spreadsheetOverride || SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = spreadsheet.getSheetByName(sheetName);

  // Get expected headers from config
  let baseSheetName = sheetName.replace("_NPK1", "");
  let expectedHeaders = SHEET_HEADERS[baseSheetName];

  if (!sheet) {
    // Create new sheet
    sheet = spreadsheet.insertSheet(sheetName);

    // Use default headers if not in config
    if (!expectedHeaders) {
      expectedHeaders = ["id", "createdAt", "updatedAt"];
    }

    sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
    SpreadsheetApp.flush();
    Logger.log("getOrCreateSheet: Created new sheet " + sheetName + " with headers: " + JSON.stringify(expectedHeaders));
  } else if (expectedHeaders && expectedHeaders.length > 0) {
    // Sheet exists - validate and fix headers if needed
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();

    if (lastCol === 0) {
      // Sheet exists but has no columns - add headers
      sheet
        .getRange(1, 1, 1, expectedHeaders.length)
        .setValues([expectedHeaders]);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      SpreadsheetApp.flush();
      Logger.log("getOrCreateSheet: Added headers to empty sheet " + sheetName);
    } else {
      // Check if current headers match expected
      const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

      // Only fix headers if there are NO data rows (lastRow <= 1)
      // Rewriting headers when data rows exist causes data corruption
      // because column values would no longer align with their headers
      if (lastRow <= 1) {
        if (
          currentHeaders.length < expectedHeaders.length ||
          !expectedHeaders.every((h, i) => currentHeaders[i] === h)
        ) {
          Logger.log("getOrCreateSheet: Fixing headers in empty sheet " + sheetName + 
            " - current: " + JSON.stringify(currentHeaders) + 
            " - expected: " + JSON.stringify(expectedHeaders));
          
          sheet
            .getRange(1, 1, 1, expectedHeaders.length)
            .setValues([expectedHeaders]);
          sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
          
          SpreadsheetApp.flush();
        }
      } else {
        // Sheet has data rows - do NOT rewrite headers to prevent data corruption
        // Just log the mismatch for debugging
        if (
          currentHeaders.length < expectedHeaders.length ||
          !expectedHeaders.every((h, i) => currentHeaders[i] === h)
        ) {
          Logger.log("getOrCreateSheet: WARNING - Header mismatch in " + sheetName + 
            " with " + (lastRow - 1) + " data rows. Skipping header fix to prevent data corruption." +
            " Current: " + JSON.stringify(currentHeaders) + 
            " Expected: " + JSON.stringify(expectedHeaders));
        }
      }
    }
  }

  return sheet;
}

/**
 * Find row index (1-based) by id from ID column only.
 */
function findRowIndexById(sheet, idIndex, searchId) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1 || idIndex < 0) return -1;

  const idRange = sheet.getRange(2, idIndex + 1, lastRow - 1, 1);
  const finder = idRange
    .createTextFinder(searchId)
    .matchEntireCell(true)
    .matchCase(true)
    .findNext();

  if (finder) {
    return finder.getRow();
  }

  // Fallback for mixed value types (number/string with spaces)
  const idValues = idRange.getValues();
  for (let i = 0; i < idValues.length; i++) {
    const rowId = String(idValues[i][0] || "").trim();
    if (rowId === searchId) {
      return i + 2;
    }
  }

  return -1;
}

/**
 * Get a row object by ID using id-column lookup only.
 */
function getRowObjectById(sheet, headers, idValue) {
  if (!headers || !headers.length) {
    return { rowIndex: -1, rowValues: null, rowObject: null };
  }

  const idIndex = headers.indexOf("id");
  if (idIndex === -1) {
    return { rowIndex: -1, rowValues: null, rowObject: null };
  }

  const searchId = String(idValue || "").trim();
  const rowIndex = findRowIndexById(sheet, idIndex, searchId);
  if (rowIndex === -1) {
    return { rowIndex: -1, rowValues: null, rowObject: null };
  }

  const rowValues = sheet
    .getRange(rowIndex, 1, 1, headers.length)
    .getValues()[0];

  const rowObject = {};
  headers.forEach(function (header, idx) {
    rowObject[header] = rowValues[idx];
  });

  return { rowIndex: rowIndex, rowValues: rowValues, rowObject: rowObject };
}

function getSheetReadCacheKey(sheetName) {
  return "read:" + sheetName;
}

function getReadManyCacheKey(sheetNames) {
  return "readMany:" + sheetNames.join("|");
}

function getCachedJson(cacheKey) {
  try {
    const cachedRaw = CacheService.getScriptCache().get(cacheKey);
    if (!cachedRaw) return null;
    return JSON.parse(cachedRaw);
  } catch (error) {
    Logger.log("Cache read error for key " + cacheKey + ": " + error.toString());
    return null;
  }
}

function setCachedJson(cacheKey, value, ttlSeconds) {
  try {
    const payload = JSON.stringify(value);
    // Apps Script cache value limit is around 100KB per key.
    if (payload.length > 95000) {
      return;
    }
    CacheService.getScriptCache().put(cacheKey, payload, ttlSeconds);
  } catch (error) {
    Logger.log("Cache write error for key " + cacheKey + ": " + error.toString());
  }
}

function invalidateSheetReadCaches(sheetName) {
  try {
    const cache = CacheService.getScriptCache();
    const normalizedSheet = String(sheetName || "").trim();
    if (!normalizedSheet) return;

    cache.remove(getSheetReadCacheKey(normalizedSheet));

    const baseSheet = normalizedSheet.replace("_NPK1", "");
    const pairedSheets = [baseSheet, baseSheet + "_NPK1"].sort();
    cache.remove(getReadManyCacheKey(pairedSheets));
  } catch (error) {
    Logger.log("Cache invalidate error for sheet " + sheetName + ": " + error.toString());
  }
}

/**
 * Generate unique ID
 */
function generateId() {
  return Utilities.getUuid();
}

/**
 * Get current timestamp
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

// ============================================
// INITIALIZATION & SETUP
// ============================================

/**
 * Initialize all sheets with headers
 * Run this function once to set up all sheets
 */
function initializeAllSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // List of all sheets needed
  const allSheets = [
    "users",
    "sessions",
    "produksi_npk",
    "produksi_npk_NPK1",
    "produksi_blending",
    "produksi_blending_NPK1",
    "produksi_npk_mini",
    "produksi_npk_mini_NPK1",
    "timesheet_forklift",
    "timesheet_forklift_NPK1",
    "timesheet_loader",
    "timesheet_loader_NPK1",
    "downtime",
    "downtime_NPK1",
    "workrequest",
    "workrequest_NPK1",
    "bahanbaku",
    "bahanbaku_NPK1",
    "bahanbaku_npk",
    "bahanbaku_npk_NPK1",
    "vibrasi",
    "vibrasi_NPK1",
    "gatepass",
    "gatepass_NPK1",
    "perta",
    "perta_NPK1",
    "perbaikan_tahunan",
    "perbaikan_tahunan_NPK1",
    "trouble_record",
    "trouble_record_NPK1",
    "dokumentasi_foto",
    "dokumentasi_foto_NPK1",
    "kop",
    "kop_NPK1",
    "rekap_bbm",
    "rekap_bbm_NPK1",
    "pemakaian_bahan_baku",
    "pemakaian_bahan_baku_NPK1",
    "sarana_3r",
    "akun",
    "rkap",
    "approval_requests",
    "monthly_notes",
    "notifications",
    "chat_messages",
    "active_users",
  ];

  allSheets.forEach((sheetName) => {
    getOrCreateSheet(sheetName);
  });

  Logger.log("All sheets initialized successfully!");
}

/**
 * Create default admin user
 * Run this once after initialization
 */
function createDefaultAdmin() {
  const adminData = {
    id: generateId(),
    username: "admin",
    password: "admin123", // GANTI PASSWORD INI!
    nama: "Administrator",
    namaLengkap: "System Administrator",
    email: "admin@example.com",
    role: "admin",
    status: "active",
    plant: "ALL",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const result = createRecord("users", adminData);

  if (result.success) {
    Logger.log("Default admin created successfully!");
    Logger.log("Username: admin");
    Logger.log("Password: admin123 (GANTI SEGERA!)");
  } else {
    Logger.log("Failed to create admin: " + result.error);
  }
}

/**
 * Create sample RKAP data
 */
function createSampleRKAP() {
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
  const year = new Date().getFullYear();

  months.forEach((bulan, index) => {
    // NPK2 RKAP
    createRecord("rkap", {
      id: generateId(),
      bulan: bulan,
      tahun: year,
      produk: "NPK Granul",
      targetRKAP: 10000 + Math.floor(Math.random() * 5000),
      targetProduksi: 10000 + Math.floor(Math.random() * 5000),
      satuan: "Ton",
      plant: "NPK2",
    });

    // NPK1 RKAP
    createRecord("rkap", {
      id: generateId(),
      bulan: bulan,
      tahun: year,
      produk: "NPK Granul",
      targetRKAP: 8000 + Math.floor(Math.random() * 4000),
      targetProduksi: 8000 + Math.floor(Math.random() * 4000),
      satuan: "Ton",
      plant: "NPK1",
    });
  });

  Logger.log("Sample RKAP data created!");
}

// ============================================
// UTILITY FUNCTIONS FOR TESTING
// ============================================

/**
 * Test read function
 */
function testRead() {
  const result = readSheet("users");
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * Test create function
 */
function testCreate() {
  const result = createRecord("produksi_npk", {
    tanggal: "2024-01-15",
    shiftMalamOnspek: 100,
    shiftMalamOffspek: 5,
    shiftPagiOnspek: 120,
    shiftPagiOffspek: 3,
    shiftSoreOnspek: 110,
    shiftSoreOffspek: 2,
  });
  Logger.log(JSON.stringify(result, null, 2));
}

/**
 * DIAGNOSTIC: Check bahanbaku_npk sheet status
 * Run this to see what's happening with the sheet
 */
function diagnoseBahanBakuNPK() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ["bahanbaku_npk", "bahanbaku_npk_NPK1"];

  sheetNames.forEach((sheetName) => {
    Logger.log("\n=== Diagnosing " + sheetName + " ===");

    const sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      Logger.log("❌ Sheet does NOT exist!");
      return;
    }

    Logger.log("✓ Sheet exists");
    Logger.log("Last row: " + sheet.getLastRow());
    Logger.log("Last column: " + sheet.getLastColumn());

    if (sheet.getLastColumn() > 0) {
      const headers = sheet
        .getRange(1, 1, 1, sheet.getLastColumn())
        .getValues()[0];
      Logger.log("Current headers: " + JSON.stringify(headers));

      const expectedHeaders = SHEET_HEADERS["bahanbaku_npk"];
      Logger.log("Expected headers: " + JSON.stringify(expectedHeaders));

      // Check if headers match
      const headersMatch = expectedHeaders.every((h, i) => headers[i] === h);
      Logger.log("Headers match: " + headersMatch);

      if (sheet.getLastRow() > 1) {
        // Show first few rows of data
        const dataRows = sheet
          .getRange(
            2,
            1,
            Math.min(5, sheet.getLastRow() - 1),
            sheet.getLastColumn()
          )
          .getValues();
        Logger.log("Data rows (first 5):");
        dataRows.forEach((row, idx) => {
          Logger.log("Row " + (idx + 2) + ": " + JSON.stringify(row));
        });
      } else {
        Logger.log("No data rows in sheet");
      }
    } else {
      Logger.log("❌ Sheet has no columns!");
    }

    // Test reading via readSheet
    const readResult = readSheet(sheetName);
    Logger.log(
      "readSheet result: success=" +
        readResult.success +
        ", data count=" +
        (readResult.data ? readResult.data.length : 0)
    );
    if (readResult.data && readResult.data.length > 0) {
      Logger.log("First record: " + JSON.stringify(readResult.data[0]));
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Check Apps Script Logs for diagnostic info",
    "Diagnosis Complete",
    5
  );
}

/**
 * REPAIR: Completely reset bahanbaku_npk sheets with correct headers
 * WARNING: This will clear existing data!
 */
function resetBahanBakuNPKSheets() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ["bahanbaku_npk", "bahanbaku_npk_NPK1"];
  const expectedHeaders = [
    "id",
    "tanggal",
    "bahanBaku",
    "entries",
    "totalBerat",
  ];

  sheetNames.forEach((sheetName) => {
    Logger.log("Resetting " + sheetName);

    let sheet = spreadsheet.getSheetByName(sheetName);

    if (sheet) {
      // Delete and recreate
      spreadsheet.deleteSheet(sheet);
    }

    // Create fresh sheet
    sheet = spreadsheet.insertSheet(sheetName);
    sheet
      .getRange(1, 1, 1, expectedHeaders.length)
      .setValues([expectedHeaders]);
    sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
    sheet.setFrozenRows(1);

    Logger.log(
      "✓ Reset " +
        sheetName +
        " with headers: " +
        JSON.stringify(expectedHeaders)
    );
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "bahanbaku_npk sheets have been reset!",
    "✅ Reset Complete",
    5
  );
}

/**
 * CLEANUP: Remove rows with empty data (only ID exists)
 * This cleans up corrupted/incomplete records
 */
function cleanupEmptyRowsBahanBakuNPK() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ["bahanbaku_npk", "bahanbaku_npk_NPK1"];
  let totalDeleted = 0;

  sheetNames.forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet " + sheetName + " not found");
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log("No data in " + sheetName);
      return;
    }

    // Get all data
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const tanggalIndex = headers.indexOf("tanggal");
    const bahanBakuIndex = headers.indexOf("bahanBaku");

    // Find rows to delete (from bottom to top to avoid index shifting)
    let rowsToDelete = [];
    for (let i = data.length - 1; i >= 1; i--) {
      const row = data[i];
      // If tanggal and bahanBaku are both empty, mark for deletion
      if (!row[tanggalIndex] && !row[bahanBakuIndex]) {
        rowsToDelete.push(i + 1); // +1 for 1-indexed rows
      }
    }

    // Delete rows from bottom to top
    rowsToDelete.forEach((rowNum) => {
      sheet.deleteRow(rowNum);
      totalDeleted++;
    });

    Logger.log(
      "Deleted " + rowsToDelete.length + " empty rows from " + sheetName
    );
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Deleted " + totalDeleted + " empty rows!",
    "✅ Cleanup Complete",
    5
  );

  return totalDeleted;
}

/**
 * Test create bahan baku NPK
 */
function testCreateBahanBakuNPK() {
  const testData = {
    tanggal: "2026-01-12",
    bahanBaku: "Urea",
    entries: JSON.stringify([{ berat: 100, unit: "Ton" }]),
    totalBerat: 100,
  };

  Logger.log("Testing bahanbaku_npk creation...");
  Logger.log("Data to save: " + JSON.stringify(testData, null, 2));

  const result = createRecord("bahanbaku_npk", testData);

  Logger.log("Result: " + JSON.stringify(result, null, 2));

  // Also test reading
  const readResult = readSheet("bahanbaku_npk");
  Logger.log("Data in sheet: " + JSON.stringify(readResult, null, 2));
}

/**
 * Test createRecordWithLog for bahan baku NPK
 */
function testCreateBahanBakuNPKWithLog() {
  const testData = {
    tanggal: "2026-01-12",
    bahanBaku: "DAP",
    entries: JSON.stringify([{ berat: 50, unit: "Ton" }]),
    totalBerat: 50,
  };

  const userInfo = {
    username: "test",
    namaLengkap: "Test User",
    nama: "Test",
    role: "admin",
  };

  Logger.log("Testing bahanbaku_npk creation with log...");
  Logger.log("Data to save: " + JSON.stringify(testData, null, 2));

  const result = createRecordWithLog("bahanbaku_npk", testData, userInfo);

  Logger.log("Result: " + JSON.stringify(result, null, 2));
}

/**
 * Clear all data in a sheet (except headers)
 */
function clearSheetData(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (sheet && sheet.getLastRow() > 1) {
    sheet.deleteRows(2, sheet.getLastRow() - 1);
    Logger.log("Cleared data from " + sheetName);
  }
}

// ============================================
// FILL EMPTY IDs FOR MANUAL INPUT
// ============================================

/**
 * Fill empty IDs in rekap_bbm sheets (both NPK1 and NPK2)
 * Run this function after manually inputting data without IDs
 */
function fillEmptyIdsRekapBBM() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ["rekap_bbm", "rekap_bbm_NPK1"];
  let totalFilled = 0;

  sheetNames.forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet " + sheetName + " not found");
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log("No data in " + sheetName);
      return;
    }

    // Get all data starting from row 2 (skip header)
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 1); // Column A (id)
    const ids = dataRange.getValues();

    let filledCount = 0;
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i][0] || ids[i][0] === "") {
        // Generate new ID and set it
        const newId = generateId();
        sheet.getRange(i + 2, 1).setValue(newId);
        filledCount++;
      }
    }

    Logger.log("Filled " + filledCount + " empty IDs in " + sheetName);
    totalFilled += filledCount;
  });

  Logger.log("=== Total IDs filled: " + totalFilled + " ===");
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Berhasil mengisi " + totalFilled + " ID kosong di rekap_bbm!",
    "✅ Selesai",
    5
  );
}

/**
 * Fill empty IDs in any specified sheet
 * @param {string} sheetName - Name of the sheet to fill IDs
 */
function fillEmptyIdsInSheet(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    Logger.log("Sheet " + sheetName + " not found");
    return 0;
  }

  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log("No data in " + sheetName);
    return 0;
  }

  // Get all data starting from row 2 (skip header)
  const dataRange = sheet.getRange(2, 1, lastRow - 1, 1); // Column A (id)
  const ids = dataRange.getValues();

  let filledCount = 0;
  for (let i = 0; i < ids.length; i++) {
    if (!ids[i][0] || ids[i][0] === "") {
      // Generate new ID and set it
      const newId = generateId();
      sheet.getRange(i + 2, 1).setValue(newId);
      filledCount++;
    }
  }

  Logger.log("Filled " + filledCount + " empty IDs in " + sheetName);
  return filledCount;
}

/**
 * Fill empty IDs in ALL data sheets
 * Useful for bulk manual data entry
 */
function fillEmptyIdsAllSheets() {
  const allDataSheets = [
    "rekap_bbm",
    "rekap_bbm_NPK1",
    "pemakaian_bahan_baku",
    "pemakaian_bahan_baku_NPK1",
    "produksi_npk",
    "produksi_npk_NPK1",
    "produksi_blending",
    "produksi_blending_NPK1",
    "produksi_npk_mini",
    "produksi_npk_mini_NPK1",
    "timesheet_forklift",
    "timesheet_forklift_NPK1",
    "timesheet_loader",
    "timesheet_loader_NPK1",
    "downtime",
    "downtime_NPK1",
    "workrequest",
    "workrequest_NPK1",
    "bahanbaku",
    "bahanbaku_NPK1",
    "bahanbaku_npk",
    "bahanbaku_npk_NPK1",
    "vibrasi",
    "vibrasi_NPK1",
    "gatepass",
    "gatepass_NPK1",
    "perta",
    "perta_NPK1",
    "trouble_record",
    "trouble_record_NPK1",
    "dokumentasi_foto",
    "dokumentasi_foto_NPK1",
    "kop",
    "kop_NPK1",
    "perbaikan_tahunan",
    "perbaikan_tahunan_NPK1",
    "sarana_3r",
  ];

  let totalFilled = 0;
  allDataSheets.forEach((sheetName) => {
    totalFilled += fillEmptyIdsInSheet(sheetName);
  });

  Logger.log("=== Total IDs filled across all sheets: " + totalFilled + " ===");
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Berhasil mengisi " + totalFilled + " ID kosong di semua sheet!",
    "✅ Selesai",
    5
  );
}

// ============================================
// MENU FOR SPREADSHEET
// ============================================

/**
 * Fix headers for all sheets that have SHEET_HEADERS config
 * Useful when new columns are added to existing sheets
 */
function fixAllSheetHeaders() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let fixedCount = 0;
  
  // Process all sheets that have header configs
  Object.keys(SHEET_HEADERS).forEach(function (baseSheet) {
    var sheetsToFix = [baseSheet, baseSheet + "_NPK1"];
    
    sheetsToFix.forEach(function (sheetName) {
      var sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) return;
      
      var expectedHeaders = SHEET_HEADERS[baseSheet];
      var lastCol = sheet.getLastColumn();
      if (lastCol === 0) return;
      
      var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      
      if (
        currentHeaders.length < expectedHeaders.length ||
        !expectedHeaders.every(function (h, i) { return currentHeaders[i] === h; })
      ) {
        sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
        Logger.log("Fixed headers in " + sheetName + 
          " from " + currentHeaders.length + " to " + expectedHeaders.length + " columns");
        fixedCount++;
      }
    });
  });
  
  SpreadsheetApp.flush();
  Logger.log("=== Fixed headers in " + fixedCount + " sheets ===");
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Fixed headers in " + fixedCount + " sheets!",
    "✅ Headers Fixed",
    5
  );
}

/**
 * Add custom menu to spreadsheet
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("🔧 NPK Webapp")
    .addItem("Initialize All Sheets", "initializeAllSheets")
    .addItem("Create Default Admin", "createDefaultAdmin")
    .addItem("Create Sample RKAP", "createSampleRKAP")
    .addSeparator()
    .addItem("🔑 Fill Empty IDs - Rekap BBM", "fillEmptyIdsRekapBBM")
    .addItem("🔑 Fill Empty IDs - All Sheets", "fillEmptyIdsAllSheets")
    .addItem("🔑 Fill Empty IDs - Pemakaian BB", "fillEmptyIdsPemakaianBB")
    .addSeparator()
    .addItem("🚀 Migrasi Pemakaian BB (tambah dolomite, ga, kaptan)", "migratePemakaianBahanBakuHeaders")
    .addSeparator()
    .addItem("🩺 Diagnose Bahan Baku NPK", "diagnoseBahanBakuNPK")
    .addItem(
      "🧹 Cleanup Empty Rows - Bahan Baku NPK",
      "cleanupEmptyRowsBahanBakuNPK"
    )
    .addItem("🔧 Fix Headers - Bahan Baku NPK", "fixBahanBakuNPKHeaders")
    .addItem("🔧 Fix Headers - All Sheets", "fixAllSheetHeaders")
    .addItem("⚠️ RESET Bahan Baku NPK Sheets", "resetBahanBakuNPKSheets")
    .addItem("🧪 Test Create Bahan Baku NPK", "testCreateBahanBakuNPK")
    .addSeparator()
    .addItem("Test Read Users", "testRead")
    .addToUi();
}

/**
 * Fill empty IDs in pemakaian_bahan_baku sheets
 */
function fillEmptyIdsPemakaianBB() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ["pemakaian_bahan_baku", "pemakaian_bahan_baku_NPK1"];
  let totalFilled = 0;

  sheetNames.forEach((sheetName) => {
    const sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet " + sheetName + " not found");
      return;
    }

    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      Logger.log("No data in " + sheetName);
      return;
    }

    // Get all data starting from row 2 (skip header)
    const dataRange = sheet.getRange(2, 1, lastRow - 1, 1); // Column A (id)
    const ids = dataRange.getValues();

    let filledCount = 0;
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i][0] || ids[i][0] === "") {
        // Generate new ID and set it
        const newId = generateId();
        sheet.getRange(i + 2, 1).setValue(newId);
        filledCount++;
      }
    }

    Logger.log("Filled " + filledCount + " empty IDs in " + sheetName);
    totalFilled += filledCount;
  });

  Logger.log("=== Total IDs filled: " + totalFilled + " ===");
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Berhasil mengisi " + totalFilled + " ID kosong di pemakaian_bahan_baku!",
    "✅ Selesai",
    5
  );
}

/**
 * Migration: Add new columns (dolomite, ga) to pemakaian_bahan_baku sheets
 * This safely appends new header columns at the correct positions
 * without disrupting existing data.
 * 
 * Run this ONCE after deploying the new version.
 */
function migratePemakaianBahanBakuHeaders() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheetNames = ["pemakaian_bahan_baku", "pemakaian_bahan_baku_NPK1"];
  var expectedHeaders = SHEET_HEADERS["pemakaian_bahan_baku"];
  
  sheetNames.forEach(function(sheetName) {
    var sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      Logger.log("Sheet " + sheetName + " not found, skipping.");
      return;
    }
    
    var lastCol = sheet.getLastColumn();
    if (lastCol === 0) {
      // Empty sheet - just write all headers
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      Logger.log("Added all headers to empty sheet " + sheetName);
      return;
    }
    
    var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log("Current headers in " + sheetName + ": " + JSON.stringify(currentHeaders));
    
    // Find missing headers that need to be added
    var missingHeaders = [];
    for (var i = 0; i < expectedHeaders.length; i++) {
      if (currentHeaders.indexOf(expectedHeaders[i]) === -1) {
        missingHeaders.push({
          header: expectedHeaders[i],
          expectedIndex: i
        });
      }
    }
    
    if (missingHeaders.length === 0) {
      Logger.log("No missing headers in " + sheetName + " - already up to date!");
      return;
    }
    
    Logger.log("Missing headers in " + sheetName + ": " + JSON.stringify(missingHeaders.map(function(m) { return m.header; })));
    
    var lastRow = sheet.getLastRow();
    
    // For each missing header, insert it at the correct position
    // We need to process from right to left to maintain correct indices
    missingHeaders.sort(function(a, b) { return b.expectedIndex - a.expectedIndex; });
    
    for (var j = 0; j < missingHeaders.length; j++) {
      var missing = missingHeaders[j];
      // Find the correct column position based on expected order
      // Look at current headers and find where this header should be inserted
      var insertCol = lastCol + 1; // default: append at end
      
      // Find the position: after the last existing header that comes before this one in expected order
      for (var k = missing.expectedIndex - 1; k >= 0; k--) {
        var prevHeader = expectedHeaders[k];
        var prevCol = -1;
        var refreshedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        for (var c = 0; c < refreshedHeaders.length; c++) {
          if (refreshedHeaders[c] === prevHeader) {
            prevCol = c + 1; // 1-indexed
            break;
          }
        }
        if (prevCol !== -1) {
          insertCol = prevCol + 1;
          break;
        }
      }
      
      // Insert column
      sheet.insertColumnAfter(insertCol - 1);
      // Set header
      sheet.getRange(1, insertCol).setValue(missing.header).setFontWeight("bold");
      
      // Fill existing data rows with 0 (empty/default)
      if (lastRow > 1) {
        var emptyValues = [];
        for (var r = 0; r < lastRow - 1; r++) {
          emptyValues.push([0]);
        }
        sheet.getRange(2, insertCol, lastRow - 1, 1).setValues(emptyValues);
      }
      
      Logger.log("Inserted column '" + missing.header + "' at position " + insertCol + " in " + sheetName);
    }
    
    SpreadsheetApp.flush();
    Logger.log("Migration complete for " + sheetName + ". New headers: " + 
      JSON.stringify(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]));
  });
  
  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Migrasi pemakaian_bahan_baku selesai! Kolom dolomite, ga & kaptan telah ditambahkan.",
    "✅ Migrasi Selesai",
    5
  );
}

/**
 * Fix headers for bahanbaku_npk sheets
 * Run this to ensure headers are correct
 */
function fixBahanBakuNPKHeaders() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ["bahanbaku_npk", "bahanbaku_npk_NPK1"];
  const expectedHeaders = SHEET_HEADERS["bahanbaku_npk"];

  Logger.log("Expected headers: " + JSON.stringify(expectedHeaders));

  sheetNames.forEach((sheetName) => {
    let sheet = spreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      // Create the sheet if it doesn't exist
      sheet = spreadsheet.insertSheet(sheetName);
      sheet
        .getRange(1, 1, 1, expectedHeaders.length)
        .setValues([expectedHeaders]);
      sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
      Logger.log("Created sheet " + sheetName + " with headers");
    } else {
      // Check and fix headers
      const lastCol = sheet.getLastColumn();

      if (lastCol === 0) {
        // No columns yet
        sheet
          .getRange(1, 1, 1, expectedHeaders.length)
          .setValues([expectedHeaders]);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
        sheet.setFrozenRows(1);
        Logger.log("Added headers to empty sheet " + sheetName);
      } else {
        const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        Logger.log(
          "Current headers in " +
            sheetName +
            ": " +
            JSON.stringify(currentHeaders)
        );

        // Update headers
        sheet
          .getRange(1, 1, 1, expectedHeaders.length)
          .setValues([expectedHeaders]);
        sheet.getRange(1, 1, 1, expectedHeaders.length).setFontWeight("bold");
        Logger.log("Updated headers in " + sheetName);
      }
    }
  });

  SpreadsheetApp.getActiveSpreadsheet().toast(
    "Headers bahanbaku_npk sudah diperbaiki!",
    "✅ Selesai",
    5
  );
}

// ============================================
// INVENTARIS STOK MATERIAL CONSUMABLE
// ============================================

/**
 * Get all materials from the materials sheet
 */
function getMaterials() {
  try {
    const sheet = getOrCreateSheet("materials");
    return readSheet("materials");
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Add a new material
 * @param {Object} data - { kode_material, nama_material, satuan, stok, stok_minimum }
 */
function addMaterial(data) {
  try {
    const materialData = {
      id: generateId(),
      kode_material: data.kode_material || "",
      nama_material: data.nama_material || "",
      satuan: data.satuan || "pcs",
      stok: parseFloat(data.stok) || 0,
      stok_minimum: parseFloat(data.stok_minimum) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return createRecord("materials", materialData);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Update material data (for editing material info, not stock)
 * @param {Object} data - { id, kode_material, nama_material, satuan, stok_minimum }
 */
function updateMaterial(data) {
  try {
    if (!data.id) {
      return { success: false, error: "ID material diperlukan" };
    }

    const updateData = {
      id: data.id,
      kode_material: data.kode_material,
      nama_material: data.nama_material,
      satuan: data.satuan,
      stok_minimum: parseFloat(data.stok_minimum) || 0,
      updated_at: new Date().toISOString(),
    };

    return updateRecord("materials", updateData);
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Delete a material
 * @param {string} materialId - The ID of material to delete
 */
function deleteMaterial(materialId) {
  try {
    if (!materialId) {
      return { success: false, error: "ID material diperlukan" };
    }

    return deleteRecord("materials", { id: materialId });
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Add material with logging
 * @param {Object} data - Material data
 * @param {Object} userInfo - User information for logging
 */
function addMaterialWithLog(data, userInfo) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    const materialData = {
      id: generateId(),
      kode_material: data.kode_material || "",
      nama_material: data.nama_material || "",
      satuan: data.satuan || "pcs",
      stok: parseFloat(data.stok) || 0,
      stok_minimum: parseFloat(data.stok_minimum) || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = createRecord("materials", materialData);

    if (!result.success) return result;

    const preview = `${materialData.kode_material} - ${materialData.nama_material}`;

    createActivityLog({
      action: "create",
      sheet_name: "materials",
      record_id: materialData.id,
      record_preview: preview,
      user_id: userInfo?.username || "",
      user_name: userInfo?.namaLengkap || userInfo?.nama || "",
      user_role: userInfo?.role || "",
      plant: userInfo?.plant || "",
    });

    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update material with logging
 * @param {Object} data - Material data
 * @param {Object} userInfo - User information for logging
 */
function updateMaterialWithLog(data, userInfo) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!data.id) {
      return { success: false, error: "ID material diperlukan" };
    }

    const updateData = {
      id: data.id,
      kode_material: data.kode_material,
      nama_material: data.nama_material,
      satuan: data.satuan,
      stok_minimum: parseFloat(data.stok_minimum) || 0,
      updated_at: new Date().toISOString(),
    };

    const result = updateRecord("materials", updateData);

    if (!result.success) return result;

    const preview = `${updateData.kode_material} - ${updateData.nama_material}`;

    createActivityLog({
      action: "update",
      sheet_name: "materials",
      record_id: data.id,
      record_preview: preview,
      user_id: userInfo?.username || "",
      user_name: userInfo?.namaLengkap || userInfo?.nama || "",
      user_role: userInfo?.role || "",
      plant: userInfo?.plant || "",
    });

    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Delete material with logging
 * @param {string} materialId - The ID of material to delete
 * @param {Object} userInfo - User information for logging
 */
function deleteMaterialWithLog(materialId, userInfo) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!materialId) {
      return { success: false, error: "ID material diperlukan" };
    }

    // Get material info before deleting for log preview
    const materialsResult = readSheet("materials");
    let preview = materialId;
    const searchId = String(materialId).trim();
    if (materialsResult.success && materialsResult.data) {
      const material = materialsResult.data.find((m) => String(m.id || "").trim() === searchId);
      if (material) {
        preview = `${material.kode_material} - ${material.nama_material}`;
      }
    }

    const result = deleteRecord("materials", { id: materialId });

    if (!result.success) return result;

    createActivityLog({
      action: "delete",
      sheet_name: "materials",
      record_id: materialId,
      record_preview: preview,
      user_id: userInfo?.username || "",
      user_name: userInfo?.namaLengkap || userInfo?.nama || "",
      user_role: userInfo?.role || "",
      plant: userInfo?.plant || "",
    });

    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update stock masuk with logging
 * @param {string} materialId - The ID of material
 * @param {number} jumlah - Amount to add
 * @param {string} keterangan - Description/notes
 * @param {Object} userInfo - User information for logging
 */
function updateStockMasukWithLog(materialId, jumlah, keterangan, userInfo) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!materialId || !jumlah) {
      return { success: false, error: "Material ID dan jumlah diperlukan" };
    }

    const amount = parseFloat(jumlah);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Jumlah harus lebih dari 0" };
    }

    // Get current material data with minimal reads
    const materialsSheet = getOrCreateSheet("materials");
    const lastCol = materialsSheet.getLastColumn();
    const lastRow = materialsSheet.getLastRow();
    if (lastCol === 0 || lastRow <= 1) {
      return { success: false, error: "Material tidak ditemukan (sheet kosong)" };
    }

    const headers = materialsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const stokIndex = headers.indexOf("stok");
    const updatedAtIndex = headers.indexOf("updated_at");
    const kodeMaterialIndex = headers.indexOf("kode_material");
    const namaMaterialIndex = headers.indexOf("nama_material");

    const materialRef = getRowObjectById(materialsSheet, headers, materialId);
    if (materialRef.rowIndex === -1) {
      const searchId = String(materialId).trim();
      Logger.log("updateStockMasukWithLog: Material not found. ID: " + searchId);
      return { success: false, error: "Material tidak ditemukan (ID: " + searchId + ")" };
    }

    const materialRow = materialRef.rowIndex;
    const currentStok = parseFloat(materialRef.rowValues[stokIndex]) || 0;
    const kodeMaterial = materialRef.rowValues[kodeMaterialIndex] || "";
    const namaMaterial = materialRef.rowValues[namaMaterialIndex] || "";

    const newStok = currentStok + amount;
    materialsSheet.getRange(materialRow, stokIndex + 1).setValue(newStok);
    materialsSheet
      .getRange(materialRow, updatedAtIndex + 1)
      .setValue(new Date().toISOString());

    invalidateSheetReadCaches("materials");

    // Log to stock history
    const historyData = {
      id: generateId(),
      material_id: materialId,
      kode_material: kodeMaterial,
      nama_material: namaMaterial,
      jenis: "masuk",
      jumlah: amount,
      stok_sebelum: currentStok,
      stok_sesudah: newStok,
      keterangan: keterangan || "",
      created_at: new Date().toISOString(),
    };

    createRecord("stock_history", historyData);

    // Create transaction record for Riwayat Transaksi
    const transactionData = {
      id: generateId(),
      material_id: materialId,
      tipe_transaksi: "masuk",
      jumlah: amount,
      keterangan: keterangan || "",
      created_at: new Date().toISOString(),
    };

    createRecord("material_transactions", transactionData);

    // Log activity
    const preview = `Stock Masuk: ${kodeMaterial} - ${namaMaterial} (+${amount})`;

    createActivityLog({
      action: "update",
      sheet_name: "materials",
      record_id: materialId,
      record_preview: preview,
      user_id: userInfo?.username || "",
      user_name: userInfo?.namaLengkap || userInfo?.nama || "",
      user_role: userInfo?.role || "",
      plant: userInfo?.plant || "",
    });

    return {
      success: true,
      data: {
        material_id: materialId,
        stok_lama: currentStok,
        jumlah_ditambah: amount,
        stok_baru: newStok,
      },
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update stock keluar with logging
 * @param {string} materialId - The ID of material
 * @param {number} jumlah - Amount to subtract
 * @param {string} keterangan - Description/notes
 * @param {Object} userInfo - User information for logging
 */
function updateStockKeluarWithLog(materialId, jumlah, keterangan, userInfo) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    if (!materialId || !jumlah) {
      return { success: false, error: "Material ID dan jumlah diperlukan" };
    }

    const amount = parseFloat(jumlah);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Jumlah harus lebih dari 0" };
    }

    // Get current material data with minimal reads
    const materialsSheet = getOrCreateSheet("materials");
    const lastCol = materialsSheet.getLastColumn();
    const lastRow = materialsSheet.getLastRow();
    if (lastCol === 0 || lastRow <= 1) {
      return { success: false, error: "Material tidak ditemukan (sheet kosong)" };
    }

    const headers = materialsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const stokIndex = headers.indexOf("stok");
    const updatedAtIndex = headers.indexOf("updated_at");
    const kodeMaterialIndex = headers.indexOf("kode_material");
    const namaMaterialIndex = headers.indexOf("nama_material");

    const materialRef = getRowObjectById(materialsSheet, headers, materialId);
    if (materialRef.rowIndex === -1) {
      const searchId = String(materialId).trim();
      Logger.log("updateStockKeluarWithLog: Material not found. ID: " + searchId);
      return { success: false, error: "Material tidak ditemukan (ID: " + searchId + ")" };
    }

    const materialRow = materialRef.rowIndex;
    const currentStok = parseFloat(materialRef.rowValues[stokIndex]) || 0;
    const kodeMaterial = materialRef.rowValues[kodeMaterialIndex] || "";
    const namaMaterial = materialRef.rowValues[namaMaterialIndex] || "";

    if (currentStok < amount) {
      return { success: false, error: "Stok tidak mencukupi" };
    }

    const newStok = currentStok - amount;
    materialsSheet.getRange(materialRow, stokIndex + 1).setValue(newStok);
    materialsSheet
      .getRange(materialRow, updatedAtIndex + 1)
      .setValue(new Date().toISOString());

    invalidateSheetReadCaches("materials");

    // Log to stock history
    const historyData = {
      id: generateId(),
      material_id: materialId,
      kode_material: kodeMaterial,
      nama_material: namaMaterial,
      jenis: "keluar",
      jumlah: amount,
      stok_sebelum: currentStok,
      stok_sesudah: newStok,
      keterangan: keterangan || "",
      created_at: new Date().toISOString(),
    };

    createRecord("stock_history", historyData);

    // Create transaction record for Riwayat Transaksi
    const transactionData = {
      id: generateId(),
      material_id: materialId,
      tipe_transaksi: "keluar",
      jumlah: amount,
      keterangan: keterangan || "",
      created_at: new Date().toISOString(),
    };

    createRecord("material_transactions", transactionData);

    // Log activity
    const preview = `Stock Keluar: ${kodeMaterial} - ${namaMaterial} (-${amount})`;

    createActivityLog({
      action: "update",
      sheet_name: "materials",
      record_id: materialId,
      record_preview: preview,
      user_id: userInfo?.username || "",
      user_name: userInfo?.namaLengkap || userInfo?.nama || "",
      user_role: userInfo?.role || "",
      plant: userInfo?.plant || "",
    });

    return {
      success: true,
      data: {
        material_id: materialId,
        stok_lama: currentStok,
        jumlah_dikurangi: amount,
        stok_baru: newStok,
      },
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update stock - MASUK (add stock)
 * Uses LockService to prevent race condition
 * @param {string} materialId - The ID of material
 * @param {number} jumlah - Amount to add
 * @param {string} keterangan - Description/notes
 */
function updateStockMasuk(materialId, jumlah, keterangan) {
  const lock = LockService.getScriptLock();

  try {
    // Try to acquire lock for 30 seconds
    lock.waitLock(30000);

    if (!materialId || !jumlah) {
      return { success: false, error: "Material ID dan jumlah diperlukan" };
    }

    const amount = parseFloat(jumlah);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Jumlah harus lebih dari 0" };
    }

    // Get current material data with minimal reads
    const materialsSheet = getOrCreateSheet("materials");
    const lastCol = materialsSheet.getLastColumn();
    const lastRow = materialsSheet.getLastRow();
    if (lastCol === 0 || lastRow <= 1) {
      return { success: false, error: "Material tidak ditemukan (sheet kosong)" };
    }

    const headers = materialsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const stokIndex = headers.indexOf("stok");
    const updatedAtIndex = headers.indexOf("updated_at");

    const materialRef = getRowObjectById(materialsSheet, headers, materialId);
    if (materialRef.rowIndex === -1) {
      const searchId = String(materialId).trim();
      return { success: false, error: "Material tidak ditemukan (ID: " + searchId + ")" };
    }

    const materialRow = materialRef.rowIndex;
    const currentStok = parseFloat(materialRef.rowValues[stokIndex]) || 0;

    // Calculate new stock
    const newStok = currentStok + amount;

    // Update material stock
    materialsSheet.getRange(materialRow, stokIndex + 1).setValue(newStok);
    materialsSheet
      .getRange(materialRow, updatedAtIndex + 1)
      .setValue(new Date().toISOString());

    invalidateSheetReadCaches("materials");

    // Create transaction record
    const transactionData = {
      id: generateId(),
      material_id: materialId,
      tipe_transaksi: "masuk",
      jumlah: amount,
      keterangan: keterangan || "",
      created_at: new Date().toISOString(),
    };

    createRecord("material_transactions", transactionData);

    return {
      success: true,
      data: {
        material_id: materialId,
        stok_lama: currentStok,
        jumlah_ditambah: amount,
        stok_baru: newStok,
      },
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update stock - KELUAR (reduce stock)
 * Uses LockService to prevent race condition
 * Validates stock cannot go negative
 * @param {string} materialId - The ID of material
 * @param {number} jumlah - Amount to reduce
 * @param {string} keterangan - Description/notes
 */
function updateStockKeluar(materialId, jumlah, keterangan) {
  const lock = LockService.getScriptLock();

  try {
    // Try to acquire lock for 30 seconds
    lock.waitLock(30000);

    if (!materialId || !jumlah) {
      return { success: false, error: "Material ID dan jumlah diperlukan" };
    }

    const amount = parseFloat(jumlah);
    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: "Jumlah harus lebih dari 0" };
    }

    // Get current material data with minimal reads
    const materialsSheet = getOrCreateSheet("materials");
    const lastCol = materialsSheet.getLastColumn();
    const lastRow = materialsSheet.getLastRow();
    if (lastCol === 0 || lastRow <= 1) {
      return { success: false, error: "Material tidak ditemukan (sheet kosong)" };
    }

    const headers = materialsSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const stokIndex = headers.indexOf("stok");
    const namaIndex = headers.indexOf("nama_material");
    const updatedAtIndex = headers.indexOf("updated_at");

    const materialRef = getRowObjectById(materialsSheet, headers, materialId);
    if (materialRef.rowIndex === -1) {
      const searchId = String(materialId).trim();
      return { success: false, error: "Material tidak ditemukan (ID: " + searchId + ")" };
    }

    const materialRow = materialRef.rowIndex;
    const currentStok = parseFloat(materialRef.rowValues[stokIndex]) || 0;
    const namaMaterial = materialRef.rowValues[namaIndex] || "";

    // Validate stock won't go negative
    if (currentStok < amount) {
      return {
        success: false,
        error: `Stok tidak cukup! Stok ${namaMaterial} saat ini: ${currentStok}`,
      };
    }

    // Calculate new stock
    const newStok = currentStok - amount;

    // Update material stock
    materialsSheet.getRange(materialRow, stokIndex + 1).setValue(newStok);
    materialsSheet
      .getRange(materialRow, updatedAtIndex + 1)
      .setValue(new Date().toISOString());

    invalidateSheetReadCaches("materials");

    // Create transaction record
    const transactionData = {
      id: generateId(),
      material_id: materialId,
      tipe_transaksi: "keluar",
      jumlah: amount,
      keterangan: keterangan || "",
      created_at: new Date().toISOString(),
    };

    createRecord("material_transactions", transactionData);

    return {
      success: true,
      data: {
        material_id: materialId,
        stok_lama: currentStok,
        jumlah_dikurangi: amount,
        stok_baru: newStok,
      },
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get all material transactions
 * Optional: filter by material_id and date range
 */
function getMaterialTransactions(filters) {
  try {
    const result = readSheet("material_transactions");

    if (!result.success || !result.data) {
      return result;
    }

    let transactions = result.data;

    // Apply filters if provided
    if (filters) {
      if (filters.material_id) {
        transactions = transactions.filter(
          (t) => t.material_id === filters.material_id
        );
      }
      if (filters.start_date) {
        const startDate = new Date(filters.start_date);
        transactions = transactions.filter(
          (t) => new Date(t.created_at) >= startDate
        );
      }
      if (filters.end_date) {
        const endDate = new Date(filters.end_date);
        endDate.setHours(23, 59, 59, 999);
        transactions = transactions.filter(
          (t) => new Date(t.created_at) <= endDate
        );
      }
    }

    // Sort by created_at descending (newest first)
    transactions.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    return { success: true, data: transactions };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// ============================================
// ACTIVITY LOGGING & NOTIFICATION SYSTEM
// ============================================

/**
 * Get sheet display name for notifications
 */
function getSheetDisplayName(sheetName) {
  const displayNames = {
    produksi_npk: "Produksi NPK",
    produksi_npk_NPK1: "Produksi NPK",
    produksi_blending: "Produksi Blending",
    produksi_blending_NPK1: "Produksi Blending",
    produksi_npk_mini: "Produksi NPK Mini",
    produksi_npk_mini_NPK1: "Produksi NPK Mini",
    timesheet_forklift: "Timesheet Forklift",
    timesheet_forklift_NPK1: "Timesheet Forklift",
    timesheet_loader: "Timesheet Loader",
    timesheet_loader_NPK1: "Timesheet Loader",
    downtime: "Downtime",
    downtime_NPK1: "Downtime",
    workrequest: "Work Request",
    workrequest_NPK1: "Work Request",
    bahanbaku: "Bahan Baku",
    bahanbaku_NPK1: "Bahan Baku",
    bahanbaku_npk: "Bahan Baku NPK",
    bahanbaku_npk_NPK1: "Bahan Baku NPK",
    vibrasi: "Vibrasi",
    vibrasi_NPK1: "Vibrasi",
    gatepass: "Gate Pass",
    gatepass_NPK1: "Gate Pass",
    perbaikan_tahunan: "Perbaikan Tahunan",
    perbaikan_tahunan_NPK1: "Perbaikan Tahunan",
    trouble_record: "Trouble Record",
    trouble_record_NPK1: "Trouble Record",
    dokumentasi_foto: "Dokumentasi Foto",
    dokumentasi_foto_NPK1: "Dokumentasi Foto",
    rekap_bbm: "Rekap BBM",
    rekap_bbm_NPK1: "Rekap BBM",
    pemakaian_bahan_baku: "Pemakaian Bahan Baku",
    pemakaian_bahan_baku_NPK1: "Pemakaian Bahan Baku",
    riksa_timb_portabel: "Riksa Timbangan Portabel",
    sarana_3r: "Sarana 3R",
    kop: "KOP",
    kop_NPK1: "KOP",
    materials: "Inventaris Material",
    perta: "PERTA",
    perta_NPK1: "PERTA",
  };
  return displayNames[sheetName] || sheetName;
}

/**
 * Get plant from sheet name
 */
function getPlantFromSheet(sheetName) {
  if (sheetName.endsWith("_NPK1")) return "NPK1";
  return "NPK2";
}

/**
 * Create a record preview for logs
 */
function createRecordPreview(data, sheetName) {
  if (data.tanggal) {
    if (data.namaBarang) return `${data.tanggal} - ${data.namaBarang}`;
    if (data.bahanBaku) return `${data.tanggal} - ${data.bahanBaku}`;
    if (data.nomorWR) return `${data.tanggal} - WR ${data.nomorWR}`;
    if (data.nomorGatePass) return `${data.tanggal} - GP ${data.nomorGatePass}`;
    if (data.item) return `${data.tanggal} - ${data.item}`;
    if (data.namaEquipment) return `${data.tanggal} - ${data.namaEquipment}`;
    if (data.judul) return `${data.tanggal} - ${data.judul}`;
    if (data.namaAlatBerat) return `${data.tanggal} - ${data.namaAlatBerat}`;
    if (data.shift) return `${data.tanggal} - Shift ${data.shift}`;
    return data.tanggal;
  }
  if (data.kode_material)
    return `${data.kode_material} - ${data.nama_material}`;
  if (data.nama_material) return data.nama_material;
  return data.id || "Data";
}

/**
 * Create activity log entry
 */
function createActivityLog(logData) {
  try {
    const log = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      action: logData.action,
      sheet_name: logData.sheet_name,
      record_id: logData.record_id || "",
      record_preview: logData.record_preview || "",
      user_id: logData.user_id || "",
      user_name: logData.user_name || "",
      user_role: logData.user_role || "",
      plant: logData.plant || "",
      ip_address: logData.ip_address || "",
      changes: logData.changes ? JSON.stringify(logData.changes) : "",
    };

    return createRecord("activity_logs", log);
  } catch (error) {
    Logger.log("Error creating activity log: " + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Get users by roles for notification targeting
 * @param {Array} roles - Array of roles to target ['supervisor', 'avp', 'admin']
 * @param {string} plant - Plant filter ('NPK1', 'NPK2', or 'ALL' for both)
 */
function getUsersByRoles(roles, plant) {
  try {
    const usersResult = readSheet("users");
    if (!usersResult.success || !usersResult.data) return [];

    return usersResult.data.filter((user) => {
      if (!roles.includes(user.role)) return false;
      if (plant && plant !== "ALL") {
        if (user.plant === "ALL") return true;
        return user.plant === plant;
      }
      return true;
    });
  } catch (error) {
    Logger.log("Error getting users by roles: " + error.toString());
    return [];
  }
}

/**
 * Send notifications to specific roles
 * @param {Object} data - { message, plant, targetRoles, fromUser, fromPlant, relatedLogId, sheetName, recordId }
 */
function sendNotificationToRoles(data) {
  try {
    const {
      message,
      plant,
      targetRoles,
      fromUser,
      fromPlant,
      relatedLogId,
      sheetName,
      recordId,
    } = data;
    const roles = targetRoles || ["supervisor", "avp", "admin"];

    const targetUsers = getUsersByRoles(roles, plant);

    if (targetUsers.length === 0) {
      Logger.log("No target users found for notification");
      return { success: true, data: { sent: 0 } };
    }

    let sentCount = 0;
    const timestamp = new Date().toISOString();

    for (const targetUser of targetUsers) {
      if (targetUser.username === fromUser) continue;

      const notifData = {
        id: generateId(),
        message: message,
        timestamp: timestamp,
        read: false,
        fromUser: fromUser || "",
        fromPlant: fromPlant || plant || "",
        toUser: targetUser.username,
        relatedLogId: relatedLogId || "",
        sheetName: sheetName || "",
        recordId: recordId || "",
      };

      const result = createRecord("notifications", notifData);
      if (result.success) sentCount++;
    }

    return { success: true, data: { sent: sentCount } };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Create record with logging and notifications
 */
function createRecordWithLog(sheetName, data, userInfo) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    Logger.log("createRecordWithLog called for sheet: " + sheetName);
    Logger.log("Data received: " + JSON.stringify(data));

    const result = createRecord(sheetName, data);

    Logger.log("createRecord result: " + JSON.stringify(result));

    if (!result.success) return result;

    const plant = getPlantFromSheet(sheetName);
    const displayName = getSheetDisplayName(sheetName);
    const preview = createRecordPreview(data, sheetName);
    const recordId = result.data?.id || data.id || "";

    const logResult = createActivityLog({
      action: "create",
      sheet_name: sheetName,
      record_id: recordId,
      record_preview: preview,
      user_id: userInfo?.username || "",
      user_name: userInfo?.namaLengkap || userInfo?.nama || "",
      user_role: userInfo?.role || "",
      plant: plant,
    });

    const notifMessage = `📝 ${
      userInfo?.namaLengkap || userInfo?.nama || "User"
    } menambahkan data baru di ${displayName} (${plant}): ${preview}`;

    sendNotificationToRoles({
      message: notifMessage,
      plant: plant,
      targetRoles: ["supervisor", "avp", "admin"],
      fromUser: userInfo?.username || "",
      fromPlant: plant,
      relatedLogId: logResult.data?.id || "",
      sheetName: sheetName,
      recordId: recordId,
    });

    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update record with logging and notifications
 */
function updateRecordWithLog(sheetName, data, userInfo) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    let oldData = null;
    if (data.id) {
      const sheet = getOrCreateSheet(sheetName);
      const lastCol = sheet.getLastColumn();
      const lastRow = sheet.getLastRow();

      if (lastCol > 0 && lastRow > 1) {
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const rowRef = getRowObjectById(sheet, headers, data.id);
        if (rowRef.rowIndex !== -1) {
          oldData = rowRef.rowObject;
        }
      }
    }

    const result = updateRecord(sheetName, data);

    if (!result.success) return result;

    const plant = getPlantFromSheet(sheetName);
    const displayName = getSheetDisplayName(sheetName);
    const preview = createRecordPreview(data, sheetName);

    const changes = {};
    if (oldData) {
      Object.keys(data).forEach((key) => {
        if (key !== "id" && data[key] !== oldData[key]) {
          changes[key] = { old: oldData[key], new: data[key] };
        }
      });
    }

    const logResult = createActivityLog({
      action: "update",
      sheet_name: sheetName,
      record_id: data.id || "",
      record_preview: preview,
      user_id: userInfo?.username || "",
      user_name: userInfo?.namaLengkap || userInfo?.nama || "",
      user_role: userInfo?.role || "",
      plant: plant,
      changes: changes,
    });

    const notifMessage = `✏️ ${
      userInfo?.namaLengkap || userInfo?.nama || "User"
    } mengubah data di ${displayName} (${plant}): ${preview}`;

    sendNotificationToRoles({
      message: notifMessage,
      plant: plant,
      targetRoles: ["supervisor", "avp", "admin"],
      fromUser: userInfo?.username || "",
      fromPlant: plant,
      relatedLogId: logResult.data?.id || "",
      sheetName: sheetName,
      recordId: data.id || "",
    });

    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Delete record with logging and notifications
 */
function deleteRecordWithLog(sheetName, data, userInfo) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(30000);

    let recordPreview = "";
    let oldData = null;
    if (data.id) {
      const sheet = getOrCreateSheet(sheetName);
      const lastCol = sheet.getLastColumn();
      const lastRow = sheet.getLastRow();

      if (lastCol > 0 && lastRow > 1) {
        const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
        const rowRef = getRowObjectById(sheet, headers, data.id);
        if (rowRef.rowIndex !== -1) {
          oldData = rowRef.rowObject;
          recordPreview = createRecordPreview(oldData, sheetName);
        }
      }
    }

    const result = deleteRecord(sheetName, data);

    if (!result.success) return result;

    const plant = getPlantFromSheet(sheetName);
    const displayName = getSheetDisplayName(sheetName);

    const logResult = createActivityLog({
      action: "delete",
      sheet_name: sheetName,
      record_id: data.id || "",
      record_preview: recordPreview || data.id,
      user_id: userInfo?.username || "",
      user_name: userInfo?.namaLengkap || userInfo?.nama || "",
      user_role: userInfo?.role || "",
      plant: plant,
      changes: oldData ? { deleted_data: oldData } : null,
    });

    const notifMessage = `🗑️ ${
      userInfo?.namaLengkap || userInfo?.nama || "User"
    } menghapus data di ${displayName} (${plant}): ${recordPreview}`;

    sendNotificationToRoles({
      message: notifMessage,
      plant: plant,
      targetRoles: ["supervisor", "avp", "admin"],
      fromUser: userInfo?.username || "",
      fromPlant: plant,
      relatedLogId: logResult.data?.id || "",
      sheetName: sheetName,
      recordId: data.id || "",
    });

    return result;
  } catch (error) {
    return { success: false, error: error.toString() };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Get activity logs with filters
 * @param {Object} filters - { sheet_name, user_id, plant, start_date, end_date, record_id }
 */
function getActivityLogs(filters) {
  try {
    const result = readSheet("activity_logs");

    if (!result.success || !result.data) return result;

    let logs = result.data;

    if (filters) {
      if (filters.sheet_name) {
        logs = logs.filter(
          (l) =>
            l.sheet_name === filters.sheet_name ||
            l.sheet_name.startsWith(filters.sheet_name)
        );
      }
      if (filters.user_id) {
        logs = logs.filter((l) => l.user_id === filters.user_id);
      }
      if (filters.plant) {
        logs = logs.filter((l) => l.plant === filters.plant);
      }
      if (filters.record_id) {
        logs = logs.filter((l) => l.record_id === filters.record_id);
      }
      if (filters.start_date) {
        const startDate = new Date(filters.start_date);
        logs = logs.filter((l) => new Date(l.timestamp) >= startDate);
      }
      if (filters.end_date) {
        const endDate = new Date(filters.end_date);
        endDate.setHours(23, 59, 59, 999);
        logs = logs.filter((l) => new Date(l.timestamp) <= endDate);
      }
    }

    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return { success: true, data: logs };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Get activity logs for a specific record
 */
function getRecordActivityLogs(sheetName, recordId) {
  return getActivityLogs({ sheet_name: sheetName, record_id: recordId });
}
