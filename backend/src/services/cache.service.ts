type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const activeRequests = new Map<string, Promise<unknown>>();
let cacheRevision = 0;

export const getCached = <T>(key: string): T | undefined => {
  const entry = store.get(key);
  if (!entry) return undefined;

  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return undefined;
  }

  return entry.value as T;
};

export const setCached = <T>(key: string, value: T, ttlMs: number) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

export const deleteCachedByPrefix = (prefix: string) => {
  cacheRevision += 1;

  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }

  for (const key of activeRequests.keys()) {
    if (key.startsWith(prefix)) activeRequests.delete(key);
  }
};

export const invalidateDashboardCache = () => deleteCachedByPrefix("dashboard:");

export const invalidateAdherenceCache = () => deleteCachedByPrefix("adherence:");

export const invalidatePatientReadCache = () => deleteCachedByPrefix("patients:");

export const invalidateAccessScopeCache = () => deleteCachedByPrefix("access-scope:");

export const getOrSetCached = async <T>(key: string, ttlMs: number, loader: () => Promise<T>) => {
  const cached = getCached<T>(key);
  if (cached !== undefined) return cached;

  const activeRequest = activeRequests.get(key) as Promise<T> | undefined;
  if (activeRequest) return activeRequest;

  const revision = cacheRevision;
  const request: Promise<T> = loader()
    .then((value) => {
      if (ttlMs > 0 && revision === cacheRevision) setCached(key, value, ttlMs);
      return value;
    })
    .finally(() => {
      if (activeRequests.get(key) === request) activeRequests.delete(key);
    });

  activeRequests.set(key, request);
  return request;
};
