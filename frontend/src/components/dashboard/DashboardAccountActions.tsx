import { LogOut, Settings } from "lucide-react";

interface DashboardAccountActionsProps {
  readonly onLogout: () => void;
}

export default function DashboardAccountActions({ onLogout }: DashboardAccountActionsProps) {
  return (
    <>
      <button className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-muted transition-colors hover:bg-surface hover:text-primary">
        <Settings size={18} />
        Pengaturan
      </button>
      <button
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-muted transition-colors hover:bg-surface hover:text-danger"
        onClick={onLogout}
      >
        <LogOut size={18} />
        Keluar
      </button>
    </>
  );
}
