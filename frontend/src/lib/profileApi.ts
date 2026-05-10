import api from "@/lib/axios";
import type { User } from "@/types/auth";

export interface UpdateProfilePayload {
  readonly fullName?: string;
  readonly email?: string;
  readonly phone?: string | null;
  readonly address?: string | null;
}

export const updateProfileViaApi = async (payload: UpdateProfilePayload): Promise<User> => {
  const response = await api.patch<{ data: User }>("/auth/me", payload);
  return response.data.data;
};

export const changePasswordViaApi = async (currentPassword: string, newPassword: string): Promise<User> => {
  const response = await api.put<{ data: { user: User } }>("/auth/change-password", { currentPassword, newPassword });
  return response.data.data.user;
};
