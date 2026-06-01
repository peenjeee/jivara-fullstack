import api from "@/lib/axios";
import { notifyDashboardDataChanged } from "@/lib/cacheEvents";
import type { NurseGender, NurseRecord, NurseStatus } from "@/lib/mocks/nurses";
import type { NurseFormValues } from "@/store/nurses";

interface NurseResponse {
  id: string;
  user?: {
    fullName?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  isActive?: boolean | null;
  assignedPatients?: number | null;
  handledPatients?: number | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
}

interface SingleNurseResponse<T = NurseResponse> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  meta?: { page: number; limit: number; total: number };
}

const formatDate = (value?: string | null, fallback = "-") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const mapGender = (gender?: string | null): NurseGender => gender === "male" ? "Pria" : "Wanita";
const mapStatus = (isActive?: boolean | null): NurseStatus => isActive === false ? "Nonaktif" : "Aktif";
const mapApiGender = (gender: NurseGender) => gender === "Pria" ? "male" : "female";
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const mapNurse = (nurse: NurseResponse): NurseRecord => ({
  id: nurse.id,
  fullName: nurse.fullName || nurse.user?.fullName || "-",
  email: nurse.email || nurse.user?.email || "-",
  phone: nurse.phone || nurse.user?.phone || "-",
  gender: mapGender(nurse.gender),
  status: mapStatus(nurse.isActive),
  joinedAt: formatDate(nurse.createdAt),
  lastVisit: formatDate(nurse.lastLoginAt, "Belum pernah login"),
  temporaryPassword: false,
  assignedPatients: nurse.assignedPatients ?? 0,
  handledPatients: nurse.handledPatients ?? nurse.assignedPatients ?? 0,
});

const mapFormValuesToPayload = (values: NurseFormValues) => ({
  fullName: values.fullName,
  email: values.email,
  phone: values.phone,
  gender: mapApiGender(values.gender),
  isActive: values.status === "Aktif",
  ...(values.password ? { password: values.password } : {}),
});

let nursesCache: { data: NurseRecord[] } | null = null;
let nursesRequest: Promise<NurseRecord[]> | null = null;
const nurseListPageLimit = 100;
const nursePageCacheVersion = "nurse-counts-v2";
const nursePageCache = new Map<string, { data: NursePage }>();
const nursePageRequests = new Map<string, Promise<NursePage>>();
const nurseDetailCache = new Map<string, { data: NurseRecord }>();
const nurseDetailRequests = new Map<string, Promise<NurseRecord>>();

const getNursePageCacheKey = (params: { page?: number; limit?: number; search?: string; status?: "active" | "inactive" } = {}) => {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const search = params.search?.trim() || "";
  const status = params.status || "";

  return `${nursePageCacheVersion}:${page}:${limit}:${search}:${status}`;
};

export type NursePage = {
  nurses: NurseRecord[];
  meta: { page: number; limit: number; total: number };
};

export const clearNursesCache = () => {
  nursesCache = null;
  nursesRequest = null;
  nursePageCache.clear();
  nursePageRequests.clear();
  nurseDetailCache.clear();
  nurseDetailRequests.clear();
};

const clearNurseRelatedCaches = async () => {
  clearNursesCache();
  await Promise.all([
    import("./auditLogApi").then(({ clearAuditLogCache }) => clearAuditLogCache()).catch(() => undefined),
    import("./dashboardApi").then(({ clearDashboardCache }) => clearDashboardCache()).catch(() => undefined),
    import("./notificationActivitiesApi").then(({ clearNotificationActivityCache }) => clearNotificationActivityCache()).catch(() => undefined),
    import("./patientApi").then(({ clearPatientsCache }) => clearPatientsCache()).catch(() => undefined),
    import("./scheduleApi").then(({ clearSchedulesCache }) => clearSchedulesCache()).catch(() => undefined),
  ]);
  notifyDashboardDataChanged("nurses");
};

const getNurseListPageFromApi = async (page: number): Promise<NursePage> => {
  const response = await api.get<PaginatedResponse<NurseResponse>>("/nurses", { params: { page, limit: nurseListPageLimit } });
  const nurses = response.data.data.map(mapNurse);
  return {
    nurses,
    meta: response.data.meta ?? { page, limit: nurseListPageLimit, total: nurses.length },
  };
};

