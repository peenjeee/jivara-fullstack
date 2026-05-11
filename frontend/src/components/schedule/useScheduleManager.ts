"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { BellRing, CalendarClock, CheckCircle2 } from "lucide-react";
import { groupSchedulesByPatient } from "@/helpers/schedules";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getPatientsFromApi } from "@/lib/patientApi";
import { createSchedulesViaApi, deactivateScheduleViaApi, getSchedulesFromApi, setScheduleActiveViaApi, updateScheduleViaApi } from "@/lib/scheduleApi";
import { showConfirm, showError, showToast } from "@/lib/swal";
import type { ScheduleAction } from "./ScheduleActions";
import { getScheduleFormValues, type ScheduleFormValues } from "./ScheduleForm";
import type { ScheduleFilter } from "./ScheduleToolbar";

const pageSize = 10;

export function useScheduleManager(initialPatientName: string) {
  const linkedPatientName = initialPatientName.trim().toLowerCase();
  const [schedules, setSchedules] = useState<MedicationScheduleRecord[]>([]);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ScheduleFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMedicinePatientId, setAddMedicinePatientId] = useState<string | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<MedicationScheduleRecord | null>(null);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [returnToDetailPatientId, setReturnToDetailPatientId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getSchedulesFromApi(), getPatientsFromApi()])
      .then(([apiSchedules, apiPatients]) => {
        if (!isMounted) return;
        setSchedules(apiSchedules);
        setPatients(apiPatients);
      })
      .catch(() => {
        if (!isMounted) return;
        setSchedules([]);
        setPatients([]);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const summaryStats = useMemo(() => {
    const active = schedules.filter((schedule) => schedule.status === "Aktif").length;
    const completed = schedules.filter((schedule) => schedule.status === "Selesai").length;
    const reminders = schedules.filter((schedule) => schedule.reminderEnabled).length;

    return [
      { label: "Jadwal Aktif", value: String(active), tone: "safe" as const, color: "pine" as const, icon: CalendarClock },
      { label: "Selesai", value: String(completed), tone: "safe" as const, color: "leaf" as const, icon: CheckCircle2 },
      { label: "Reminder Aktif", value: String(reminders), tone: "neutral" as const, color: "lime" as const, icon: BellRing },
    ];
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return schedules.filter((schedule) => {
      const matchesSearch = !query || [schedule.patientName, schedule.medicineName, schedule.dose, schedule.frequency, schedule.instructions ?? ""].some((value) => value.toLowerCase().includes(query));
      return matchesSearch && activeFilter === "all";
    });
  }, [activeFilter, deferredSearch, schedules]);

  const patientGroups = useMemo(() => groupSchedulesByPatient(filteredSchedules), [filteredSchedules]);
  const allPatientGroups = useMemo(() => groupSchedulesByPatient(schedules), [schedules]);
  const medicineCountByPatient = useMemo(() => Object.fromEntries(allPatientGroups.map((group) => [group.patientId, group.schedules.length])), [allPatientGroups]);
  const selectedGroup = selectedPatientId ? allPatientGroups.find((group) => group.patientId === selectedPatientId) ?? null : null;
  const addMedicinePatientGroup = addMedicinePatientId ? allPatientGroups.find((group) => group.patientId === addMedicinePatientId) ?? null : null;
  const totalPages = Math.max(1, Math.ceil(patientGroups.length / pageSize));
  const paginatedGroups = patientGroups.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    if (!linkedPatientName) return;
    const linkedPatientId = schedules.find((schedule) => schedule.patientName.toLowerCase() === linkedPatientName)?.patientId;
    if (!linkedPatientId) return;
    const openTimer = window.setTimeout(() => setSelectedPatientId(linkedPatientId), 420);
    return () => window.clearTimeout(openTimer);
  }, [linkedPatientName, schedules]);

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
    try {
      const createdSchedules = await createSchedulesViaApi(values.patientId, values.medicines, patients);
      setSchedules((currentSchedules) => [...createdSchedules, ...currentSchedules]);
    } catch {
      showError("Gagal menambahkan jadwal obat dari API.");
      return;
    }

    setIsAddModalOpen(false);
    setAddMedicinePatientId(null);
    resetFilters();
    showToast(values.medicines.length > 1 ? "Beberapa jadwal obat berhasil ditambahkan." : "Jadwal obat berhasil ditambahkan.");
  };

  const handleEditSchedule = async (values: ScheduleFormValues) => {
    if (!editingSchedule) return;
    const [medicine] = values.medicines;
    if (!medicine) return;

    try {
      const updatedSchedule = await updateScheduleViaApi(editingSchedule.id, values.patientId, medicine, patients);
      setSchedules((currentSchedules) => currentSchedules.map((schedule) => schedule.id === editingSchedule.id ? updatedSchedule : schedule));
    } catch {
      showError("Gagal memperbarui jadwal obat dari API.");
      return;
    }

    setEditingSchedule(null);
    setSelectedPatientId(returnToDetailPatientId);
    setReturnToDetailPatientId(null);
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
      try {
        const updatedSchedule = await setScheduleActiveViaApi(schedule, schedule.status === "Nonaktif", patients);
        setSchedules((currentSchedules) => currentSchedules.map((currentSchedule) => currentSchedule.id === schedule.id ? updatedSchedule : currentSchedule));
      } catch {
        showError("Gagal mengubah status jadwal obat dari API.");
        return;
      }
      showToast(schedule.status === "Nonaktif" ? "Jadwal berhasil diaktifkan." : "Jadwal berhasil dinonaktifkan.");
      return;
    }
    if (action !== "delete") return;

    const result = await showConfirm("Hapus jadwal obat?", `Jadwal ${schedule.medicineName} untuk ${schedule.patientName} akan dihapus.`, "Ya, Hapus");
    if (!result.isConfirmed) return;

    try {
      await deactivateScheduleViaApi(schedule.id);
      setSchedules((currentSchedules) => currentSchedules.filter((currentSchedule) => currentSchedule.id !== schedule.id));
    } catch {
      showError("Gagal menghapus jadwal obat dari API.");
      return;
    }

    showToast("Jadwal obat berhasil dihapus.");
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
    isAddModalOpen,
    medicineCountByPatient,
    paginatedGroups,
    patientGroups,
    patients,
    resetFilters,
    search,
    selectedGroup,
    setAddMedicinePatientId,
    setCurrentPage: (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages)),
    setEditingSchedule,
    setIsAddModalOpen,
    setSelectedPatientId,
    summaryStats,
    totalPages,
    getEditingScheduleValues: () => editingSchedule ? getScheduleFormValues(editingSchedule) : undefined,
  };
}
