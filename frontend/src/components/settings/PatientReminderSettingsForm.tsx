"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormDataSkeleton } from "@/components/ui/PageSkeletons";
import { enableMedicationPushNotifications, getBlockedNotificationPermissionMessage, getCachedMedicationPushPreference, getMedicationPushPreference, isBrowserPushPermissionDenied, setMedicationPushPreference, supportsBrowserPushNotifications } from "@/lib/pushNotifications";
import { showToast, showWarning } from "@/lib/swal";
import ToggleRow from "./ToggleRow";

let patientReminderSettingsCache: { medicineReminder: boolean } | null = null;

export default function PatientReminderSettingsForm() {
  const supportsPush = supportsBrowserPushNotifications();
  const cachedPreference = patientReminderSettingsCache ?? (() => {
    const cachedApiPreference = getCachedMedicationPushPreference();
    return cachedApiPreference ? { medicineReminder: cachedApiPreference.enabled && !isBrowserPushPermissionDenied() } : null;
  })();
  const [medicineReminder, setMedicineReminder] = useState(() => cachedPreference?.medicineReminder ?? true);
  const [isLoading, setIsLoading] = useState(!cachedPreference);
  const [hasLoadedSettings, setHasLoadedSettings] = useState(Boolean(cachedPreference));
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getMedicationPushPreference()
      .then((preference) => {
        const enabled = preference.enabled && !isBrowserPushPermissionDenied();
        if (isMounted) setMedicineReminder(enabled);
        patientReminderSettingsCache = { medicineReminder: enabled };
        if (preference.enabled && isBrowserPushPermissionDenied()) {
          void setMedicationPushPreference(false);
        }
      })
      .catch(() => {
        const enabled = !isBrowserPushPermissionDenied();
        if (isMounted) setMedicineReminder(enabled);
        patientReminderSettingsCache = { medicineReminder: enabled };
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

    if (medicineReminder && isBrowserPushPermissionDenied()) {
      setMedicineReminder(false);
      await setMedicationPushPreference(false).catch(() => undefined);
      await showWarning(getBlockedNotificationPermissionMessage(), "Izin Notifikasi Diblokir");
      return;
    }

    setIsSaving(true);

    try {
      if (medicineReminder) {
        if (!supportsPush) {
          showToast("Browser ini belum mendukung push notification atau belum berjalan di HTTPS.", "warning");
          return;
        }

        await enableMedicationPushNotifications();
      } else {
        await setMedicationPushPreference(false);
      }

      showToast("Preferensi reminder obat berhasil disimpan.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preferensi reminder gagal disimpan.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (!supportsPush) return;

    if (enabled && isBrowserPushPermissionDenied()) {
      setMedicineReminder(false);
      await setMedicationPushPreference(false).catch(() => undefined);
      await showWarning(getBlockedNotificationPermissionMessage(), "Izin Notifikasi Diblokir");
      return;
    }

    setMedicineReminder(enabled);
    patientReminderSettingsCache = { medicineReminder: enabled };
    setIsSaving(true);
    try {
      if (enabled) {
        await enableMedicationPushNotifications();
        await setMedicationPushPreference(true);
      } else {
        await setMedicationPushPreference(false);
      }
      showToast(enabled ? "Reminder obat berhasil diaktifkan." : "Reminder obat berhasil dinonaktifkan.");
    } catch (error) {
      setMedicineReminder(false);
      patientReminderSettingsCache = { medicineReminder: false };
      await setMedicationPushPreference(false).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Preferensi reminder gagal disimpan.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return isLoading && !hasLoadedSettings ? <FormDataSkeleton /> : (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow
        id="medicineReminder"
        title="Reminder minum obat"
        description="Aktifkan notifikasi sesuai jadwal obat dan aturan sebelum/sesudah makan."
        checked={medicineReminder}
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
