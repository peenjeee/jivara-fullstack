"use client";

import { useState, type FormEvent } from "react";
import { m } from "motion/react";
import { Lock, Save } from "lucide-react";
import { getApiErrorMessage } from "@/lib/apiErrors";
import api from "@/lib/axios";
import { showError, showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";

export default function ForcePasswordChangeModal() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user?.mustChangePassword) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!newPassword || !confirmPassword) {
      showWarning("Kata sandi baru dan konfirmasi wajib diisi.");
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

    setIsSubmitting(true);

    try {
      const response = await api.post("/auth/complete-password-change", { newPassword });
      const updatedUser = response.data.data.user;

      updateUser({ ...updatedUser, mustChangePassword: false });
      setNewPassword("");
      setConfirmPassword("");
      showToast("Kata sandi berhasil diperbarui.", "success");
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal memperbarui kata sandi. Silakan coba lagi."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60000] flex items-start justify-center overflow-y-auto bg-dark/50 p-4 backdrop-blur-sm sm:items-center" data-lenis-prevent>
      <m.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="force-password-title"
        aria-describedby="force-password-description"
        className="w-full max-w-xl rounded-[32px] bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.24)] sm:p-8"
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="mb-6 space-y-2">
          <h2 id="force-password-title" className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main sm:text-3xl">
            Wajib Ganti Kata Sandi
          </h2>
          <p id="force-password-description" className="text-sm leading-6 text-muted">
            Ganti kata sandi sementara sebelum melanjutkan ke dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <input
            type="email"
            name="username"
            value={user.email}
            readOnly
            autoComplete="username"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
          <AuthInput
            id="forcedNewPassword"
            label="Kata Sandi Baru"
            type="password"
            placeholder="Minimal 8 karakter"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            icon={<Lock size={20} />}
          />
          <AuthInput
            id="forcedConfirmPassword"
            label="Konfirmasi Kata Sandi"
            type="password"
            placeholder="Ulangi kata sandi baru"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            icon={<Lock size={20} />}
          />
          <Button type="submit" className="w-full" icon={<Save size={18} />} loading={isSubmitting}>
            Simpan Kata Sandi
          </Button>
        </form>
      </m.section>
    </div>
  );
}
