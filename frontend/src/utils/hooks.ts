"use client";

import { useState, useEffect } from "react";

/**
 * Hook to track window scroll position and determine if it has passed a threshold.
 * Used for navbar background transitions.
 */
export const useScrollThreshold = (threshold: number = 20) => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > threshold);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold]);

  return isScrolled;
};

/**
 * Hook to lock body scroll when a modal or drawer is open.
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
