import Link from "next/link";
import type { DashboardNavItemConfig } from "./navigation";

interface DashboardNavItemProps {
  readonly item: DashboardNavItemConfig;
  readonly isActive: boolean;
  readonly onSelect: () => void;
}

export default function DashboardNavItem({ item, isActive, onSelect }: DashboardNavItemProps) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onSelect}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
        isActive ? "bg-primary/10 !text-primary" : "text-text-main hover:bg-surface hover:text-primary"
      }`}
    >
      {isActive && <span className="absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-primary" />}
      <Icon size={18} strokeWidth={2.3} className={isActive ? "!text-primary" : undefined} />
      <span className={isActive ? "!text-primary" : undefined}>{item.label}</span>
    </Link>
  );
}
