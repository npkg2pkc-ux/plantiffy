import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiResponse } from "@/types";

/**
 * Custom hook for fast data fetching with caching awareness
 * Provides loading states and automatic refresh
 */

interface UseFetchDataOptions<T> {
  // Function to fetch data
  fetchFn: () => Promise<ApiResponse<T[]>>;
  // Initial data
  initialData?: T[];
  // Dependencies to trigger refetch
  deps?: unknown[];
  // Skip initial fetch
  skip?: boolean;
  // Transform function for data
  transform?: (data: T[]) => T[];
}

interface UseFetchDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
}

export function useFetchData<T>({
  fetchFn,
  initialData = [],
  deps = [],
  skip = false,
  transform,
}: UseFetchDataOptions<T>): UseFetchDataResult<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();

      if (!mountedRef.current) return;

      if (result.success && result.data) {
        const processedData = transform ? transform(result.data) : result.data;
        setData(processedData);
      } else {
        setError(result.error || "Gagal memuat data");
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        fetchingRef.current = false;
      }
    }
  }, [fetchFn, transform]);

  useEffect(() => {
    mountedRef.current = true;
    
    if (!skip) {
      fetchData();
    }

    return () => {
      mountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip, ...deps]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch, setData };
}

/**
 * Hook for parallel data fetching - fetches multiple data sources at once
 */
interface ParallelFetchConfig<T> {
  key: string;
  fetchFn: () => Promise<ApiResponse<T[]>>;
  transform?: (data: T[]) => T[];
}

interface ParallelFetchResult<T extends Record<string, unknown[]>> {
  data: T;
  loading: boolean;
  errors: Record<string, string | null>;
  refetch: () => Promise<void>;
}

export function useParallelFetch<T extends Record<string, unknown[]>>(
  configs: ParallelFetchConfig<unknown>[],
  deps: unknown[] = []
): ParallelFetchResult<T> {
  const [data, setData] = useState<T>({} as T);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const mountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);

    try {
      const results = await Promise.all(
        configs.map(async (config) => {
          try {
            const result = await config.fetchFn();
            return {
              key: config.key,
              data: result.success && result.data
                ? config.transform
                  ? config.transform(result.data)
                  : result.data
                : [],
              error: result.success ? null : result.error || "Error",
            };
          } catch (err) {
            return {
              key: config.key,
              data: [],
              error: err instanceof Error ? err.message : "Error",
            };
          }
        })
      );

      if (!mountedRef.current) return;

      const newData = {} as T;
      const newErrors: Record<string, string | null> = {};

      results.forEach((result) => {
        (newData as Record<string, unknown[]>)[result.key] = result.data;
        newErrors[result.key] = result.error;
      });

      setData(newData);
      setErrors(newErrors);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(configs.map((c) => c.key))]);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();

    return () => {
      mountedRef.current = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps]);

  return { data, loading, errors, refetch: fetchAll };
}

/**
 * Hook for lazy loading data - only fetches when triggered
 */
export function useLazyFetch<T>(
  fetchFn: () => Promise<ApiResponse<T[]>>
): {
  data: T[];
  loading: boolean;
  error: string | null;
  fetch: () => Promise<T[]>;
} {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async (): Promise<T[]> => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();

      if (result.success && result.data) {
        setData(result.data);
        return result.data;
      } else {
        setError(result.error || "Gagal memuat data");
        return [];
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan");
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  return { data, loading, error, fetch };
}
