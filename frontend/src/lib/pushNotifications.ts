import api from "@/lib/axios";
import { updateUserNotificationPreferenceViaApi, type UserNotificationPreferenceKey } from "@/lib/notificationSettingsApi";
import type { User } from "@/types/auth";

interface PatientResponse {
  id: string;
}

interface PublicKeyResponse {
  publicKey: string;
}

interface PreferenceResponse {
  patientId: string;
  enabled: boolean;
  subscriptionCount: number;
  activeSubscriptions: number;
}

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

export const getNotificationPatientId = async () => {
  const response = await api.get<{ data: PatientResponse[] }>("/patients", { params: { limit: 1 } });
  const patient = response.data.data[0];

  if (!patient?.id) {
    throw new Error("Data pasien tidak ditemukan untuk mengaktifkan notifikasi.");
  }

  return patient.id;
};

export const supportsBrowserPushNotifications = () => {
  if (typeof window === "undefined") return false;
  return window.isSecureContext && "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
};

const getServiceWorkerRegistration = async () => {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Browser belum mendukung Service Worker.");
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration("/");
  const registration = existingRegistration ?? await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;
  return registration;
};

const getPushSubscription = async (registration: ServiceWorkerRegistration, publicKey: string) => {
  const applicationServerKey = urlBase64ToUint8Array(publicKey);
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription) return existingSubscription;

  try {
    return await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  } catch (error) {
    const staleSubscription = await registration.pushManager.getSubscription();
    await staleSubscription?.unsubscribe().catch(() => undefined);

    try {
      return await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch {

      const message = error instanceof Error && error.message ? error.message : "Push service error";
      const diagnostics = {
        permission: Notification.permission,
        secureContext: window.isSecureContext,
        hasController: Boolean(navigator.serviceWorker.controller),
        registrationScope: registration.scope,
        serviceWorkerState: registration.active?.state || registration.installing?.state || registration.waiting?.state || null,
      };
      console.warn("[Jivara Push] Subscription failed", { ...diagnostics, errorMessage: message });
      throw new Error("Gagal mengaktifkan notifikasi di browser ini. Pastikan menggunakan HTTPS dan browser mendukung push notification.");
    }
  }
};

export const enableMedicationPushNotifications = async () => {
  if (!supportsBrowserPushNotifications()) {
    throw new Error("Browser belum mendukung push notification.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Izin notifikasi belum diberikan.");
  }

  const [patientId, keyResponse, registration] = await Promise.all([
    getNotificationPatientId(),
    api.get<{ data: PublicKeyResponse }>("/notifications/public-key"),
    getServiceWorkerRegistration(),
  ]);

  const subscription = await getPushSubscription(registration, keyResponse.data.data.publicKey);

  await api.post("/notifications/subscribe", {
    patient_id: patientId,
    subscription: subscription.toJSON(),
  });

  return patientId;
};

export const enableUserPushNotifications = async () => {
  if (!supportsBrowserPushNotifications()) {
    throw new Error("Browser belum mendukung push notification.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Izin notifikasi belum diberikan.");
  }

  const [keyResponse, registration] = await Promise.all([
    api.get<{ data: PublicKeyResponse }>("/notifications/public-key"),
    getServiceWorkerRegistration(),
  ]);

  const subscription = await getPushSubscription(registration, keyResponse.data.data.publicKey);

  await api.post("/notifications/user-subscribe", {
    subscription: subscription.toJSON(),
  });
};

const getDefaultUserPreferenceKey = (role: string): UserNotificationPreferenceKey | null => {
  if (role === "nurse") return "nurse_critical_alert";
  if (role === "admin") return "admin_critical_activity";
  if (role === "super_admin") return "super_admin_approval";
  return null;
};

export const disableDefaultPushPreference = async (user: Pick<User, "role">) => {
  try {
    if (user.role === "patient") {
      await setMedicationPushPreference(false);
      return;
    }

    const preferenceKey = getDefaultUserPreferenceKey(String(user.role));
    if (preferenceKey) await updateUserNotificationPreferenceViaApi(preferenceKey, false);
  } catch (error) {
    console.warn("[Jivara Push] Failed to disable default preference", error);
  }
};

export const tryEnableDefaultPushNotifications = async (user: Pick<User, "role">, options: { requestPermission?: boolean } = {}) => {
  if (typeof window === "undefined") return;
  if (!supportsBrowserPushNotifications()) return;
  if (Notification.permission === "denied") return;
  if (Notification.permission === "default" && options.requestPermission !== true) return;

  try {
    if (user.role === "patient") {
      await enableMedicationPushNotifications();
      await setMedicationPushPreference(true);
      return;
    }

    const preferenceKey = getDefaultUserPreferenceKey(String(user.role));
    if (preferenceKey) {
      await enableUserPushNotifications();
      await updateUserNotificationPreferenceViaApi(preferenceKey, true);
    }
  } catch (error) {
    await disableDefaultPushPreference(user);
    console.warn("[Jivara Push] Default subscription skipped", error);
  }
};

export const setMedicationPushPreference = async (enabled: boolean) => {
  const patientId = await getNotificationPatientId();

  await api.patch("/notifications/preferences", {
    patient_id: patientId,
    enabled,
  });
};

export const getMedicationPushPreference = async () => {
  const patientId = await getNotificationPatientId();
  const response = await api.get<{ data: PreferenceResponse }>("/notifications/preferences", { params: { patient_id: patientId } });
  return response.data.data;
};
