"use client";

import { useState, useEffect, useSyncExternalStore } from "react";

/**
 * Hook untuk melacak posisi scroll.
 * Digunakan untuk transisi.
 */
export const useScrollThreshold = (threshold: number = 20) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return isScrolled;
};

/**
 * Hook untuk mengunci body scroll saat modal atau drawer terbuka.
 */
export const useLockBodyScroll = (lock: boolean) => {
  useEffect(() => {
    if (lock) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [lock]);
};

/**
 * Hook untuk mendeteksi app dibuka sebagai installed PWA/standalone.
 */
export const useIsStandalonePwa = () => {
  return useSyncExternalStore((onStoreChange) => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    mediaQuery.addEventListener("change", onStoreChange);

    return () => mediaQuery.removeEventListener("change", onStoreChange);
  }, () => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    return mediaQuery.matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  }, () => false);
};
