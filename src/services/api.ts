/// <reference types="vite/client" />
import type { ApiResponse, DokumentasiFoto } from "@/types";

// API Base URL - ganti dengan URL deployment Google Apps Script Anda
const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://script.google.com/macros/s/AKfycbwhf1qqyKphj6flFppZSczHJDqERKyfn6qoh-LVhfS8thGvZw085lqDGMKKHyt_uYcwEw/exec";

// Generic fetch function for GET requests
async function fetchGET<T>(endpoint: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "GET",
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data || result };
  } catch (error) {
    console.error("API GET Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Generic fetch function for POST requests
// IMPORTANT: Google Apps Script requires text/plain content-type to avoid CORS preflight
async function fetchPOST<T>(data: object): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    // Check if the backend returned an error
    if (result.success === false) {
      return { success: false, error: result.error || "Unknown error" };
    }

    return {
      success: true,
      data: result.data !== undefined ? result.data : result,
    };
  } catch (error) {
    console.error("API POST Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Read data from sheet
export async function readData<T>(
  sheetName: string
): Promise<ApiResponse<T[]>> {
  return fetchGET<T[]>(`?action=read&sheet=${sheetName}`);
}

// Create data
export async function createData<T>(
  sheetName: string,
  data: Partial<T>
): Promise<ApiResponse<T>> {
  return fetchPOST<T>({
    action: "create",
    sheet: sheetName,
    data,
  });
}

// Update data
export async function updateData<T>(
  sheetName: string,
  data: Partial<T>
): Promise<ApiResponse<T>> {
  return fetchPOST<T>({
    action: "update",
    sheet: sheetName,
    data,
  });
}

// Delete data
export async function deleteData(
  sheetName: string,
  id: string
): Promise<ApiResponse<boolean>> {
  return fetchPOST<boolean>({
    action: "delete",
    sheet: sheetName,
    data: { id },
  });
}

// Login user
export async function loginUser(
  username: string,
  password: string
): Promise<ApiResponse<{ user: unknown; session: unknown }>> {
  return fetchPOST<{ user: unknown; session: unknown }>({
    action: "login",
    data: { username, password },
  });
}

// Check session
export async function checkSession(
  sessionId: string
): Promise<
  ApiResponse<{ valid: boolean; deviceId?: string; browser?: string }>
> {
  return fetchGET<{ valid: boolean; deviceId?: string; browser?: string }>(
    `?action=checkSession&sessionId=${sessionId}`
  );
}

// Create session
export async function createSession(data: {
  username: string;
  deviceId: string;
  browser: string;
}): Promise<ApiResponse<{ sessionId: string }>> {
  return fetchPOST<{ sessionId: string }>({
    action: "createSession",
    data,
  });
}

// Delete session (logout)
export async function deleteSession(
  sessionId: string
): Promise<ApiResponse<boolean>> {
  return fetchPOST<boolean>({
    action: "deleteSession",
    data: { sessionId },
  });
}

// Plant-aware fetch wrapper
export async function fetchDataByPlant<T>(
  baseSheet: string
): Promise<ApiResponse<T[]>> {
  const npk2Result = await readData<T>(baseSheet);
  const npk1Result = await readData<T>(`${baseSheet}_NPK1`);

  const allData: T[] = [];

  if (npk2Result.success && npk2Result.data) {
    allData.push(
      ...npk2Result.data.map((item) => ({
        ...item,
        _plant: "NPK2" as const,
      }))
    );
  }

  if (npk1Result.success && npk1Result.data) {
    allData.push(
      ...npk1Result.data.map((item) => ({
        ...item,
        _plant: "NPK1" as const,
      }))
    );
  }

  return { success: true, data: allData };
}

// Plant-aware save wrapper
export async function saveDataByPlant<T extends { _plant?: string }>(
  baseSheet: string,
  data: T
): Promise<ApiResponse<T>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  return createData<T>(targetSheet, data);
}

// Plant-aware update wrapper
export async function updateDataByPlant<T extends { _plant?: string }>(
  baseSheet: string,
  data: T
): Promise<ApiResponse<T>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  return updateData<T>(targetSheet, data);
}

// Plant-aware delete wrapper
export async function deleteDataByPlant(
  baseSheet: string,
  data: { id: string; _plant?: string }
): Promise<ApiResponse<boolean>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  return deleteData(targetSheet, data.id);
}

