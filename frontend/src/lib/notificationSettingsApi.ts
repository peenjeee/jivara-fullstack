import api from "@/lib/axios";

export type UserNotificationPreferenceKey = "admin_critical_activity" | "super_admin_approval" | "nurse_critical_alert";

interface UserNotificationPreferenceResponse {
  data: {
    key: UserNotificationPreferenceKey;
    enabled: boolean;
  };
}

export const getUserNotificationPreferenceFromApi = async (key: UserNotificationPreferenceKey) => {
  const response = await api.get<UserNotificationPreferenceResponse>("/notifications/user-preferences", { params: { key } });
  return response.data.data;
};

export const updateUserNotificationPreferenceViaApi = async (key: UserNotificationPreferenceKey, enabled: boolean) => {
  const response = await api.patch<UserNotificationPreferenceResponse>("/notifications/user-preferences", { key, enabled });
  return response.data.data;
};
