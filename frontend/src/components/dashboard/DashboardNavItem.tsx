import Link from "next/link";
import type { DashboardNavItemConfig } from "./navigation";

interface DashboardNavItemProps {
  readonly item: DashboardNavItemConfig;
  readonly isActive: boolean;
  readonly badgeCount?: number;
  readonly isBadgeLoading?: boolean;
  readonly onSelect: () => void;
}

export default function DashboardNavItem({ item, isActive, badgeCount = 0, isBadgeLoading = false, onSelect }: DashboardNavItemProps) {
  const Icon = item.icon;
  const hasBadge = !isBadgeLoading && badgeCount > 0;

  return (
    <Link
      href={item.href}
      prefetch
      onClick={onSelect}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
        isActive ? "!text-primary" : "text-text-main hover:bg-surface hover:text-primary"
      }`}
    >
      <Icon size={18} strokeWidth={2.3} className={isActive ? "!text-primary" : undefined} />
      <span className={`min-w-0 flex-1 ${isActive ? "!text-primary" : ""}`}>{item.label}</span>
      {isBadgeLoading && <span className="h-6 min-w-10 shrink-0 animate-pulse rounded-full bg-line" aria-label="Memuat jumlah log aktivitas" />}
      {hasBadge && (
        <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-primary px-2 text-[11px] font-extrabold leading-none text-white">
          {badgeCount > 99 ? "99+" : badgeCount}
        </span>
      )}
    </Link>
  );
}
