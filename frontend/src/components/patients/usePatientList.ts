"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { PatientRecord } from "@/lib/mocks/patients";
import { getNursesFromApi } from "@/lib/nurseApi";
import { activatePatientViaApi, assignPatientToNursesViaApi, createPatientViaApi, deactivatePatientViaApi, getPatientPageFromApi, updatePatientViaApi } from "@/lib/patientApi";
import { showConfirm, showError, showToast } from "@/lib/swal";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useNurseStore } from "@/store/nurses";
import type { AddPatientValues } from "./addPatientFormUtils";
import type { PatientAction } from "./PatientActions";
import type { PatientFilter } from "./PatientToolbar";

const pageSize = 10;
let patientListViewCache: {
  patientRecords: PatientRecord[];
  totalPatients: number;
  search: string;
  activeFilter: PatientFilter;
  currentPage: number;
} | null = null;

/** Exported for test isolation — resets module-level cache between tests. */
export function __resetPatientListViewCache(): void {
  patientListViewCache = null;
}

export function usePatientList(onViewPatient: (patientId: string) => void, options: { readonly shouldLoadNurses?: boolean; readonly assignAfterCreate?: boolean } = {}) {
  const shouldLoadNurses = options.shouldLoadNurses ?? true;
  const assignAfterCreate = options.assignAfterCreate ?? false;
  const nurses = useNurseStore((state) => state.nurses);
  const setNurses = useNurseStore((state) => state.setNurses);
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>(() => patientListViewCache?.patientRecords ?? []);
  const [totalPatients, setTotalPatients] = useState(() => patientListViewCache?.totalPatients ?? 0);
  const [search, setSearch] = useState(() => patientListViewCache?.search ?? "");
  const [activeFilter, setActiveFilter] = useState<PatientFilter>(() => patientListViewCache?.activeFilter ?? "all");
  const [currentPage, setCurrentPage] = useState(() => patientListViewCache?.currentPage ?? 1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [assigningPatient, setAssigningPatient] = useState<PatientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(!patientListViewCache);
  const [hasLoadedPatients, setHasLoadedPatients] = useState(Boolean(patientListViewCache));
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [isLoadingNurses, setIsLoadingNurses] = useState(false);
  const isInitialLoad = useRef(true);
  const hasLoadedPatientsRef = useRef(hasLoadedPatients);
  const requestSeqRef = useRef(0);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    hasLoadedPatientsRef.current = hasLoadedPatients;
  }, [hasLoadedPatients]);

  const loadPatientPage = useCallback(async (page: number, forceRefresh = false, overrides?: { search?: string; activeFilter?: PatientFilter }) => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    const nextSearch = overrides?.search ?? debouncedSearch;
    const nextFilter = overrides?.activeFilter ?? activeFilter;
    const status = nextFilter === "Nonaktif" ? "inactive" : nextFilter === "all" ? "all" : "active";
    const adherenceStatus = nextFilter === "all" || nextFilter === "Nonaktif" ? undefined : nextFilter;
    const canUseVisibleCache = patientListViewCache?.currentPage === page
      && patientListViewCache.search === nextSearch
      && patientListViewCache.activeFilter === nextFilter;
    setIsLoading(!canUseVisibleCache);
    try {
      const result = await getPatientPageFromApi({
        page,
        limit: pageSize,
        status,
        search: nextSearch,
        adherenceStatus,
        forceRefresh,
      });
      if (requestSeq === requestSeqRef.current) {
        setPatientRecords(result.patients);
        setTotalPatients(result.meta.total);
        const totalPagesForQuery = Math.max(1, Math.ceil(result.meta.total / pageSize));
        patientListViewCache = {
          patientRecords: result.patients,
          totalPatients: result.meta.total,
          search: nextSearch,
          activeFilter: nextFilter,
          currentPage: page,
        };
        if (!forceRefresh) {
          const adjacentPages = [page + 1, page - 1].filter((nextPage) => nextPage >= 1 && nextPage <= totalPagesForQuery);
          void Promise.all(adjacentPages.map((nextPage) => getPatientPageFromApi({
            page: nextPage,
            limit: pageSize,
            status,
            search: nextSearch,
            adherenceStatus,
          }).catch(() => undefined)));
        }
      }
    } catch {
      if (requestSeq === requestSeqRef.current && !hasLoadedPatientsRef.current) {
        setPatientRecords([]);
        setTotalPatients(0);
      }
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setHasLoadedPatients(true);
        setIsLoading(false);
      }
    }
  }, [activeFilter, debouncedSearch]);

  useEffect(() => {
    const forceRefresh = isInitialLoad.current && !patientListViewCache;
    isInitialLoad.current = false;
    const id = setTimeout(() => void loadPatientPage(currentPage, forceRefresh));
    return () => clearTimeout(id);
  }, [currentPage, loadPatientPage]);

  useEffect(() => {
    const handleScheduleChanged = () => {
      void loadPatientPage(currentPage, true);
    };

    window.addEventListener("jivara:schedule-changed", handleScheduleChanged);
    return () => window.removeEventListener("jivara:schedule-changed", handleScheduleChanged);
  }, [currentPage, loadPatientPage]);

  const ensureNursesLoaded = useCallback(async () => {
    if (!shouldLoadNurses || nurses.length > 0 || isLoadingNurses) return;
    setIsLoadingNurses(true);
    try {
      const nurseRecords = await getNursesFromApi();
      setNurses(nurseRecords);
    } catch {
      // Modal can still show an empty-state if nurses cannot be loaded.
    } finally {
      setIsLoadingNurses(false);
    }
  }, [isLoadingNurses, nurses.length, setNurses, shouldLoadNurses]);

  const totalPages = Math.max(1, Math.ceil(totalPatients / pageSize));
  const paginatedPatients = patientRecords;
  const assignedNurseByPatientId = useMemo(() => Object.fromEntries(patientRecords.map((patient) => [patient.id, nurses.find((nurse) => nurse.id === patient.assignedNurseId)?.fullName ?? "Belum ditugaskan"])), [nurses, patientRecords]);

  const setPage = (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages));
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };
  const handleFilterChange = (value: PatientFilter) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };
  const resetFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setCurrentPage(1);
  };

  const handleAddPatient = async (values: AddPatientValues) => {
    let createdPatient: PatientRecord;
    try {
      createdPatient = await createPatientViaApi(values);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal menambahkan pasien."));
      return;
    }

    setIsAddModalOpen(false);
    resetFilters();
    if (assignAfterCreate) {
      setAssigningPatient(createdPatient);
      void ensureNursesLoaded();
      void loadPatientPage(1, true, { search: "", activeFilter: "all" });
      showToast("Pasien berhasil ditambahkan. Pilih perawat yang menangani pasien.", "success");
      return;
    }

    await loadPatientPage(1, true, { search: "", activeFilter: "all" });
    showToast("Pasien berhasil ditambahkan.", "success");
  };

  const handleEditPatient = async (values: AddPatientValues) => {
    if (!editingPatient) return;

    try {
      await updatePatientViaApi(editingPatient.id, values);
      await loadPatientPage(currentPage, true);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal memperbarui pasien."));
      return;
    }

    setEditingPatient(null);
    showToast("Data pasien berhasil diperbarui.");
  };

  const handlePatientAction = async (action: PatientAction, patient: PatientRecord) => {
    if (action === "view") onViewPatient(patient.id);
    if (action === "edit") setEditingPatient(patient);
    if (action === "assign") {
      setAssigningPatient(patient);
      void ensureNursesLoaded();
    }

    if (action === "activate") {
      const actionKey = `activate-${patient.id}`;
      if (processingAction) return;

      setProcessingAction(actionKey);
      try {
        await activatePatientViaApi(patient.id);
        await loadPatientPage(currentPage, true);
      } catch (error) {
        showError(getApiErrorMessage(error, "Gagal mengaktifkan pasien."));
        return;
      } finally {
        setProcessingAction(null);
      }

      showToast("Pasien berhasil diaktifkan.");
    }

    if (action === "delete") {
      const actionKey = `delete-${patient.id}`;
      if (processingAction) return;
      const result = await showConfirm("Hapus pasien?", `Data ${patient.name} akan dihapus dari daftar pasien.`, "Ya, Hapus");
      if (!result.isConfirmed) return;

      setProcessingAction(actionKey);
      try {
        await deactivatePatientViaApi(patient.id);
        await loadPatientPage(currentPage, true);
      } catch (error) {
        showError(getApiErrorMessage(error, "Gagal menghapus pasien."));
        return;
      } finally {
        setProcessingAction(null);
      }

      showToast("Pasien berhasil dihapus.");
    }
  };

  const handleAssignNurses = async (nurseIds: readonly string[]) => {
    if (!assigningPatient) return;

    try {
      await assignPatientToNursesViaApi(assigningPatient.id, nurseIds);
      await loadPatientPage(currentPage, true);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal mengatur perawat pasien."));
      return;
    }

    setAssigningPatient(null);
    showToast("Perawat pasien berhasil diperbarui.");
  };

  return {
    activeFilter,
    assigningPatient,
    assignedNurseByPatientId,
    currentPage,
    editingPatient,
    filteredPatients: patientRecords,
    handleAddPatient,
    handleAssignNurses,
    handleEditPatient,
    handleFilterChange,
    handlePatientAction,
    handleSearchChange,
    hasLoadedPatients,
    isAddModalOpen,
    isLoading,
    isLoadingNurses,
    nurses,
    paginatedPatients,
    pageSize,
    processingAction,
    resetFilters,
    search,
    setCurrentPage: setPage,
    setEditingPatient,
    setAssigningPatient,
    setIsAddModalOpen,
    totalPages,
    totalPatients,
  };
}
