"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { showToast } from "@/lib/swal";
import ToggleRow from "@/components/settings/ToggleRow";

export default function AdminNotificationSettingsForm() {
  const [criticalActivity, setCriticalActivity] = useState(true);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    showToast("Preferensi notifikasi admin berhasil disimpan.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow
        id="adminCriticalActivity"
        title="Aktivitas Kritis"
        description="Notifikasi saat sistem mendeteksi aktivitas kritis atau pasien berisiko tinggi."
        checked={criticalActivity}
        onChange={setCriticalActivity}
      />
      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />}>Simpan</Button>
      </div>
    </form>
  );
}
