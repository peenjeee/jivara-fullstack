"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LogIn, Mail } from "lucide-react";
import axios from "axios";
import { closeAlert, showError, showLoading, showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import AuthCard from "@/components/ui/AuthCard";
import AuthInput from "@/components/ui/AuthInput";
import Button from "@/components/ui/Button";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPostLoginPath(user: { readonly role?: string | null; readonly accountStatus?: string | null }, callbackUrl: string | null) {
  if (user.role === "admin" && (user.accountStatus ?? "active") !== "active") return "/account-status";
  return callbackUrl?.startsWith("/") ? callbackUrl : "/dashboard";
}

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hasHydrated, user, setAuth, updateToken, updateUser, logout } = useAuthStore();
  const hasTriedRestoreRef = useRef(false);

  useEffect(() => {
    if (!hasHydrated || hasTriedRestoreRef.current) return;
    hasTriedRestoreRef.current = true;

    if (!user) {
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl");
    router.replace(getPostLoginPath(user, callbackUrl));
  }, [hasHydrated, logout, router, searchParams, updateToken, updateUser, user]);

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
      const response = await axios.post("/api/auth/login", {
        identifier,
        password,
      });

      const { user, access_token } = response.data.data;

      if (!access_token || !user) {
        throw new Error("Data autentikasi tidak valid dari server.");
      }

      setAuth(user, access_token);

      showToast("Anda berhasil masuk.", "success");
      const callbackUrl = searchParams.get("callbackUrl");
      router.push(getPostLoginPath(user, callbackUrl));
    } catch {
      closeAlert();
      showError("Login gagal. Periksa kembali email dan kata sandi Anda.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated || user) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="font-body text-sm text-muted">Mohon Tunggu ...</p>
      </div>
    );
  }

  return (
    <AuthCard
      title="Masuk"
      footer={
        <p className="text-muted font-body">
          Belum punya akun?{" "}
          <Link href="/register" prefetch className="font-bold underline hover-text-primary transition-colors hover:text-primary-dark">
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
