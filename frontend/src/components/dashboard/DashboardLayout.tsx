"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { LogOut } from "lucide-react";
import api from "@/lib/axios";
import { SimpleFooter } from "@/components/landing/Footer";
import ForcePasswordChangeModal from "@/components/auth/ForcePasswordChangeModal";
import { showConfirm, showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import { useIsStandalonePwa } from "@/hooks";
import PwaTopLogoBar from "@/components/ui/PwaTopLogoBar";
import DashboardBottomNav from "./DashboardBottomNav";
import NurseDashboardNavbar from "./NurseDashboardNavbar";

interface DashboardLayoutProps {
  readonly children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { logout, refreshToken } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const isStandalonePwa = useIsStandalonePwa();
  const router = useRouter();

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
      Cookies.remove("jivara-token");
      window.localStorage.removeItem("jivara-auth-storage");

      // 1. Lakukan navigasi client-side DULU agar transisi mulus tanpa layar putih
      router.replace("/login");

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

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <NurseDashboardNavbar onLogout={handleLogout} />
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
