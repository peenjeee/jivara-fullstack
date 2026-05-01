"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Lock, LogIn, Mail } from "lucide-react";
import api from "@/lib/axios";
import { closeAlert, showError, showLoading, showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import AuthCard from "@/components/ui/AuthCard";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);

    if (!identifier || !password) {
      setLoading(false);
      showWarning("Harap isi semua kolom yang tersedia.");
      return;
    }

    if (!emailRegex.test(identifier)) {
      setLoading(false);
      showWarning("Silakan masukkan alamat email yang valid.", "Format Email Salah!");
      return;
    }

    showLoading("Mohon Tunggu", "Sedang masuk ke akun Anda...");

    try {
      const response = await api.post("/auth/login", {
        identifier,
        password,
      });

      const { user, access_token, refresh_token } = response.data.data;

      if (!access_token || !user) {
        throw new Error("Data autentikasi tidak valid dari server.");
      }

      setAuth(user, access_token, refresh_token);
      Cookies.set("jivara-token", access_token, {
        expires: 7,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });

      showToast("Anda berhasil masuk.", "success");
      router.push("/dashboard");
    } catch {
      closeAlert();
      showError("Login gagal. Periksa kembali email dan kata sandi Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Masuk"
      footer={
        <p className="text-muted font-body">
          Belum punya akun?{" "}
          <Link href="/register" className="font-bold underline hover-text-primary transition-colors hover:text-primary-dark">
            Daftar
          </Link>
        </p>
      }
    >
      <form onSubmit={handleLogin} className="space-y-6" noValidate>
        <AuthInput
          id="identifier"
          label="Email"
          type="email"
          placeholder="nama@email.com"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          icon={<Mail size={20} />}
        />

        <AuthInput
          id="password"
          label="Kata Sandi"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          icon={<Lock size={20} />}
        />

        <Button type="submit" className="w-full" icon={<LogIn size={18} />} loading={loading}>
          Masuk
        </Button>
      </form>
    </AuthCard>
  );
}
