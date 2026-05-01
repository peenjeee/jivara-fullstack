"use client";

import { useState, type FormEvent } from "react";
import { Lock, Save } from "lucide-react";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";
import { showSuccess, showWarning } from "@/lib/swal";

export default function SecuritySettingsForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showWarning("Semua kolom kata sandi wajib diisi.");
      return;
    }

    if (newPassword.length < 6) {
      showWarning("Kata sandi baru minimal 6 karakter.", "Password Terlalu Pendek");
      return;
    }

    if (newPassword !== confirmPassword) {
      showWarning("Konfirmasi kata sandi tidak cocok.", "Password Tidak Cocok");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showSuccess("Kata sandi berhasil diperbarui.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
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
        <Button type="submit" icon={<Save size={18} />}>Simpan</Button>
      </div>
    </form>
  );
}
