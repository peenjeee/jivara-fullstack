"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { getNotificationPatientId, subscribeCurrentBrowserToPush } from "@/helpers/notifications";
import { showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import ToggleRow from "./ToggleRow";

export default function NotificationSettingsForm() {
  const [criticalAlert, setCriticalAlert] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSaving(true);

    try {
      if (criticalAlert) {
        const patientId = getNotificationPatientId(user);
        if (!patientId) throw new Error("Patient ID demo untuk notifikasi belum tersedia.");
        await subscribeCurrentBrowserToPush(patientId);
      }

      showToast("Preferensi notifikasi berhasil disimpan.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal mengaktifkan notifikasi.";
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow id="criticalAlert" title="Peringatan Obat" description="Notifikasi saat pasien memiliki risiko interaksi makanan dan obat tinggi." checked={criticalAlert} onChange={setCriticalAlert} />
      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={isSaving} icon={<Save size={18} />}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
      </div>
    </form>
  );
}
