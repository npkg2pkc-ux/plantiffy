import { useCallback } from "react";
import {
  createDataWithLog,
  updateDataWithLog,
  deleteDataWithLog,
  type UserInfoForLog,
} from "@/services/api";
import { useAuthStore } from "@/stores";
import { playNotificationSoundStandalone } from "./useNotificationSound";
import type { ApiResponse } from "@/types";

/**
 * Custom hook for data operations with activity logging
 * Automatically sends notifications to supervisors, AVP, and admins
 * when data is created, updated, or deleted
 * Now also plays notification sounds on successful operations
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
      const result = await createDataWithLog(baseSheet, data, userInfo);
      // Play success sound on successful data creation
      if (result.success) {
        playNotificationSoundStandalone("success");
      }
      return result;
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
      const result = await updateDataWithLog(baseSheet, data, userInfo);
      // Play success sound on successful data update
      if (result.success) {
        playNotificationSoundStandalone("success");
      }
      return result;
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
      const result = await deleteDataWithLog(baseSheet, data, userInfo);
      // Play warning sound on successful data deletion
      if (result.success) {
        playNotificationSoundStandalone("warning");
      }
      return result;
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
