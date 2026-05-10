import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_TTL_MS = 15 * 60 * 1000; // 15 min

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export async function cacheSet<T>(key: string, data: T, ttlMs = DEFAULT_TTL_MS): Promise<void> {
  const entry: CacheEntry<T> = { data, expiresAt: Date.now() + ttlMs };
  await AsyncStorage.setItem(`cache:${key}`, JSON.stringify(entry));
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`cache:${key}`);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiresAt) {
      await AsyncStorage.removeItem(`cache:${key}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export async function cacheInvalidate(keyPrefix: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const toDelete = keys.filter((k) => k.startsWith(`cache:${keyPrefix}`));
    if (toDelete.length) await AsyncStorage.multiRemove(toDelete);
  } catch { /* noop */ }
}

export async function cacheClear(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((k) => k.startsWith('cache:'));
    if (cacheKeys.length) await AsyncStorage.multiRemove(cacheKeys);
  } catch { /* noop */ }
}

// Stale-while-revalidate: returns cached data immediately, fetches fresh in background
export async function cacheOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = DEFAULT_TTL_MS,
): Promise<{ data: T; fromCache: boolean }> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    // Revalidate in background
    fetcher().then((fresh) => cacheSet(key, fresh, ttlMs)).catch(() => {});
    return { data: cached, fromCache: true };
  }
  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlMs);
  return { data: fresh, fromCache: false };
}
