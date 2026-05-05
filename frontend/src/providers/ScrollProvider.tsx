"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

interface ScrollProviderProps {
  children: ReactNode;
}

export default function ScrollProvider({ children }: ScrollProviderProps) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const shouldUseLenis = pathname === "/";

  useEffect(() => {
    if (!shouldUseLenis) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });
    lenisRef.current = lenis;

    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    // Menangani smooth scroll untuk tautan anchor
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");

      if (link && link.getAttribute("href")?.startsWith("/#")) {
        const id = link.getAttribute("href")?.split("#")[1];
        const element = document.getElementById(id || "");
        
        if (element) {
          e.preventDefault();
          lenis.scrollTo(element, { offset: -80 });
          
          window.history.pushState(null, "", `#${id}`);
        }
      } else if (link && link.getAttribute("href")?.startsWith("#")) {
        const id = link.getAttribute("href")?.substring(1);
        const element = document.getElementById(id || "");

        if (element) {
          e.preventDefault();
          lenis.scrollTo(element, { offset: -80 });
          window.history.pushState(null, "", `#${id}`);
        }
      } else if (link && link.getAttribute("href") === "/") {
        if (window.location.pathname === "/") {
          e.preventDefault();
          lenis.scrollTo(0);
          window.history.pushState(null, "", "/");
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    return () => {
      lenisRef.current = null;
      cancelAnimationFrame(rafId);
      lenis.destroy();
      document.removeEventListener("click", handleAnchorClick);
    };
  }, [shouldUseLenis]);

  useEffect(() => {
    if (window.location.hash) {
      return;
    }

    if (shouldUseLenis) lenisRef.current?.scrollTo(0, { immediate: true });
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname, shouldUseLenis]);

  return <>{children}</>;
}
