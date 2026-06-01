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
  readonly userId?: string | null;
}

export function useActivityBadgeSync({ enabled, role, userId }: UseActivityBadgeSyncOptions) {
  const isSyncingRef = useRef(false);

  const lastSuccessfulSyncAtRef = useRef(0);
  const badgeScopeKey = userId && (role === "patient" || role === "nurse") ? `${role}:${userId}` : null;

  const syncActivityBadge = useCallback(async (forceRefresh = false) => {
    if (!enabled || !badgeScopeKey) return;
    if (isSyncingRef.current) return;

    isSyncingRef.current = true;
    const { setLoading, setUnreadActivityCount, setUnreadActivityScope, unreadActivityCount, unreadActivityScopeKey } = useActivityLogStore.getState();
    if (unreadActivityScopeKey !== badgeScopeKey) {
      setUnreadActivityScope(badgeScopeKey);
    }
    if (unreadActivityScopeKey !== badgeScopeKey || unreadActivityCount === null) setLoading(true);

    try {
      const unreadCount = await getActivityUnreadCountFromApi({ forceRefresh, scopeKey: badgeScopeKey });
      setUnreadActivityCount(unreadCount, badgeScopeKey);
      lastSuccessfulSyncAtRef.current = Date.now();
    } finally {
      setLoading(false);
      isSyncingRef.current = false;
    }
  }, [badgeScopeKey, enabled]);

  useEffect(() => {
    if (!enabled || !badgeScopeKey) {
      const { setLoading, setUnreadActivityScope } = useActivityLogStore.getState();
      setUnreadActivityScope(null);
      setLoading(false);
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
  }, [badgeScopeKey, enabled, syncActivityBadge]);
}
