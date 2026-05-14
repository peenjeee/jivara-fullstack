"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormDataSkeleton } from "@/components/ui/PageSkeletons";
import { enableMedicationPushNotifications, getMedicationPushPreference, setMedicationPushPreference } from "@/lib/pushNotifications";
import { showToast } from "@/lib/swal";
import ToggleRow from "./ToggleRow";

export default function PatientReminderSettingsForm() {
  const [medicineReminder, setMedicineReminder] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getMedicationPushPreference()
      .then((preference) => {
        if (isMounted) setMedicineReminder(preference.enabled);
      })
      .catch(() => {
        if (isMounted) setMedicineReminder(false);
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
    setIsSaving(true);

    try {
      if (medicineReminder) {
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

  return isLoading ? <FormDataSkeleton /> : (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow
        id="medicineReminder"
        title="Reminder minum obat"
        description="Aktifkan notifikasi sesuai jadwal obat dan aturan sebelum/sesudah makan."
        checked={medicineReminder}
        onChange={setMedicineReminder}
      />
      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />} loading={isSaving}>Simpan</Button>
      </div>
    </form>
  );
}
