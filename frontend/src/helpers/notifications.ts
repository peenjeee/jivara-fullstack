import api from "@/lib/axios";
import type { User } from "@/types/auth";

export type NotificationUrgency = "normal" | "urgent" | "critical" | "high";

export interface NotificationRecord {
  readonly id: string;
  readonly patientId: string;
  readonly type: string;
  readonly title: string;
  readonly body: string;
  readonly data?: Record<string, unknown> | null;
  readonly status: string;
  readonly urgency: NotificationUrgency;
  readonly scheduledAt?: string | null;
  readonly deliveredAt?: string | null;
  readonly readAt?: string | null;
  readonly createdAt?: string | null;
}

interface NotificationListResponse {
  readonly data: NotificationRecord[];
}

export function getNotificationPatientId(user: User | null) {
  return user?.patientId || process.env.NEXT_PUBLIC_DEMO_PATIENT_ID || null;
}

export async function listNotifications(params: { patientId?: string; type?: string; status?: string; limit?: number } = {}) {
  const { data } = await api.get<NotificationListResponse>("/notifications", {
    params: {
      patient_id: params.patientId,
      type: params.type,
      status: params.status,
      limit: params.limit ?? 10,
    },
  });

  return data.data;
}

export async function markNotificationAsRead(id: string) {
  await api.patch(`/notifications/${id}/read`);
}

export async function subscribeCurrentBrowserToPush(patientId: string) {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    throw new Error("Browser belum mendukung push notification.");
  }

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("NEXT_PUBLIC_VAPID_PUBLIC_KEY belum dikonfigurasi.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Izin notifikasi belum diberikan.");
  }

  const registration = await navigator.serviceWorker.ready;
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await api.post("/notifications/subscribe", {
    patientId,
    subscription: subscription.toJSON(),
  });

  return subscription;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}
