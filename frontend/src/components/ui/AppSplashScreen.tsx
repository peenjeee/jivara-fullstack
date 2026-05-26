"use client";

import Image from "next/image";
import { AnimatePresence, m } from "motion/react";
import { createContext, useEffect, useMemo, useState, use } from "react";
import { useIsStandalonePwa } from "@/hooks";

const splashSessionKey = "jivara-pwa-splash-shown";
const preSplashDuration = 500;
const mainSplashDuration = 1000;
const exitDuration = 300;

interface SplashScreenContextValue {
  readonly isSplashFinished: boolean;
}

const SplashScreenContext = createContext<SplashScreenContextValue>({ isSplashFinished: true });

export const useSplashScreen = () => use(SplashScreenContext);

export default function AppSplashScreen() {
  const isStandalonePwa = useIsStandalonePwa();
  const shouldShowSplash = useMemo(() => {
    if (!isStandalonePwa) return false;
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(splashSessionKey) !== "true";
  }, [isStandalonePwa]);

  const [phase, setPhase] = useState<"idle" | "pre-splash" | "main-splash" | "done">(() => {
    if (!shouldShowSplash) return "done";
    return "pre-splash";
  });

  useEffect(() => {
    if (!shouldShowSplash || phase === "done" || phase === "idle") return;

    if (phase === "pre-splash") window.sessionStorage.setItem(splashSessionKey, "true");

    const nextPhase = phase === "pre-splash" ? "main-splash" : "done";
    const duration = phase === "pre-splash" ? preSplashDuration : mainSplashDuration;
    const timer = setTimeout(() => setPhase(nextPhase), duration);
    return () => clearTimeout(timer);
  }, [phase, shouldShowSplash]);

  const isReady = phase === "done";

  const splashValue = useMemo(() => ({ isSplashFinished: isReady }), [isReady]);

  return (
    <SplashScreenContext.Provider value={splashValue}>
      <AnimatePresence>
        {phase === "pre-splash" && (
          <m.div
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Image
              src="/images/logo/text.png"
              alt="Jivara"
              width={200}
              height={60}
              priority
              className="h-[60px] w-[200px] object-contain"
            />
          </m.div>
        )}

        {phase === "main-splash" && (
          <m.div
            className="fixed inset-0 z-[100000] flex items-center justify-center bg-white"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: exitDuration / 1000, ease: [0.16, 1, 0.3, 1] }}
          >
            <m.div
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
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </SplashScreenContext.Provider>
  );
}
