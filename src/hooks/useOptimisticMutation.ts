import { useCallback, useState } from "react";
import type { ApiResponse } from "@/types";

/**
 * Custom hook for optimistic mutations
 * Updates UI immediately, then syncs with server
 * Provides rollback on error
 */

export interface OptimisticMutationOptions<T> {
  // Function to call API
  mutationFn: (data: T) => Promise<ApiResponse<T>>;
  // Function to update local state optimistically
  onOptimisticUpdate?: (data: T) => void;
  // Function to rollback on error
  onRollback?: (previousData: T) => void;
  // Callback on success
  onSuccess?: (data: T) => void;
  // Callback on error
  onError?: (error: string) => void;
}

export function useOptimisticMutation<T>() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutate = useCallback(
    async (
      data: T,
      options: OptimisticMutationOptions<T>
    ): Promise<boolean> => {
      const { mutationFn, onOptimisticUpdate, onRollback, onSuccess, onError } =
        options;

      setIsPending(true);
      setError(null);

      // Store previous data for rollback
      const previousData = { ...data };

      // Optimistically update UI immediately
      if (onOptimisticUpdate) {
        onOptimisticUpdate(data);
      }

      try {
        // Make the actual API call
        const result = await mutationFn(data);

        if (result.success) {
          // Success - keep the optimistic update
          if (onSuccess) {
            onSuccess(result.data || data);
          }
          return true;
        } else {
          // Failed - rollback
          if (onRollback) {
            onRollback(previousData);
          }
          const errorMsg = result.error || "Operasi gagal";
          setError(errorMsg);
          if (onError) {
            onError(errorMsg);
          }
          return false;
        }
      } catch (err) {
        // Error - rollback
        if (onRollback) {
          onRollback(previousData);
        }
        const errorMsg =
          err instanceof Error ? err.message : "Terjadi kesalahan";
        setError(errorMsg);
        if (onError) {
          onError(errorMsg);
        }
        return false;
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return { mutate, isPending, error, clearError: () => setError(null) };
}

/**
 * Hook for batched optimistic operations
 * Useful for add/edit operations that need fast UI feedback
 */
export interface OptimisticAction<T> {
  type: "add" | "update" | "delete";
  data: T;
  tempId?: string;
}

export function useOptimisticList<T extends { id?: string }>() {
  const [pendingActions, setPendingActions] = useState<OptimisticAction<T>[]>(
    []
  );

  // Add item optimistically
  const optimisticAdd = useCallback(
    (
      items: T[],
      newItem: T,
      tempId: string
    ): { newItems: T[]; rollback: () => T[] } => {
      const itemWithTempId = { ...newItem, id: tempId, _isPending: true };
      const newItems = [itemWithTempId as T, ...items];

      return {
        newItems,
        rollback: () => items,
      };
    },
    []
  );

  // Update item optimistically
  const optimisticUpdate = useCallback(
    (
      items: T[],
      updatedItem: T
    ): { newItems: T[]; rollback: () => T[]; previousItem: T | undefined } => {
      const previousItem = items.find((item) => item.id === updatedItem.id);

      const newItems = items.map((item) =>
        item.id === updatedItem.id
          ? { ...updatedItem, _isPending: true }
          : item
      );

      return {
        newItems: newItems as T[],
        rollback: () => items,
        previousItem,
      };
    },
    []
  );

  // Delete item optimistically
  const optimisticDelete = useCallback(
    (
      items: T[],
      itemId: string
    ): { newItems: T[]; rollback: () => T[]; deletedItem: T | undefined } => {
      const deletedItem = items.find((item) => item.id === itemId);
      const newItems = items.filter((item) => item.id !== itemId);

      return {
        newItems,
        rollback: () => items,
        deletedItem,
      };
    },
    []
  );

  // Replace temp ID with real ID after server confirms
  const confirmAdd = useCallback(
    (items: T[], tempId: string, realId: string): T[] => {
      return items.map((item) =>
        item.id === tempId
          ? { ...item, id: realId, _isPending: undefined }
          : item
      ) as T[];
    },
    []
  );

  // Clear pending state after server confirms
  const confirmUpdate = useCallback((items: T[], itemId: string): T[] => {
    return items.map((item) =>
      item.id === itemId ? { ...item, _isPending: undefined } : item
    ) as T[];
  }, []);

  return {
    pendingActions,
    setPendingActions,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete,
    confirmAdd,
    confirmUpdate,
  };
}

/**
 * Generate temporary ID for optimistic adds
 */
export function generateTempId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
