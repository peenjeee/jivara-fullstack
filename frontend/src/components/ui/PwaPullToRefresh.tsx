"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, m } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useEffect, useReducer, useRef } from "react";
import { useIsStandalonePwa } from "@/hooks";

const threshold = 82;
const maxPull = 124;
const finishDelay = 720;

type RefreshStatus = "idle" | "pulling" | "ready" | "refreshing";

type PullState = {
  readonly pullDistance: number;
  readonly status: RefreshStatus;
};

const idlePullState: PullState = { pullDistance: 0, status: "idle" };

const pullStateReducer = (_state: PullState, nextState: PullState) => nextState;

export default function PwaPullToRefresh() {
  const { refresh } = useRouter();
  const isStandalonePwa = useIsStandalonePwa();
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const statusRef = useRef<RefreshStatus>("idle");
  const [pullState, dispatchPullState] = useReducer(pullStateReducer, idlePullState);
  const { pullDistance, status } = pullState;
  const progress = Math.min(pullDistance / threshold, 1);
  const isVisible = status !== "idle";

  // Sync state → refs so touch handlers always read latest in event-callback closures
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
    statusRef.current = status;
  }, [pullDistance, status]);

  useEffect(() => {
    document.documentElement.classList.toggle("pwa-standalone", isStandalonePwa);
    document.body.classList.toggle("pwa-standalone", isStandalonePwa);

    return () => {
      document.documentElement.classList.remove("pwa-standalone");
      document.body.classList.remove("pwa-standalone");
    };
  }, [isStandalonePwa]);

  useEffect(() => {
    if (!isStandalonePwa) return;

    const reset = () => {
      isTrackingRef.current = false;
      statusRef.current = "idle";
      pullDistanceRef.current = 0;
      dispatchPullState(idlePullState);
    };

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
        reset();
        return;
      }

      const nextDistance = Math.min(distance * 0.58, maxPull);
      dispatchPullState({ pullDistance: nextDistance, status: nextDistance >= threshold ? "ready" : "pulling" });
    };

    const handleTouchEnd = () => {
      if (!isTrackingRef.current) return;

      isTrackingRef.current = false;

      if (pullDistanceRef.current >= threshold) {
        dispatchPullState({ pullDistance: threshold, status: "refreshing" });
        refresh();

        window.setTimeout(() => {
          dispatchPullState(idlePullState);
        }, finishDelay);
        return;
      }

      reset();
    };

    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [isStandalonePwa, refresh]);

  const label = status === "refreshing" ? "Memperbarui ..." : status === "ready" ? "Lepas untuk refresh" : "Tarik untuk refresh";

  return (
    <AnimatePresence>
      {isStandalonePwa && isVisible && (
        <m.div
          className="pointer-events-none fixed inset-x-0 top-[calc(76px+env(safe-area-inset-top))] z-[40000] flex justify-center px-4 lg:hidden"
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: Math.min(pullDistance * 0.18, 18), scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center gap-3 rounded-full border border-line bg-white/95 px-4 py-2 text-sm font-extrabold text-text-main shadow-[0_14px_34px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <m.span
              className="grid size-8 place-items-center rounded-full bg-primary/10 text-primary"
              animate={status === "refreshing" ? { rotate: 360 } : { rotate: progress * 180 }}
              transition={status === "refreshing" ? { repeat: Infinity, duration: 0.7, ease: "linear" } : { duration: 0.12 }}
            >
              <RefreshCw size={17} strokeWidth={2.5} />
            </m.span>
            <span>{label}</span>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}

function shouldIgnoreTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(target.closest("[data-lenis-prevent], [role='dialog'], input, textarea, select, [data-pull-refresh-disabled]"));
}
