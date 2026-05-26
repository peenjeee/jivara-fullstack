"use client";

import { useEffect, useMemo, useReducer } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { AlertTriangle, Bell, CheckCheck, ClipboardList, type LucideIcon } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import { ActivityDataSkeleton, SummaryCardsSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { FoodScanDetailModal } from "@/components/food-scan";
import { getActivityDateKey } from "@/helpers/activityLogs";
import { activityMatchesNurse } from "@/helpers/nurses";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import { getActivityReadIdsFromApi, markActivitiesReadViaApi } from "@/lib/activityReadApi";
import { getAuditActivityPageFromApi } from "@/lib/auditLogApi";
import { isDateInRange } from "@/lib/dateRange";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { getNotificationActivityPageFromApi } from "@/lib/notificationActivitiesApi";
import { getNursesFromApi } from "@/lib/nurseApi";
import { getPatientsFromApi } from "@/lib/patientApi";
import { showToast } from "@/lib/swal";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useActivityLogStore } from "@/store/activityLog";
import { useNurseStore } from "@/store/nurses";
import ActivityDetailModal from "./ActivityDetailModal";
import ActivityFeed from "./ActivityFeed";
import ActivityToolbar, { type ActivityQuickFilter } from "./ActivityToolbar";

const serverPageSize = 10;
const loadBatchSize = serverPageSize;

const getAuditSeverityFilter = (quickFilter: ActivityQuickFilter) => {
  if (quickFilter === "critical" || quickFilter === "warning" || quickFilter === "success" || quickFilter === "info") return quickFilter;
  return undefined;
};

const getNotificationSeverityFilter = (quickFilter: ActivityQuickFilter) => {
  if (quickFilter === "critical" || quickFilter === "warning" || quickFilter === "success") return quickFilter;
  return undefined;
};

interface ActivityLogPageProps {
  readonly initialPatientName?: string;
  readonly initialCategory?: string;
  readonly auditUserRole?: string;
  readonly readOnly?: boolean;
  readonly showNurseFilter?: boolean;
}

type ActivityLogPageState = {
  activities: ActivityLogRecord[];
  search: string;
  quickFilter: ActivityQuickFilter;
  category: ActivityCategory | "all";
  nurseId: string;
  date: string;
  visibleCount: number;
  selectedActivity: ActivityLogRecord | null;
  selectedFoodScanId: string | null;
  patientAssignments: Record<string, string>;
  summaryActivities: ActivityLogRecord[];
  isLoading: boolean;
  isSummaryLoading: boolean;
  hasLoadedActivities: boolean;
  hasLoadedSummary: boolean;
  activityPage: number;
  isLoadingMore: boolean;
  processingActivityId: string | null;
  isMarkingAllRead: boolean;
  serverActivityTotal: number | null;
  serverWarningCriticalTotal: number | null;
  serverTodayTotal: number | null;
  summaryServerActivityTotal: number | null;
  summaryServerWarningCriticalTotal: number | null;
  summaryServerTodayTotal: number | null;
};

type ActivityLogViewCache = Pick<ActivityLogPageState,
  | "activities"
  | "search"
  | "quickFilter"
  | "category"
  | "nurseId"
  | "date"
  | "visibleCount"
  | "summaryActivities"
  | "patientAssignments"
  | "activityPage"
  | "serverActivityTotal"
  | "serverWarningCriticalTotal"
  | "serverTodayTotal"
  | "summaryServerActivityTotal"
  | "summaryServerWarningCriticalTotal"
  | "summaryServerTodayTotal"
>;

type ActivityLogPageAction =
  | { type: "patch"; payload: Partial<ActivityLogPageState> }
  | { type: "set-filters"; payload: Partial<Pick<ActivityLogPageState, "search" | "quickFilter" | "category" | "nurseId" | "date">> }
  | { type: "reset-filters" }
  | { type: "increase-visible-count" }
  | { type: "mark-summary-read"; activityId: string }
  | { type: "mark-all-summary-read" };

let activityLogPageViewCache: ActivityLogViewCache | null = null;

/** Exported for test isolation — resets module-level cache between tests. */
export function __resetActivityLogPageViewCache(): void {
  activityLogPageViewCache = null;
}

