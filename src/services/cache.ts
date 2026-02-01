/**
 * API Data Cache System
 * Provides in-memory caching for API data to speed up page loads
 * Cache expires after a configurable TTL (time-to-live)
 */

import type { ApiResponse } from "@/types";

// Cache configuration
const DEFAULT_TTL = 60000; // 1 minute default TTL
const SHORT_TTL = 30000; // 30 seconds for frequently updated data
const LONG_TTL = 300000; // 5 minutes for rarely changing data

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory cache store
const cache = new Map<string, CacheEntry<unknown>>();

// Pending requests map to prevent duplicate requests
const pendingRequests = new Map<string, Promise<unknown>>();

/**
 * Get data from cache if valid
 */
function getFromCache<T>(key: string): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > entry.ttl) {
    // Cache expired
    cache.delete(key);
    return null;
  }

  return entry.data;
}

/**
 * Set data in cache
 */
function setInCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Clear specific cache entry
 */
export function clearCache(key: string): void {
  cache.delete(key);
}

/**
 * Clear all cache entries matching a pattern
 */
export function clearCacheByPattern(pattern: string): void {
  const keysToDelete: string[] = [];
  cache.forEach((_, key) => {
    if (key.includes(pattern)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => cache.delete(key));
}

/**
 * Clear entire cache
 */
export function clearAllCache(): void {
  cache.clear();
  pendingRequests.clear();
}

/**
 * Cached fetch wrapper - prevents duplicate requests and caches results
 */
export async function cachedFetch<T>(
  key: string,
  fetchFn: () => Promise<ApiResponse<T>>,
  ttl: number = DEFAULT_TTL
): Promise<ApiResponse<T>> {
  // Check cache first
  const cachedData = getFromCache<T>(key);
  if (cachedData !== null) {
    return { success: true, data: cachedData };
  }

  // Check if there's already a pending request for this key
  const pending = pendingRequests.get(key) as Promise<ApiResponse<T>> | undefined;
  if (pending) {
    return pending;
  }

  // Create new request
  const requestPromise = fetchFn().then((result) => {
    // Remove from pending
    pendingRequests.delete(key);

    // Cache successful results
    if (result.success && result.data) {
      setInCache(key, result.data, ttl);
    }

    return result;
  }).catch((error) => {
    pendingRequests.delete(key);
    throw error;
  });

  // Store pending request
  pendingRequests.set(key, requestPromise);

  return requestPromise;
}

/**
 * Prefetch data and store in cache
 */
export async function prefetchData<T>(
  key: string,
  fetchFn: () => Promise<ApiResponse<T>>,
  ttl: number = DEFAULT_TTL
): Promise<void> {
  // Don't prefetch if already cached
  if (getFromCache<T>(key) !== null) return;

  try {
    const result = await fetchFn();
    if (result.success && result.data) {
      setInCache(key, result.data, ttl);
    }
  } catch (error) {
    console.error("Prefetch error:", error);
  }
}

/**
 * Invalidate cache when data is modified (create/update/delete)
 */
export function invalidateOnMutation(sheetName: string): void {
  // Clear all caches related to this sheet
  clearCacheByPattern(sheetName);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: Array.from(cache.keys()),
  };
}

// Export TTL constants for use in components
export const CACHE_TTL = {
  SHORT: SHORT_TTL,
  DEFAULT: DEFAULT_TTL,
  LONG: LONG_TTL,
};

// Export cache key generators
export const CACHE_KEYS = {
  readData: (sheet: string) => `read:${sheet}`,
  fetchByPlant: (sheet: string) => `plant:${sheet}`,
  dashboard: () => "dashboard:all",
};
