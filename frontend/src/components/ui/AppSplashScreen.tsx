"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useIsStandalonePwa } from "@/hooks";

const splashSessionKey = "jivara-pwa-splash-shown";
const splashDuration = 1000;

export default function AppSplashScreen() {
  const isStandalonePwa = useIsStandalonePwa();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isStandalonePwa || window.sessionStorage.getItem(splashSessionKey) === "true") return;

    window.sessionStorage.setItem(splashSessionKey, "true");

    const showTimer = window.setTimeout(() => setIsVisible(true), 0);
    const hideTimer = window.setTimeout(() => setIsVisible(false), splashDuration);

    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [isStandalonePwa]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed inset-0 z-[100000] grid place-items-center bg-white"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 10 }}
            animate={{ opacity: 1, scale: [0.92, 1, 0.985, 1], y: 0 }}
            exit={{ opacity: 0, scale: 1.03, y: -8 }}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image src="/images/logo/splash.png" alt="Jivara" width={180} height={180} priority className="h-[150px] w-[150px] rounded-[36px] object-contain sm:h-[180px] sm:w-[180px]" />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
