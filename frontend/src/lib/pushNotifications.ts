import api from "@/lib/axios";
import { updateUserNotificationPreferenceViaApi, type UserNotificationPreferenceKey } from "@/lib/notificationSettingsApi";
import type { User } from "@/types/auth";

interface PublicKeyResponse {
  publicKey: string;
}

interface PreferenceResponse {
  patientId: string;
  enabled: boolean;
  subscriptionCount: number;
  activeSubscriptions: number;
}

const firstLoginPromptStoragePrefix = "jivara-notification-first-login-prompt:";
const medicationPreferenceCacheTtl = 30_000;
const currentMedicationPreferenceCacheKey = "current-patient";

const getPushNotificationCache = () => {
  const globalStore = globalThis as typeof globalThis & {
    __jivaraMedicationPreferenceCache?: Map<string, { data: PreferenceResponse; expiresAt: number }>;
    __jivaraMedicationPreferenceRequests?: Map<string, Promise<PreferenceResponse>>;
  };

  globalStore.__jivaraMedicationPreferenceCache ??= new Map();
  globalStore.__jivaraMedicationPreferenceRequests ??= new Map();

  return globalStore;
};

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

export const supportsBrowserPushNotifications = () => {
  if (typeof window === "undefined") return false;
  return window.isSecureContext && "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;
};

export const isBrowserPushPermissionDenied = () => {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  return Notification.permission === "denied";
};

export const getBlockedNotificationPermissionMessage = () => (
  "Mohon izinkan aplikasi/browser untuk izin notifikasi."
);

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
  } catch {
    const staleSubscription = await registration.pushManager.getSubscription();
    await staleSubscription?.unsubscribe().catch(() => undefined);

    try {
      return await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
    } catch {
      throw new Error("Preferensi notifikasi gagal disimpan. Pastikan Browser sudah izin dan mendukung notifikasi.");
    }
  }
};

export const enableMedicationPushNotifications = async () => {
  if (!supportsBrowserPushNotifications()) {
    throw new Error("Browser belum mendukung push notification.");
  }

  return Notification.requestPermission().then((permission) => {
    if (permission !== "granted") {
      throw new Error("Izin notifikasi belum diberikan.");
    }

    return Promise.all([
      api.get<{ data: PublicKeyResponse }>("/notifications/public-key"),
      getServiceWorkerRegistration(),
    ]);
  }).then(([keyResponse, registration]) => getPushSubscription(registration, keyResponse.data.data.publicKey))
    .then((subscription) => api.post("/notifications/subscribe", {
      subscription: subscription.toJSON(),
    }));
};

export const enableUserPushNotifications = async () => {
  if (!supportsBrowserPushNotifications()) {
    throw new Error("Browser belum mendukung push notification.");
  }

  return Notification.requestPermission().then((permission) => {
    if (permission !== "granted") {
      throw new Error("Izin notifikasi belum diberikan.");
    }

    return Promise.all([
      api.get<{ data: PublicKeyResponse }>("/notifications/public-key"),
      getServiceWorkerRegistration(),
    ]);
  }).then(([keyResponse, registration]) => getPushSubscription(registration, keyResponse.data.data.publicKey))
    .then((subscription) => api.post("/notifications/user-subscribe", {
      subscription: subscription.toJSON(),
    }));
};

const getDefaultUserPreferenceKey = (role: string): UserNotificationPreferenceKey | null => {
  if (role === "nurse") return "nurse_critical_alert";
  if (role === "admin") return "admin_critical_activity";
  if (role === "super_admin") return "super_admin_approval";
  return null;
};

const getFirstLoginPromptStorageKey = (user: Pick<User, "id" | "role">) => `${firstLoginPromptStoragePrefix}${user.id}:${user.role}`;

const disableDefaultPushPreference = async (user: Pick<User, "role">) => {
  if (user.role === "patient") {
    await setMedicationPushPreference(false);
    return;
  }

  const preferenceKey = getDefaultUserPreferenceKey(String(user.role));
  if (preferenceKey) await updateUserNotificationPreferenceViaApi(preferenceKey, false);
};

export const promptForFirstLoginPushNotifications = async (user: Pick<User, "id" | "role">) => {
  if (typeof window === "undefined") return;
  if (!supportsBrowserPushNotifications()) {
    await disableDefaultPushPreference(user).catch(() => undefined);
    return;
  }
  if (Notification.permission === "denied") {
    await disableDefaultPushPreference(user).catch(() => undefined);
    return;
  }

  const storageKey = getFirstLoginPromptStorageKey(user);
  if (window.localStorage.getItem(storageKey) === "1") return;
  window.localStorage.setItem(storageKey, "1");

  try {
    if (user.role === "patient") {
      await enableMedicationPushNotifications();
      await setMedicationPushPreference(true);
      return;
    }

    const preferenceKey = getDefaultUserPreferenceKey(String(user.role));
    if (!preferenceKey) return;

    await enableUserPushNotifications();
    await updateUserNotificationPreferenceViaApi(preferenceKey, true);
  } catch {
    await disableDefaultPushPreference(user).catch(() => undefined);
    // User can still enable notifications later from Settings.
  }
};

export const setMedicationPushPreference = async (enabled: boolean) => {
  const response = await api.patch<{ data: PreferenceResponse }>("/notifications/preferences", {
    enabled,
  });

  const cache = getPushNotificationCache();
  cache.__jivaraMedicationPreferenceCache?.set(currentMedicationPreferenceCacheKey, {
    data: response.data.data,
    expiresAt: Date.now() + medicationPreferenceCacheTtl,
  });
  cache.__jivaraMedicationPreferenceCache?.set(response.data.data.patientId, {
    data: response.data.data,
    expiresAt: Date.now() + medicationPreferenceCacheTtl,
  });
};

export const getMedicationPushPreference = async () => {
  const cache = getPushNotificationCache();
  const cached = cache.__jivaraMedicationPreferenceCache?.get(currentMedicationPreferenceCacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const activeRequest = cache.__jivaraMedicationPreferenceRequests?.get(currentMedicationPreferenceCacheKey);
  if (activeRequest) return activeRequest;

  const request = api.get<{ data: PreferenceResponse }>("/notifications/preferences")
    .then((response) => {
      cache.__jivaraMedicationPreferenceCache?.set(currentMedicationPreferenceCacheKey, {
        data: response.data.data,
        expiresAt: Date.now() + medicationPreferenceCacheTtl,
      });
      cache.__jivaraMedicationPreferenceCache?.set(response.data.data.patientId, {
        data: response.data.data,
        expiresAt: Date.now() + medicationPreferenceCacheTtl,
      });
      return response.data.data;
    })
    .finally(() => {
      cache.__jivaraMedicationPreferenceRequests?.delete(currentMedicationPreferenceCacheKey);
    });

  cache.__jivaraMedicationPreferenceRequests?.set(currentMedicationPreferenceCacheKey, request);
  return request;
};
