"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import Button from "@/components/ui/Button";
import { FormDataSkeleton } from "@/components/ui/PageSkeletons";
import { getUserNotificationPreferenceFromApi, updateUserNotificationPreferenceViaApi } from "@/lib/notificationSettingsApi";
import { showToast } from "@/lib/swal";
import ToggleRow from "./ToggleRow";

export default function NotificationSettingsForm() {
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
    setIsSaving(true);

    try {
      await updateUserNotificationPreferenceViaApi("nurse_critical_alert", criticalAlert);
      showToast("Preferensi notifikasi berhasil disimpan.");
    } catch {
      showToast("Preferensi notifikasi gagal disimpan.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  return isLoading ? <FormDataSkeleton /> : (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <ToggleRow id="criticalAlert" title="Peringatan Obat" description="Notifikasi saat pasien memiliki risiko interaksi makanan dan obat tinggi." checked={criticalAlert} onChange={setCriticalAlert} />
      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />} loading={isSaving}>Simpan</Button>
      </div>
    </form>
  );
}
