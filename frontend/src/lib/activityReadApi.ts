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

let activityReadCache: { data: Set<string> } | null = null;
let activityReadRequest: Promise<Set<string>> | null = null;
const scopedActivityReadRequests = new Map<string, Promise<Set<string>>>();
const scopedActivityReadCache = new Map<string, { data: Set<string> }>();
let activityUnreadCountCache: { data: number } | null = null;
let activityUnreadCountRequest: Promise<number> | null = null;

type ActivityReadRequestOptions = {
  forceRefresh?: boolean;
  startDate?: string;
  endDate?: string;
  activityIds?: readonly string[];
  page?: number;
  limit?: number;
  paginateAll?: boolean;
};

export const clearActivityReadCache = () => {
  activityReadCache = null;
  activityReadRequest = null;
  scopedActivityReadRequests.clear();
  scopedActivityReadCache.clear();
  activityUnreadCountCache = null;
  activityUnreadCountRequest = null;
};

export const getActivityReadIdsFromApi = async (options: ActivityReadRequestOptions = {}) => {
  const { startDate, endDate } = options;
  const activityIds = [...new Set(options.activityIds ?? [])].filter(Boolean);
  const isScoped = Boolean(startDate && endDate);
  const hasActivityIdFilter = activityIds.length > 0;
  const shouldPaginateAll = options.paginateAll ?? !hasActivityIdFilter;
  const requestedPage = options.page ?? 1;
  const requestedLimit = options.limit ?? (hasActivityIdFilter ? activityIds.length : 100);
  const cacheKey = shouldPaginateAll
    ? (isScoped ? `${startDate}_${endDate}` : "all")
    : `${isScoped ? `${startDate}_${endDate}` : "all"}:${requestedPage}:${requestedLimit}:${activityIds.join(",") || "any"}`;

  if (options.forceRefresh) clearActivityReadCache();

  if (isScoped || !shouldPaginateAll) {
    const cached = scopedActivityReadCache.get(cacheKey);
    if (cached) return cached.data;
    if (scopedActivityReadRequests.has(cacheKey)) return scopedActivityReadRequests.get(cacheKey)!;
  } else {
    if (activityReadCache) return activityReadCache.data;
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

    if (isScoped || !shouldPaginateAll) {
      scopedActivityReadCache.set(cacheKey, { data: readIds });
    } else {
      activityReadCache = { data: readIds };
    }
    return readIds;
  })();

  if (isScoped || !shouldPaginateAll) {
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

export const getActivityUnreadCountFromApi = async (options: { forceRefresh?: boolean } = {}) => {
  if (options.forceRefresh) {
    activityUnreadCountCache = null;
    activityUnreadCountRequest = null;
  }
  if (activityUnreadCountCache) return activityUnreadCountCache.data;
  if (activityUnreadCountRequest) return activityUnreadCountRequest;

  activityUnreadCountRequest = api.get<ActivityUnreadCountResponse>("/activity-reads/unread-count")
    .then((response) => {
      const count = response.data.data.count;
      activityUnreadCountCache = { data: count };
      return count;
    })
    .finally(() => {
      activityUnreadCountRequest = null;
    });

  return activityUnreadCountRequest;
};

export const markActivitiesReadViaApi = async (activityIds: readonly string[]) => {
  if (activityIds.length === 0) return;
  await api.post("/activity-reads", { activityIds });
  clearActivityReadCache();
};

export const markAllUnreadViaApi = async () => {
  await api.post("/activity-reads/mark-all-unread");
  clearActivityReadCache();
};
