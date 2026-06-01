"use client";

import { useCallback, useEffect, useRef } from "react";
import { getActivityUnreadCountFromApi } from "@/lib/activityReadApi";
import { useActivityLogStore } from "@/store/activityLog";
import type { DashboardRole } from "@/components/dashboard/navigation";

const ACTIVITY_BADGE_FOCUS_SYNC_STALE_MS = 5 * 60_000;
const ACTIVITY_EVENTS_URL = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/activity-events`
  : "/api/v1/activity-events";

interface UseActivityBadgeSyncOptions {
  readonly enabled: boolean;
  readonly role: DashboardRole;
}

export function useActivityBadgeSync({ enabled, role }: UseActivityBadgeSyncOptions) {
  const isSyncingRef = useRef(false);

  const lastSuccessfulSyncAtRef = useRef(0);

  const syncActivityBadge = useCallback(async (forceRefresh = false) => {
    if (!enabled || (role !== "patient" && role !== "nurse")) return;
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    const { setLoading, setUnreadActivityCount, unreadActivityCount } = useActivityLogStore.getState();
    if (unreadActivityCount === null) setLoading(true);

    try {
      const unreadCount = await getActivityUnreadCountFromApi({ forceRefresh });
      setUnreadActivityCount(unreadCount);
      lastSuccessfulSyncAtRef.current = Date.now();
    } finally {
      setLoading(false);
      isSyncingRef.current = false;
    }
  }, [enabled, role]);

  useEffect(() => {
    if (!enabled || (role !== "patient" && role !== "nurse")) {
      useActivityLogStore.getState().setUnreadActivityCount(null);
      return;
    }

    void syncActivityBadge();

    let realtimeSyncTimer: number | null = null;

    const syncFromRealtimeEvent = () => {
      if (realtimeSyncTimer !== null) window.clearTimeout(realtimeSyncTimer);
      realtimeSyncTimer = window.setTimeout(() => {
        realtimeSyncTimer = null;
        void syncActivityBadge(true);
      }, 500);
    };

    const eventSource = new EventSource(ACTIVITY_EVENTS_URL, { withCredentials: true });
    eventSource.addEventListener("activity:changed", syncFromRealtimeEvent);

    const syncIfStale = () => {
      if (Date.now() - lastSuccessfulSyncAtRef.current < ACTIVITY_BADGE_FOCUS_SYNC_STALE_MS) return;
      void syncActivityBadge(true);
    };
    const handleFocus = syncIfStale;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") syncIfStale();
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      eventSource.removeEventListener("activity:changed", syncFromRealtimeEvent);
      eventSource.close();
      if (realtimeSyncTimer !== null) window.clearTimeout(realtimeSyncTimer);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, role, syncActivityBadge]);
}
