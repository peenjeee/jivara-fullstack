"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { getUnreadActivityCount } from "@/helpers/activityLogs";
import { patients } from "@/lib/mocks/patients";
import { useActivityLogStore } from "@/store/activityLog";
import { useAuthStore } from "@/store/auth";
import { getDashboardBottomNavItems, getDashboardRole } from "./navigation";

export default function DashboardBottomNav() {
  const pathname = usePathname();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const unreadActivityCount = useActivityLogStore((state) => getUnreadActivityCount(state.activities, dashboardRole === "patient" ? patients[0].id : undefined));
  const bottomNavItems = getDashboardBottomNavItems(dashboardRole);

  if (!hasAuthHydrated) return null;

  return (
    <motion.nav
      aria-label="Navigasi bawah PWA"
      className="fixed inset-x-3 bottom-3 z-[30000] rounded-[28px] border border-line bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:hidden"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className={`grid gap-1 ${bottomNavItems.length === 5 ? "grid-cols-5" : "grid-cols-4"}`}>
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const badgeCount = item.href === "/activity-log" ? unreadActivityCount : 0;
          const isFeatured = "featured" in item && item.featured;

          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: 0.04 + bottomNavItems.indexOf(item) * 0.035 }}
              whileHover={isActive ? undefined : { y: -2 }}
              whileTap={{ scale: 0.94 }}
            >
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[10px] font-extrabold transition-colors ${isFeatured ? "-mt-7 py-1" : "py-2"} ${
                  isActive ? "text-primary" : "text-muted hover:text-primary"
                }`}
              >
                <motion.span
                  className={`relative flex items-center justify-center ${isFeatured ? "h-14 w-14 rounded-full bg-primary text-white" : ""}`}
                  animate={isActive ? { y: -1 } : { y: 0 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                >
                  <Icon size={isFeatured ? 26 : 20} strokeWidth={2.4} className={isFeatured ? "text-white" : isActive ? "text-primary" : "text-text-main transition-colors group-hover:text-primary"} />
                  {badgeCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-black leading-none text-white">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </motion.span>
                <span className={`max-w-full truncate transition-colors ${isActive ? "text-primary" : "text-text-main group-hover:text-primary"}`}>{item.label}</span>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.nav>
  );
}
