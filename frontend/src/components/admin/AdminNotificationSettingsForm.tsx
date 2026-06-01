"use client";

import { useEffect, useReducer, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormDataSkeleton } from "@/components/ui/PageSkeletons";
import { getCachedUserNotificationPreference, getUserNotificationPreferenceFromApi, updateUserNotificationPreferenceViaApi, type UserNotificationPreferenceKey } from "@/lib/notificationSettingsApi";
import { enableUserPushNotifications, getBlockedNotificationPermissionMessage, isBrowserPushPermissionDenied, supportsBrowserPushNotifications } from "@/lib/pushNotifications";
import { showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import ToggleRow from "@/components/settings/ToggleRow";

const adminNotificationSettingsCache = new Map<UserNotificationPreferenceKey, boolean>();

interface AdminNotificationSettingsState {
  readonly notificationEnabled: boolean;
  readonly isLoading: boolean;
  readonly hasLoadedSettings: boolean;
  readonly isSaving: boolean;
}

type AdminNotificationSettingsAction =
  | { readonly type: "loadSuccess"; readonly enabled: boolean }
  | { readonly type: "setNotificationEnabled"; readonly enabled: boolean }
  | { readonly type: "setSaving"; readonly value: boolean };

function createInitialAdminNotificationSettingsState(preferenceKey: UserNotificationPreferenceKey): AdminNotificationSettingsState {
  const cachedApiPreference = getCachedUserNotificationPreference(preferenceKey);
  const hasCachedEnabled = adminNotificationSettingsCache.has(preferenceKey) || Boolean(cachedApiPreference);
  const cachedEnabled = adminNotificationSettingsCache.get(preferenceKey)
    ?? (cachedApiPreference ? cachedApiPreference.enabled && !isBrowserPushPermissionDenied() : undefined);
  return {
    notificationEnabled: cachedEnabled ?? true,
    isLoading: !hasCachedEnabled,
    hasLoadedSettings: hasCachedEnabled,
    isSaving: false,
  };
}

function adminNotificationSettingsReducer(state: AdminNotificationSettingsState, action: AdminNotificationSettingsAction): AdminNotificationSettingsState {
  switch (action.type) {
    case "loadSuccess":
      return {
        ...state,
        notificationEnabled: action.enabled,
        isLoading: false,
        hasLoadedSettings: true,
      };
    case "setNotificationEnabled":
      return { ...state, notificationEnabled: action.enabled };
    case "setSaving":
      return { ...state, isSaving: action.value };
    default:
      return state;
  }
}

export default function AdminNotificationSettingsForm() {
  const supportsPush = supportsBrowserPushNotifications();
  const role = useAuthStore((state) => state.user?.role);
  const isSuperAdmin = role === "super_admin";
  const preferenceKey: UserNotificationPreferenceKey = isSuperAdmin ? "super_admin_approval" : "admin_critical_activity";
  const [state, dispatch] = useReducer(adminNotificationSettingsReducer, preferenceKey, createInitialAdminNotificationSettingsState);
  const { notificationEnabled, isLoading, hasLoadedSettings, isSaving } = state;

  useEffect(() => {
    let isMounted = true;

    getUserNotificationPreferenceFromApi(preferenceKey)
      .then((preference) => {
        const enabled = preference.enabled && !isBrowserPushPermissionDenied();
        if (isMounted) dispatch({ type: "loadSuccess", enabled });
        adminNotificationSettingsCache.set(preferenceKey, enabled);
        if (preference.enabled && isBrowserPushPermissionDenied()) {
          void updateUserNotificationPreferenceViaApi(preferenceKey, false);
        }
      })
      .catch(() => {
        const enabled = !isBrowserPushPermissionDenied();
        if (isMounted) dispatch({ type: "loadSuccess", enabled });
        adminNotificationSettingsCache.set(preferenceKey, enabled);
      });

    return () => {
      isMounted = false;
    };
  }, [preferenceKey]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supportsPush) return;

    if (notificationEnabled && isBrowserPushPermissionDenied()) {
      dispatch({ type: "setNotificationEnabled", enabled: false });
      await updateUserNotificationPreferenceViaApi(preferenceKey, false).catch(() => undefined);
      await showWarning(getBlockedNotificationPermissionMessage(), "Izin Notifikasi Diblokir");
      return;
    }

    dispatch({ type: "setSaving", value: true });

    try {
      if (notificationEnabled) await enableUserPushNotifications();
      await updateUserNotificationPreferenceViaApi(preferenceKey, notificationEnabled);
      showToast(`Preferensi notifikasi ${isSuperAdmin ? "Super Admin" : "admin"} berhasil disimpan.`);
    } catch {
      showToast("Preferensi notifikasi gagal disimpan. Pastikan Browser sudah izin dan mendukung notifikasi.", "error");
    } finally {
      dispatch({ type: "setSaving", value: false });
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!supportsPush) return;

    if (enabled && isBrowserPushPermissionDenied()) {
      dispatch({ type: "setNotificationEnabled", enabled: false });
      await updateUserNotificationPreferenceViaApi(preferenceKey, false).catch(() => undefined);
      await showWarning(getBlockedNotificationPermissionMessage(), "Izin Notifikasi Diblokir");
      return;
    }

    dispatch({ type: "setNotificationEnabled", enabled });
    adminNotificationSettingsCache.set(preferenceKey, enabled);
    dispatch({ type: "setSaving", value: true });
    try {
      if (enabled) await enableUserPushNotifications();
      await updateUserNotificationPreferenceViaApi(preferenceKey, enabled);
      showToast(`Notifikasi ${isSuperAdmin ? "Super Admin" : "admin"} berhasil ${enabled ? "diaktifkan" : "dinonaktifkan"}.`);
    } catch {
      dispatch({ type: "setNotificationEnabled", enabled: false });
      adminNotificationSettingsCache.set(preferenceKey, false);
      await updateUserNotificationPreferenceViaApi(preferenceKey, false).catch(() => undefined);
      showToast("Preferensi notifikasi gagal disimpan. Pastikan Browser sudah izin dan mendukung notifikasi.", "error");
    } finally {
      dispatch({ type: "setSaving", value: false });
    }
  };

  return isLoading && !hasLoadedSettings ? <FormDataSkeleton /> : (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow
        id={isSuperAdmin ? "superAdminApprovalNotification" : "adminCriticalActivity"}
        title={isSuperAdmin ? "Approval Admin Baru" : "Aktivitas Kritis"}
        description={isSuperAdmin ? "Notifikasi saat ada pendaftaran admin baru yang perlu disetujui." : "Notifikasi saat ada aktivitas penting yang membutuhkan perhatian admin."}
        checked={notificationEnabled}
        onChange={(enabled) => { void handleToggle(enabled); }}
      />
      {!supportsPush && (
        <p className="rounded-2xl bg-warning/10 px-4 py-3 text-sm font-bold leading-6 text-warning-dark">
          Browser ini belum mendukung push notification atau Jivara belum dibuka melalui HTTPS.
        </p>
      )}
      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />} loading={isSaving} disabled={!supportsPush}>Simpan</Button>
      </div>
    </form>
  );
}
