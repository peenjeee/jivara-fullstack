"use client";

import { useState, type FormEvent } from "react";
import { Mail, Phone, Save, User } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";
import { showSuccess, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";

export default function ProfileSettingsForm() {
  const { user, token, refreshToken, setAuth } = useAuthStore();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!user) return;

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone) {
      showWarning("Nama, email, dan nomor telepon wajib diisi.");
      return;
    }

    if (token && refreshToken) {
      setAuth({ ...user, fullName: trimmedName, email: trimmedEmail, phone: trimmedPhone }, token, refreshToken);
    }

    showSuccess("Profil berhasil diperbarui.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <AuthInput
        id="settingsName"
        label="Nama Lengkap"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        icon={<User size={20} />}
        autoComplete="name"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <AuthInput
          id="settingsEmail"
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          icon={<Mail size={20} />}
          autoComplete="email"
        />
        <AuthInput
          id="settingsPhone"
          label="Nomor Telepon"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
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
