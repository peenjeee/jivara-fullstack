"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormDataSkeleton } from "@/components/ui/PageSkeletons";
import { getUserNotificationPreferenceFromApi, updateUserNotificationPreferenceViaApi } from "@/lib/notificationSettingsApi";
import { enableUserPushNotifications, supportsBrowserPushNotifications } from "@/lib/pushNotifications";
import { showToast } from "@/lib/swal";
import ToggleRow from "./ToggleRow";

export default function NotificationSettingsForm() {
  const supportsPush = supportsBrowserPushNotifications();
  const [criticalAlert, setCriticalAlert] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getUserNotificationPreferenceFromApi("nurse_critical_alert")
      .then((preference) => {
        if (isMounted) setCriticalAlert(preference.enabled);
      })
      .catch(() => {
        if (isMounted) setCriticalAlert(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!supportsPush) return;
    setIsSaving(true);

    try {
      if (criticalAlert) await enableUserPushNotifications();
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", criticalAlert);
      showToast("Preferensi notifikasi berhasil disimpan.");
    } catch {
      showToast("Preferensi notifikasi gagal disimpan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    setCriticalAlert(enabled);
    if (!supportsPush) return;

    setIsSaving(true);
    try {
      if (enabled) await enableUserPushNotifications();
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", enabled);
      showToast(enabled ? "Notifikasi berhasil diaktifkan." : "Notifikasi berhasil dinonaktifkan.");
    } catch {
      setCriticalAlert(false);
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", false).catch(() => undefined);
      showToast("Preferensi notifikasi gagal disimpan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return isLoading ? <FormDataSkeleton /> : (
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
