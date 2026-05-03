"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";
import { useIsStandalonePwa } from "@/hooks";

const showAfter = 420;

export default function BackToTopButton() {
  const [isVisible, setIsVisible] = useState(false);
  const isStandalonePwa = useIsStandalonePwa();

  useEffect(() => {
    const updateVisibility = () => setIsVisible(window.scrollY > showAfter);

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          type="button"
          aria-label="Kembali ke atas"
          onClick={scrollToTop}
          className={`fixed right-4 z-[29000] grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-[0_14px_34px_rgba(20,114,69,0.28)] transition-colors hover:bg-primary-hover sm:right-6 ${
            isStandalonePwa ? "bottom-32 lg:bottom-6" : "bottom-6"
          }`}
          initial={{ opacity: 0, y: 18, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.92 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          <ArrowUp size={20} strokeWidth={2.6} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
