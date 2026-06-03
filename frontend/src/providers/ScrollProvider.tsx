"use client";

import type Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

interface ScrollProviderProps {
  children: ReactNode;
}

interface LenisControl {
  stop: () => void;
  start: () => void;
}

declare global {
  interface Window {
    __lenisControl__?: LenisControl;
  }
}

const lenisExcludedRoutes = [
  "/dashboard",
  "/patients",
  "/schedule",
  "/activity-log",
  "/settings",
  "/food-scan",
  "/nurses",
  "/admin-approvals",
  "/account-status",
];

export default function ScrollProvider({ children }: ScrollProviderProps) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const shouldUseLenis = !lenisExcludedRoutes.some((route) => pathname.startsWith(route));

  useEffect(() => {
    if (!shouldUseLenis) return;

    let isCancelled = false;
    let activeLenis: Lenis | null = null;
    let rafId = 0;

    const startLenis = async () => {
      const { default: LenisConstructor } = await import("lenis");
      if (isCancelled) return;

      const lenis = new LenisConstructor({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: "vertical",
        gestureOrientation: "vertical",
        smoothWheel: true,
        syncTouch: true,
        syncTouchLerp: 0.075,
        wheelMultiplier: 1,
        touchMultiplier: 2,
      });
      activeLenis = lenis;
      lenisRef.current = lenis;

      window.__lenisControl__ = {
        stop: () => lenis.stop(),
        start: () => lenis.start(),
      };

      function raf(time: number) {
        lenis.raf(time);
        rafId = requestAnimationFrame(raf);
      }

      rafId = requestAnimationFrame(raf);
    };

    void startLenis();

    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest("a");
      const lenis = lenisRef.current;
      if (!lenis) return;

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
      isCancelled = true;
      lenisRef.current = null;
      if (rafId) cancelAnimationFrame(rafId);
      activeLenis?.destroy();
      document.removeEventListener("click", handleAnchorClick);
      delete window.__lenisControl__;
    };
  }, [shouldUseLenis]);

  useEffect(() => {
    if (window.location.hash) {
      return;
    }

    const lenis = lenisRef.current;
    if (lenis) {
      lenis.scrollTo(0, { immediate: true });
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return <>{children}</>;
}
