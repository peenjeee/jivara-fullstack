"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { PatientRecord } from "@/lib/mocks/patients";
import { createPatientViaApi, deactivatePatientViaApi, getPatientPageFromApi, updatePatientViaApi } from "@/lib/patientApi";
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

export function usePatientList(onViewPatient: (patientId: string) => void) {
  const nurses = useNurseStore((state) => state.nurses);
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>(() => patientListViewCache?.patientRecords ?? []);
  const [totalPatients, setTotalPatients] = useState(() => patientListViewCache?.totalPatients ?? 0);
  const [search, setSearch] = useState(() => patientListViewCache?.search ?? "");
  const [activeFilter, setActiveFilter] = useState<PatientFilter>(() => patientListViewCache?.activeFilter ?? "all");
  const [currentPage, setCurrentPage] = useState(() => patientListViewCache?.currentPage ?? 1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const [isLoading, setIsLoading] = useState(!patientListViewCache);
  const [hasLoadedPatients, setHasLoadedPatients] = useState(Boolean(patientListViewCache));
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const loadPatientPage = useCallback(async (page: number, forceRefresh = false, overrides?: { search?: string; activeFilter?: PatientFilter }) => {
    const nextSearch = overrides?.search ?? debouncedSearch;
    const nextFilter = overrides?.activeFilter ?? activeFilter;
    const canUseVisibleCache = !forceRefresh
      && patientListViewCache?.currentPage === page
      && patientListViewCache.search === nextSearch
      && patientListViewCache.activeFilter === nextFilter;
    setIsLoading(!canUseVisibleCache);
    try {
      const result = await getPatientPageFromApi({
        page,
        limit: pageSize,
        status: "active",
        search: nextSearch,
        adherenceStatus: nextFilter === "all" ? undefined : nextFilter,
        forceRefresh,
      });
      setPatientRecords(result.patients);
      setTotalPatients(result.meta.total);
      patientListViewCache = {
        patientRecords: result.patients,
        totalPatients: result.meta.total,
        search: nextSearch,
        activeFilter: nextFilter,
        currentPage: page,
      };
    } catch {
      setPatientRecords([]);
      setTotalPatients(0);
    } finally {
      setHasLoadedPatients(true);
      setIsLoading(false);
    }
  }, [activeFilter, debouncedSearch]);

  useEffect(() => {
    const id = setTimeout(() => void loadPatientPage(currentPage));
    return () => clearTimeout(id);
  }, [currentPage, loadPatientPage]);

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
    try {
      await createPatientViaApi(values);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal menambahkan pasien dari API."));
      return;
    }

    setIsAddModalOpen(false);
    resetFilters();
    await loadPatientPage(1, true, { search: "", activeFilter: "all" });
    showToast("Pasien berhasil ditambahkan.", "success");
  };

  const handleEditPatient = async (values: AddPatientValues) => {
    if (!editingPatient) return;

    try {
      await updatePatientViaApi(editingPatient.id, values);
      await loadPatientPage(currentPage, true);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal memperbarui pasien dari API."));
      return;
    }

    setEditingPatient(null);
    showToast("Data pasien berhasil diperbarui.");
  };

  const handlePatientAction = async (action: PatientAction, patient: PatientRecord) => {
    if (action === "view") onViewPatient(patient.id);
    if (action === "edit") setEditingPatient(patient);

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
        showError(getApiErrorMessage(error, "Gagal menghapus pasien dari API."));
        return;
      } finally {
        setProcessingAction(null);
      }

      showToast("Pasien berhasil dihapus.");
    }
  };

  return {
    activeFilter,
    assignedNurseByPatientId,
    currentPage,
    editingPatient,
    filteredPatients: patientRecords,
    handleAddPatient,
    handleEditPatient,
    handleFilterChange,
    handlePatientAction,
    handleSearchChange,
    hasLoadedPatients,
    isAddModalOpen,
    isLoading,
    paginatedPatients,
    pageSize,
    processingAction,
    resetFilters,
    search,
    setCurrentPage: setPage,
    setEditingPatient,
    setIsAddModalOpen,
    totalPages,
    totalPatients,
  };
}
