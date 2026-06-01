"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2 } from "lucide-react";
import { groupSchedulesByPatient } from "@/helpers/schedules";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getPatientsFromApi } from "@/lib/patientApi";
import { createSchedulesViaApi, getSchedulePatientGroupsPageFromApi, setScheduleActiveViaApi, updateScheduleViaApi } from "@/lib/scheduleApi";
import { showError, showToast } from "@/lib/swal";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import type { ScheduleAction } from "./ScheduleActions";
import { getScheduleFormValues, type ScheduleFormValues } from "./scheduleFormUtils";
import type { ScheduleFilter } from "./ScheduleToolbar";

const pageSize = 10;
const defaultScheduleSummary = { active: 0, completed: 0, reminders: 0 };
let scheduleManagerViewCache: {
  schedules: MedicationScheduleRecord[];
  patients: PatientRecord[];
  totalPatients: number;
  scheduleSummary: { active: number; completed: number; reminders: number };
  search: string;
  activeFilter: ScheduleFilter;
  currentPage: number;
} | null = null;

interface UseScheduleManagerOptions {
  readonly initialPatientId?: string;
  readonly initialPatientName?: string;
}

export function useScheduleManager({ initialPatientId = "", initialPatientName = "" }: UseScheduleManagerOptions = {}) {
  const linkedPatientId = initialPatientId.trim();
  const linkedPatientName = initialPatientName.trim().toLowerCase();
  const [schedules, setSchedules] = useState<MedicationScheduleRecord[]>(() => scheduleManagerViewCache?.schedules ?? []);
  const [patients, setPatients] = useState<PatientRecord[]>(() => scheduleManagerViewCache?.patients ?? []);
  const [scheduleFormPatients, setScheduleFormPatients] = useState<PatientRecord[]>(() => scheduleManagerViewCache?.patients ?? []);
  const [totalPatients, setTotalPatients] = useState(() => scheduleManagerViewCache?.totalPatients ?? 0);
  const [scheduleSummary, setScheduleSummary] = useState(() => scheduleManagerViewCache?.scheduleSummary ?? defaultScheduleSummary);
  const [search, setSearch] = useState(() => scheduleManagerViewCache?.search ?? "");
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>(() => scheduleManagerViewCache?.activeFilter ?? "all");
  const [currentPage, setCurrentPage] = useState(() => scheduleManagerViewCache?.currentPage ?? 1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMedicinePatientId, setAddMedicinePatientId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<MedicationScheduleRecord | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [returnToDetailPatientId, setReturnToDetailPatientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(!scheduleManagerViewCache);
  const [isSummaryLoading, setIsSummaryLoading] = useState(!scheduleManagerViewCache);
  const [hasLoadedSchedules, setHasLoadedSchedules] = useState(Boolean(scheduleManagerViewCache));
  const [hasLoadedSummary, setHasLoadedSummary] = useState(Boolean(scheduleManagerViewCache));
  const hasLoadedSummaryRef = useRef(Boolean(scheduleManagerViewCache));
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const isInitialLoad = useRef(true);
  const requestSeqRef = useRef(0);
  const debouncedSearch = useDebouncedValue(search);

  const ensureScheduleFormPatients = useCallback(async () => {
    try {
      const allPatients = await getPatientsFromApi();
      setScheduleFormPatients(allPatients);
    } catch {
      // Current page patients are still available as a fallback for locked patient flows.
    }
  }, []);

  const loadSchedulePage = useCallback(async (page: number, forceRefresh = false, overrides?: { search?: string; activeFilter?: ScheduleFilter }) => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    const nextSearch = overrides?.search ?? debouncedSearch;
    const nextFilter = overrides?.activeFilter ?? activeFilter;
    const status = nextFilter === "Nonaktif" ? "inactive" : nextFilter === "all" ? "all" : "active";
    const adherenceStatus = nextFilter === "all" || nextFilter === "Nonaktif" ? undefined : nextFilter;
    const canUseVisibleCache = scheduleManagerViewCache?.currentPage === page
      && scheduleManagerViewCache.search === nextSearch
      && scheduleManagerViewCache.activeFilter === nextFilter;
    setIsLoading(!canUseVisibleCache);
    try {
      const schedulePage = await getSchedulePatientGroupsPageFromApi({
        page,
        limit: pageSize,
        search: nextSearch,
        status,
        adherenceStatus,
        forceRefresh,
      });
      if (requestSeq === requestSeqRef.current) {
        setPatients(schedulePage.patients);
        setSchedules(schedulePage.schedules);
        setTotalPatients(schedulePage.meta.total);
        const shouldRefreshSummary = !nextSearch && nextFilter === "all";
        const nextSummary = shouldRefreshSummary
          ? schedulePage.meta.summary ?? scheduleManagerViewCache?.scheduleSummary ?? defaultScheduleSummary
          : scheduleManagerViewCache?.scheduleSummary ?? defaultScheduleSummary;
        if (shouldRefreshSummary || !hasLoadedSummaryRef.current) setScheduleSummary(nextSummary);
        hasLoadedSummaryRef.current = true;
        setHasLoadedSummary(true);
        setIsSummaryLoading(false);
        const totalPagesForQuery = Math.max(1, Math.ceil(schedulePage.meta.total / pageSize));
        scheduleManagerViewCache = {
          schedules: schedulePage.schedules,
          patients: schedulePage.patients,
          totalPatients: schedulePage.meta.total,
          scheduleSummary: nextSummary,
          search: nextSearch,
          activeFilter: nextFilter,
          currentPage: page,
        };
        if (!forceRefresh) {
          const adjacentPages = [page + 1, page - 1].filter((nextPage) => nextPage >= 1 && nextPage <= totalPagesForQuery);
          void Promise.all(adjacentPages.map((nextPage) => getSchedulePatientGroupsPageFromApi({
            page: nextPage,
            limit: pageSize,
            search: nextSearch,
            status,
            adherenceStatus,
          }).catch(() => undefined)));
        }
      }
    } catch {
      if (requestSeq === requestSeqRef.current && !hasLoadedSchedules) {
        setSchedules([]);
        setPatients([]);
        setTotalPatients(0);
      }
      if (requestSeq === requestSeqRef.current) {
        setIsSummaryLoading(false);
        hasLoadedSummaryRef.current = true;
        setHasLoadedSummary(true);
      }
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setHasLoadedSchedules(true);
        setIsLoading(false);
      }
    }
  }, [activeFilter, debouncedSearch, hasLoadedSchedules]);

  useEffect(() => {
    const forceRefresh = isInitialLoad.current && !scheduleManagerViewCache;
    isInitialLoad.current = false;
    const id = setTimeout(() => void loadSchedulePage(currentPage, forceRefresh));
    return () => clearTimeout(id);
  }, [currentPage, loadSchedulePage]);

  const summaryStats = useMemo(() => {
    return [
      { label: "Jadwal Obat Aktif", value: String(scheduleSummary.active), tone: "safe" as const, color: "pine" as const, icon: CalendarClock },
      { label: "Total Obat Selesai", value: String(scheduleSummary.completed), tone: "safe" as const, color: "leaf" as const, icon: CheckCircle2 },
      { label: "Reminder Obat Aktif", value: String(scheduleSummary.reminders), tone: "neutral" as const, color: "lime" as const, icon: BellRing },
    ];
  }, [scheduleSummary]);

  const patientGroups = useMemo(() => groupSchedulesByPatient(schedules, undefined, patients), [patients, schedules]);
  const allPatientGroups = useMemo(() => groupSchedulesByPatient(schedules, undefined, patients), [patients, schedules]);
  const medicineCountByPatient = useMemo(() => Object.fromEntries(allPatientGroups.map((group) => [group.patientId, group.schedules.length])), [allPatientGroups]);
  const selectedGroup = selectedPatientId ? allPatientGroups.find((group) => group.patientId === selectedPatientId) ?? null : null;
  const addMedicinePatientGroup = addMedicinePatientId ? allPatientGroups.find((group) => group.patientId === addMedicinePatientId) ?? null : null;
  const totalPages = Math.max(1, Math.ceil(totalPatients / pageSize));
  const paginatedGroups = patientGroups;

  useEffect(() => {
    if (!linkedPatientId && !linkedPatientName) return;
    const resolvedPatientId = linkedPatientId || schedules.find((schedule) => schedule.patientName.toLowerCase() === linkedPatientName)?.patientId;
    if (!resolvedPatientId || !allPatientGroups.some((group) => group.patientId === resolvedPatientId)) return;
    const openTimer = window.setTimeout(() => setSelectedPatientId(resolvedPatientId), 420);
    return () => window.clearTimeout(openTimer);
  }, [allPatientGroups, linkedPatientId, linkedPatientName, schedules]);

  const resetFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setCurrentPage(1);
  };
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };
  const handleFilterChange = (value: ScheduleFilter) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };

  const handleAddSchedule = async (values: ScheduleFormValues) => {
    const formPatients = scheduleFormPatients.length > 0 ? scheduleFormPatients : patients;

    try {
      const createdSchedules = await createSchedulesViaApi(values.patientId, values.medicines, formPatients);
      setSchedules((currentSchedules) => [...createdSchedules, ...currentSchedules]);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal menambahkan jadwal obat."));
      return;
    }

    setIsAddModalOpen(false);
    setAddMedicinePatientId(null);
    resetFilters();
    await loadSchedulePage(1, true, { search: "", activeFilter: "all" });
    showToast(values.medicines.length > 1 ? "Beberapa jadwal obat berhasil ditambahkan." : "Jadwal obat berhasil ditambahkan.");
  };

  const handleEditSchedule = async (values: ScheduleFormValues) => {
    if (!editingSchedule) return;
    const [medicine] = values.medicines;
    if (!medicine) return;

    try {
      const updatedSchedule = await updateScheduleViaApi(editingSchedule.id, values.patientId, medicine, patients);
      setSchedules((currentSchedules) => currentSchedules.map((schedule) => schedule.id === editingSchedule.id ? updatedSchedule : schedule));
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal memperbarui jadwal obat."));
      return;
    }

    setEditingSchedule(null);
    setSelectedPatientId(returnToDetailPatientId);
    setReturnToDetailPatientId(null);
    await loadSchedulePage(currentPage, true);
    showToast("Jadwal obat berhasil diperbarui.");
  };

  const handleScheduleAction = async (action: ScheduleAction, schedule: MedicationScheduleRecord) => {
    if (action === "view") return;
    if (action === "edit") {
      setReturnToDetailPatientId(selectedPatientId);
      setSelectedPatientId(null);
      setEditingSchedule(schedule);
      return;
    }
    if (action === "toggle") {
      if (schedule.status === "Selesai") {
        showToast("Jadwal sudah selesai karena stok obat habis.");
        return;
      }

      const actionKey = `toggle-${schedule.id}`;
      if (processingAction) return;
      setProcessingAction(actionKey);
      try {
        const updatedSchedule = await setScheduleActiveViaApi(schedule, schedule.status === "Nonaktif", patients);
        setSchedules((currentSchedules) => currentSchedules.map((currentSchedule) => currentSchedule.id === schedule.id ? updatedSchedule : currentSchedule));
        await loadSchedulePage(currentPage, true);
      } catch (error) {
        showError(getApiErrorMessage(error, "Gagal mengubah status jadwal obat."));
        return;
      } finally {
        setProcessingAction(null);
      }
      showToast(schedule.status === "Nonaktif" ? "Jadwal berhasil diaktifkan." : "Jadwal berhasil dinonaktifkan.");
      return;
    }
  };

  const openAddScheduleModal = () => {
    setIsAddModalOpen(true);
    void ensureScheduleFormPatients();
  };

  const closeEditSchedule = () => {
    setEditingSchedule(null);
    setSelectedPatientId(returnToDetailPatientId);
    setReturnToDetailPatientId(null);
  };

  return {
    activeFilter,
    addMedicinePatientGroup,
    addMedicinePatientId,
    closeEditSchedule,
    currentPage,
    editingSchedule,
    handleAddSchedule,
    handleEditSchedule,
    handleFilterChange,
    handleScheduleAction,
    handleSearchChange,
    hasLoadedSchedules,
    hasLoadedSummary,
    isAddModalOpen,
    isLoading,
    isSummaryLoading,
    medicineCountByPatient,
    paginatedGroups,
    patientGroups,
    patients,
    scheduleFormPatients: scheduleFormPatients.length > 0 ? scheduleFormPatients : patients,
    processingAction,
    resetFilters,
    search,
    selectedGroup,
    setAddMedicinePatientId,
    setCurrentPage: (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages)),
    setEditingSchedule,
    setIsAddModalOpen: (isOpen: boolean) => {
      if (isOpen) {
        openAddScheduleModal();
        return;
      }
      setIsAddModalOpen(false);
    },
    setSelectedPatientId,
    summaryStats,
    totalPages,
    totalPatients,
    pageSize,
    getEditingScheduleValues: () => editingSchedule ? getScheduleFormValues(editingSchedule) : undefined,
  };
}
