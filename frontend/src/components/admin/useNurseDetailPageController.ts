"use client";

import { useCallback, useEffect, useMemo, useReducer } from "react";
import { useRouter } from "next/navigation";
import { getActivityDateKey } from "@/helpers/activityLogs";
import { activityMatchesNurse, getAverageAdherence } from "@/helpers/nurses";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import { markActivitiesReadViaApi } from "@/lib/activityReadApi";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { getAuditActivityPageFromApi } from "@/lib/auditLogApi";
import { getNotificationActivityPageFromApi } from "@/lib/notificationActivitiesApi";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { NurseRecord } from "@/lib/mocks/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";
import { deactivateNurseViaApi, getNurseByIdFromApi } from "@/lib/nurseApi";
import { assignPatientToNursesViaApi, getPatientPageFromApi } from "@/lib/patientApi";
import { isDateInRange } from "@/lib/dateRange";
import { showConfirm, showError, showToast, showWarning } from "@/lib/swal";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import { useAuthStore } from "@/store/auth";
import { useNurseStore } from "@/store/nurses";
import type { ActivityQuickFilter } from "@/components/activity-log/ActivityToolbar";
import type { PatientFilter } from "@/components/patients/PatientToolbar";
import { AlertTriangle, CheckCheck, UserRound } from "lucide-react";

export const loadBatchSize = 10;
export const patientPageSize = 10;

type NurseDetailViewCacheEntry = {
  nurse: NurseRecord | null;
  assignedPatients: PatientRecord[];
  summaryPatients: PatientRecord[];
  totalAssignedPatientCount: number;
  totalPatientResults: number;
  activities: ActivityLogRecord[];
  totalActivities: number;
  activityPage: number;
  patientSearch?: string;
  patientFilter?: PatientFilter;
  patientPage?: number;
  activitySearch?: string;
  activityQuickFilter?: ActivityQuickFilter;
  activityCategory?: ActivityCategory | "all";
  activityDate?: string;
};

const nurseDetailViewCache = new Map<string, NurseDetailViewCacheEntry>();

const updateNurseDetailViewCache = (nurseId: string, nextCache: Partial<NurseDetailViewCacheEntry>) => {
  const currentCache = nurseDetailViewCache.get(nurseId);
  nurseDetailViewCache.set(nurseId, {
    nurse: null,
    assignedPatients: [],
    summaryPatients: [],
    totalAssignedPatientCount: 0,
    totalPatientResults: 0,
    activities: [],
    totalActivities: 0,
    activityPage: 1,
    ...currentCache,
    ...nextCache,
  });
};

interface NurseDetailState {
  nurse: NurseRecord | null;
  assignedPatients: PatientRecord[];
  summaryPatients: PatientRecord[];
  selectedPatientIds: string[];
  isReassignOpen: boolean;
  selectedActivity: ActivityLogRecord | null;
  activitySearch: string;
  activityQuickFilter: ActivityQuickFilter;
  activityCategory: ActivityCategory | "all";
  activityDate: string;
  patientSearch: string;
  patientFilter: PatientFilter;
  patientPage: number;
  totalAssignedPatientCount: number;
  totalPatientResults: number;
  visibleActivityCount: number;
  activityPage: number;
  totalActivities: number;
  activities: ActivityLogRecord[];
  isLoadingMoreActivities: boolean;
  isLoadingPatients: boolean;
  hasLoadedPatients: boolean;
  hasLoadedActivities: boolean;
  hasLoadedPatientSummary: boolean;
  isLoadingPatientSummary: boolean;
  isLoadingActivities: boolean;
  isLoadingNurse: boolean;
  isDeleting: boolean;
}

