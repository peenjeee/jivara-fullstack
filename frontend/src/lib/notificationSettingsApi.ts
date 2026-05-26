import api from "@/lib/axios";

export type UserNotificationPreferenceKey = "admin_critical_activity" | "super_admin_approval" | "nurse_critical_alert";

interface UserNotificationPreferenceResponse {
  data: {
    key: UserNotificationPreferenceKey;
    enabled: boolean;
  };
}

const preferenceCacheTtl = 30_000;

const getPreferenceCache = () => {
  const globalStore = globalThis as typeof globalThis & {
    __jivaraPreferenceCache?: Map<UserNotificationPreferenceKey, { data: UserNotificationPreferenceResponse["data"]; expiresAt: number }>;
    __jivaraPreferenceRequests?: Map<UserNotificationPreferenceKey, Promise<UserNotificationPreferenceResponse["data"]>>;
  };

  globalStore.__jivaraPreferenceCache ??= new Map();
  globalStore.__jivaraPreferenceRequests ??= new Map();

  return {
    cache: globalStore.__jivaraPreferenceCache,
    requests: globalStore.__jivaraPreferenceRequests,
  };
};

export const getUserNotificationPreferenceFromApi = async (key: UserNotificationPreferenceKey) => {
  const { cache, requests } = getPreferenceCache();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const activeRequest = requests.get(key);
  if (activeRequest) return activeRequest;

  const request = api.get<UserNotificationPreferenceResponse>("/notifications/user-preferences", { params: { key } })
    .then((response) => {
      cache.set(key, { data: response.data.data, expiresAt: Date.now() + preferenceCacheTtl });
      return response.data.data;
    })
    .finally(() => {
      requests.delete(key);
    });

  requests.set(key, request);
  return request;
};

export const updateUserNotificationPreferenceViaApi = async (key: UserNotificationPreferenceKey, enabled: boolean) => {
  const { cache } = getPreferenceCache();
  const response = await api.patch<UserNotificationPreferenceResponse>("/notifications/user-preferences", { key, enabled });
  cache.set(key, { data: response.data.data, expiresAt: Date.now() + preferenceCacheTtl });
  return response.data.data;
};
