"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useEffect, useState } from "react";
import { useIsStandalonePwa } from "@/hooks";

const splashSessionKey = "jivara-pwa-splash-shown";
const splashDuration = 1200;

interface SplashScreenContextValue {
  readonly isSplashFinished: boolean;
}

const SplashScreenContext = createContext<SplashScreenContextValue>({ isSplashFinished: true });

export const useSplashScreen = () => useContext(SplashScreenContext);

export default function AppSplashScreen() {
  const isStandalonePwa = useIsStandalonePwa();
  const [isActive, setIsActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!isStandalonePwa || window.sessionStorage.getItem(splashSessionKey) === "true") {
      return;
    }

    window.sessionStorage.setItem(splashSessionKey, "true");
    setHasStarted(true);
    setIsActive(true);

    const hideTimer = window.setTimeout(() => setIsActive(false), splashDuration);

    return () => {
      window.clearTimeout(hideTimer);
    };
  }, [isStandalonePwa]);

  const isSplashFinished = !isActive && hasStarted;

  return (
    <SplashScreenContext.Provider value={{ isSplashFinished }}>
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-white"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: [0.92, 1, 0.985, 1], y: 0 }}
              exit={{ opacity: 0, scale: 1.03, y: -8 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image 
                src="/images/logo/splash.png" 
                alt="Jivara" 
                width={180} 
                height={180} 
                priority 
                sizes="(max-width: 640px) 150px, 180px" 
                className="h-[150px] w-[150px] rounded-[36px] object-contain sm:h-[180px] sm:w-[180px]" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SplashScreenContext.Provider>
  );
}
