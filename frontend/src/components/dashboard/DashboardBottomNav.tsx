"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Settings } from "lucide-react";
import { useActivityLogStore } from "@/store/activityLog";
import { DASHBOARD_NAV_ITEMS } from "./navigation";

const bottomNavItems = [
  ...DASHBOARD_NAV_ITEMS,
  { label: "Pengaturan", href: "/settings", icon: Settings },
] as const;

export default function DashboardBottomNav() {
  const pathname = usePathname();
  const unreadActivityCount = useActivityLogStore((state) => state.activities.filter((activity) => !activity.read).length);

  return (
    <motion.nav
      aria-label="Navigasi bawah PWA"
      className="fixed inset-x-3 bottom-3 z-[30000] rounded-[28px] border border-line bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:hidden"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="grid grid-cols-5 gap-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badgeCount = item.href === "/activity-log" ? unreadActivityCount : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-extrabold transition-colors ${
                isActive ? "text-primary" : "text-muted hover:text-primary"
              }`}
            >
              <span className="relative">
                <Icon size={20} strokeWidth={2.4} className={isActive ? "text-primary" : "text-text-main transition-colors group-hover:text-primary"} />
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black leading-none text-white">
                    {badgeCount > 99 ? "99+" : badgeCount}
                  </span>
                )}
              </span>
              <span className={`max-w-full truncate transition-colors ${isActive ? "text-primary" : "text-text-main group-hover:text-primary"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}
