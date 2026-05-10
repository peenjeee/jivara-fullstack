"use client";

import { useState, type FormEvent } from "react";
import { Lock, Save } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";
import { changePasswordViaApi } from "@/lib/profileApi";
import { showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";

export default function SecuritySettingsForm() {
  const { user, token, setAuth } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showWarning("Semua kolom kata sandi wajib diisi.");
      return;
    }

    if (newPassword.length < 8) {
      showWarning("Kata sandi baru minimal 8 karakter.", "Password Terlalu Pendek");
      return;
    }

    if (newPassword !== confirmPassword) {
      showWarning("Konfirmasi kata sandi tidak cocok.", "Password Tidak Cocok");
      return;
    }

    if (!user) {
      showWarning("Sesi pengguna tidak ditemukan. Silakan login ulang.");
      return;
    }

    setIsSaving(true);

    try {
      const updatedUser = await changePasswordViaApi(currentPassword, newPassword);
      setAuth(updatedUser, token);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Kata sandi berhasil diperbarui.");
    } catch {
      showWarning("Kata sandi gagal diperbarui. Pastikan kata sandi saat ini benar.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <input
        type="email"
        name="username"
        value={user?.email ?? ""}
        readOnly
        autoComplete="username"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
      />
      <AuthInput
        id="currentPassword"
        label="Kata Sandi Saat Ini"
        type="password"
        placeholder="Masukkan kata sandi saat ini"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
        icon={<Lock size={20} />}
        autoComplete="current-password"
      />
      <AuthInput
        id="newPassword"
        label="Kata Sandi Baru"
        type="password"
        placeholder="Masukkan kata sandi baru"
        value={newPassword}
        onChange={(event) => setNewPassword(event.target.value)}
        icon={<Lock size={20} />}
        autoComplete="new-password"
      />
      <AuthInput
        id="confirmNewPassword"
        label="Konfirmasi Kata Sandi"
        type="password"
        placeholder="Ulangi kata sandi baru"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        icon={<Lock size={20} />}
        autoComplete="new-password"
      />
      <div className="flex justify-end pt-2">
        <Button type="submit" icon={<Save size={18} />} loading={isSaving}>Simpan</Button>
      </div>
    </form>
  );
}
