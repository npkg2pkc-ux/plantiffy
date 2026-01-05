import { useCallback } from "react";
import {
  createDataWithLog,
  updateDataWithLog,
  deleteDataWithLog,
  type UserInfoForLog,
} from "@/services/api";
import { useAuthStore } from "@/stores";
import type { ApiResponse } from "@/types";

/**
 * Custom hook for data operations with activity logging
 * Automatically sends notifications to supervisors, AVP, and admins
 * when data is created, updated, or deleted
 */
export function useDataWithLogging() {
  const { user } = useAuthStore();

  // Get user info for logging
  const getUserInfo = useCallback((): UserInfoForLog => {
    return {
      username: user?.username || "",
      namaLengkap: user?.namaLengkap || user?.nama || "",
      nama: user?.nama || "",
      role: user?.role || "",
    };
  }, [user]);

  /**
   * Create data with activity logging and notification
   * @param baseSheet - Base sheet name (e.g., 'bahanbaku')
   * @param data - Data to create (must include _plant for plant-aware sheets)
   */
  const createWithLog = useCallback(
    async <T extends { _plant?: string }>(
      baseSheet: string,
      data: T
    ): Promise<ApiResponse<T>> => {
      const userInfo = getUserInfo();
      return createDataWithLog(baseSheet, data, userInfo);
    },
    [getUserInfo]
  );

  /**
   * Update data with activity logging and notification
   * @param baseSheet - Base sheet name
   * @param data - Data to update (must include id and _plant)
   */
  const updateWithLog = useCallback(
    async <T extends { _plant?: string; id?: string }>(
      baseSheet: string,
      data: T
    ): Promise<ApiResponse<T>> => {
      const userInfo = getUserInfo();
      return updateDataWithLog(baseSheet, data, userInfo);
    },
    [getUserInfo]
  );

  /**
   * Delete data with activity logging and notification
   * @param baseSheet - Base sheet name
   * @param data - Data containing id and _plant
   */
  const deleteWithLog = useCallback(
    async (
      baseSheet: string,
      data: { id: string; _plant?: string }
    ): Promise<ApiResponse<boolean>> => {
      const userInfo = getUserInfo();
      return deleteDataWithLog(baseSheet, data, userInfo);
    },
    [getUserInfo]
  );

  return {
    createWithLog,
    updateWithLog,
    deleteWithLog,
    getUserInfo,
  };
}
