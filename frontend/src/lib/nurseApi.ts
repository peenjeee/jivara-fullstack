import api from "@/lib/axios";
import { nurses as fallbackNurses, type NurseGender, type NurseRecord, type NurseStatus } from "@/lib/mocks/nurses";

interface NurseResponse {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  gender?: string | null;
  isActive?: boolean | null;
  createdAt?: string | null;
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

export const getNursesFromApi = async (): Promise<NurseRecord[]> => {
  const response = await api.get<PaginatedResponse<NurseResponse>>("/nurses", { params: { limit: 100 } });
  const nurses = response.data.data.map((nurse) => ({
    id: nurse.id,
    fullName: nurse.fullName,
    email: nurse.email,
    phone: nurse.phone || "-",
    gender: mapGender(nurse.gender),
    status: mapStatus(nurse.isActive),
    joinedAt: formatJoinedAt(nurse.createdAt),
    temporaryPassword: false,
  }));

  return nurses.length > 0 ? nurses : fallbackNurses;
};

export { fallbackNurses };
