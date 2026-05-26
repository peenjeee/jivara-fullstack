"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

interface DashboardAccountActionsProps {
  readonly onLogout: () => void;
  readonly hideSettings?: boolean;
}

export default function DashboardAccountActions({ onLogout, hideSettings = false }: DashboardAccountActionsProps) {
  const pathname = usePathname();
  const isSettingsActive = pathname.startsWith("/settings");

  return (
    <>
      {!hideSettings && (
        <Link
          href="/settings"
          prefetch
          aria-current={isSettingsActive ? "page" : undefined}
          className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-main transition-colors ${
            isSettingsActive ? "text-primary" : "text-main"
          }`}
        >
          <Settings size={18} />
          Pengaturan
        </Link>
      )}
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-2xl p-3 text-left text-sm font-bold text-main transition-colors hover:bg-surface hover:text-danger"
        onClick={onLogout}
      >
        <LogOut size={18} />
        Keluar
      </button>
    </>
  );
}
