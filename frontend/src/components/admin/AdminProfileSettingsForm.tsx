"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, Save, User } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";
import { updateProfileViaApi } from "@/lib/profileApi";
import { showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";

const numericPhone = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

export default function AdminProfileSettingsForm() {
  const { user, setAuth } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(() => numericPhone(user?.phone));
  const [isSaving, setIsSaving] = useState(false);

  const updatePhone = (value: string) => {
    setPhone(value.replace(/\D/g, ""));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      showWarning("Nama, email, dan nomor telepon wajib diisi.");
      return;
    }

    if (!user) {
      showWarning("Sesi admin tidak ditemukan. Silakan login ulang.");
      return;
    }

    setIsSaving(true);

    try {
      const updatedUser = await updateProfileViaApi({ fullName: trimmedName, email: trimmedEmail, phone: trimmedPhone });
      setAuth(updatedUser);
      showToast("Profil admin berhasil diperbarui.");
    } catch {
      showWarning("Profil admin gagal diperbarui. Periksa koneksi atau data yang digunakan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <AuthInput
        id="adminSettingsName"
        label="Nama Lengkap"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        icon={<User size={20} />}
        autoComplete="name"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <AuthInput
          id="adminSettingsEmail"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={<Mail size={20} />}
          autoComplete="email"
        />
        <AuthInput
          id="adminSettingsPhone"
          label="Nomor Telepon"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="628..."
          value={phone}
          onChange={(event) => updatePhone(event.target.value)}
          icon={<Phone size={20} />}
          autoComplete="tel"
        />
      </div>
      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />} loading={isSaving}>Simpan</Button>
      </div>
    </form>
  );
}
