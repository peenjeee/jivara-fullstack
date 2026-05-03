"use client";

import type { ReactNode } from "react";
import Cookies from "js-cookie";
import api from "@/lib/axios";
import { SimpleFooter } from "@/components/landing/Footer";
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
  const isStandalonePwa = useIsStandalonePwa();

  const handleLogout = async () => {
    const result = await showConfirm("Keluar Akun?", "Anda perlu masuk kembali untuk mengakses data Anda.", "Ya, Keluar");

    if (result.isConfirmed) {
      try {
        await api.post("/auth/logout", { refresh_token: refreshToken });
      } catch {
        // Logout backend gagal, lanjutkan logout lokal.
      }

      logout();
      Cookies.remove("jivara-token");
      window.localStorage.removeItem("jivara-auth-storage");
      showToast("Berhasil keluar dari akun.", "success");
      window.location.replace("/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <NurseDashboardNavbar onLogout={handleLogout} />
      {isStandalonePwa && <PwaTopLogoBar />}
      <div className={`flex-1 ${isStandalonePwa ? "pt-[calc(76px+env(safe-area-inset-top))] pb-28 lg:pt-0 lg:pb-0" : ""}`}>{children}</div>
      <SimpleFooter className={`lg:ml-[280px] ${isStandalonePwa ? "pb-24 lg:pb-0" : ""}`} />
      {isStandalonePwa && <DashboardBottomNav />}
    </div>
  );
}
