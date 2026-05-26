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
import { getAuditActivityPageFromApi, type ApprovalLogStatus } from "@/lib/auditLogApi";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
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
  const [state, dispatch] = useReducer(superAdminActivityLogReducer, {
    activities: superAdminLogViewCache?.activities ?? [],
    search: superAdminLogViewCache?.search ?? "",
    filter: superAdminLogViewCache?.filter ?? "all",
    date: superAdminLogViewCache?.date ?? "",
    selectedActivity: null,
    isLoading: !superAdminLogViewCache,
    hasLoadedActivities: Boolean(superAdminLogViewCache),
    hasLoadedSummary: Boolean(superAdminLogViewCache),
    isLoadingMore: false,
    activityPage: superAdminLogViewCache?.activityPage ?? 1,
    totalAuditLogCount: superAdminLogViewCache?.totalAuditLogCount ?? 0,
    totalFilteredLogCount: superAdminLogViewCache?.totalFilteredLogCount ?? 0,
    totalIncomingApprovalCount: superAdminLogViewCache?.totalIncomingApprovalCount ?? 0,
    totalProcessedTodayCount: superAdminLogViewCache?.totalProcessedTodayCount ?? 0,
  });
  const { activities, search, filter, date, selectedActivity, isLoading, hasLoadedActivities, hasLoadedSummary, isLoadingMore, activityPage, totalAuditLogCount, totalFilteredLogCount, totalIncomingApprovalCount, totalProcessedTodayCount } = state;
  const loadingPagesRef = useRef(new Set<string>());
  const loadedQueryRef = useRef<string | null>(superAdminLogViewCache ? `${superAdminLogViewCache.activityPage}:${superAdminLogViewCache.filter}:${superAdminLogViewCache.date}:${superAdminLogViewCache.search}` : null);
  const failedQueryRef = useRef<string | null>(null);
  const loadedSummaryRef = useRef(Boolean(superAdminLogViewCache));
  const stateRef = useRef(state);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const loadPage = useCallback(async (page: number) => {
    const currentState = stateRef.current;
    const pageKey = `${page}:${currentState.filter}:${currentState.date}:${debouncedSearch}`;
    if (page === 1 && loadedQueryRef.current === pageKey) return;
    if (page === 1 && failedQueryRef.current === pageKey) return;
    if (loadingPagesRef.current.has(pageKey)) return;

    loadingPagesRef.current.add(pageKey);
    dispatch({ type: "patch", payload: page === 1 ? { isLoading: true } : { isLoadingMore: true } });

    try {
      const response = await getAuditActivityPageFromApi({
        page,
        limit: pageSize,
        status: currentState.filter === "all" ? undefined : currentState.filter,
        userRole: "super_admin",
        date: currentState.date,
        search: debouncedSearch,
        forceRefresh: page === 1,
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
  }, [debouncedSearch]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadPage(1);
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
        {isLoading ? <ActivityDataSkeleton /> : <ActivityFeed activities={filteredActivities} visibleCount={filteredActivities.length} readOnly hasMore={hasMoreFromServer} isLoadingMore={isLoadingMore} onLoadMore={loadMoreActivities} onMarkRead={() => {}} onViewDetail={(activity) => dispatch({ type: "patch", payload: { selectedActivity: activity } })} />}
      </m.div>

      <ActivityDetailModal activity={selectedActivity} onClose={() => dispatch({ type: "patch", payload: { selectedActivity: null } })} />
    </DashboardPageShell>
  );
}
