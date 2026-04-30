"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, Phone, User, UserPlus } from "lucide-react";
import api from "@/lib/axios";
import { closeAlert, showError, showLoading, showToast, showWarning } from "@/lib/swal";
import AuthCard from "@/components/ui/AuthCard";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    if (!fullName || !email || !password || !phone || !confirmPassword) {
      setLoading(false);
      showWarning("Harap isi semua kolom yang tersedia.");
      return;
    }

    if (!emailRegex.test(email)) {
      setLoading(false);
      showWarning("Silakan masukkan alamat email yang valid.", "Format Email Salah!");
      return;
    }

    if (password !== confirmPassword) {
      setLoading(false);
      showWarning("Kata sandi dan konfirmasi kata sandi tidak cocok.", "Password Tidak Cocok!");
      return;
    }

    showLoading("Mohon Tunggu", "Sedang mendaftarkan akun Anda...");

    try {
      await api.post("/auth/register", {
        fullName,
        email,
        phone,
        password,
        role: "nurse",
      });

      showToast("Akun Anda telah terdaftar. Silakan masuk.", "success");
      router.push("/login");
    } catch {
      closeAlert();
      showError("Terjadi kesalahan saat mendaftar. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="DAFTAR"
      subtitle="Mulai monitoring kesehatan Pasien Anda bersama Jivara."
      footer={
        <p className="text-muted font-body">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-bold underline hover-text-primary transition-colors hover:text-primary-dark">
            Masuk
          </Link>
        </p>
      }
    >
      <form onSubmit={handleRegister} className="space-y-6" noValidate>
        <AuthInput
          id="fullName"
          label="Nama Lengkap"
          type="text"
          placeholder="Nama Lengkap"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          autoComplete="name"
          icon={<User size={20} />}
        />

        <AuthInput
          id="email"
          label="Email"
          type="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          icon={<Mail size={20} />}
        />

        <AuthInput
          id="phone"
          label="Nomor Telepon"
          type="text"
          placeholder="+628..."
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          autoComplete="tel"
          icon={<Phone size={20} />}
        />

        <AuthInput
          id="password"
          label="Kata Sandi"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          icon={<Lock size={20} />}
        />

        <AuthInput
          id="confirmPassword"
          label="Konfirmasi Kata Sandi"
          type="password"
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          autoComplete="new-password"
          icon={<Lock size={20} />}
        />

        <Button type="submit" className="w-full" icon={<UserPlus size={18} />} loading={loading}>
          Daftar
        </Button>
      </form>
    </AuthCard>
  );
}
