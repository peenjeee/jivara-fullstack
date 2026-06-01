"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useReducer, useRef } from "react";
import { m } from "motion/react";
import { AlertTriangle, Bell, CheckCheck, ClipboardList } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import { PatientActivityCalendarSkeleton, SummaryCardsSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import RefreshingNotice from "@/components/ui/RefreshingNotice";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { FoodScanDetailModal } from "@/components/food-scan";
import PatientMedicineDetailModal from "@/components/schedule/PatientMedicineDetailModal";
import { addMonths, getDateKey } from "@/helpers/patientSchedule";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import { applyKnownActivityReadState, getActivityReadIdsFromApi, markActivitiesReadViaApi, markAllUnreadViaApi } from "@/lib/activityReadApi";
import { isDateInRange } from "@/lib/dateRange";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { getCachedPatientActivityLogData, getPatientActivityLogData, hydrateCachedPatientActivityLogReadState, markAllCachedPatientActivityLogActivitiesRead, markCachedPatientActivityLogActivitiesRead, type PatientActivityLogData } from "@/lib/patientDashboardApi";
import { showToast } from "@/lib/swal";
import { useActivityLogStore } from "@/store/activityLog";
import { useAuthStore } from "@/store/auth";
import ActivityDetailModal from "./ActivityDetailModal";
import type { ActivityQuickFilter } from "./ActivityToolbar";
import PatientActivityCalendar from "./PatientActivityCalendar";
import PatientActivityToolbar from "./PatientActivityToolbar";

interface PatientActivityLogPageProps {
  readonly initialCategory?: string;
}

let patientActivityLogViewCache: {
  search: string;
  quickFilter: ActivityQuickFilter;
  category: ActivityCategory | "all";
  date: string;
  visibleMonth: Date;
  schedules: MedicationScheduleRecord[];
  cachedUserId: string | null;
} | null = null;

interface PatientActivityLogState {
  readonly search: string;
  readonly quickFilter: ActivityQuickFilter;
  readonly category: ActivityCategory | "all";
  readonly date: string;
  readonly visibleMonth: Date;
  readonly selectedActivity: ActivityLogRecord | null;
  readonly selectedSchedule: MedicationScheduleRecord | null;
  readonly selectedFoodScanId: string | null;
  readonly isLoading: boolean;
  readonly hasLoadedActivities: boolean;
  readonly isReadStateHydrating: boolean;
  readonly isMarkingAllRead: boolean;
}

type PatientActivityLogAction = { readonly type: "patch"; readonly payload: Partial<PatientActivityLogState> };

function patientActivityLogReducer(state: PatientActivityLogState, action: PatientActivityLogAction): PatientActivityLogState {
  return action.type === "patch" ? { ...state, ...action.payload } : state;
}

export default function PatientActivityLogPage({ initialCategory }: PatientActivityLogPageProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const currentUserId = useAuthStore((state) => state.user?.id);
  const cacheIsValid = patientActivityLogViewCache !== null && patientActivityLogViewCache.cachedUserId === (currentUserId ?? null);
  const activities = useActivityLogStore((state) => state.activities);
  const setActivities = useActivityLogStore((state) => state.setActivities);
  const setActivityLogLoading = useActivityLogStore((state) => state.setLoading);
  const markActivityAsRead = useActivityLogStore((state) => state.markAsRead);
  const markAllActivitiesAsRead = useActivityLogStore((state) => state.markAllAsRead);
  const [state, dispatch] = useReducer(patientActivityLogReducer, {
    search: cacheIsValid ? (patientActivityLogViewCache?.search ?? "") : "",
    quickFilter: cacheIsValid ? (patientActivityLogViewCache?.quickFilter ?? "all") : "all",
    category: cacheIsValid ? (patientActivityLogViewCache?.category ?? (isActivityCategory(initialCategory) ? initialCategory : "all")) : (isActivityCategory(initialCategory) ? initialCategory : "all"),
    date: cacheIsValid ? (patientActivityLogViewCache?.date ?? "") : "",
    visibleMonth: cacheIsValid ? (patientActivityLogViewCache?.visibleMonth ?? new Date(new Date().getFullYear(), new Date().getMonth(), 1)) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    selectedActivity: null,
    selectedSchedule: null,
    selectedFoodScanId: null,
    isLoading: !cacheIsValid,
    hasLoadedActivities: cacheIsValid,
    isReadStateHydrating: false,
    isMarkingAllRead: false,
  });
  const { search, quickFilter, category, date, visibleMonth, selectedActivity, selectedSchedule, selectedFoodScanId, isLoading, hasLoadedActivities, isReadStateHydrating, isMarkingAllRead } = state;
  const stateRef = useRef(state);
  const schedulesRef = useRef<MedicationScheduleRecord[]>(cacheIsValid ? (patientActivityLogViewCache?.schedules ?? []) : []);
  const deferredSearch = useDeferredValue(search);
  const todayKey = getDateKey(new Date());

  const syncPatientActivityLogViewCache = useCallback((schedules: MedicationScheduleRecord[]) => {
    const currentState = stateRef.current;
    patientActivityLogViewCache = {
      search: currentState.search,
      quickFilter: currentState.quickFilter,
      category: currentState.category,
      date: currentState.date,
      visibleMonth: currentState.visibleMonth,
      schedules,
      cachedUserId: currentUserId ?? null,
    };
  }, [currentUserId]);

  const applyCachedActivityLogData = useCallback((activityData: PatientActivityLogData) => {
    setActivities(applyKnownActivityReadState(activityData.activities));
    schedulesRef.current = activityData.schedules;
    syncPatientActivityLogViewCache(activityData.schedules);
    dispatch({
      type: "patch",
      payload: {
        hasLoadedActivities: true,
        isLoading: true,
        isReadStateHydrating: activityData.activities.length > 0 && activityData.readStateHydrated !== true,
      },
    });
  }, [setActivities, syncPatientActivityLogViewCache]);

  const applyFreshActivityLogData = useCallback((monthDate: Date, activityData: PatientActivityLogData, readIds: Set<string>) => {
    const nextActivities = activityData.activities.map((activity) => ({ ...activity, read: readIds.has(activity.id) || activity.read }));
    hydrateCachedPatientActivityLogReadState(monthDate, readIds);
    setActivities(nextActivities);
    schedulesRef.current = activityData.schedules;
    syncPatientActivityLogViewCache(activityData.schedules);
    dispatch({ type: "patch", payload: { hasLoadedActivities: true, isLoading: false, isReadStateHydrating: false } });
  }, [setActivities, syncPatientActivityLogViewCache]);

  const clearFailedActivityLogData = useCallback(() => {
    setActivities([]);
    schedulesRef.current = [];
    dispatch({ type: "patch", payload: { hasLoadedActivities: true, isLoading: false, isReadStateHydrating: false } });
  }, [setActivities]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    setActivityLogLoading(isLoading);

    return () => {
      setActivityLogLoading(false);
    };
  }, [isLoading, setActivityLogLoading]);

  useEffect(() => {
    let isMounted = true;
    const cachedData = getCachedPatientActivityLogData(visibleMonth);
    const hasCachedData = Boolean(cachedData);

    if (cachedData) {
      applyCachedActivityLogData(cachedData);
    } else {
      setActivities([]);
      schedulesRef.current = [];
      dispatch({ type: "patch", payload: { hasLoadedActivities: false, isLoading: true, isReadStateHydrating: false } });
    }

    const activityDataRequest = getPatientActivityLogData(visibleMonth);
    const readIdsRequest = activityDataRequest
      .then((activityData) => {
        const activityIds = activityData.activities.map((activity) => activity.id);
        return activityIds.length > 0
          ? getActivityReadIdsFromApi({ activityIds, limit: Math.min(activityIds.length, 100), paginateAll: true })
          : new Set<string>();
      })
      .catch(() => new Set<string>());

    Promise.all([activityDataRequest, readIdsRequest])
      .then(([activityData, readIds]) => {
        if (!isMounted) return;
        applyFreshActivityLogData(visibleMonth, activityData, readIds);
        void Promise.all([
          getPatientActivityLogData(addMonths(visibleMonth, 1)),
          getPatientActivityLogData(addMonths(visibleMonth, -1)),
        ]).catch(() => undefined);
      })
      .catch(() => {
        if (!isMounted) return;
        if (!hasCachedData) {
          clearFailedActivityLogData();
          return;
        }
        dispatch({ type: "patch", payload: { hasLoadedActivities: true, isLoading: false, isReadStateHydrating: false } });
      });

    return () => {
      isMounted = false;
    };
  }, [applyCachedActivityLogData, applyFreshActivityLogData, clearFailedActivityLogData, setActivities, visibleMonth]);

  useEffect(() => {
    if (!hasLoadedActivities) return;
    patientActivityLogViewCache = {
      search,
      quickFilter,
      category,
      date,
      visibleMonth,
      schedules: schedulesRef.current,
      cachedUserId: currentUserId ?? null,
    };
  }, [category, currentUserId, date, hasLoadedActivities, quickFilter, search, visibleMonth]);

  const patientActivities = useMemo(() => activities, [activities]);
  const readSafePatientActivities = useMemo(() => {
    if (!isReadStateHydrating) return patientActivities;
    return patientActivities.map((activity) => (activity.read ? activity : { ...activity, read: true }));
  }, [isReadStateHydrating, patientActivities]);

  const summaryStats = useMemo(() => {
    const unread = readSafePatientActivities.filter((activity) => !activity.read).length;
    const warningCritical = readSafePatientActivities.filter((activity) => activity.severity === "Peringatan" || activity.severity === "Kritis").length;
    const todayTotal = readSafePatientActivities.filter((activity) => getDateKey(new Date(activity.timestamp)) === todayKey).length;

    return [
      { label: "Notifikasi Belum Dibaca", value: String(unread), tone: "neutral" as const, color: "pine" as const, icon: Bell },
      { label: "Notifikasi Peringatan/Kritis", value: String(warningCritical), tone: "critical" as const, color: "lime" as const, icon: AlertTriangle },
      { label: "Total Aktivitas Hari Ini", value: String(todayTotal), tone: "safe" as const, color: "leaf" as const, icon: ClipboardList },
    ];
  }, [readSafePatientActivities, todayKey]);

  const filteredActivities = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return readSafePatientActivities.filter((activity) => {
      const matchesSearch = !query || [activity.title, activity.description, activity.medicineName ?? "", activity.category]
        .some((value) => value.toLowerCase().includes(query));
      const matchesQuickFilter = quickFilter === "all"
        || (quickFilter === "unread" && !activity.read)
        || (quickFilter === "success" && activity.severity === "Sukses")
        || (quickFilter === "info" && activity.severity === "Info")
        || (quickFilter === "critical" && activity.severity === "Kritis")
        || (quickFilter === "warning" && activity.severity === "Peringatan");
      const matchesCategory = category === "all" || activity.category === category;
      const matchesDate = isDateInRange(getDateKey(new Date(activity.timestamp)), date);

      return matchesSearch && matchesQuickFilter && matchesCategory && matchesDate;
    });
  }, [category, date, deferredSearch, readSafePatientActivities, quickFilter]);

  const hasUnread = readSafePatientActivities.some((activity) => !activity.read);
  const showMarkAllButton = hasUnread;
  const hasActiveFilters = Boolean(search || quickFilter !== "all" || category !== "all" || date);
  const isUpdatingActivities = isLoading && hasLoadedActivities;

  const resetFilters = () => {
    dispatch({ type: "patch", payload: { search: "", quickFilter: "all", category: "all", date: "" } });
  };

  const markAllAsRead = async () => {
    dispatch({ type: "patch", payload: { isMarkingAllRead: true } });
    try {
      const activityIds = patientActivities.map((activity) => activity.id);
      await markAllUnreadViaApi(activityIds);
      markAllCachedPatientActivityLogActivitiesRead();
      markAllActivitiesAsRead();
      showToast("Semua aktivitas ditandai sudah dibaca.");
    } catch {
      showToast("Gagal menandai semua aktivitas sebagai dibaca.", "error");
    } finally {
      dispatch({ type: "patch", payload: { isMarkingAllRead: false } });
    }
  };

  const viewActivityDetail = async (activity: ActivityLogRecord) => {
    if (!activity.read) {
      try {
        await markActivitiesReadViaApi([activity.id]);
        markCachedPatientActivityLogActivitiesRead(visibleMonth, [activity.id]);
        markActivityAsRead(activity.id);
      } catch {
        showToast("Gagal menandai aktivitas sebagai dibaca.", "error");
      }
    }
    dispatch({ type: "patch", payload: { selectedActivity: activity.read ? activity : { ...activity, read: true } } });
  };

  const viewFoodScan = (scanId: string) => {
    dispatch({ type: "patch", payload: { selectedActivity: null, selectedFoodScanId: scanId } });
  };

  const viewSchedule = (activity: ActivityLogRecord) => {
    const schedule = schedulesRef.current.find((currentSchedule) => currentSchedule.id === activity.scheduleId)
      ?? schedulesRef.current.find((currentSchedule) => currentSchedule.medicineName === activity.medicineName);

    if (!schedule) return;

    dispatch({ type: "patch", payload: { selectedActivity: null, selectedSchedule: schedule } });
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Log Aktivitas"
        action={showMarkAllButton && (
          <Button size="sm" icon={<CheckCheck size={16} />} onClick={markAllAsRead} loading={isMarkingAllRead}>
            Tandai Semua Dibaca
          </Button>
        )}
      />

      {isLoading && !hasLoadedActivities ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={summaryStats} />}

      <m.div
        className="mt-6"
        {...getDashboardEntranceMotion(shouldAnimate, 0.32, 20)}
      >
        {isLoading && !hasLoadedActivities ? <ToolbarSkeleton /> : <PatientActivityToolbar
          search={search}
          quickFilter={quickFilter}
          category={category}
          date={date}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={(value) => dispatch({ type: "patch", payload: { search: value } })}
          onQuickFilterChange={(value) => dispatch({ type: "patch", payload: { quickFilter: value } })}
          onCategoryChange={(value) => dispatch({ type: "patch", payload: { category: value } })}
          onDateChange={(value) => dispatch({ type: "patch", payload: { date: value } })}
          onReset={resetFilters}
        />}
      </m.div>

      <div className="relative mt-6" aria-busy={isUpdatingActivities || undefined}>
        <RefreshingNotice active={isUpdatingActivities} />
        {isLoading && !hasLoadedActivities ? <PatientActivityCalendarSkeleton /> : (
          <div className={isUpdatingActivities ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <PatientActivityCalendar month={visibleMonth} activities={filteredActivities} onMonthChange={(month) => dispatch({ type: "patch", payload: { visibleMonth: month } })} onViewDetail={viewActivityDetail} />
          </div>
        )}
      </div>

      <ActivityDetailModal activity={selectedActivity} useScheduleQuery={false} onClose={() => dispatch({ type: "patch", payload: { selectedActivity: null } })} onViewFoodScan={viewFoodScan} onViewSchedule={viewSchedule} />
      <PatientMedicineDetailModal schedule={selectedSchedule} onClose={() => dispatch({ type: "patch", payload: { selectedSchedule: null } })} />
      <FoodScanDetailModal scanId={selectedFoodScanId} onClose={() => dispatch({ type: "patch", payload: { selectedFoodScanId: null } })} />
    </DashboardPageShell>
  );
}

function isActivityCategory(value: string | undefined): value is ActivityCategory {
  return value === "Reminder" || value === "Kepatuhan" || value === "Scan Makanan";
}
