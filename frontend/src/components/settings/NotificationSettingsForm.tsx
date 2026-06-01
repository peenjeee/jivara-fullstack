"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormDataSkeleton } from "@/components/ui/PageSkeletons";
import { getCachedUserNotificationPreference, getUserNotificationPreferenceFromApi, updateUserNotificationPreferenceViaApi } from "@/lib/notificationSettingsApi";
import { enableUserPushNotifications, getBlockedNotificationPermissionMessage, isBrowserPushPermissionDenied, supportsBrowserPushNotifications } from "@/lib/pushNotifications";
import { showToast, showWarning } from "@/lib/swal";
import ToggleRow from "./ToggleRow";

let notificationSettingsCache: { criticalAlert: boolean } | null = null;

export default function NotificationSettingsForm() {
  const supportsPush = supportsBrowserPushNotifications();
  const cachedPreference = notificationSettingsCache ?? (() => {
    const cachedApiPreference = getCachedUserNotificationPreference("nurse_critical_alert");
    return cachedApiPreference ? { criticalAlert: cachedApiPreference.enabled && !isBrowserPushPermissionDenied() } : null;
  })();
  const [criticalAlert, setCriticalAlert] = useState(() => cachedPreference?.criticalAlert ?? true);
  const [isLoading, setIsLoading] = useState(!cachedPreference);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(Boolean(cachedPreference));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getUserNotificationPreferenceFromApi("nurse_critical_alert")
      .then((preference) => {
        const enabled = preference.enabled && !isBrowserPushPermissionDenied();
        if (isMounted) setCriticalAlert(enabled);
        notificationSettingsCache = { criticalAlert: enabled };
        if (preference.enabled && isBrowserPushPermissionDenied()) {
          void updateUserNotificationPreferenceViaApi("nurse_critical_alert", false);
        }
      })
      .catch(() => {
        const enabled = !isBrowserPushPermissionDenied();
        if (isMounted) setCriticalAlert(enabled);
        notificationSettingsCache = { criticalAlert: enabled };
      })
      .finally(() => {
        if (!isMounted) return;
        setHasLoadedSettings(true);
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supportsPush) return;

    if (criticalAlert && isBrowserPushPermissionDenied()) {
      setCriticalAlert(false);
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", false).catch(() => undefined);
      await showWarning(getBlockedNotificationPermissionMessage(), "Izin Notifikasi Diblokir");
      return;
    }

    setIsSaving(true);

    try {
      if (criticalAlert) await enableUserPushNotifications();
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", criticalAlert);
      showToast("Preferensi notifikasi berhasil disimpan.");
    } catch {
      showToast("Preferensi notifikasi gagal disimpan. Pastikan Browser sudah izin dan mendukung notifikasi.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!supportsPush) return;

    if (enabled && isBrowserPushPermissionDenied()) {
      setCriticalAlert(false);
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", false).catch(() => undefined);
      await showWarning(getBlockedNotificationPermissionMessage(), "Izin Notifikasi Diblokir");
      return;
    }

    setCriticalAlert(enabled);
    notificationSettingsCache = { criticalAlert: enabled };
    setIsSaving(true);
    try {
      if (enabled) await enableUserPushNotifications();
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", enabled);
      showToast(enabled ? "Notifikasi berhasil diaktifkan." : "Notifikasi berhasil dinonaktifkan.");
    } catch {
      setCriticalAlert(false);
      notificationSettingsCache = { criticalAlert: false };
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", false).catch(() => undefined);
      showToast("Preferensi notifikasi gagal disimpan. Pastikan Browser sudah izin dan mendukung notifikasi.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return isLoading && !hasLoadedSettings ? <FormDataSkeleton /> : (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow id="criticalAlert" title="Peringatan Obat" description="Notifikasi saat pasien memiliki risiko interaksi makanan dan obat tinggi." checked={criticalAlert} onChange={(enabled) => { void handleToggle(enabled); }} />
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
