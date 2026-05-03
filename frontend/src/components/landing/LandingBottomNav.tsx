"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Home, LayoutList, LogIn, PanelsTopLeft, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const landingBottomItems = [
  { label: "Beranda", href: "/#top", sectionId: "top", icon: Home },
  { label: "Fitur", href: "/#fitur", sectionId: "fitur", icon: PanelsTopLeft },
  { label: "Alur", href: "/#alur", sectionId: "alur", icon: LayoutList },
  { label: "Keamanan", href: "/#keamanan", sectionId: "keamanan", icon: ShieldCheck },
  { label: "Masuk", href: "/login", sectionId: "login", icon: LogIn },
] as const;

type LandingSectionId = (typeof landingBottomItems)[number]["sectionId"];

export default function LandingBottomNav() {
  const pathname = usePathname();
  const activeSection = useLandingActiveSection();

  return (
    <motion.nav
      aria-label="Navigasi bawah landing PWA"
      className="fixed inset-x-3 bottom-3 z-[30000] rounded-[28px] border border-line bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:hidden"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="grid grid-cols-5 gap-1">
        {landingBottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.sectionId === "login" ? pathname.startsWith("/login") : pathname === "/" && activeSection === item.sectionId;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={`group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-extrabold transition-colors ${
                isActive ? "text-primary" : "text-muted hover:text-primary"
              }`}
            >
              <Icon size={20} strokeWidth={2.4} className={isActive ? "text-primary" : "text-text-main transition-colors group-hover:text-primary"} />
              <span className={`max-w-full truncate transition-colors ${isActive ? "text-primary" : "text-text-main group-hover:text-primary"}`}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
}

function useLandingActiveSection() {
  const [activeSection, setActiveSection] = useState<LandingSectionId>("top");

  useEffect(() => {
    const sectionIds = landingBottomItems.filter((item) => item.sectionId !== "login").map((item) => item.sectionId);
    const visibleSections = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        const [nextSection] = [...visibleSections.entries()].sort((first, second) => second[1] - first[1])[0] ?? ["top"];
        setActiveSection(nextSection as LandingSectionId);
      },
      { rootMargin: "-28% 0px -55% 0px", threshold: [0.12, 0.25, 0.5, 0.75] },
    );

    sectionIds.forEach((sectionId) => {
      const section = document.getElementById(sectionId);
      if (section) observer.observe(section);
    });

    return () => observer.disconnect();
  }, []);

  return activeSection;
}
