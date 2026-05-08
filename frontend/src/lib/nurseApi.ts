import api from "@/lib/axios";
import { nurses as fallbackNurses, type NurseGender, type NurseRecord, type NurseStatus } from "@/lib/mocks/nurses";
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
  createdAt?: string | null;
}

interface SingleNurseResponse<T = NurseResponse> {
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
}

const formatJoinedAt = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
};

const mapGender = (gender?: string | null): NurseGender => gender === "male" ? "Pria" : "Wanita";
const mapStatus = (isActive?: boolean | null): NurseStatus => isActive === false ? "Nonaktif" : "Aktif";
const mapApiGender = (gender: NurseGender) => gender === "Pria" ? "male" : "female";

const mapNurse = (nurse: NurseResponse): NurseRecord => ({
  id: nurse.id,
  fullName: nurse.fullName || nurse.user?.fullName || "-",
  email: nurse.email || nurse.user?.email || "-",
  phone: nurse.phone || nurse.user?.phone || "-",
  gender: mapGender(nurse.gender),
  status: mapStatus(nurse.isActive),
  joinedAt: formatJoinedAt(nurse.createdAt),
  temporaryPassword: false,
});

const mapFormValuesToPayload = (values: NurseFormValues) => ({
  fullName: values.fullName,
  email: values.email,
  phone: values.phone,
  gender: mapApiGender(values.gender),
  isActive: values.status === "Aktif",
  ...(values.password ? { password: values.password } : {}),
});

export const getNursesFromApi = async (): Promise<NurseRecord[]> => {
  const response = await api.get<PaginatedResponse<NurseResponse>>("/nurses", { params: { limit: 100 } });
  const nurses = response.data.data.map(mapNurse);

  return nurses.length > 0 ? nurses : fallbackNurses;
};

export const createNurseViaApi = async (values: NurseFormValues): Promise<NurseRecord> => {
  const response = await api.post<SingleNurseResponse<NurseResponse>>("/nurses", mapFormValuesToPayload(values));
  const createdNurse = mapNurse(response.data.data);

  if (values.status === "Nonaktif") {
    const inactiveResponse = await api.put<SingleNurseResponse<NurseResponse>>(
      `/nurses/${encodeURIComponent(createdNurse.id)}`,
      { isActive: false },
    );
    return { ...mapNurse(inactiveResponse.data.data), temporaryPassword: true };
  }

  return { ...createdNurse, temporaryPassword: true };
};

export const updateNurseViaApi = async (nurseId: string, values: NurseFormValues): Promise<NurseRecord> => {
  const response = await api.put<SingleNurseResponse<NurseResponse>>(`/nurses/${encodeURIComponent(nurseId)}`, mapFormValuesToPayload(values));
  return { ...mapNurse(response.data.data), temporaryPassword: values.password ? true : false };
};

export const deactivateNurseViaApi = async (nurseId: string) => {
  await api.delete(`/nurses/${encodeURIComponent(nurseId)}`);
};

export { fallbackNurses };