// Helper to get sheet name by plant
// NPK2 uses base sheet name, NPK1 uses base_NPK1
export function getSheetNameByPlant(
  baseSheet: string,
  plant: "NPK1" | "NPK2"
): string {
  return plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
}

// Sheet names
export const SHEETS = {
  // NPK2 (base)
  PRODUKSI_NPK: "produksi_npk",
  PRODUKSI_BLENDING: "produksi_blending",
  PRODUKSI_NPK_MINI: "produksi_npk_mini",
  TIMESHEET_FORKLIFT: "timesheet_forklift",
  TIMESHEET_LOADER: "timesheet_loader",
  DOWNTIME: "downtime",
  WORK_REQUEST: "workrequest",
  BAHAN_BAKU: "bahanbaku",
  BAHAN_BAKU_NPK: "bahanbaku_npk",
  VIBRASI: "vibrasi",
  GATE_PASS: "gatepass",
  PERTA: "perta",
  PERBAIKAN_TAHUNAN: "perbaikan_tahunan",
  TROUBLE_RECORD: "trouble_record",
  KOP: "kop",
  REKAP_BBM: "rekap_bbm",
  PEMANTAUAN_BAHAN_BAKU: "pemantauan_bahan_baku",

  // NPK2 only features
  RIKSA_TIMB_PORTABEL: "riksa_timb_portabel",

  // Shared
  USERS: "users",
  SESSIONS: "sessions",
  APPROVAL_REQUESTS: "approval_requests",
  MONTHLY_NOTES: "monthly_notes",
  NOTIFICATIONS: "notifications",
  CHAT_MESSAGES: "chat_messages",
  AKUN: "akun",
  RKAP: "rkap",
  DOKUMENTASI_FOTO: "dokumentasi_foto",
  ACTIVE_USERS: "active_users",

  // Inventaris Material Consumable
  MATERIALS: "materials",
  MATERIAL_TRANSACTIONS: "material_transactions",
} as const;

// ============================================
// PHOTO DOCUMENTATION API
// ============================================

// Upload photo to Google Drive
export async function uploadPhoto(data: {
  judul: string;
  keterangan?: string;
  imageBase64: string;
  fileName: string;
  uploadBy: string;
  plant: string;
}): Promise<ApiResponse<DokumentasiFoto>> {
  return fetchPOST<DokumentasiFoto>({
    action: "uploadPhoto",
    data,
  });
}

// Delete photo from Google Drive
export async function deletePhoto(data: {
  id: string;
  fileId: string;
  plant: string;
}): Promise<ApiResponse<boolean>> {
  return fetchPOST<boolean>({
    action: "deletePhoto",
    data,
  });
}

// ============================================
// EXCHANGE RATE API
// ============================================

export interface ExchangeRateData {
  rate: number;
  currency: string;
  base: string;
  timestamp: string;
  formatted: string;
}

// Get real-time USD to IDR exchange rate
export async function getExchangeRate(): Promise<
  ApiResponse<ExchangeRateData>
> {
  return fetchGET<ExchangeRateData>(`?action=getExchangeRate`);
}

// ============================================
// INVENTARIS STOK MATERIAL CONSUMABLE API
// ============================================

import type {
  Material,
  MaterialTransaction,
  MaterialTransactionFilter,
  StockUpdateResponse,
} from "@/types";

// Get all materials
export async function getMaterials(): Promise<ApiResponse<Material[]>> {
  return fetchGET<Material[]>(`?action=getMaterials`);
}

// Add new material
export async function addMaterial(
  data: Omit<Material, "id" | "created_at" | "updated_at">
): Promise<ApiResponse<Material>> {
  return fetchPOST<Material>({
    action: "addMaterial",
    data,
  });
}

// Update material info (not stock)
export async function updateMaterial(
  data: Partial<Material> & { id: string }
): Promise<ApiResponse<Material>> {
  return fetchPOST<Material>({
    action: "updateMaterial",
    data,
  });
}

// Delete material
export async function deleteMaterial(
  materialId: string
): Promise<ApiResponse<boolean>> {
  return fetchPOST<boolean>({
    action: "deleteMaterial",
    data: { id: materialId },
  });
}

// Update stock - MASUK (add stock)
export async function updateStockMasuk(
  materialId: string,
  jumlah: number,
  keterangan: string
): Promise<ApiResponse<StockUpdateResponse>> {
  return fetchPOST<StockUpdateResponse>({
    action: "updateStockMasuk",
    data: { materialId, jumlah, keterangan },
  });
}

