"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { enableMedicationPushNotifications, setMedicationPushPreference } from "@/lib/pushNotifications";
import { showToast } from "@/lib/swal";
import ToggleRow from "./ToggleRow";

export default function PatientReminderSettingsForm() {
  const [medicineReminder, setMedicineReminder] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow
        id="medicineReminder"
        title="Reminder minum obat"
        description="Aktifkan notifikasi sesuai jadwal obat dan aturan sebelum/sesudah makan."
        checked={medicineReminder}
        onChange={setMedicineReminder}
      />
      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />} disabled={isSaving}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </form>
  );
}