function activityLogPageReducer(state: ActivityLogPageState, action: ActivityLogPageAction): ActivityLogPageState {
  switch (action.type) {
    case "patch":
      return { ...state, ...action.payload };
    case "set-filters":
      return { ...state, ...action.payload, visibleCount: loadBatchSize, isLoading: true };
    case "reset-filters":
      return { ...state, search: "", quickFilter: "all", category: "all", nurseId: "all", date: "", visibleCount: loadBatchSize, isLoading: true };
    case "increase-visible-count":
      return { ...state, visibleCount: state.visibleCount + loadBatchSize };
    case "mark-summary-read":
      return {
        ...state,
        summaryActivities: state.summaryActivities.map((activity) => activity.id === action.activityId ? { ...activity, read: true } : activity),
      };
    case "mark-all-summary-read":
      return {
        ...state,
        summaryActivities: state.summaryActivities.map((activity) => ({ ...activity, read: true })),
      };
    default:
      return state;
  }
}

function createInitialState(initialPatientName: string, initialCategory?: string): ActivityLogPageState {
  return {
    activities: activityLogPageViewCache?.activities ?? [],
    search: activityLogPageViewCache?.search ?? initialPatientName,
    quickFilter: activityLogPageViewCache?.quickFilter ?? "all",
    category: activityLogPageViewCache?.category ?? (isActivityCategory(initialCategory) ? initialCategory : "all"),
    nurseId: activityLogPageViewCache?.nurseId ?? "all",
    date: activityLogPageViewCache?.date ?? "",
    visibleCount: activityLogPageViewCache?.visibleCount ?? loadBatchSize,
    selectedActivity: null,
    selectedFoodScanId: null,
    patientAssignments: activityLogPageViewCache?.patientAssignments ?? {},
    summaryActivities: activityLogPageViewCache?.summaryActivities ?? [],
    isLoading: !activityLogPageViewCache,
    isSummaryLoading: !activityLogPageViewCache,
    hasLoadedActivities: Boolean(activityLogPageViewCache),
    hasLoadedSummary: Boolean(activityLogPageViewCache),
    activityPage: activityLogPageViewCache?.activityPage ?? 1,
    isLoadingMore: false,
    processingActivityId: null,
    isMarkingAllRead: false,
    serverActivityTotal: activityLogPageViewCache?.serverActivityTotal ?? null,
    serverWarningCriticalTotal: activityLogPageViewCache?.serverWarningCriticalTotal ?? null,
    serverTodayTotal: activityLogPageViewCache?.serverTodayTotal ?? null,
    summaryServerActivityTotal: activityLogPageViewCache?.summaryServerActivityTotal ?? null,
    summaryServerWarningCriticalTotal: activityLogPageViewCache?.summaryServerWarningCriticalTotal ?? null,
    summaryServerTodayTotal: activityLogPageViewCache?.summaryServerTodayTotal ?? null,
  };
}

function createViewCache(state: ActivityLogPageState, quickFilter: ActivityQuickFilter): ActivityLogViewCache {
  return {
    activities: state.activities,
    search: state.search,
    quickFilter,
    category: state.category,
    nurseId: state.nurseId,
    date: state.date,
    visibleCount: state.visibleCount,
    summaryActivities: state.summaryActivities,
    patientAssignments: state.patientAssignments,
    activityPage: state.activityPage,
    serverActivityTotal: state.serverActivityTotal,
    serverWarningCriticalTotal: state.serverWarningCriticalTotal,
    serverTodayTotal: state.serverTodayTotal,
    summaryServerActivityTotal: state.summaryServerActivityTotal,
    summaryServerWarningCriticalTotal: state.summaryServerWarningCriticalTotal,
    summaryServerTodayTotal: state.summaryServerTodayTotal,
  };
}

