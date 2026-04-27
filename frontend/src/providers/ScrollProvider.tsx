"use client";

import { useEffect, ReactNode } from "react";
import Lenis from "lenis";

interface ScrollProviderProps {
  children: ReactNode;
}

export default function ScrollProvider({ children }: ScrollProviderProps) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

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
      cancelAnimationFrame(rafId);
      lenis.destroy();
      document.removeEventListener("click", handleAnchorClick);
    };
  }, []);

  return <>{children}</>;
}