export const getNursesFromApi = async (): Promise<NurseRecord[]> => {
  if (nursesCache) return nursesCache.data;
  if (nursesRequest) return nursesRequest;

  nursesRequest = getNurseListPageFromApi(1)
    .then(async (firstPage) => {
      const totalPages = Math.ceil(firstPage.meta.total / firstPage.meta.limit);
      const remainingPages = totalPages > 1
        ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, index) => getNurseListPageFromApi(index + 2)))
        : [];
      const nurses = [firstPage, ...remainingPages].flatMap((page) => page.nurses);
      nursesCache = { data: nurses };
      return nurses;
    })
    .finally(() => {
      nursesRequest = null;
    });

  return nursesRequest;
};

export const getNursesPageFromApi = async (params: { page?: number; limit?: number; search?: string; status?: "active" | "inactive"; forceRefresh?: boolean } = {}): Promise<NursePage> => {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const search = params.search?.trim() || "";
  const status = params.status || "";
  const cacheKey = getNursePageCacheKey(params);
  if (params.forceRefresh) {
    nursePageCache.delete(cacheKey);
    nursePageRequests.delete(cacheKey);
  }
  const activeRequest = nursePageRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<PaginatedResponse<NurseResponse>>("/nurses", { params: { page, limit, ...(search ? { search } : {}), ...(status ? { status } : {}) } })
    .then((response) => {
      const nurses = response.data.data.map(mapNurse);
      const result = {
        nurses,
        meta: response.data.meta ?? { page, limit, total: nurses.length },
      };
      nursePageCache.set(cacheKey, { data: result });
      return result;
    })
    .finally(() => {
      nursePageRequests.delete(cacheKey);
    });

  nursePageRequests.set(cacheKey, request);
  return request;
};

export const getCachedNursesPageFromApi = (params: { page?: number; limit?: number; search?: string; status?: "active" | "inactive" } = {}): NursePage | null => {
  return nursePageCache.get(getNursePageCacheKey(params))?.data ?? null;
};

export const getNurseByIdFromApi = async (nurseId: string, options: { readonly forceRefresh?: boolean } = {}): Promise<NurseRecord> => {
  if (options.forceRefresh) {
    nurseDetailCache.delete(nurseId);
    nurseDetailRequests.delete(nurseId);
  }
  const activeRequest = nurseDetailRequests.get(nurseId);
  if (activeRequest) return activeRequest;

  const request = api.get<SingleNurseResponse<NurseResponse>>(`/nurses/${encodeURIComponent(nurseId)}`)
    .then((response) => {
      const nurse = mapNurse(response.data.data);
      nurseDetailCache.set(nurseId, { data: nurse });
      return nurse;
    })
    .finally(() => {
      nurseDetailRequests.delete(nurseId);
    });

  nurseDetailRequests.set(nurseId, request);
  return request;
};

const resolveNurseId = async (nurseId: string, values?: Pick<NurseFormValues, "email" | "phone">) => {
  if (isUuid(nurseId)) return nurseId;

  const nurses = await getNursesFromApi();
  const matchedNurse = values
    ? nurses.find((nurse) => nurse.email === values.email || nurse.phone === values.phone)
    : null;

  if (!matchedNurse) {
    throw new Error("NURSE_ID_NOT_RESOLVED");
  }

  return matchedNurse.id;
};

export const createNurseViaApi = async (values: NurseFormValues): Promise<NurseRecord> => {
  const response = await api.post<SingleNurseResponse<NurseResponse>>("/nurses", mapFormValuesToPayload(values));
  const createdNurse = mapNurse(response.data.data);
  await clearNurseRelatedCaches();

  if (values.status === "Nonaktif") {
    const inactiveResponse = await api.put<SingleNurseResponse<NurseResponse>>(
      `/nurses/${encodeURIComponent(createdNurse.id)}`,
      { isActive: false },
    );
    await clearNurseRelatedCaches();
    return { ...mapNurse(inactiveResponse.data.data), temporaryPassword: true };
  }

  return { ...createdNurse, temporaryPassword: true };
};

export const updateNurseViaApi = async (nurseId: string, values: NurseFormValues): Promise<NurseRecord> => {
  const resolvedNurseId = await resolveNurseId(nurseId, values);
  const response = await api.put<SingleNurseResponse<NurseResponse>>(`/nurses/${encodeURIComponent(resolvedNurseId)}`, mapFormValuesToPayload(values));
  await clearNurseRelatedCaches();
  return { ...mapNurse(response.data.data), temporaryPassword: values.password ? true : false };
};

export const deactivateNurseViaApi = async (nurseId: string) => {
  return resolveNurseId(nurseId)
    .then((resolvedNurseId) => api.delete(`/nurses/${encodeURIComponent(resolvedNurseId)}`))
    .then(() => clearNurseRelatedCaches());
};