async function fetchSummaryData({ readOnly, auditUserRole, todayKey }: { readOnly: boolean; auditUserRole?: string; todayKey: string }) {
  if (readOnly) {
    const [auditPage, notificationPage] = await Promise.all([
      getAuditActivityPageFromApi({ page: 1, limit: serverPageSize, userRole: auditUserRole }),
      getNotificationActivityPageFromApi({ page: 1, limit: serverPageSize }).catch(() => ({ activities: [], meta: { page: 1, limit: serverPageSize, total: 0, summary: undefined } })),
    ]);
    const summaryActivities = [...notificationPage.activities, ...auditPage.activities];
    const notificationWarningCritical = notificationPage.meta.summary?.warningCritical ?? notificationPage.activities.filter((activity) => activity.severity === "Peringatan" || activity.severity === "Kritis").length;
    const notificationToday = notificationPage.meta.summary?.today ?? notificationPage.activities.filter((activity) => getActivityDateKey(activity.timestamp) === todayKey).length;

    return {
      summaryActivities,
      unreadCount: summaryActivities.filter((activity) => !activity.read).length,
      summaryServerActivityTotal: auditPage.meta.total + notificationPage.meta.total,
      summaryServerWarningCriticalTotal: (auditPage.meta.summary?.warningCritical ?? 0) + notificationWarningCritical,
      summaryServerTodayTotal: (auditPage.meta.summary?.today ?? 0) + notificationToday,
    };
  }

  const [readIds, auditPage, notificationPage] = await Promise.all([
    getActivityReadIdsFromApi().catch(() => new Set<string>()),
    getAuditActivityPageFromApi({ page: 1, limit: serverPageSize, userRole: auditUserRole }).catch(() => ({ activities: [], meta: { page: 1, limit: serverPageSize, total: 0, summary: undefined } })),
    getNotificationActivityPageFromApi({ page: 1, limit: serverPageSize }).catch(() => ({ activities: [], meta: { page: 1, limit: serverPageSize, total: 0, summary: undefined } })),
  ]);
  const summaryActivities = [...notificationPage.activities, ...auditPage.activities].map((activity) => ({ ...activity, read: readIds.has(activity.id) || activity.read }));
  const notificationWarningCritical = notificationPage.meta.summary?.warningCritical ?? notificationPage.activities.filter((activity) => activity.severity === "Peringatan" || activity.severity === "Kritis").length;
  const notificationToday = notificationPage.meta.summary?.today ?? notificationPage.activities.filter((activity) => getActivityDateKey(activity.timestamp) === todayKey).length;

  return {
    summaryActivities,
    unreadCount: summaryActivities.filter((activity) => !activity.read).length,
    summaryServerActivityTotal: auditPage.meta.total + notificationPage.meta.total,
    summaryServerWarningCriticalTotal: (auditPage.meta.summary?.warningCritical ?? 0) + notificationWarningCritical,
    summaryServerTodayTotal: (auditPage.meta.summary?.today ?? 0) + notificationToday,
  };
}

async function fetchActivityPageData({
  page,
  readOnly,
  auditUserRole,
  showNurseFilter,
  nurseId,
  category,
  date,
  quickFilter,
  search,
  fallbackTotal,
}: {
  page: number;
  readOnly: boolean;
  auditUserRole?: string;
  showNurseFilter: boolean;
  nurseId: string;
  category: ActivityCategory | "all";
  date: string;
  quickFilter: ActivityQuickFilter;
  search: string;
  fallbackTotal: number;
}) {
  const patients = showNurseFilter ? await getPatientsFromApi() : [];
  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const assignments = showNurseFilter ? Object.fromEntries(patients.flatMap((patient) => patient.assignedNurseId ? [[patient.id, patient.assignedNurseId]] : [])) : {};
  const selectedNurseId = nurseId === "all" ? undefined : nurseId;
  const [readIds, auditPage, notificationPage] = await Promise.all([
    readOnly ? Promise.resolve(new Set<string>()) : getActivityReadIdsFromApi().catch(() => new Set<string>()),
    getAuditActivityPageFromApi({ page, limit: serverPageSize, category, date, userRole: auditUserRole, nurseId: selectedNurseId, severity: getAuditSeverityFilter(quickFilter), search }).catch(() => ({ activities: [], meta: { page, limit: serverPageSize, total: fallbackTotal } })),
    getNotificationActivityPageFromApi({ page, limit: serverPageSize, nurseId: selectedNurseId, category, date, severity: getNotificationSeverityFilter(quickFilter), search }).catch(() => ({ activities: [], meta: { page, limit: serverPageSize, total: 0 } })),
  ]);
  const notificationActivities = showNurseFilter
    ? notificationPage.activities.map((activity) => {
      const patient = activity.patientId ? patientById.get(activity.patientId) : undefined;
      return { ...activity, patientName: patient?.name, patientAvatar: patient?.avatar };
    })
    : notificationPage.activities;
  const activities: ActivityLogRecord[] = [];

  for (const activity of [...notificationActivities, ...auditPage.activities]) {
    if (showNurseFilter && nurseId !== "all" && !activityMatchesNurse(activity, assignments, nurseId)) continue;
    activities.push({ ...activity, read: readIds.has(activity.id) || activity.read });
  }

  activities.sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());

  return {
    activities,
    assignments,
    total: auditPage.meta.total + notificationPage.meta.total,
    warningCriticalTotal: null,
    todayTotal: null,
    page,
  };
}

