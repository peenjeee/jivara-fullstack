import api from "@/lib/axios";

export interface PendingRegistrationRecord {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone?: string | null;
  readonly role: string;
  readonly age?: number | null;
  readonly gender?: string | null;
  readonly address?: string | null;
  readonly approvalStatus: string;
  readonly createdAt?: string | null;
}

interface PendingRegistrationsResponse {
  data: PendingRegistrationRecord[];
}

export const getPendingRegistrationsFromApi = async () => {
  const response = await api.get<PendingRegistrationsResponse>("/auth/registrations/pending");
  return response.data.data;
};

export const approveRegistrationViaApi = async (userId: string) => {
  await api.patch(`/auth/registrations/${encodeURIComponent(userId)}/approve`);
};

export const rejectRegistrationViaApi = async (userId: string) => {
  await api.patch(`/auth/registrations/${encodeURIComponent(userId)}/reject`);
};
