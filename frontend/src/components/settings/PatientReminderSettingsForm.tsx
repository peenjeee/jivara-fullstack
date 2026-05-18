"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormDataSkeleton } from "@/components/ui/PageSkeletons";
import { enableMedicationPushNotifications, getMedicationPushPreference, setMedicationPushPreference, supportsBrowserPushNotifications } from "@/lib/pushNotifications";
import { showToast } from "@/lib/swal";
import ToggleRow from "./ToggleRow";

export default function PatientReminderSettingsForm() {
  const supportsPush = supportsBrowserPushNotifications();
  const [medicineReminder, setMedicineReminder] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getMedicationPushPreference()
      .then((preference) => {
        if (isMounted) setMedicineReminder(preference.enabled);
      })
      .catch(() => {
        if (isMounted) setMedicineReminder(true);
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
    setMedicineReminder(enabled);
    if (!supportsPush) return;

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
      await setMedicationPushPreference(false).catch(() => undefined);
      const message = error instanceof Error ? error.message : "Preferensi reminder gagal disimpan.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return isLoading ? <FormDataSkeleton /> : (
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
