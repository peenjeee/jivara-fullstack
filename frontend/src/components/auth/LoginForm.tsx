"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, LogIn, Mail } from "lucide-react";
import axios from "axios";
import { getApiErrorMessage, isRateLimitError } from "@/lib/apiErrors";
import { promptForFirstLoginPushNotifications } from "@/lib/pushNotifications";
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

function shouldPromptForLoginPushNotifications(user: { readonly role?: string | null; readonly accountStatus?: string | null }) {
  return user.role !== "admin" || (user.accountStatus ?? "active") === "active";
}

export default function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { push, replace } = useRouter();
  const { hasHydrated, user, setAuth, setHasHydrated, logout } = useAuthStore();
  const hasTriedRestoreRef = useRef(false);

  useEffect(() => {
    if (hasHydrated) return;

    const timer = window.setTimeout(() => {
      if (!useAuthStore.getState().hasHydrated) {
        setHasHydrated(true);
      }
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [hasHydrated, setHasHydrated]);

  useEffect(() => {
    if (!hasHydrated || hasTriedRestoreRef.current) return;
    hasTriedRestoreRef.current = true;
    const searchParams = new URLSearchParams(window.location.search);
    const shouldShowLogoutToast = window.sessionStorage.getItem("jivara-logout-success") === "1";
    if (shouldShowLogoutToast) {
      window.sessionStorage.removeItem("jivara-logout-success");
      showToast("Anda berhasil keluar.", "success");
    }

    const reason = searchParams.get("reason");
    if (reason === "unauthenticated" && user) {
      logout();
      return;
    }

    if (!user) {
      return;
    }

    const callbackUrl = searchParams.get("callbackUrl");
    const targetPath = getPostLoginPath(user, callbackUrl);
    replace(targetPath);

    const fallbackTimer = window.setTimeout(() => {
      if (window.location.pathname !== targetPath) {
        window.location.replace(targetPath);
      }
    }, 1500);

    return () => window.clearTimeout(fallbackTimer);
  }, [hasHydrated, logout, replace, user]);

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
      const response = await axios.post("/api/v1/auth/login", {
        identifier,
        password,
      });

      const { user } = response.data.data;

      if (!user) {
        throw new Error("Data autentikasi tidak valid dari server.");
      }

      setAuth(user);
      if (shouldPromptForLoginPushNotifications(user)) {
        void promptForFirstLoginPushNotifications(user);
      }

      showToast("Anda berhasil masuk.", "success");
      const callbackUrl = new URLSearchParams(window.location.search).get("callbackUrl");
      push(getPostLoginPath(user, callbackUrl));
    } catch (error) {
      closeAlert();
      if (isRateLimitError(error)) {
        showWarning(getApiErrorMessage(error, "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi."), "Terlalu Banyak Percobaan");
        return;
      }

      showError("Login gagal. Periksa kembali email dan kata sandi Anda.");
    } finally {
      setLoading(false);
    }
  };

  if (!hasHydrated || user) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-y-4">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
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
          <Link href="/register" prefetch className="font-bold !text-primary underline transition-colors hover:!text-primary-dark">
            Daftar
          </Link>
        </p>
      }
    >
      <form method="post" onSubmit={handleLogin} className="space-y-6" noValidate>
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
