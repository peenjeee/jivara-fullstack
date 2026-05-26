import api from "@/lib/axios";
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
});

const mapFormValuesToPayload = (values: NurseFormValues) => ({
  fullName: values.fullName,
  email: values.email,
  phone: values.phone,
  gender: mapApiGender(values.gender),
  isActive: values.status === "Aktif",
  ...(values.password ? { password: values.password } : {}),
});

let nursesCache: { data: NurseRecord[]; expiresAt: number } | null = null;
let nursesRequest: Promise<NurseRecord[]> | null = null;
const nursePageCacheTtl = 10_000;
const nursePageCache = new Map<string, { data: NursePage; expiresAt: number }>();
const nursePageRequests = new Map<string, Promise<NursePage>>();
const nurseDetailCacheTtl = 30_000;
const nurseDetailCache = new Map<string, { data: NurseRecord; expiresAt: number }>();
const nurseDetailRequests = new Map<string, Promise<NurseRecord>>();

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
  await import("./dashboardApi").then(({ clearDashboardCache }) => clearDashboardCache()).catch(() => undefined);
};

export const getNursesFromApi = async (): Promise<NurseRecord[]> => {
  const now = Date.now();
  if (nursesCache && nursesCache.expiresAt > now) return nursesCache.data;
  if (nursesRequest) return nursesRequest;

  nursesRequest = api.get<PaginatedResponse<NurseResponse>>("/nurses", { params: { limit: 100 } })
    .then((response) => {
      const nurses = response.data.data.map(mapNurse);
      nursesCache = { data: nurses, expiresAt: Date.now() + 30_000 };
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
  const cacheKey = `${page}:${limit}:${search}:${status}`;
  if (params.forceRefresh) {
    nursePageCache.delete(cacheKey);
    nursePageRequests.delete(cacheKey);
  }
  const now = Date.now();
  const cached = nursePageCache.get(cacheKey);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = nursePageRequests.get(cacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<PaginatedResponse<NurseResponse>>("/nurses", { params: { page, limit, ...(search ? { search } : {}), ...(status ? { status } : {}) } })
    .then((response) => {
      const nurses = response.data.data.map(mapNurse);
      const result = {
        nurses,
        meta: response.data.meta ?? { page, limit, total: nurses.length },
      };
      nursePageCache.set(cacheKey, { data: result, expiresAt: Date.now() + nursePageCacheTtl });
      return result;
    })
    .finally(() => {
      nursePageRequests.delete(cacheKey);
    });

  nursePageRequests.set(cacheKey, request);
  return request;
};

export const getNurseByIdFromApi = async (nurseId: string): Promise<NurseRecord> => {
  const now = Date.now();
  const cached = nurseDetailCache.get(nurseId);
  if (cached && cached.expiresAt > now) return cached.data;
  const activeRequest = nurseDetailRequests.get(nurseId);
  if (activeRequest) return activeRequest;

  const request = api.get<SingleNurseResponse<NurseResponse>>(`/nurses/${encodeURIComponent(nurseId)}`)
    .then((response) => {
      const nurse = mapNurse(response.data.data);
      nurseDetailCache.set(nurseId, { data: nurse, expiresAt: Date.now() + nurseDetailCacheTtl });
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