function ActivityLogSummarySection({ isLoading, hasLoaded, summaryStats }: { isLoading: boolean; hasLoaded: boolean; summaryStats: Array<{ label: string; value: string; tone: "neutral" | "critical" | "safe"; color: "pine" | "lime" | "leaf"; icon: LucideIcon }> }) {
  if (isLoading && !hasLoaded) return <SummaryCardsSkeleton />;
  return <SummaryCardGrid stats={summaryStats} />;
}

function useActivityLogPageController({ initialPatientName = "", initialCategory, auditUserRole, readOnly = false, showNurseFilter = true }: ActivityLogPageProps) {
  const { push } = useRouter();
  const setActivities = useActivityLogStore((state) => state.setActivities);
  const setActivityLogLoading = useActivityLogStore((state) => state.setLoading);
  const nurses = useNurseStore((state) => state.nurses);
  const setNurses = useNurseStore((state) => state.setNurses);
  const setUnreadActivityCount = useActivityLogStore((state) => state.setUnreadActivityCount);
  const [state, dispatch] = useReducer(activityLogPageReducer, undefined, () => createInitialState(initialPatientName, initialCategory));
  const debouncedSearch = useDebouncedValue(state.search);
  const todayKey = new Date().toISOString().slice(0, 10);
  const effectiveQuickFilter = readOnly && state.quickFilter === "unread" ? "all" : state.quickFilter;

  useEffect(() => {
    if (!showNurseFilter || nurses.length > 0) return;
    let isMounted = true;

    getNursesFromApi()
      .then((nextNurses) => {
        if (isMounted) setNurses(nextNurses);
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [nurses.length, setNurses, showNurseFilter]);

  useEffect(() => {
    let isMounted = true;

    void fetchSummaryData({ readOnly, auditUserRole, todayKey })
      .then((summaryData) => {
        if (!isMounted) return;
        setUnreadActivityCount(summaryData.unreadCount);
        dispatch({
          type: "patch",
          payload: {
            summaryActivities: summaryData.summaryActivities,
            summaryServerActivityTotal: summaryData.summaryServerActivityTotal,
            summaryServerWarningCriticalTotal: summaryData.summaryServerWarningCriticalTotal,
            summaryServerTodayTotal: summaryData.summaryServerTodayTotal,
            isSummaryLoading: false,
            hasLoadedSummary: true,
          },
        });
      })
      .catch(() => {
        if (!isMounted) return;
        dispatch({
          type: "patch",
          payload: {
            summaryActivities: [],
            summaryServerActivityTotal: null,
            summaryServerWarningCriticalTotal: null,
            summaryServerTodayTotal: null,
            isSummaryLoading: false,
            hasLoadedSummary: true,
          },
        });
      });

    return () => {
      isMounted = false;
    };
  }, [auditUserRole, readOnly, setUnreadActivityCount, todayKey]);

  useEffect(() => {
    let isMounted = true;

    void fetchActivityPageData({
      page: 1,
      readOnly,
      auditUserRole,
      showNurseFilter,
      nurseId: state.nurseId,
      category: state.category,
      date: state.date,
      quickFilter: effectiveQuickFilter,
      search: debouncedSearch,
      fallbackTotal: state.activities.length,
    })
      .then((activityData) => {
        if (!isMounted) return;
        dispatch({
          type: "patch",
          payload: {
            activities: activityData.activities,
            patientAssignments: activityData.assignments,
            serverActivityTotal: activityData.total,
            serverWarningCriticalTotal: activityData.warningCriticalTotal,
            serverTodayTotal: activityData.todayTotal,
            activityPage: 1,
            isLoading: false,
            hasLoadedActivities: true,
          },
        });
      })
      .catch(() => {
        if (!isMounted) return;
        dispatch({
          type: "patch",
          payload: {
            activities: [],
            serverActivityTotal: null,
            serverWarningCriticalTotal: null,
            serverTodayTotal: null,
            isLoading: false,
            hasLoadedActivities: true,
          },
        });
      });

    return () => {
      isMounted = false;
    };
  }, [auditUserRole, debouncedSearch, effectiveQuickFilter, readOnly, showNurseFilter, state.activities.length, state.category, state.date, state.nurseId, state.search]);

  useEffect(() => {
    setActivities(state.activities);
  }, [setActivities, state.activities]);

  useEffect(() => {
    setActivityLogLoading(state.isLoading);
  }, [setActivityLogLoading, state.isLoading]);

  useEffect(() => {
    activityLogPageViewCache = createViewCache(state, effectiveQuickFilter);
  }, [effectiveQuickFilter, state]);

  const summaryStats = useMemo(() => {
    const total = state.summaryServerActivityTotal ?? state.summaryActivities.length;
    const unread = state.summaryActivities.filter((activity) => !activity.read).length;
    const warningCritical = state.summaryServerWarningCriticalTotal ?? state.summaryActivities.filter((activity) => activity.severity === "Peringatan" || activity.severity === "Kritis").length;
    const todayTotal = state.summaryServerTodayTotal ?? state.summaryActivities.filter((activity) => getActivityDateKey(activity.timestamp) === todayKey).length;

    return [
      readOnly
        ? { label: "Total Aktivitas", value: String(total), tone: "neutral" as const, color: "pine" as const, icon: ClipboardList }
        : { label: "Notifikasi Belum Dibaca", value: String(unread), tone: "neutral" as const, color: "pine" as const, icon: Bell },
      { label: "Notifikasi Peringatan/Kritis", value: String(warningCritical), tone: "critical" as const, color: "lime" as const, icon: AlertTriangle },
      { label: "Total Aktivitas Hari Ini", value: String(todayTotal), tone: "safe" as const, color: "leaf" as const, icon: ClipboardList },
    ];
  }, [readOnly, state.summaryActivities, state.summaryServerActivityTotal, state.summaryServerTodayTotal, state.summaryServerWarningCriticalTotal, todayKey]);

  const filteredActivities = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    return state.activities
      .filter((activity) => {
        const matchesSearch = !query || [activity.title, activity.description, activity.patientName ?? "", activity.medicineName ?? "", activity.category]
          .some((value) => value.toLowerCase().includes(query));
        const matchesQuickFilter = effectiveQuickFilter === "all"
          || (effectiveQuickFilter === "unread" && !activity.read)
          || (effectiveQuickFilter === "success" && activity.severity === "Sukses")
          || (effectiveQuickFilter === "info" && activity.severity === "Info")
          || (effectiveQuickFilter === "critical" && activity.severity === "Kritis")
          || (effectiveQuickFilter === "warning" && activity.severity === "Peringatan");
        const matchesCategory = state.category === "all" || activity.category === state.category;
        const matchesNurse = state.nurseId === "all" || activityMatchesNurse(activity, state.patientAssignments, state.nurseId);
        const matchesDate = isDateInRange(getActivityDateKey(activity.timestamp), state.date);

        return matchesSearch && matchesQuickFilter && matchesCategory && matchesNurse && matchesDate;
      })
      .sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  }, [debouncedSearch, effectiveQuickFilter, state.activities, state.category, state.date, state.nurseId, state.patientAssignments]);

  const hasUnread = state.activities.some((activity) => !activity.read);
  const hasActiveFilters = Boolean(state.search || effectiveQuickFilter !== "all" || state.category !== "all" || state.nurseId !== "all" || state.date);
  const hasMoreFromServer = state.serverActivityTotal !== null
    ? state.activityPage * serverPageSize < state.serverActivityTotal
    : undefined;

  const handleSearchChange = (value: string) => {
    dispatch({ type: "set-filters", payload: { search: value } });
  };

  const handleQuickFilterChange = (value: ActivityQuickFilter) => {
    dispatch({ type: "set-filters", payload: { quickFilter: readOnly && value === "unread" ? "all" : value } });
  };

  const handleCategoryChange = (value: ActivityCategory | "all") => {
    dispatch({ type: "set-filters", payload: { category: value } });
  };

  const handleNurseChange = (value: string) => {
    dispatch({ type: "set-filters", payload: { nurseId: value } });
  };

  const handleDateChange = (value: string) => {
    dispatch({ type: "set-filters", payload: { date: value } });
  };

  const handleLoadMore = async () => {
    const nextVisibleCount = state.visibleCount + loadBatchSize;
    dispatch({ type: "increase-visible-count" });
    if (state.isLoadingMore || hasMoreFromServer !== true || nextVisibleCount < filteredActivities.length) return;

    const nextPage = state.activityPage + 1;
    dispatch({ type: "patch", payload: { isLoadingMore: true } });

    try {
      const activityData = await fetchActivityPageData({
        page: nextPage,
        readOnly,
        auditUserRole,
        showNurseFilter,
        nurseId: state.nurseId,
        category: state.category,
        date: state.date,
        quickFilter: effectiveQuickFilter,
        search: debouncedSearch,
        fallbackTotal: state.serverActivityTotal ?? state.activities.length,
      });
      const byId = new Map([...state.activities, ...activityData.activities].map((activity) => [activity.id, activity]));
      dispatch({
        type: "patch",
        payload: {
          activities: Array.from(byId.values()).sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime()),
          patientAssignments: activityData.assignments,
          serverActivityTotal: activityData.total,
          serverWarningCriticalTotal: null,
          serverTodayTotal: null,
          activityPage: nextPage,
          isLoadingMore: false,
        },
      });
    } catch {
      dispatch({ type: "patch", payload: { isLoadingMore: false } });
      showToast("Gagal memuat aktivitas tambahan.", "error");
    }
  };

  const markAsRead = async (activityId: string) => {
    if (readOnly) return;
    const activity = state.activities.find((item) => item.id === activityId);
    if (!activity) return;

    dispatch({ type: "patch", payload: { processingActivityId: activityId } });
    try {
      await markActivitiesReadViaApi([activityId]);
      dispatch({
        type: "patch",
        payload: {
          activities: state.activities.map((item) => item.id === activityId ? { ...item, read: true } : item),
          summaryActivities: state.summaryActivities.map((item) => item.id === activityId ? { ...item, read: true } : item),
        },
      });

      const summaryData = await fetchSummaryData({ readOnly, auditUserRole, todayKey });
      setUnreadActivityCount(summaryData.unreadCount);
      dispatch({
        type: "patch",
        payload: {
          summaryActivities: summaryData.summaryActivities,
          summaryServerActivityTotal: summaryData.summaryServerActivityTotal,
          summaryServerWarningCriticalTotal: summaryData.summaryServerWarningCriticalTotal,
          summaryServerTodayTotal: summaryData.summaryServerTodayTotal,
        },
      });
    } catch {
      showToast("Gagal menandai aktivitas sebagai dibaca.", "error");
    } finally {
      dispatch({ type: "patch", payload: { processingActivityId: null } });
    }
  };

  const markAllAsRead = async () => {
    if (readOnly) return;
    dispatch({ type: "patch", payload: { isMarkingAllRead: true } });
    try {
      const unreadIds: string[] = [];
      for (const activity of filteredActivities) {
        if (!activity.read) unreadIds.push(activity.id);
      }
      await markActivitiesReadViaApi(unreadIds);
      dispatch({
        type: "patch",
        payload: {
          activities: state.activities.map((activity) => ({ ...activity, read: true })),
          summaryActivities: state.summaryActivities.map((activity) => ({ ...activity, read: true })),
        },
      });

      const summaryData = await fetchSummaryData({ readOnly, auditUserRole, todayKey });
      setUnreadActivityCount(summaryData.unreadCount);
      dispatch({
        type: "patch",
        payload: {
          summaryActivities: summaryData.summaryActivities,
          summaryServerActivityTotal: summaryData.summaryServerActivityTotal,
          summaryServerWarningCriticalTotal: summaryData.summaryServerWarningCriticalTotal,
          summaryServerTodayTotal: summaryData.summaryServerTodayTotal,
        },
      });
      showToast("Semua aktivitas ditandai sudah dibaca.");
    } catch {
      showToast("Gagal menandai semua aktivitas sebagai dibaca.", "error");
    } finally {
      dispatch({ type: "patch", payload: { isMarkingAllRead: false } });
    }
  };

  const viewFoodScan = (scanId: string) => {
    dispatch({ type: "patch", payload: { selectedActivity: null, selectedFoodScanId: scanId } });
  };

  const viewSchedule = (activity: ActivityLogRecord) => {
    const href = activity.patientId
      ? `/schedule?patientId=${encodeURIComponent(activity.patientId)}${activity.medicineName ? `&medicineName=${encodeURIComponent(activity.medicineName)}` : ""}`
      : "/schedule";

    dispatch({ type: "patch", payload: { selectedActivity: null } });
    window.setTimeout(() => push(href), 380);
  };

  return {
    nurses,
    state,
    effectiveQuickFilter,
    filteredActivities,
    hasUnread,
    hasActiveFilters,
    hasMoreFromServer,
    summaryStats,
    handleSearchChange,
    handleQuickFilterChange,
    handleCategoryChange,
    handleNurseChange,
    handleDateChange,
    handleLoadMore,
    markAsRead,
    markAllAsRead,
    viewFoodScan,
    viewSchedule,
    resetFilters: () => dispatch({ type: "reset-filters" }),
    selectActivity: (activity: ActivityLogRecord | null) => dispatch({ type: "patch", payload: { selectedActivity: activity } }),
    closeFoodScan: () => dispatch({ type: "patch", payload: { selectedFoodScanId: null } }),
  };
}

