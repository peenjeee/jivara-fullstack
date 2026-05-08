"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, Save, User } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";
import { showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";

const fallbackAdmin = {
  fullName: "Admin Jivara",
  email: "admin@jivara.id",
  phone: "6281200000000",
};

const numericPhone = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");

export default function AdminProfileSettingsForm() {
  const { user, token, refreshToken, setAuth } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? fallbackAdmin.fullName);
  const [email, setEmail] = useState(user?.email ?? fallbackAdmin.email);
  const [phone, setPhone] = useState(numericPhone(user?.phone ?? fallbackAdmin.phone));

  const updatePhone = (value: string) => {
    setPhone(value.replace(/\D/g, ""));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      showWarning("Nama, email, dan nomor telepon wajib diisi.");
      return;
    }

    if (user && token && refreshToken) {
      setAuth({ ...user, fullName: trimmedName, email: trimmedEmail, phone: trimmedPhone }, token, refreshToken);
    }

    showToast("Profil admin berhasil diperbarui.");
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
        <Button type="submit" icon={<Save size={18} />}>Simpan</Button>
      </div>
    </form>
  );
}