// Update stock - KELUAR (reduce stock)
export async function updateStockKeluar(
  materialId: string,
  jumlah: number,
  keterangan: string
): Promise<ApiResponse<StockUpdateResponse>> {
  return fetchPOST<StockUpdateResponse>({
    action: "updateStockKeluar",
    data: { materialId, jumlah, keterangan },
  });
}

// Get material transactions with optional filters
export async function getMaterialTransactions(
  filters?: MaterialTransactionFilter
): Promise<ApiResponse<MaterialTransaction[]>> {
  let queryParams = "?action=getMaterialTransactions";

  if (filters) {
    if (filters.material_id) {
      queryParams += `&material_id=${encodeURIComponent(filters.material_id)}`;
    }
    if (filters.start_date) {
      queryParams += `&start_date=${encodeURIComponent(filters.start_date)}`;
    }
    if (filters.end_date) {
      queryParams += `&end_date=${encodeURIComponent(filters.end_date)}`;
    }
  }

  return fetchGET<MaterialTransaction[]>(queryParams);
}

// ============================================
// ACTIVITY LOGGING & NOTIFICATION API
// ============================================

import type { ActivityLog, ActivityLogFilter, User } from "@/types";

// User info type for logging
export interface UserInfoForLog {
  username: string;
  namaLengkap?: string;
  nama?: string;
  role: string;
}

// Create data with activity logging and notification
export async function createDataWithLog<T extends { _plant?: string }>(
  baseSheet: string,
  data: T,
  userInfo: UserInfoForLog
): Promise<ApiResponse<T>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  return fetchPOST<T>({
    action: "createWithLog",
    sheet: targetSheet,
    data,
    userInfo,
  });
}

// Update data with activity logging and notification
export async function updateDataWithLog<T extends { _plant?: string }>(
  baseSheet: string,
  data: T,
  userInfo: UserInfoForLog
): Promise<ApiResponse<T>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  return fetchPOST<T>({
    action: "updateWithLog",
    sheet: targetSheet,
    data,
    userInfo,
  });
}

// Delete data with activity logging and notification
export async function deleteDataWithLog(
  baseSheet: string,
  data: { id: string; _plant?: string },
  userInfo: UserInfoForLog
): Promise<ApiResponse<boolean>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  return fetchPOST<boolean>({
    action: "deleteWithLog",
    sheet: targetSheet,
    data: { id: data.id },
    userInfo,
  });
}

// Get activity logs with filters
export async function getActivityLogs(
  filters?: ActivityLogFilter
): Promise<ApiResponse<ActivityLog[]>> {
  return fetchPOST<ActivityLog[]>({
    action: "getActivityLogs",
    filters,
  });
}

// Get activity logs for a specific record
export async function getRecordActivityLogs(
  sheetName: string,
  recordId: string
): Promise<ApiResponse<ActivityLog[]>> {
  return fetchPOST<ActivityLog[]>({
    action: "getActivityLogs",
    filters: { sheet_name: sheetName, record_id: recordId },
  });
}

// Send notification to specific roles
export async function sendNotificationToRoles(data: {
  message: string;
  plant: string;
  targetRoles?: string[];
  fromUser: string;
  fromPlant: string;
  relatedLogId?: string;
  sheetName?: string;
  recordId?: string;
}): Promise<ApiResponse<{ sent: number }>> {
  return fetchPOST<{ sent: number }>({
    action: "sendNotificationToRoles",
    data,
  });
}

// Type for parsing changes JSON
export interface ActivityLogChanges {
  [key: string]: {
    old: unknown;
    new: unknown;
  };
}

// Helper to parse changes from activity log
export function parseActivityLogChanges(
  changesJson: string | undefined
): ActivityLogChanges | null {
  if (!changesJson) return null;
  try {
    return JSON.parse(changesJson) as ActivityLogChanges;
  } catch {
    return null;
  }
}

// Helper to get action display text
export function getActionDisplayText(action: ActivityLog["action"]): string {
  const actionMap: Record<ActivityLog["action"], string> = {
    create: "Menambahkan",
    update: "Mengubah",
    delete: "Menghapus",
  };
  return actionMap[action] || action;
}

// Helper to get action icon
export function getActionIcon(action: ActivityLog["action"]): string {
  const iconMap: Record<ActivityLog["action"], string> = {
    create: "📝",
    update: "✏️",
    delete: "🗑️",
  };
  return iconMap[action] || "📋";
}
