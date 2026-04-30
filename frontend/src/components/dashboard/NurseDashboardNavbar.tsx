"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu } from "lucide-react";
import { useLockBodyScroll } from "@/hooks";
import DashboardSidebar from "./DashboardSidebar";
import type { DashboardNavLabel } from "./navigation";

interface NurseDashboardNavbarProps {
  readonly onLogout: () => void;
}

export default function NurseDashboardNavbar({ onLogout }: NurseDashboardNavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<DashboardNavLabel>("Dashboard");

  useLockBodyScroll(isMenuOpen);

  return (
    <>
      <header className="sticky top-0 z-[10000] bg-white/90 shadow-[0_8px_26px_rgba(15,23,42,0.06)] backdrop-blur-[20px] lg:hidden">
        <div className="flex h-[76px] items-center justify-between px-4">
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main">Jivara</h1>
          <button
            className="flex h-11 w-11 items-center justify-center rounded-xl text-text-main transition-colors"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Buka menu"
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      <aside className="fixed inset-y-0 left-0 z-[10000] hidden w-[280px] flex-col bg-white px-7 py-8 shadow-[8px_0_26px_rgba(15,23,42,0.06)] lg:flex">
        <DashboardSidebar activeItem={activeItem} onActiveChange={setActiveItem} onLogout={onLogout} />
      </aside>

      <AnimatePresence>
        {isMenuOpen && (
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
              className="absolute left-0 top-0 flex h-full w-[82%] max-w-[330px] flex-col bg-bg px-5 pb-5 pt-5 shadow-[10px_0_50px_rgba(15,23,42,0.1)]"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main">Jivara</span>
              </div>

              <DashboardSidebar
                activeItem={activeItem}
                onActiveChange={setActiveItem}
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
