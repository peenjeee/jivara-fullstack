export interface PushSubscriptionDTO {
  patientId?: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface UserPushSubscriptionDTO {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}

export interface NotificationPreferenceDTO {
  patientId?: string;
  enabled: boolean;
}

export interface UserNotificationPreferenceDTO {
  key: string;
  enabled: boolean;
}

export interface SendNotificationDTO {
  patientId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  urgency?: "normal" | "high" | "urgent" | "critical";
}
