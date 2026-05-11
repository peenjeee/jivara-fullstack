"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { getNurseByPatientId } from "@/helpers/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";
import { createPatientViaApi, deactivatePatientViaApi, getPatientsFromApi, updatePatientViaApi } from "@/lib/patientApi";
import { showConfirm, showError, showToast } from "@/lib/swal";
import { useNurseStore } from "@/store/nurses";
import type { AddPatientValues } from "./AddPatientForm";
import type { PatientAction } from "./PatientActions";
import type { PatientFilter } from "./PatientToolbar";

const pageSize = 10;

export function usePatientList(onViewPatient: (patientId: string) => void) {
  const nurses = useNurseStore((state) => state.nurses);
  const assignments = useNurseStore((state) => state.assignments);
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<PatientFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isMounted = true;

    getPatientsFromApi()
      .then((patients) => {
        if (isMounted) setPatientRecords(patients);
      })
      .catch(() => {
        if (isMounted) setPatientRecords([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPatients = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return patientRecords.filter((patient) => {
      const matchesSearch = !query || patient.name.toLowerCase().includes(query) || patient.id.toLowerCase().includes(query);
      const matchesFilter = activeFilter === "all" || patient.status === activeFilter;
      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, deferredSearch, patientRecords]);

  const totalPages = Math.max(1, Math.ceil(filteredPatients.length / pageSize));
  const paginatedPatients = filteredPatients.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const assignedNurseByPatientId = useMemo(() => Object.fromEntries(patientRecords.map((patient) => [patient.id, getNurseByPatientId(nurses, assignments, patient.id)?.fullName ?? "Belum ditugaskan"])), [assignments, nurses, patientRecords]);

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
      const createdPatient = await createPatientViaApi(values);
      setPatientRecords((currentPatients) => [createdPatient, ...currentPatients]);
    } catch {
      showError("Gagal menambahkan pasien dari API.");
      return;
    }

    setIsAddModalOpen(false);
    resetFilters();
    showToast("Pasien berhasil ditambahkan.", "success");
  };

  const handleEditPatient = async (values: AddPatientValues) => {
    if (!editingPatient) return;

    try {
      const updatedPatient = await updatePatientViaApi(editingPatient.id, values);
      setPatientRecords((currentPatients) => currentPatients.map((patient) => patient.id === editingPatient.id ? updatedPatient : patient));
    } catch {
      showError("Gagal memperbarui pasien dari API.");
      return;
    }

    setEditingPatient(null);
    showToast("Data pasien berhasil diperbarui.");
  };

  const handlePatientAction = async (action: PatientAction, patient: PatientRecord) => {
    if (action === "view") onViewPatient(patient.id);
    if (action === "edit") setEditingPatient(patient);

    if (action === "delete") {
      const result = await showConfirm("Hapus pasien?", `Data ${patient.name} akan dihapus dari daftar pasien.`, "Ya, Hapus");
      if (!result.isConfirmed) return;

      try {
        await deactivatePatientViaApi(patient.id);
        setPatientRecords((currentPatients) => currentPatients.filter((currentPatient) => currentPatient.id !== patient.id));
      } catch {
        showError("Gagal menghapus pasien dari API.");
        return;
      }

      showToast("Pasien berhasil dihapus.");
    }
  };

  return {
    activeFilter,
    assignedNurseByPatientId,
    currentPage,
    editingPatient,
    filteredPatients,
    handleAddPatient,
    handleEditPatient,
    handleFilterChange,
    handlePatientAction,
    handleSearchChange,
    isAddModalOpen,
    paginatedPatients,
    resetFilters,
    search,
    setCurrentPage: setPage,
    setEditingPatient,
    setIsAddModalOpen,
    totalPages,
  };
}
