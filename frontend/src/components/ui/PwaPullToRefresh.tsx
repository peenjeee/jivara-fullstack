"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useIsStandalonePwa } from "@/hooks";

const threshold = 82;
const maxPull = 124;
const finishDelay = 720;

type RefreshStatus = "idle" | "pulling" | "ready" | "refreshing";

export default function PwaPullToRefresh() {
  const router = useRouter();
  const isStandalonePwa = useIsStandalonePwa();
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const statusRef = useRef<RefreshStatus>("idle");
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<RefreshStatus>("idle");
  const progress = Math.min(pullDistance / threshold, 1);
  const isVisible = status !== "idle";

  const resetPullState = useCallback(() => {
    isTrackingRef.current = false;
    setStatus("idle");
    setPullDistance(0);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("pwa-standalone", isStandalonePwa);
    document.body.classList.toggle("pwa-standalone", isStandalonePwa);

    return () => {
      document.documentElement.classList.remove("pwa-standalone");
      document.body.classList.remove("pwa-standalone");
    };
  }, [isStandalonePwa]);

  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!isStandalonePwa) return;

    const handleTouchStart = (event: TouchEvent) => {
      if (window.scrollY > 0 || shouldIgnoreTarget(event.target)) return;

      startYRef.current = event.touches[0]?.clientY ?? 0;
      isTrackingRef.current = true;
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!isTrackingRef.current || statusRef.current === "refreshing") return;

      const currentY = event.touches[0]?.clientY ?? 0;
      const distance = currentY - startYRef.current;

      if (distance <= 0 || window.scrollY > 0) {
        resetPullState();
        return;
      }

      event.preventDefault();
      const nextDistance = Math.min(distance * 0.58, maxPull);
      setPullDistance(nextDistance);
      setStatus(nextDistance >= threshold ? "ready" : "pulling");
    };

    const handleTouchEnd = () => {
      if (!isTrackingRef.current) return;

      isTrackingRef.current = false;

      if (pullDistanceRef.current >= threshold) {
        setStatus("refreshing");
        setPullDistance(threshold);
        router.refresh();

        window.setTimeout(() => {
          setStatus("idle");
          setPullDistance(0);
        }, finishDelay);
        return;
      }

      resetPullState();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd);
    window.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isStandalonePwa, resetPullState, router]);

  const label = status === "refreshing" ? "Memperbarui ..." : status === "ready" ? "Lepas untuk refresh" : "Tarik untuk refresh";

  return (
    <AnimatePresence>
      {isStandalonePwa && isVisible && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 top-[calc(76px+env(safe-area-inset-top))] z-[40000] flex justify-center px-4 lg:hidden"
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: Math.min(pullDistance * 0.18, 18), scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 rounded-full border border-line bg-white/95 px-4 py-2 text-sm font-extrabold text-text-main shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <motion.span
              className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary"
              animate={status === "refreshing" ? { rotate: 360 } : { rotate: progress * 180 }}
              transition={status === "refreshing" ? { repeat: Infinity, duration: 0.7, ease: "linear" } : { duration: 0.12 }}
            >
              <RefreshCw size={17} strokeWidth={2.5} />
            </motion.span>
            <span>{label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function shouldIgnoreTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(target.closest("[data-lenis-prevent], [role='dialog'], input, textarea, select, [data-pull-refresh-disabled]"));
}
