import api from "@/lib/axios";

interface ActivityReadResponse {
  activityId: string;
  readAt?: string | null;
}

interface ActivityReadListResponse {
  data: ActivityReadResponse[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

interface ActivityUnreadCountResponse {
  data: {
    count: number;
  };
}

interface MarkAllUnreadResponse {
  data?: {
    count?: number;
    activityIds?: string[];
  };
}

let activityReadCache: { data: Set<string> } | null = null;
let activityReadRequest: Promise<Set<string>> | null = null;
const scopedActivityReadRequests = new Map<string, Promise<Set<string>>>();
const scopedActivityReadCache = new Map<string, { data: Set<string> }>();
const activityUnreadCountCache = new Map<string, { data: number }>();
const activityUnreadCountRequests = new Map<string, Promise<number>>();
const locallyReadActivityIds = new Set<string>();

type ActivityReadState = {
  readonly id: string;
  readonly read?: boolean;
};

type ActivityReadRequestOptions = {
  forceRefresh?: boolean;
  startDate?: string;
  endDate?: string;
  activityIds?: readonly string[];
  page?: number;
  limit?: number;
  paginateAll?: boolean;
};

const normalizeActivityIds = (activityIds: readonly string[] = []) => [...new Set(activityIds.flatMap((activityId) => {
  const normalizedActivityId = activityId.trim();
  return normalizedActivityId ? [normalizedActivityId] : [];
}))];

export const rememberActivityIdsAsRead = (activityIds: readonly string[]) => {
  normalizeActivityIds(activityIds).forEach((activityId) => locallyReadActivityIds.add(activityId));
};

const mergeKnownReadIds = (readIds: Set<string>) => {
  locallyReadActivityIds.forEach((activityId) => readIds.add(activityId));
  return readIds;
};

export const applyKnownActivityReadState = <T extends ActivityReadState>(activities: readonly T[]): T[] => {
  return activities.map((activity) => (
    activity.read || locallyReadActivityIds.has(activity.id) ? { ...activity, read: true } : activity
  ));
};

export const clearActivityReadCache = (options: { readonly clearKnownReadIds?: boolean } = {}) => {
  activityReadCache = null;
  activityReadRequest = null;
  scopedActivityReadRequests.clear();
  scopedActivityReadCache.clear();
  activityUnreadCountCache.clear();
  activityUnreadCountRequests.clear();
  if (options.clearKnownReadIds) locallyReadActivityIds.clear();
};

export const getActivityReadIdsFromApi = async (options: ActivityReadRequestOptions = {}) => {
  const { startDate, endDate } = options;
  const activityIds = normalizeActivityIds(options.activityIds);
  const isScoped = Boolean(startDate && endDate);
  const hasActivityIdFilter = activityIds.length > 0;
  const shouldPaginateAll = options.paginateAll ?? !hasActivityIdFilter;
  const requestedPage = options.page ?? 1;
  const requestedLimit = options.limit ?? (hasActivityIdFilter ? activityIds.length : 100);
  const cacheScope = isScoped ? `${startDate}_${endDate}` : "all";
  const cacheKey = hasActivityIdFilter
    ? `${cacheScope}:${shouldPaginateAll ? "all-pages" : `${requestedPage}:${requestedLimit}`}:${activityIds.join(",")}`
    : shouldPaginateAll
      ? cacheScope
      : `${cacheScope}:${requestedPage}:${requestedLimit}:any`;
  const useScopedCache = isScoped || hasActivityIdFilter || !shouldPaginateAll;

  if (options.forceRefresh) clearActivityReadCache();

  if (useScopedCache) {
    const cached = scopedActivityReadCache.get(cacheKey);
    if (cached) return mergeKnownReadIds(new Set(cached.data));
    if (scopedActivityReadRequests.has(cacheKey)) return scopedActivityReadRequests.get(cacheKey)!;
  } else {
    if (activityReadCache) return mergeKnownReadIds(new Set(activityReadCache.data));
    if (activityReadRequest) return activityReadRequest;
  }

  const request = (async () => {
    const limit = requestedLimit;
    const readIds = new Set<string>();
    let page = requestedPage;
    let total = 0;

    do {
      const response = await api.get<ActivityReadListResponse>("/activity-reads", {
        params: {
          page,
          limit,
          ...(isScoped ? { start_date: startDate, end_date: endDate } : {}),
          ...(hasActivityIdFilter ? { activity_ids: activityIds.join(",") } : {}),
        },
      });
      const items = response.data.data;
      items.forEach((read) => readIds.add(read.activityId));
      total = response.data.meta?.total ?? readIds.size;
      
      if (items.length === 0) break;
      
      page += 1;
    } while (shouldPaginateAll && readIds.size < total);

    rememberActivityIdsAsRead([...readIds]);
    const mergedReadIds = mergeKnownReadIds(readIds);

    if (useScopedCache) {
      scopedActivityReadCache.set(cacheKey, { data: mergedReadIds });
    } else {
      activityReadCache = { data: mergedReadIds };
    }
    return mergedReadIds;
  })();

  if (useScopedCache) {
    scopedActivityReadRequests.set(cacheKey, request);
    request.finally(() => {
      scopedActivityReadRequests.delete(cacheKey);
    });
    return request;
  }

  activityReadRequest = request.finally(() => {
    activityReadRequest = null;
  });

  return activityReadRequest;
};

export const getActivityUnreadCountFromApi = async (options: { forceRefresh?: boolean; scopeKey?: string | null } = {}) => {
  const scopeKey = options.scopeKey || "current-user";
  if (options.forceRefresh) {
    activityUnreadCountCache.delete(scopeKey);
    activityUnreadCountRequests.delete(scopeKey);
  }
  const cached = activityUnreadCountCache.get(scopeKey);
  if (cached) return cached.data;
  const pendingRequest = activityUnreadCountRequests.get(scopeKey);
  if (pendingRequest) return pendingRequest;

  const request = api.get<ActivityUnreadCountResponse>("/activity-reads/unread-count")
    .then((response) => {
      const count = response.data.data.count;
      activityUnreadCountCache.set(scopeKey, { data: count });
      return count;
    })
    .finally(() => {
      activityUnreadCountRequests.delete(scopeKey);
    });

  activityUnreadCountRequests.set(scopeKey, request);
  return request;
};

export const markActivitiesReadViaApi = async (activityIds: readonly string[]) => {
  const readIds = normalizeActivityIds(activityIds);
  if (readIds.length === 0) return;
  await api.post("/activity-reads", { activityIds: readIds });
  rememberActivityIdsAsRead(readIds);
  clearActivityReadCache();
};

export const markAllUnreadViaApi = async (activityIds: readonly string[] = []) => {
  const readIds = normalizeActivityIds(activityIds);
  const response = await api.post<MarkAllUnreadResponse>("/activity-reads/mark-all-unread", readIds.length > 0 ? { activityIds: readIds } : undefined);
  const responseReadIds = normalizeActivityIds(response.data?.data?.activityIds ?? []);
  rememberActivityIdsAsRead([...readIds, ...responseReadIds]);
  clearActivityReadCache();
};
