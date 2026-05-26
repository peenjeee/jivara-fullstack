"use client";

import type { ReactNode } from "react";
import type { MouseEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import axios from "axios";
import { LogOut } from "lucide-react";
import { SimpleFooter } from "@/components/landing/Footer";
import ForcePasswordChangeModal from "@/components/auth/ForcePasswordChangeModal";
import { showConfirm } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types/auth";
import { useIsStandalonePwa } from "@/hooks";
import PwaTopLogoBar from "@/components/ui/PwaTopLogoBar";
import DashboardBottomNav from "./DashboardBottomNav";
import DashboardNavbar from "./DashboardNavbar";
import DashboardRouteFallback from "./DashboardRouteFallback";
import { getFallbackPathForRole, isPathAllowedForRole } from "./access";

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

const MAX_LOADING_SECONDS = 8;
const USER_STATUS_SYNC_INTERVAL_MS = 60_000;
const USER_STATUS_RATE_LIMIT_BACKOFF_MS = 5 * 60_000;

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { logout, user, hasHydrated, setAuth, setHasHydrated, updateUser } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isRedirectingToLogin, setIsRedirectingToLogin] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  const isSyncingRef = useRef(false);
  const lastUserStatusSyncAtRef = useRef(0);
  const userStatusSyncBlockedUntilRef = useRef(0);
  const isNavigatingAwayRef = useRef(false);
  const isRestoringSessionRef = useRef(false);
  const isStandalonePwa = useIsStandalonePwa();
  const pathname = usePathname();
  const { replace } = useRouter();
  const userRole = user?.role;

  const isCurrentRouteAllowed = isPathAllowedForRole(pathname, userRole);
  const fallbackPath = getFallbackPathForRole(userRole);

  const redirectToLogin = useCallback(() => {
    replace("/login?loggedOut=1");
  }, [replace]);

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
    replace(getFallbackPathForRole(userRole));
  };

  const navigateToLogin = useCallback(async () => {
    if (isNavigatingAwayRef.current) return;
    isNavigatingAwayRef.current = true;
    setIsRedirectingToLogin(true);
    logout();
    window.localStorage.removeItem("jivara-auth-storage");

    try {
      await axios.post("/api/v1/auth/logout", undefined, { timeout: 5000 });
    } catch {
    }

    redirectToLogin();
  }, [logout, redirectToLogin]);

  const restoreSession = useCallback(async () => {
    if (!hasHydrated || user || isLoggingOut || isNavigatingAwayRef.current || isRestoringSessionRef.current) return;

    isRestoringSessionRef.current = true;
    setIsRestoringSession(true);

    try {
      let response;

      try {
        response = await axios.post("/api/v1/auth/status", undefined, { timeout: 5000 });
      } catch {
        response = await axios.post("/api/v1/auth/refresh", undefined, { timeout: 8000 });
      }

      if (isNavigatingAwayRef.current) return;

      const restoredUser: User | undefined = response.data.data.user;
      if (restoredUser) {
        setAuth(restoredUser);
        return;
      }

      navigateToLogin();
    } catch {
      if (!isNavigatingAwayRef.current) {
        navigateToLogin();
      }
    } finally {
      isRestoringSessionRef.current = false;
      setIsRestoringSession(false);
    }
  }, [hasHydrated, isLoggingOut, navigateToLogin, setAuth, user]);

  const restoreSessionRef = useRef(restoreSession);
  useEffect(() => { restoreSessionRef.current = restoreSession; }, [restoreSession]);

  const syncCurrentUser = useCallback(async () => {
    if (!hasHydrated || isLoggingOut || isNavigatingAwayRef.current) return;

    if (userRole !== "admin") return;

    const now = Date.now();
    if (now < userStatusSyncBlockedUntilRef.current) return;
    if (now - lastUserStatusSyncAtRef.current < USER_STATUS_SYNC_INTERVAL_MS) return;

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    lastUserStatusSyncAtRef.current = now;

    try {
      const response = await axios.post("/api/v1/auth/status", undefined, { timeout: 8000 });
      const currentUser: User = response.data.data.user;

      if (!isNavigatingAwayRef.current) updateUser(currentUser);

      if (!isNavigatingAwayRef.current && currentUser.role === "admin" && (currentUser.accountStatus ?? "active") !== "active") {
        replace("/account-status");
        return;
      }
    } catch (error: unknown) {
      if (isNavigatingAwayRef.current) return;
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        userStatusSyncBlockedUntilRef.current = Date.now() + USER_STATUS_RATE_LIMIT_BACKOFF_MS;
        return;
      }
      if (axios.isAxiosError(error) && (error.response?.status === 401 || error.response?.status === 403)) {
        navigateToLogin();
        return;
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [hasHydrated, isLoggingOut, replace, updateUser, userRole, navigateToLogin]);

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
    if (user && hasHydrated) return;
    if (isNavigatingAwayRef.current) return;

    const timer = window.setTimeout(() => void navigateToLogin(), MAX_LOADING_SECONDS * 1000);
    return () => window.clearTimeout(timer);
  }, [user, hasHydrated, navigateToLogin]);

  useEffect(() => {
    if (!hasHydrated || !userRole || isNavigatingAwayRef.current) return;

    if (userRole === "admin") {
      void syncCurrentUser();
    }

    const intervalId = window.setInterval(() => {
      void syncCurrentUser();
    }, USER_STATUS_SYNC_INTERVAL_MS);

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
    if (!hasHydrated || isLoggingOut || isNavigatingAwayRef.current) return;

    if (!user) {
      void restoreSession();
      return;
    }

    if (!isCurrentRouteAllowed) replace(fallbackPath);
  }, [fallbackPath, hasHydrated, isCurrentRouteAllowed, replace, user, isLoggingOut, restoreSession]);

  useEffect(() => {
    if (user || isLoggingOut || isNavigatingAwayRef.current) return;

    const handleResume = () => {
      if (document.visibilityState === "visible") {
        void restoreSessionRef.current();
      }
    };

    window.addEventListener("focus", handleResume);
    window.addEventListener("pageshow", handleResume);
    document.addEventListener("visibilitychange", handleResume);

    return () => {
      window.removeEventListener("focus", handleResume);
      window.removeEventListener("pageshow", handleResume);
      document.removeEventListener("visibilitychange", handleResume);
    };
  }, [isLoggingOut, user]);

  const handleLogout = async () => {
    const result = await showConfirm("Keluar Akun?", "Anda perlu masuk kembali untuk mengakses data Anda.", "Ya, Keluar");

    if (result.isConfirmed) {
      setIsLoggingOut(true);
      isNavigatingAwayRef.current = true;
      setIsRedirectingToLogin(true);

      logout();
      window.localStorage.removeItem("jivara-auth-storage");

      try {
        await axios.post("/api/v1/auth/logout", undefined, { timeout: 5000 });
      } catch {
      }

      window.sessionStorage.setItem("jivara-logout-success", "1");
      redirectToLogin();
    }
  };

  if (isLoggingOut) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface" aria-label="Keluar akun">
        <div className="flex flex-col items-center gap-y-4">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-text-secondary">Sedang keluar ...</p>
        </div>
      </div>
    );
  }

  if (!hasHydrated || !user || isRestoringSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface" aria-label="Memuat halaman">
        <div className="flex flex-col items-center gap-y-4">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm font-medium text-text-secondary">
            {isRedirectingToLogin ? "Mengarahkan ke halaman masuk ..." : "Mohon tunggu ..."}
          </p>
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
            <button type="button" onClick={handleLogout} className="group inline-flex size-10 items-center justify-center rounded-full text-text-main transition-colors hover:!text-danger" aria-label="Keluar akun">
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
