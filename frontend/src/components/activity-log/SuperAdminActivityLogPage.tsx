"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import { m } from "motion/react";
import { CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import DatePickerField from "@/components/ui/DatePickerField";
import FilterPills from "@/components/ui/FilterPills";
import { ActivityDataSkeleton, SummaryCardsSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import SearchField from "@/components/ui/SearchField";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import ToolbarCard from "@/components/ui/ToolbarCard";
import { FORM_PILL_INPUT_CLASS } from "@/components/ui/formStyles";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import { getSuperAdminApprovalActivityPageFromApi, type ApprovalLogStatus } from "@/lib/auditLogApi";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useAuthStore } from "@/store/auth";
import ActivityDetailModal from "./ActivityDetailModal";
import ActivityFeed from "./ActivityFeed";

type SuperAdminLogFilter = ApprovalLogStatus;

const pageSize = 10;
const filters: { readonly label: string; readonly value: SuperAdminLogFilter }[] = [
  { label: "Semua", value: "all" },
  { label: "Menunggu", value: "pending" },
  { label: "Diterima", value: "active" },
  { label: "Tolak", value: "rejected" },
  { label: "Suspend", value: "suspended" },
];

let superAdminLogViewCache: {
  activities: ActivityLogRecord[];
  search: string;
  filter: SuperAdminLogFilter;
  date: string;
  activityPage: number;
  totalAuditLogCount: number;
  totalFilteredLogCount: number;
  totalIncomingApprovalCount: number;
  totalProcessedTodayCount: number;
  cachedUserId: string | null;
} | null = null;

interface SuperAdminActivityLogState {
  readonly activities: ActivityLogRecord[];
  readonly search: string;
  readonly filter: SuperAdminLogFilter;
  readonly date: string;
  readonly selectedActivity: ActivityLogRecord | null;
  readonly isLoading: boolean;
  readonly hasLoadedActivities: boolean;
  readonly hasLoadedSummary: boolean;
  readonly isLoadingMore: boolean;
  readonly activityPage: number;
  readonly totalAuditLogCount: number;
  readonly totalFilteredLogCount: number;
  readonly totalIncomingApprovalCount: number;
  readonly totalProcessedTodayCount: number;
}

type SuperAdminActivityLogAction = { readonly type: "patch"; readonly payload: Partial<SuperAdminActivityLogState> };

function superAdminActivityLogReducer(state: SuperAdminActivityLogState, action: SuperAdminActivityLogAction): SuperAdminActivityLogState {
  return action.type === "patch" ? { ...state, ...action.payload } : state;
}

export default function SuperAdminActivityLogPage() {
  const shouldAnimate = useDashboardEntranceMotion();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const cacheIsValid = superAdminLogViewCache !== null && superAdminLogViewCache.cachedUserId === (currentUserId ?? null);
  // Invalidate cache if user changed (outside render)
  useEffect(() => {
    if (currentUserId && superAdminLogViewCache && superAdminLogViewCache.cachedUserId !== currentUserId) {
      superAdminLogViewCache = null;
    }
  }, [currentUserId]);
  const [state, dispatch] = useReducer(superAdminActivityLogReducer, {
    activities: cacheIsValid ? (superAdminLogViewCache?.activities ?? []) : [],
    search: cacheIsValid ? (superAdminLogViewCache?.search ?? "") : "",
    filter: cacheIsValid ? (superAdminLogViewCache?.filter ?? "all") : "all",
    date: cacheIsValid ? (superAdminLogViewCache?.date ?? "") : "",
    selectedActivity: null,
    isLoading: !cacheIsValid,
    hasLoadedActivities: cacheIsValid,
    hasLoadedSummary: cacheIsValid,
    isLoadingMore: false,
    activityPage: cacheIsValid ? (superAdminLogViewCache?.activityPage ?? 1) : 1,
    totalAuditLogCount: cacheIsValid ? (superAdminLogViewCache?.totalAuditLogCount ?? 0) : 0,
    totalFilteredLogCount: cacheIsValid ? (superAdminLogViewCache?.totalFilteredLogCount ?? 0) : 0,
    totalIncomingApprovalCount: cacheIsValid ? (superAdminLogViewCache?.totalIncomingApprovalCount ?? 0) : 0,
    totalProcessedTodayCount: cacheIsValid ? (superAdminLogViewCache?.totalProcessedTodayCount ?? 0) : 0,
  });
  const { activities, search, filter, date, selectedActivity, isLoading, hasLoadedActivities, hasLoadedSummary, isLoadingMore, activityPage, totalAuditLogCount, totalFilteredLogCount, totalIncomingApprovalCount, totalProcessedTodayCount } = state;
  const loadingPagesRef = useRef(new Set<string>());
  const loadedQueryRef = useRef<string | null>(cacheIsValid ? `${superAdminLogViewCache!.activityPage}:${superAdminLogViewCache!.filter}:${superAdminLogViewCache!.date}:${superAdminLogViewCache!.search}` : null);
  const failedQueryRef = useRef<string | null>(null);
  const loadedSummaryRef = useRef(cacheIsValid);
  const stateRef = useRef(state);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadPage = useCallback(async (page: number, options: { readonly forceRefresh?: boolean } = {}) => {
    const forceRefresh = options.forceRefresh ?? false;
    const currentState = stateRef.current;
    const pageKey = `${page}:${currentState.filter}:${currentState.date}:${debouncedSearch}`;
    if (!forceRefresh && page === 1 && loadedQueryRef.current === pageKey) return;
    if (!forceRefresh && page === 1 && failedQueryRef.current === pageKey) return;
    if (loadingPagesRef.current.has(pageKey)) return;

    loadingPagesRef.current.add(pageKey);
    dispatch({ type: "patch", payload: page === 1 ? { isLoading: true } : { isLoadingMore: true } });

    try {
      const response = await getSuperAdminApprovalActivityPageFromApi({
        page,
        limit: pageSize,
        status: currentState.filter === "all" ? undefined : currentState.filter,
        date: currentState.date,
        search: debouncedSearch,
        forceRefresh: page === 1 || forceRefresh,
      });

      const visibleActivities = page === 1 ? response.activities : [...currentState.activities, ...response.activities];
      const hasActiveFilters = Boolean(currentState.search || currentState.date || currentState.filter !== "all");
      const shouldRefreshSummary = page === 1 && (!hasActiveFilters || !loadedSummaryRef.current);

      if (page === 1) {
        loadedQueryRef.current = pageKey;
        failedQueryRef.current = null;
        if (shouldRefreshSummary) loadedSummaryRef.current = true;
      }

      dispatch({
        type: "patch",
        payload: {
          activities: visibleActivities,
          activityPage: page,
          totalFilteredLogCount: response.meta.total,
          ...(shouldRefreshSummary ? {
            hasLoadedSummary: true,
            totalAuditLogCount: response.meta.total,
            totalIncomingApprovalCount: response.meta.summary?.pending ?? 0,
            totalProcessedTodayCount: response.meta.summary?.processedToday ?? 0,
          } : {}),
        },
      });

      superAdminLogViewCache = {
        activities: visibleActivities,
        search: currentState.search,
        filter: currentState.filter,
        date: currentState.date,
        activityPage: page,
        totalAuditLogCount: shouldRefreshSummary ? response.meta.total : (superAdminLogViewCache?.totalAuditLogCount ?? currentState.totalAuditLogCount),
        totalFilteredLogCount: response.meta.total,
        totalIncomingApprovalCount: shouldRefreshSummary ? (response.meta.summary?.pending ?? 0) : (superAdminLogViewCache?.totalIncomingApprovalCount ?? currentState.totalIncomingApprovalCount),
        totalProcessedTodayCount: shouldRefreshSummary ? (response.meta.summary?.processedToday ?? 0) : (superAdminLogViewCache?.totalProcessedTodayCount ?? currentState.totalProcessedTodayCount),
        cachedUserId: currentUserId ?? null,
      };
    } catch {
      if (page === 1) {
        failedQueryRef.current = pageKey;
        dispatch({ type: "patch", payload: { activities: [], totalFilteredLogCount: 0 } });
      }
    } finally {
      loadingPagesRef.current.delete(pageKey);
      dispatch({ type: "patch", payload: page === 1 ? { hasLoadedActivities: true, isLoading: false } : { isLoadingMore: false } });
    }
  }, [currentUserId, debouncedSearch]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPage(1, { forceRefresh: true });
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [date, debouncedSearch, filter, loadPage]);

  const filteredActivities = useMemo(() => {
    return activities.toSorted((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  }, [activities]);

  const stats = [
    { label: "Total Semua Aktivitas", value: String(totalAuditLogCount), tone: "neutral" as const, color: "pine" as const, icon: ClipboardList },
    { label: "Approval Akun Masuk", value: String(totalIncomingApprovalCount), tone: "safe" as const, color: "leaf" as const, icon: Clock3 },
    { label: "Sudah Diproses Hari Ini", value: String(totalProcessedTodayCount), tone: "critical" as const, color: "lime" as const, icon: CheckCircle2 },
  ];

  const hasActiveFilters = Boolean(search || date || filter !== "all");
  const hasMoreFromServer = activityPage * pageSize < totalFilteredLogCount;

  const resetFilters = () => {
    loadedQueryRef.current = null;
    dispatch({ type: "patch", payload: { search: "", filter: "all", date: "" } });
  };

  const loadMoreActivities = () => {
    if (!hasMoreFromServer || isLoadingMore) return;
    void loadPage(activityPage + 1);
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Log Aktivitas" />
      {!hasLoadedSummary ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={stats} />}

      <m.div className="mt-6" {...getDashboardEntranceMotion(shouldAnimate, 0.32, 20)}>
        {isLoading && !hasLoadedActivities ? <ToolbarSkeleton /> : <ToolbarCard>
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_auto] lg:items-center">
            <SearchField id="superAdminActivitySearch" value={search} placeholder="Cari aktivitas ..." onChange={(value) => { failedQueryRef.current = null; dispatch({ type: "patch", payload: { search: value } }); }} />
            <DatePickerField id="superAdminActivityDate" value={date} mode="range" popoverAlign="right" className={FORM_PILL_INPUT_CLASS} onChange={(value) => { failedQueryRef.current = null; dispatch({ type: "patch", payload: { date: value } }); }} />
            {hasActiveFilters && <Button type="button" size="sm" variant="outline" onClick={resetFilters} className="w-full lg:w-auto">Reset</Button>}
          </div>
          <FilterPills options={filters} activeValue={filter} onChange={(value) => { failedQueryRef.current = null; dispatch({ type: "patch", payload: { filter: value } }); }} className="mt-4" />
        </ToolbarCard>}
      </m.div>

      <m.div className="mt-6" {...getDashboardEntranceMotion(shouldAnimate, 0.4, 24)}>
        {isLoading && !hasLoadedActivities ? <ActivityDataSkeleton /> : <ActivityFeed activities={filteredActivities} visibleCount={filteredActivities.length} readOnly hasMore={hasMoreFromServer} isLoadingMore={isLoadingMore} onLoadMore={loadMoreActivities} onMarkRead={() => {}} onViewDetail={(activity) => dispatch({ type: "patch", payload: { selectedActivity: activity } })} />}
      </m.div>

      <ActivityDetailModal activity={selectedActivity} onClose={() => dispatch({ type: "patch", payload: { selectedActivity: null } })} />
    </DashboardPageShell>
  );
}
