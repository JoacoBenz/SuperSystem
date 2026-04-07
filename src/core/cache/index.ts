interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, CacheEntry<unknown>>();
const MAX_ENTRIES = 500;

export async function cached<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const entry = store.get(key) as CacheEntry<T> | undefined;

  if (entry && entry.expiresAt > now) {
    return entry.value;
  }

  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlMs });

  // Evict oldest entries if over limit
  if (store.size > MAX_ENTRIES) {
    const keysToDelete = Array.from(store.keys()).slice(0, store.size - MAX_ENTRIES);
    for (const k of keysToDelete) store.delete(k);
  }

  return value;
}

export function invalidateCache(pattern: string): void {
  for (const key of store.keys()) {
    if (key.startsWith(pattern)) {
      store.delete(key);
    }
  }
}

// Cleanup expired entries periodically
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.expiresAt <= now) store.delete(key);
    }
  }, 120_000);
}
