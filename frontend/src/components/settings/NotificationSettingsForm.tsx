"use client";

import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { showSuccess } from "@/lib/swal";
import ToggleRow from "./ToggleRow";

export default function NotificationSettingsForm() {
  const [criticalAlert, setCriticalAlert] = useState(true);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    showSuccess("Preferensi notifikasi berhasil disimpan.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow title="Peringatan kritis" description="Notifikasi saat pasien memiliki risiko interaksi makanan dan obat tinggi." checked={criticalAlert} onChange={setCriticalAlert} />
      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />}>Simpan</Button>
      </div>
    </form>
  );
}
