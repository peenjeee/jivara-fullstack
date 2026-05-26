"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { m } from "motion/react";
import { Home, Info, LayoutList, PanelsTopLeft, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

const landingBottomItems = [
  { label: "Beranda", href: "/#top", sectionId: "top", icon: Home },
  { label: "Fitur", href: "/#fitur", sectionId: "fitur", icon: PanelsTopLeft },
  { label: "Tentang", href: "/#tentang", sectionId: "tentang", icon: Info },
  { label: "Alur", href: "/#alur", sectionId: "alur", icon: LayoutList },
  { label: "Keamanan", href: "/#keamanan", sectionId: "keamanan", icon: ShieldCheck },
] as const;

type LandingSectionId = (typeof landingBottomItems)[number]["sectionId"];

export default function LandingBottomNav() {
  const pathname = usePathname();
  const activeSection = useLandingActiveSection();

  return (
    <m.nav
      aria-label="Navigasi bawah landing PWA"
      className="fixed inset-x-3 bottom-3 z-[30000] rounded-[28px] border border-line bg-white/95 px-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_18px_45px_rgba(15,23,42,0.18)] backdrop-blur-xl lg:hidden"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="grid grid-cols-5 gap-1">
        {landingBottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === "/" && activeSection === item.sectionId;

          return (
            <m.div
              key={item.href}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              whileHover={isActive ? undefined : { y: -2 }}
              whileTap={{ scale: 0.94 }}
            >
              <Link
                href={item.href}
                prefetch
                aria-current={isActive ? "page" : undefined}
                className={`group relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-extrabold transition-colors ${
                  isActive ? "text-primary" : "text-muted hover:text-primary"
                }`}
              >
                <m.span animate={isActive ? { y: -1 } : { y: 0 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>
                  <Icon size={20} strokeWidth={2.4} className={isActive ? "text-primary" : "text-text-main transition-colors group-hover:text-primary"} />
                </m.span>
                <span className={`max-w-full truncate transition-colors ${isActive ? "text-primary" : "text-text-main group-hover:text-primary"}`}>{item.label}</span>
              </Link>
            </m.div>
          );
        })}
      </div>
    </m.nav>
  );
}

function useLandingActiveSection() {
  const [activeSection, setActiveSection] = useState<LandingSectionId>("top");

  useEffect(() => {
    const sectionIds = landingBottomItems.map((item) => item.sectionId);
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

        const visibleEntries = [...visibleSections.entries()];
        const [nextSection] = visibleEntries.length > 0 ? visibleEntries.reduce((best, entry) => entry[1] > best[1] ? entry : best) : ["top"] as [LandingSectionId | "top"];
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
