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
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

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

  return nurses;
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
  const resolvedNurseId = await resolveNurseId(nurseId, values);
  const response = await api.put<SingleNurseResponse<NurseResponse>>(`/nurses/${encodeURIComponent(resolvedNurseId)}`, mapFormValuesToPayload(values));
  return { ...mapNurse(response.data.data), temporaryPassword: values.password ? true : false };
};

export const deactivateNurseViaApi = async (nurseId: string) => {
  const resolvedNurseId = await resolveNurseId(nurseId);
  await api.delete(`/nurses/${encodeURIComponent(resolvedNurseId)}`);
};
