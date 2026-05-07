"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu } from "lucide-react";
import { useIsStandalonePwa, useLockBodyScroll } from "@/hooks";
import { useAuthStore } from "@/store/auth";
import DashboardSidebar from "./DashboardSidebar";
import { getDashboardNavItems, getDashboardRole, type DashboardNavLabel, type DashboardRole } from "./navigation";

interface NurseDashboardNavbarProps {
  readonly onLogout: () => void;
}

export default function NurseDashboardNavbar({ onLogout }: NurseDashboardNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const drawerRef = useRef<HTMLElement | null>(null);
  const isStandalonePwa = useIsStandalonePwa();
  const pathname = usePathname();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const activeItem = getActiveNavLabel(pathname, dashboardRole);

  useLockBodyScroll(isMenuOpen);

  useEffect(() => {
    if (!isMenuOpen) return;

    const firstFocusable = drawerRef.current?.querySelector<HTMLAnchorElement | HTMLButtonElement>("a, button");
    firstFocusable?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setIsMenuOpen(false);
      menuButtonRef.current?.focus({ preventScroll: true });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen]);

  return (
    <>
      {!isStandalonePwa && <header className="sticky top-0 z-[35000] bg-surface lg:hidden">
        <div className="flex h-[76px] items-center justify-between px-4">
          <Image src="/images/logo/notext.png" alt="Jivara" width={132} height={42} sizes="118px" priority className="h-auto w-[118px]" />
          <button
            ref={menuButtonRef}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-main transition-colors"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>}

      {hasAuthHydrated && (
        <aside className="fixed inset-y-0 left-0 z-[10000] hidden w-[280px] flex-col bg-white px-7 py-8 shadow-[8px_0_26px_rgba(15,23,42,0.06)] lg:flex">
          <DashboardSidebar activeItem={activeItem} role={dashboardRole} onLogout={onLogout} />
        </aside>
      )}

      <AnimatePresence>
        {isMenuOpen && !isStandalonePwa && hasAuthHydrated && (
          <div className="fixed inset-0 z-[35000] lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/25 backdrop-blur-[6px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.aside
              ref={drawerRef}
              role="dialog"
              aria-modal="true"
              aria-label="Menu dashboard"
              className="absolute left-0 top-0 flex h-full w-[82%] max-w-[330px] flex-col bg-bg px-5 pb-5 pt-5 shadow-[10px_0_50px_rgba(15,23,42,0.1)]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-start justify-between gap-4">
                <Image src="/images/logo/notext.png" alt="Jivara" width={132} height={42} sizes="118px" className="h-auto w-[118px]" />
              </div>

              <DashboardSidebar
                activeItem={activeItem}
                role={dashboardRole}
                onNavigate={() => setIsMenuOpen(false)}
                onLogout={onLogout}
              />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

function getActiveNavLabel(pathname: string, role: DashboardRole): DashboardNavLabel | undefined {
  return getDashboardNavItems(role).find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))?.label;
}
