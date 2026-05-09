"use client";

import type { ReactNode } from "react";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import { LogOut } from "lucide-react";
import api from "@/lib/axios";
import { SimpleFooter } from "@/components/landing/Footer";
import ForcePasswordChangeModal from "@/components/auth/ForcePasswordChangeModal";
import { showConfirm, showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types/auth";
import { useIsStandalonePwa } from "@/hooks";
import PwaTopLogoBar from "@/components/ui/PwaTopLogoBar";
import DashboardBottomNav from "./DashboardBottomNav";
import DashboardNavbar from "./DashboardNavbar";
import DashboardRouteFallback from "./DashboardRouteFallback";

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

function getFallbackPathForRole(role?: string) {
  return role === "super_admin" ? "/admin-approvals" : "/dashboard";
}

function isPathAllowedForRole(pathname: string, role?: string) {
  if (!role) return false;
  if (pathname.startsWith("/account-status")) return role === "admin";
  if (pathname.startsWith("/settings")) return true;
  if (pathname.startsWith("/dashboard")) return true;
  if (pathname.startsWith("/admin-approvals")) return role === "super_admin";
  if (pathname.startsWith("/activity-log") && role === "super_admin") return true;
  if (pathname.startsWith("/nurses")) return role === "admin" || role === "nurse";
  if (pathname.startsWith("/patients")) return role === "admin" || role === "nurse";
  if (pathname.startsWith("/schedule")) return role === "admin" || role === "nurse" || role === "patient";
  if (pathname.startsWith("/activity-log")) return role === "admin" || role === "nurse" || role === "patient";
  if (pathname.startsWith("/food-scan")) return role === "patient";
  return true;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { logout, refreshToken, user, hasHydrated, updateUser } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckingAccount, setIsCheckingAccount] = useState(false);
  const isSyncingRef = useRef(false);
  const hasBlockedInitialAccountCheckRef = useRef(false);
  const isStandalonePwa = useIsStandalonePwa();
  const pathname = usePathname();
  const router = useRouter();
  const userRole = user?.role;

  const isCurrentRouteAllowed = isPathAllowedForRole(pathname, userRole);
  const fallbackPath = getFallbackPathForRole(userRole);

  const handleRouteClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!userRole || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const link = (event.target as Element | null)?.closest("a[href]");
    const href = link?.getAttribute("href");
    if (!href || href.startsWith("#")) return;

    let nextUrl: URL;
    try {
      nextUrl = new URL(href, window.location.origin);
    } catch {
      return;
    }

    if (nextUrl.origin !== window.location.origin) return;
    if (isPathAllowedForRole(nextUrl.pathname, userRole)) return;

    event.preventDefault();
    event.stopPropagation();
    router.replace(getFallbackPathForRole(userRole));
  };

  const syncCurrentUser = useCallback(async (blockRender = false) => {
    if (!hasHydrated || isLoggingOut) return;

    if (userRole !== "admin") {
      setIsCheckingAccount(false);
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    if (blockRender) setIsCheckingAccount(true);

    try {
      let currentUser: User;

      if (refreshToken) {
        const response = await axios.post(`${api.defaults.baseURL}/auth/status`, { refresh_token: refreshToken });
        currentUser = response.data.data.user;
      } else {
        const response = await api.get("/auth/me");
        currentUser = response.data.data;
      }

      updateUser(currentUser);
      Cookies.set("jivara-role", currentUser.role ?? "", {
        expires: 7,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });
      Cookies.set("jivara-account-status", currentUser.accountStatus ?? "active", {
        expires: 7,
        path: "/",
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
      });

      if (currentUser.role === "admin" && (currentUser.accountStatus ?? "active") !== "active") {
        router.replace("/account-status");
        return;
      }
    } catch {
      // Kegagalan jaringan/refresh bukan bukti akun belum aktif. Jangan redirect agar tidak loop
      // antara /dashboard dan /account-status saat status check transient gagal.
    } finally {
      isSyncingRef.current = false;
      if (blockRender) setIsCheckingAccount(false);
    }
  }, [hasHydrated, isLoggingOut, refreshToken, router, updateUser, userRole]);

  useEffect(() => {
    if (!hasHydrated || !userRole) return;

    if (userRole === "admin" && !hasBlockedInitialAccountCheckRef.current) {
      hasBlockedInitialAccountCheckRef.current = true;
      void Promise.resolve().then(() => syncCurrentUser(true));
    }
    const intervalId = window.setInterval(() => {
      void syncCurrentUser();
    }, 15000);

    const handleFocus = () => {
      void syncCurrentUser();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") void syncCurrentUser();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasHydrated, syncCurrentUser, userRole]);

  useEffect(() => {
    if (!hasHydrated) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    if (!isCurrentRouteAllowed) router.replace(fallbackPath);
  }, [fallbackPath, hasHydrated, isCurrentRouteAllowed, router, user]);

  const handleLogout = async () => {
    const result = await showConfirm("Keluar Akun?", "Anda perlu masuk kembali untuk mengakses data Anda.", "Ya, Keluar");

    if (result.isConfirmed) {
      setIsLoggingOut(true);

      try {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } catch {
        // Logout backend gagal, lanjutkan logout lokal.
      }

      // Bersihkan state lokal
      logout();
      Cookies.remove("jivara-token", { path: "/" });
      Cookies.remove("jivara-role", { path: "/" });
      Cookies.remove("jivara-account-status", { path: "/" });
      window.localStorage.removeItem("jivara-auth-storage");

      window.location.replace("/login");

      // 2. SETELAH pindah halaman, bersihkan cache browser di background
      window.setTimeout(() => {
        fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
        showToast("Berhasil keluar dari akun.", "success");
      }, 800);
    }
  };

  if (isLoggingOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface" aria-label="Keluar akun">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-text-secondary">Sedang keluar ...</p>
        </div>
      </div>
    );
  }

  if (!hasHydrated || !user || isCheckingAccount) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface" aria-label="Memeriksa status akun">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-text-secondary">Memeriksa status akun ...</p>
        </div>
      </div>
    );
  }

  if (!isCurrentRouteAllowed) return <DashboardRouteFallback />;

  return (
    <div className="flex min-h-screen flex-col bg-surface" onClickCapture={handleRouteClickCapture}>
      <DashboardNavbar onLogout={handleLogout} />
      {isStandalonePwa && (
        <PwaTopLogoBar
          rightAction={(
            <button type="button" onClick={handleLogout} className="group inline-flex h-10 w-10 items-center justify-center rounded-full text-text-main transition-colors hover:!text-danger" aria-label="Keluar akun">
              <LogOut size={19} className="transition-colors group-hover:!text-danger" />
            </button>
          )}
        />
      )}
      <div className={`flex-1 ${isStandalonePwa ? "pt-[calc(76px+env(safe-area-inset-top))] pb-28 lg:pt-0 lg:pb-0" : ""}`}>{children}</div>
      <SimpleFooter className={`lg:ml-[280px] ${isStandalonePwa ? "pt-12 pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:pt-8 lg:pb-8" : ""}`} />
      {isStandalonePwa && <DashboardBottomNav />}
      <ForcePasswordChangeModal />
    </div>
  );
}