type NurseDetailAction =
  | { type: "resolve_nurse"; nurse: NurseRecord | null }
  | { type: "set_nurse_loading"; value: boolean }
  | { type: "set_deleting"; value: boolean }
  | { type: "set_reassign_open"; value: boolean }
  | { type: "set_selected_activity"; activity: ActivityLogRecord | null }
  | { type: "set_selected_patient_ids"; patientIds: string[] }
  | { type: "set_patient_controls"; search?: string; filter?: PatientFilter; page?: number; resetSelection?: boolean }
  | { type: "reset_patient_filters" }
  | { type: "set_activity_controls"; search?: string; quickFilter?: ActivityQuickFilter; category?: ActivityCategory | "all"; date?: string; reset?: boolean }
  | { type: "patients_loading"; value: boolean }
  | { type: "patients_loaded"; patients: PatientRecord[]; totalPatientResults: number; patientPage: number; summaryPatients?: PatientRecord[]; totalAssignedPatientCount?: number }
  | { type: "patients_failed" }
  | { type: "patient_summary_loading"; value: boolean }
  | { type: "patient_summary_loaded"; patients: PatientRecord[]; totalAssignedPatientCount: number }
  | { type: "patient_summary_failed" }
  | { type: "activities_loading"; value: boolean }
  | { type: "activities_loaded"; activities: ActivityLogRecord[]; totalActivities: number; activityPage: number }
  | { type: "activities_failed" }
  | { type: "load_more_activities_start" }
  | { type: "load_more_activities_done" }
  | { type: "activities_appended"; activities: ActivityLogRecord[]; totalActivities: number; activityPage: number }
  | { type: "mark_activity_read"; activityId: string };

const getAuditSeverityFilter = (quickFilter: ActivityQuickFilter) => {
  if (quickFilter === "critical" || quickFilter === "warning" || quickFilter === "success" || quickFilter === "info") return quickFilter;
  return undefined;
};

const getNotificationSeverityFilter = (quickFilter: ActivityQuickFilter) => {
  if (quickFilter === "critical" || quickFilter === "warning" || quickFilter === "success") return quickFilter;
  return undefined;
};