export default function ActivityLogPage(props: ActivityLogPageProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const controller = useActivityLogPageController(props);

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Log Aktivitas"
        action={!props.readOnly && controller.hasUnread && (
          <Button size="sm" icon={<CheckCheck size={16} />} onClick={controller.markAllAsRead} loading={controller.state.isMarkingAllRead}>
            Tandai Semua Dibaca
          </Button>
        )}
      />

      <ActivityLogSummarySection isLoading={controller.state.isSummaryLoading} hasLoaded={controller.state.hasLoadedSummary} summaryStats={controller.summaryStats} />

      <m.div className="mt-6" {...getDashboardEntranceMotion(shouldAnimate, 0.32, 20)}>
        {controller.state.isLoading && !controller.state.hasLoadedActivities ? <ToolbarSkeleton /> : (
          <ActivityToolbar
            search={controller.state.search}
            quickFilter={controller.effectiveQuickFilter}
            category={controller.state.category}
            nurseId={controller.state.nurseId}
            nurses={controller.nurses}
            showNurseFilter={props.showNurseFilter ?? true}
            showUnreadFilter={!props.readOnly}
            date={controller.state.date}
            hasActiveFilters={controller.hasActiveFilters}
            onSearchChange={controller.handleSearchChange}
            onQuickFilterChange={controller.handleQuickFilterChange}
            onCategoryChange={controller.handleCategoryChange}
            onNurseChange={controller.handleNurseChange}
            onDateChange={controller.handleDateChange}
            onReset={controller.resetFilters}
          />
        )}
      </m.div>

      <m.div className="mt-6" {...getDashboardEntranceMotion(shouldAnimate, 0.4, 24)}>
        {controller.state.isLoading ? <ActivityDataSkeleton /> : (
          <ActivityFeed
            activities={controller.filteredActivities}
            visibleCount={controller.state.visibleCount}
            readOnly={props.readOnly ?? false}
            hasMore={controller.hasMoreFromServer}
            isLoadingMore={controller.state.isLoadingMore}
            onLoadMore={() => { void controller.handleLoadMore(); }}
            onMarkRead={controller.markAsRead}
            processingActivityId={controller.state.processingActivityId}
            onViewDetail={controller.selectActivity}
          />
        )}
      </m.div>

      <ActivityDetailModal activity={controller.state.selectedActivity} onClose={() => controller.selectActivity(null)} onViewFoodScan={controller.viewFoodScan} onViewSchedule={controller.viewSchedule} />
      <FoodScanDetailModal scanId={controller.state.selectedFoodScanId} onClose={controller.closeFoodScan} />
    </DashboardPageShell>
  );
}

function isActivityCategory(value: string | undefined): value is ActivityCategory {
  return value === "Reminder" || value === "Kepatuhan" || value === "Scan Makanan" || value === "Administrasi";
}
