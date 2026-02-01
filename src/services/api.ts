/// <reference types="vite/client" />
import type { ApiResponse, DokumentasiFoto } from "@/types";
import {
  cachedFetch,
  invalidateOnMutation,
  CACHE_TTL,
  CACHE_KEYS,
} from "./cache";

// API Base URL - ganti dengan URL deployment Google Apps Script Anda
const API_BASE =
  import.meta.env.VITE_API_URL ||
  "https://script.google.com/macros/s/AKfycbwhf1qqyKphj6flFppZSczHJDqERKyfn6qoh-LVhfS8thGvZw085lqDGMKKHyt_uYcwEw/exec";

// ============================================
// PERFORMANCE OPTIMIZATION CONSTANTS
// ============================================
const DEFAULT_TIMEOUT = 30000; // 30 seconds for normal operations
const FAST_TIMEOUT = 15000; // 15 seconds for login/logout
const BACKGROUND_TIMEOUT = 60000; // 60 seconds for background ops

// Create abort controller with timeout
function createAbortController(timeout: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeout);
  return controller;
}

// ============================================
// OPTIMIZED FETCH FUNCTIONS
// ============================================

// Generic fetch function for GET requests with timeout
async function fetchGET<T>(
  endpoint: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ApiResponse<T>> {
  const controller = createAbortController(timeout);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result.data || result };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("API GET Timeout:", endpoint);
      return { success: false, error: "Request timeout - silakan coba lagi" };
    }
    console.error("API GET Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Generic fetch function for POST requests with timeout
// IMPORTANT: Google Apps Script requires text/plain content-type to avoid CORS preflight
async function fetchPOST<T>(
  data: object,
  timeout: number = DEFAULT_TIMEOUT
): Promise<ApiResponse<T>> {
  const controller = createAbortController(timeout);

  try {
    const response = await fetch(API_BASE, {
      method: "POST",
      redirect: "follow",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
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
    if (error instanceof Error && error.name === "AbortError") {
      console.error("API POST Timeout");
      return { success: false, error: "Request timeout - silakan coba lagi" };
    }
    console.error("API POST Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Fast POST for login/logout operations
async function fetchPOSTFast<T>(data: object): Promise<ApiResponse<T>> {
  return fetchPOST<T>(data, FAST_TIMEOUT);
}

// Background POST - fire and forget with longer timeout
function fetchPOSTBackground<T>(data: object): Promise<ApiResponse<T>> {
  return fetchPOST<T>(data, BACKGROUND_TIMEOUT);
}

// ============================================
// CACHED DATA OPERATIONS
// ============================================

// Internal uncached read for use in cached wrappers
async function readDataUncached<T>(
  sheetName: string
): Promise<ApiResponse<T[]>> {
  return fetchGET<T[]>(`?action=read&sheet=${sheetName}`);
}

// Read data from sheet WITH CACHING
export async function readData<T>(
  sheetName: string,
  useCache: boolean = true
): Promise<ApiResponse<T[]>> {
  if (!useCache) {
    return readDataUncached<T>(sheetName);
  }

  const cacheKey = CACHE_KEYS.readData(sheetName);
  return cachedFetch<T[]>(
    cacheKey,
    () => readDataUncached<T>(sheetName),
    CACHE_TTL.DEFAULT
  );
}

// Read data with forced fresh fetch (bypasses cache)
export async function readDataFresh<T>(
  sheetName: string
): Promise<ApiResponse<T[]>> {
  return readData<T>(sheetName, false);
}

// Create data - invalidates cache
export async function createData<T>(
  sheetName: string,
  data: Partial<T>
): Promise<ApiResponse<T>> {
  const result = await fetchPOST<T>({
    action: "create",
    sheet: sheetName,
    data,
  });

  // Invalidate cache on successful mutation
  if (result.success) {
    invalidateOnMutation(sheetName);
  }

  return result;
}

// Update data - invalidates cache
export async function updateData<T>(
  sheetName: string,
  data: Partial<T>
): Promise<ApiResponse<T>> {
  const result = await fetchPOST<T>({
    action: "update",
    sheet: sheetName,
    data,
  });

  // Invalidate cache on successful mutation
  if (result.success) {
    invalidateOnMutation(sheetName);
  }

  return result;
}

// Delete data - invalidates cache
export async function deleteData(
  sheetName: string,
  id: string
): Promise<ApiResponse<boolean>> {
  const result = await fetchPOST<boolean>({
    action: "delete",
    sheet: sheetName,
    data: { id },
  });

  // Invalidate cache on successful mutation
  if (result.success) {
    invalidateOnMutation(sheetName);
  }

  return result;
}

// Login user - optimized with fast timeout
export async function loginUser(
  username: string,
  password: string
): Promise<ApiResponse<{ user: unknown; session: unknown }>> {
  return fetchPOSTFast<{ user: unknown; session: unknown }>({
    action: "login",
    data: { username, password },
  });
}

// Check session - with fast timeout
export async function checkSession(
  sessionId: string
): Promise<
  ApiResponse<{ valid: boolean; deviceId?: string; browser?: string }>
> {
  return fetchGET<{ valid: boolean; deviceId?: string; browser?: string }>(
    `?action=checkSession&sessionId=${sessionId}`,
    FAST_TIMEOUT
  );
}

// Create session - fast timeout
export async function createSession(data: {
  username: string;
  deviceId: string;
  browser: string;
}): Promise<ApiResponse<{ sessionId: string }>> {
  return fetchPOSTFast<{ sessionId: string }>({
    action: "createSession",
    data,
  });
}

// Delete session (logout) - fast timeout
export async function deleteSession(
  sessionId: string
): Promise<ApiResponse<boolean>> {
  return fetchPOSTFast<boolean>({
    action: "deleteSession",
    data: { sessionId },
  });
}

// Set user offline (background operation - fire and forget)
export function setUserOfflineBackground(
  username: string,
  existingUserId?: string
): void {
  // Fire and forget - don't await
  fetchPOSTBackground({
    action: "update",
    sheet: SHEETS.ACTIVE_USERS,
    data: {
      id: existingUserId || "",
      username,
      status: "offline",
      lastActive: new Date(0).toISOString(),
    },
  }).catch((err) => console.error("Background offline update failed:", err));
}

// Plant-aware fetch wrapper - WITH CACHING for speed
export async function fetchDataByPlant<T>(
  baseSheet: string,
  useCache: boolean = true
): Promise<ApiResponse<T[]>> {
  const cacheKey = CACHE_KEYS.fetchByPlant(baseSheet);

  // Use cached fetch wrapper
  if (useCache) {
    return cachedFetch<T[]>(
      cacheKey,
      () => fetchDataByPlantUncached<T>(baseSheet),
      CACHE_TTL.DEFAULT
    );
  }

  return fetchDataByPlantUncached<T>(baseSheet);
}

// Internal uncached version
async function fetchDataByPlantUncached<T>(
  baseSheet: string
): Promise<ApiResponse<T[]>> {
  // Fetch both plants in parallel for speed
  const [npk2Result, npk1Result] = await Promise.all([
    readDataUncached<T>(baseSheet),
    readDataUncached<T>(`${baseSheet}_NPK1`),
  ]);

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

// Plant-aware save wrapper - invalidates cache
export async function saveDataByPlant<T extends { _plant?: string }>(
  baseSheet: string,
  data: T
): Promise<ApiResponse<T>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  const result = await createData<T>(targetSheet, data);
  
  // Invalidate plant cache
  if (result.success) {
    invalidateOnMutation(baseSheet);
  }
  
  return result;
}

// Plant-aware update wrapper - invalidates cache
export async function updateDataByPlant<T extends { _plant?: string }>(
  baseSheet: string,
  data: T
): Promise<ApiResponse<T>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  const result = await updateData<T>(targetSheet, data);
  
  // Invalidate plant cache
  if (result.success) {
    invalidateOnMutation(baseSheet);
  }
  
  return result;
}

// Plant-aware delete wrapper - invalidates cache
export async function deleteDataByPlant(
  baseSheet: string,
  data: { id: string; _plant?: string }
): Promise<ApiResponse<boolean>> {
  const targetSheet = data._plant === "NPK1" ? `${baseSheet}_NPK1` : baseSheet;
  const result = await deleteData(targetSheet, data.id);
  
  // Invalidate plant cache
  if (result.success) {
    invalidateOnMutation(baseSheet);
  }
  
  return result;
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

import type { ActivityLog, ActivityLogFilter, User as _User } from "@/types";

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

// ============================================
// MATERIAL OPERATIONS WITH LOGGING
// ============================================

// Add material with activity logging
export async function addMaterialWithLog(
  data: Omit<Material, "id" | "created_at" | "updated_at">,
  userInfo: UserInfoForLog
): Promise<ApiResponse<Material>> {
  return fetchPOST<Material>({
    action: "addMaterialWithLog",
    data,
    userInfo,
  });
}

// Update material with activity logging
export async function updateMaterialWithLog(
  data: Partial<Material> & { id: string },
  userInfo: UserInfoForLog
): Promise<ApiResponse<Material>> {
  return fetchPOST<Material>({
    action: "updateMaterialWithLog",
    data,
    userInfo,
  });
}

// Delete material with activity logging
export async function deleteMaterialWithLog(
  materialId: string,
  userInfo: UserInfoForLog
): Promise<ApiResponse<boolean>> {
  return fetchPOST<boolean>({
    action: "deleteMaterialWithLog",
    data: { id: materialId },
    userInfo,
  });
}

// Update stock MASUK with activity logging
export async function updateStockMasukWithLog(
  materialId: string,
  jumlah: number,
  keterangan: string,
  userInfo: UserInfoForLog
): Promise<ApiResponse<StockUpdateResponse>> {
  return fetchPOST<StockUpdateResponse>({
    action: "updateStockMasukWithLog",
    data: { materialId, jumlah, keterangan },
    userInfo,
  });
}

// Update stock KELUAR with activity logging
export async function updateStockKeluarWithLog(
  materialId: string,
  jumlah: number,
  keterangan: string,
  userInfo: UserInfoForLog
): Promise<ApiResponse<StockUpdateResponse>> {
  return fetchPOST<StockUpdateResponse>({
    action: "updateStockKeluarWithLog",
    data: { materialId, jumlah, keterangan },
    userInfo,
  });
}

// ============================================
// CACHE EXPORTS
// ============================================
export { clearAllCache, clearCache, clearCacheByPattern } from "./cache";