const sortActivitiesByNewest = (activities: readonly ActivityLogRecord[]) => activities
  .toSorted((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());

const isPatientStillHandled = (patient: PatientRecord) => patient.status !== "Complete" && patient.status !== "Nonaktif";

function createInitialState(nurseId: string, nurses: readonly NurseRecord[]): NurseDetailState {
  const cachedDetail = nurseDetailViewCache.get(nurseId);
  const cachedNurse = cachedDetail?.nurse ?? nurses.find((item) => item.id === nurseId) ?? null;

  return {
    nurse: cachedNurse,
    assignedPatients: cachedDetail?.assignedPatients ?? [],
    summaryPatients: cachedDetail?.summaryPatients ?? [],
    selectedPatientIds: [],
    isReassignOpen: false,
    selectedActivity: null,
    activitySearch: cachedDetail?.activitySearch ?? "",
    activityQuickFilter: cachedDetail?.activityQuickFilter ?? "all",
    activityCategory: cachedDetail?.activityCategory ?? "all",
    activityDate: cachedDetail?.activityDate ?? "",
    patientSearch: cachedDetail?.patientSearch ?? "",
    patientFilter: cachedDetail?.patientFilter ?? "all",
    patientPage: cachedDetail?.patientPage ?? 1,
    totalAssignedPatientCount: cachedDetail?.totalAssignedPatientCount ?? 0,
    totalPatientResults: cachedDetail?.totalPatientResults ?? 0,
    visibleActivityCount: loadBatchSize,
    activityPage: cachedDetail?.activityPage ?? 1,
    totalActivities: cachedDetail?.totalActivities ?? 0,
    activities: cachedDetail?.activities ?? [],
    isLoadingMoreActivities: false,
    isLoadingPatients: !cachedDetail,
    hasLoadedPatients: Boolean(cachedDetail),
    hasLoadedActivities: Boolean(cachedDetail),
    hasLoadedPatientSummary: Boolean(cachedDetail),
    isLoadingPatientSummary: !cachedDetail,
    isLoadingActivities: !cachedDetail,
    isLoadingNurse: !cachedNurse && !cachedDetail,
    isDeleting: false,
  };
}

function nurseDetailReducer(state: NurseDetailState, action: NurseDetailAction): NurseDetailState {
  switch (action.type) {
    case "resolve_nurse":
      return { ...state, nurse: action.nurse, isLoadingNurse: false };
    case "set_nurse_loading":
      return { ...state, isLoadingNurse: action.value };
    case "set_deleting":
      return { ...state, isDeleting: action.value };
    case "set_reassign_open":
      return { ...state, isReassignOpen: action.value };
    case "set_selected_activity":
      return { ...state, selectedActivity: action.activity };
    case "set_selected_patient_ids":
      return { ...state, selectedPatientIds: action.patientIds };
    case "set_patient_controls":
      return { ...state, patientSearch: action.search ?? state.patientSearch, patientFilter: action.filter ?? state.patientFilter, patientPage: action.page ?? state.patientPage, selectedPatientIds: action.resetSelection ? [] : state.selectedPatientIds };
    case "reset_patient_filters":
      return { ...state, patientSearch: "", patientFilter: "all", patientPage: 1, selectedPatientIds: [] };
    case "set_activity_controls":
      return { ...state, activitySearch: action.reset ? "" : action.search ?? state.activitySearch, activityQuickFilter: action.reset ? "all" : action.quickFilter ?? state.activityQuickFilter, activityCategory: action.reset ? "all" : action.category ?? state.activityCategory, activityDate: action.reset ? "" : action.date ?? state.activityDate, visibleActivityCount: loadBatchSize, isLoadingActivities: true };
    case "patients_loading":
      return { ...state, isLoadingPatients: action.value };
    case "patients_loaded":
      return { ...state, assignedPatients: action.patients, totalPatientResults: action.totalPatientResults, patientPage: action.patientPage, summaryPatients: action.summaryPatients ?? state.summaryPatients, totalAssignedPatientCount: action.totalAssignedPatientCount ?? state.totalAssignedPatientCount, hasLoadedPatients: true, hasLoadedPatientSummary: action.summaryPatients ? true : state.hasLoadedPatientSummary, isLoadingPatients: false, isLoadingPatientSummary: action.summaryPatients ? false : state.isLoadingPatientSummary };
    case "patients_failed":
      return state.hasLoadedPatients ? { ...state, isLoadingPatients: false } : { ...state, assignedPatients: [], totalPatientResults: 0, hasLoadedPatients: true, isLoadingPatients: false };
    case "patient_summary_loading":
      return { ...state, isLoadingPatientSummary: action.value };
    case "patient_summary_loaded":
      return { ...state, summaryPatients: action.patients, totalAssignedPatientCount: action.totalAssignedPatientCount, hasLoadedPatientSummary: true, isLoadingPatientSummary: false };
    case "patient_summary_failed":
      return state.hasLoadedPatientSummary ? { ...state, isLoadingPatientSummary: false } : { ...state, summaryPatients: [], totalAssignedPatientCount: 0, hasLoadedPatientSummary: true, isLoadingPatientSummary: false };
    case "activities_loading":
      return { ...state, isLoadingActivities: action.value };
    case "activities_loaded":
      return { ...state, activities: action.activities, activityPage: action.activityPage, totalActivities: action.totalActivities, visibleActivityCount: loadBatchSize, hasLoadedActivities: true, isLoadingActivities: false };
    case "activities_failed":
      return state.hasLoadedActivities ? { ...state, isLoadingActivities: false } : { ...state, activities: [], activityPage: 1, totalActivities: 0, hasLoadedActivities: true, isLoadingActivities: false };
    case "load_more_activities_start":
      return { ...state, isLoadingMoreActivities: true };
    case "load_more_activities_done":
      return { ...state, isLoadingMoreActivities: false };
    case "activities_appended":
      return { ...state, activities: action.activities, activityPage: action.activityPage, totalActivities: action.totalActivities, visibleActivityCount: state.visibleActivityCount + loadBatchSize, isLoadingMoreActivities: false };
    case "mark_activity_read":
      return { ...state, activities: state.activities.map((activity) => activity.id === action.activityId ? { ...activity, read: true } : activity) };
    default:
      return state;
  }
}

export function useNurseDetailPageController(nurseId: string) {
  const { replace } = useRouter();
  const shouldAnimate = useDashboardEntranceMotion();
  const userRole = useAuthStore((store) => store.user?.role);
  const hasAuthHydrated = useAuthStore((store) => store.hasHydrated);
  const nurses = useNurseStore((store) => store.nurses);
  const dashboardRole = getDashboardRole(userRole);
  const [state, dispatch] = useReducer(nurseDetailReducer, { nurseId, nurses }, ({ nurseId: nextNurseId, nurses: nextNurses }) => createInitialState(nextNurseId, nextNurses));
  const debouncedActivitySearch = useDebouncedValue(state.activitySearch);
  const debouncedPatientSearch = useDebouncedValue(state.patientSearch);

  useEffect(() => {
    if (!hasAuthHydrated || isOperationalAdminRole(dashboardRole) || dashboardRole === "nurse") return;
    replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, replace]);

  useEffect(() => {
    if (!hasAuthHydrated || (dashboardRole !== "admin" && dashboardRole !== "nurse")) return;
    const cachedNurse = nurseDetailViewCache.get(nurseId)?.nurse ?? nurses.find((item) => item.id === nurseId) ?? null;
    if (cachedNurse) dispatch({ type: "resolve_nurse", nurse: cachedNurse });
    let isMounted = true;
    dispatch({ type: "set_nurse_loading", value: !cachedNurse });
    void getNurseByIdFromApi(nurseId)
      .then((nextNurse) => {
        if (!isMounted) return;
        dispatch({ type: "resolve_nurse", nurse: nextNurse });
        updateNurseDetailViewCache(nurseId, { nurse: nextNurse });
      })
      .catch(() => {
        if (!isMounted) return;
        dispatch({ type: "resolve_nurse", nurse: null });
      })
      .finally(() => {
        if (isMounted) dispatch({ type: "set_nurse_loading", value: false });
      });
    return () => { isMounted = false; };
  }, [dashboardRole, hasAuthHydrated, nurseId, nurses]);

  const loadAssignedPatients = useCallback(async (page: number, forceRefresh = false) => {
    const cached = nurseDetailViewCache.get(nurseId);
    const canUseVisibleCache = cached?.patientPage === page && cached.patientSearch === debouncedPatientSearch && cached.patientFilter === state.patientFilter;
    const patientStatus = state.patientFilter === "Nonaktif" ? "inactive" : state.patientFilter === "all" ? "all" : "active";
    const adherenceStatus = state.patientFilter === "all" || state.patientFilter === "Nonaktif" ? undefined : state.patientFilter;
    dispatch({ type: "patients_loading", value: !canUseVisibleCache });
    try {
      const response = await getPatientPageFromApi({ page, limit: patientPageSize, status: patientStatus, nurseId, search: debouncedPatientSearch, adherenceStatus, forceRefresh });
      const canUsePageAsSummary = page === 1 && !debouncedPatientSearch && state.patientFilter === "all" && response.patients.length >= response.meta.total;
      const nextSummaryPatients = canUsePageAsSummary ? response.patients : undefined;
      const nextTotalAssignedPatientCount = canUsePageAsSummary ? response.patients.filter(isPatientStillHandled).length : undefined;
      dispatch({ type: "patients_loaded", patients: response.patients, totalPatientResults: response.meta.total, patientPage: page, summaryPatients: nextSummaryPatients, totalAssignedPatientCount: nextTotalAssignedPatientCount });
      updateNurseDetailViewCache(nurseId, { assignedPatients: response.patients, ...(nextSummaryPatients ? { summaryPatients: nextSummaryPatients } : {}), ...(nextTotalAssignedPatientCount !== undefined ? { totalAssignedPatientCount: nextTotalAssignedPatientCount } : {}), totalPatientResults: response.meta.total, patientSearch: state.patientSearch, patientFilter: state.patientFilter, patientPage: page });
    } catch {
      dispatch({ type: "patients_failed" });
    }
  }, [debouncedPatientSearch, nurseId, state.patientFilter, state.patientSearch]);

  const loadPatientSummary = useCallback(async (forceRefresh = false) => {
    dispatch({ type: "patient_summary_loading", value: true });
    try {
      const response = await getPatientPageFromApi({ page: 1, limit: 1000, status: "all", nurseId, forceRefresh });
      const handledPatientCount = response.patients.filter(isPatientStillHandled).length;
      dispatch({ type: "patient_summary_loaded", patients: response.patients, totalAssignedPatientCount: handledPatientCount });
      updateNurseDetailViewCache(nurseId, { summaryPatients: response.patients, totalAssignedPatientCount: handledPatientCount });
    } catch {
      dispatch({ type: "patient_summary_failed" });
    }
  }, [nurseId]);

  useEffect(() => {
    if (!hasAuthHydrated || (dashboardRole !== "admin" && dashboardRole !== "nurse")) return;
    void loadAssignedPatients(state.patientPage);
  }, [dashboardRole, hasAuthHydrated, loadAssignedPatients, state.patientPage]);

  useEffect(() => {
    if (!hasAuthHydrated || (dashboardRole !== "admin" && dashboardRole !== "nurse")) return;
    if (!state.hasLoadedPatients || state.hasLoadedPatientSummary) return;
    void loadPatientSummary();
  }, [dashboardRole, hasAuthHydrated, loadPatientSummary, state.hasLoadedPatientSummary, state.hasLoadedPatients]);

  const loadActivities = useCallback(async () => {
    // Skip re-fetch kalau bukan karena filter change (misal patient summary selesai).
    // Filter change bakal set isLoadingActivities=true via set_activity_controls.
    if (!state.isLoadingActivities) return;

    const cached = nurseDetailViewCache.get(nurseId);
    const canUseVisibleCache = cached?.activitySearch === debouncedActivitySearch && cached.activityQuickFilter === state.activityQuickFilter && cached.activityCategory === state.activityCategory && cached.activityDate === state.activityDate;
    dispatch({ type: "activities_loading", value: !canUseVisibleCache });
    const patientById = new Map([...state.summaryPatients, ...state.assignedPatients].map((patient) => [patient.id, patient]));
    try {
      const [auditResponse, notificationResponse] = await Promise.all([
        getAuditActivityPageFromApi({ page: 1, limit: loadBatchSize, category: state.activityCategory, date: state.activityDate, nurseId, severity: getAuditSeverityFilter(state.activityQuickFilter), search: debouncedActivitySearch }),
        getNotificationActivityPageFromApi({ page: 1, limit: loadBatchSize, nurseId, category: state.activityCategory, date: state.activityDate, severity: getNotificationSeverityFilter(state.activityQuickFilter), search: debouncedActivitySearch }).catch(() => ({ activities: [], meta: { page: 1, limit: loadBatchSize, total: 0 } })),
      ]);
      const notificationActivities = notificationResponse.activities.map((activity) => {
        const patient = activity.patientId ? patientById.get(activity.patientId) : undefined;
        return { ...activity, patientName: activity.patientName ?? patient?.name, patientAvatar: activity.patientAvatar ?? patient?.avatar };
      });
      const nextActivities = sortActivitiesByNewest([...notificationActivities, ...auditResponse.activities]);
      const nextTotalActivities = auditResponse.meta.total + notificationResponse.meta.total;
      dispatch({ type: "activities_loaded", activities: nextActivities, totalActivities: nextTotalActivities, activityPage: 1 });
      updateNurseDetailViewCache(nurseId, { activities: nextActivities, totalActivities: nextTotalActivities, activityPage: 1, activitySearch: state.activitySearch, activityQuickFilter: state.activityQuickFilter, activityCategory: state.activityCategory, activityDate: state.activityDate });
    } catch {
      dispatch({ type: "activities_failed" });
    }
  }, [debouncedActivitySearch, nurseId, state.activityCategory, state.activityDate, state.activityQuickFilter, state.activitySearch, state.assignedPatients, state.isLoadingActivities, state.summaryPatients]);

  useEffect(() => {
    if (!hasAuthHydrated || (dashboardRole !== "admin" && dashboardRole !== "nurse")) return;
    void loadActivities();
  }, [dashboardRole, hasAuthHydrated, loadActivities]);

  const filteredNurseActivities = useMemo(() => {
    const query = debouncedActivitySearch.trim().toLowerCase();
    const assignments = Object.fromEntries([...state.summaryPatients, ...state.assignedPatients].flatMap((patient) => patient.assignedNurseId ? [[patient.id, patient.assignedNurseId]] : []));
    return state.activities.filter((activity) => {
      if (!activityMatchesNurse(activity, assignments, nurseId)) return false;
      const matchesSearch = !query || [activity.title, activity.description, activity.patientName ?? "", activity.medicineName ?? "", activity.category].some((value) => value.toLowerCase().includes(query));
      const matchesQuickFilter = state.activityQuickFilter === "all" || (state.activityQuickFilter === "unread" && !activity.read) || (state.activityQuickFilter === "success" && activity.severity === "Sukses") || (state.activityQuickFilter === "info" && activity.severity === "Info") || (state.activityQuickFilter === "critical" && activity.severity === "Kritis") || (state.activityQuickFilter === "warning" && activity.severity === "Peringatan");
      const matchesCategory = state.activityCategory === "all" || activity.category === state.activityCategory;
      const matchesDate = isDateInRange(getActivityDateKey(activity.timestamp), state.activityDate);
      return matchesSearch && matchesQuickFilter && matchesCategory && matchesDate;
    }).sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  }, [debouncedActivitySearch, nurseId, state.activities, state.activityCategory, state.activityDate, state.activityQuickFilter, state.assignedPatients, state.summaryPatients]);

  const selectablePatients = useMemo(() => state.assignedPatients.filter(isPatientStillHandled), [state.assignedPatients]);
  const selectablePatientIdSet = useMemo(() => new Set(selectablePatients.map((patient) => patient.id)), [selectablePatients]);
  const selectedPatientIds = useMemo(() => state.selectedPatientIds.filter((patientId) => selectablePatientIdSet.has(patientId)), [selectablePatientIdSet, state.selectedPatientIds]);

  const handledSummaryPatients = useMemo(() => state.summaryPatients.filter(isPatientStillHandled), [state.summaryPatients]);
  const handledPatientCount = state.hasLoadedPatientSummary ? handledSummaryPatients.length : state.totalAssignedPatientCount;
  const averageAdherence = useMemo(() => getAverageAdherence(state.summaryPatients), [state.summaryPatients]);
  const riskyPatients = useMemo(() => handledSummaryPatients.filter((patient) => patient.status !== "On Ideal Schedule").length, [handledSummaryPatients]);
  const unreadLogs = useMemo(() => state.activities.filter((activity) => !activity.read).length, [state.activities]);
  const isAdminView = isOperationalAdminRole(dashboardRole);
  const hasActiveActivityFilters = Boolean(state.activitySearch || state.activityQuickFilter !== "all" || state.activityCategory !== "all" || state.activityDate);
  const hasMoreActivities = state.activityPage * loadBatchSize < state.totalActivities;
  const totalPatientPages = Math.max(1, Math.ceil(state.totalPatientResults / patientPageSize));
  const hasActivePatientFilters = Boolean(state.patientSearch || state.patientFilter !== "all");

  const stats = [
    { label: "Pasien Ditangani", value: String(handledPatientCount), tone: "neutral" as const, color: "pine" as const, icon: UserRound },
    { label: "Rata-rata Kepatuhan Pasien", value: `${averageAdherence}%`, tone: averageAdherence >= 75 ? "safe" as const : "critical" as const, color: "leaf" as const, icon: CheckCheck },
    { label: "Pasien Perlu Perhatian", value: String(riskyPatients), tone: riskyPatients ? "critical" as const : "safe" as const, color: "lime" as const, icon: AlertTriangle },
    ...(!isAdminView ? [{ label: "Log Belum Dibaca", value: String(unreadLogs), tone: unreadLogs ? "critical" as const : "safe" as const, color: unreadLogs ? "danger" as const : "safe" as const, icon: AlertTriangle }] : []),
  ];

  const togglePatient = (patientId: string) => {
    dispatch({ type: "set_selected_patient_ids", patientIds: selectedPatientIds.includes(patientId) ? selectedPatientIds.filter((id) => id !== patientId) : [...selectedPatientIds, patientId] });
  };
  const toggleAllPatients = () => {
    dispatch({ type: "set_selected_patient_ids", patientIds: selectedPatientIds.length === selectablePatients.length ? [] : selectablePatients.map((patient) => patient.id) });
  };
  const openReassign = () => dispatch({ type: "set_reassign_open", value: true });
  const closeReassign = () => dispatch({ type: "set_reassign_open", value: false });
  const resetPatientFilters = () => dispatch({ type: "reset_patient_filters" });
  const resetActivityFilters = () => dispatch({ type: "set_activity_controls", reset: true });
  const setSelectedActivity = (activity: ActivityLogRecord | null) => dispatch({ type: "set_selected_activity", activity });

  const handleReassign = async (targetNurseIds: readonly string[]) => {
    const validTargetNurseIds = targetNurseIds.filter((targetNurseId) => nurses.some((item) => item.id === targetNurseId && item.status === "Aktif"));
    if (validTargetNurseIds.length === 0 || selectedPatientIds.length === 0) return;
    try {
      await Promise.all(selectedPatientIds.map((patientId) => assignPatientToNursesViaApi(patientId, validTargetNurseIds)));
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal memindahkan pasien."));
      return;
    }
    dispatch({ type: "set_selected_patient_ids", patientIds: [] });
    dispatch({ type: "set_reassign_open", value: false });
    await Promise.all([loadAssignedPatients(state.patientPage, true), loadPatientSummary(true)]);
    showToast("Pasien berhasil dipindahkan.");
  };

  const handleDelete = async () => {
    if (!state.nurse || state.isDeleting) return;
    if (state.isLoadingNurse || state.isLoadingPatients || state.isLoadingPatientSummary || state.isLoadingActivities || !state.hasLoadedPatients || !state.hasLoadedPatientSummary || !state.hasLoadedActivities) return;
    if (state.totalAssignedPatientCount > 0) {
      showWarning(`${state.nurse.fullName} masih menangani ${state.totalAssignedPatientCount} pasien. Reassign pasien terlebih dahulu.`, "Tidak Bisa Dihapus");
      return;
    }
    const result = await showConfirm("Hapus perawat?", `Data ${state.nurse.fullName} akan dihapus dari daftar perawat.`, "Ya, Hapus");
    if (!result.isConfirmed) return;
    dispatch({ type: "set_deleting", value: true });
    try {
      await deactivateNurseViaApi(state.nurse.id);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal menonaktifkan perawat."));
      return;
    } finally {
      dispatch({ type: "set_deleting", value: false });
    }
    showToast("Perawat berhasil dihapus.");
    replace("/nurses");
  };

  const handlePatientSearchChange = (value: string) => dispatch({ type: "set_patient_controls", search: value, page: 1, resetSelection: true });
  const handlePatientFilterChange = (value: PatientFilter) => dispatch({ type: "set_patient_controls", filter: value, page: 1, resetSelection: true });
  const handlePatientPageChange = (page: number) => dispatch({ type: "set_patient_controls", page: Math.min(Math.max(page, 1), totalPatientPages), resetSelection: true });
  const handleActivitySearchChange = (value: string) => dispatch({ type: "set_activity_controls", search: value });
  const handleActivityQuickFilterChange = (value: ActivityQuickFilter) => dispatch({ type: "set_activity_controls", quickFilter: value });
  const handleActivityCategoryChange = (value: ActivityCategory | "all") => dispatch({ type: "set_activity_controls", category: value });
  const handleActivityDateChange = (value: string) => dispatch({ type: "set_activity_controls", date: value });

  const loadMoreActivities = async () => {
    if (state.isLoadingMoreActivities || !hasMoreActivities) return;
    const nextPage = state.activityPage + 1;
    dispatch({ type: "load_more_activities_start" });
    try {
      const patientById = new Map([...state.summaryPatients, ...state.assignedPatients].map((patient) => [patient.id, patient]));
      const [auditResponse, notificationResponse] = await Promise.all([
        getAuditActivityPageFromApi({ page: nextPage, limit: loadBatchSize, category: state.activityCategory, date: state.activityDate, nurseId, severity: getAuditSeverityFilter(state.activityQuickFilter), search: debouncedActivitySearch }),
        getNotificationActivityPageFromApi({ page: nextPage, limit: loadBatchSize, nurseId, category: state.activityCategory, date: state.activityDate, severity: getNotificationSeverityFilter(state.activityQuickFilter), search: debouncedActivitySearch }).catch(() => ({ activities: [], meta: { page: nextPage, limit: loadBatchSize, total: 0 } })),
      ]);
      const notificationActivities = notificationResponse.activities.map((activity) => {
        const patient = activity.patientId ? patientById.get(activity.patientId) : undefined;
        return { ...activity, patientName: activity.patientName ?? patient?.name, patientAvatar: activity.patientAvatar ?? patient?.avatar };
      });
      const nextActivities = sortActivitiesByNewest([...state.activities, ...notificationActivities, ...auditResponse.activities]);
      const nextTotalActivities = auditResponse.meta.total + notificationResponse.meta.total;
      dispatch({ type: "activities_appended", activities: nextActivities, totalActivities: nextTotalActivities, activityPage: nextPage });
      updateNurseDetailViewCache(nurseId, { activities: nextActivities, totalActivities: nextTotalActivities, activityPage: nextPage });
    } catch {
      dispatch({ type: "load_more_activities_done" });
      showToast("Gagal memuat log perawat tambahan.", "error");
    }
  };

  const handleMarkActivityRead = async (activityId: string) => {
    await markActivitiesReadViaApi([activityId]);
    dispatch({ type: "mark_activity_read", activityId });
  };

  return {
    shouldAnimate,
    dashboardRole,
    hasAuthHydrated,
    nurses,
    state,
    nurse: state.nurse,
    stats,
    isAdminView,
    hasActiveActivityFilters,
    hasMoreActivities,
    totalPatientPages,
    hasActivePatientFilters,
    filteredNurseActivities,
    selectedPatientIds,
    selectablePatients,
    handleReassign,
    handleDelete,
    handlePatientSearchChange,
    handlePatientFilterChange,
    handlePatientPageChange,
    handleActivitySearchChange,
    handleActivityQuickFilterChange,
    handleActivityCategoryChange,
    handleActivityDateChange,
    loadMoreActivities,
    handleMarkActivityRead,
    openReassign,
    closeReassign,
    resetPatientFilters,
    resetActivityFilters,
    togglePatient,
    toggleAllPatients,
    setSelectedActivity,
  };
}
