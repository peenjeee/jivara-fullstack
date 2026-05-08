"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { BellRing, CalendarClock, CheckCircle2, Plus } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import PatientPagination from "@/components/patients/PatientPagination";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { getNextScheduleOrder, groupSchedulesByPatient } from "@/helpers/schedules";
import { patients } from "@/lib/mocks/patients";
import { medicationSchedules as initialSchedules, type MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getSchedulesFromApi } from "@/lib/scheduleApi";
import { showConfirm, showToast } from "@/lib/swal";
import ScheduleDetailModal from "./ScheduleDetailModal";
import ScheduleModal from "./ScheduleModal";
import ScheduleTable from "./ScheduleTable";
import ScheduleToolbar, { type ScheduleFilter } from "./ScheduleToolbar";
import { createScheduleRecord, getEmptyScheduleFormValues, getScheduleFormValues, type ScheduleFormValues, updateScheduleRecord } from "./ScheduleForm";
import type { ScheduleAction } from "./ScheduleActions";

const pageSize = 10;
interface SchedulePageProps {
  readonly initialPatientName?: string;
  readonly readOnly?: boolean;
}

export default function SchedulePage({ initialPatientName = "", readOnly = false }: SchedulePageProps) {
  const linkedPatientName = initialPatientName.trim().toLowerCase();
  const [schedules, setSchedules] = useState(initialSchedules);
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

    getSchedulesFromApi()
      .then((apiSchedules) => {
        if (isMounted) setSchedules(apiSchedules);
      })
      .catch(() => {
        if (isMounted) setSchedules(initialSchedules);
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
    const patientStatusById = Object.fromEntries(patients.map((patient) => [patient.id, patient.status]));

    return schedules.filter((schedule) => {
      const matchesSearch = !query || [schedule.patientName, schedule.medicineName, schedule.dose, schedule.frequency, schedule.instructions ?? ""]
        .some((value) => value.toLowerCase().includes(query));
      const matchesFilter = activeFilter === "all" || patientStatusById[schedule.patientId] === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, deferredSearch, schedules]);

  const patientGroups = useMemo(() => groupSchedulesByPatient(filteredSchedules), [filteredSchedules]);
  const allPatientGroups = useMemo(() => groupSchedulesByPatient(schedules), [schedules]);
  const medicineCountByPatient = useMemo(
    () => Object.fromEntries(allPatientGroups.map((group) => [group.patientId, group.schedules.length])),
    [allPatientGroups],
  );
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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: ScheduleFilter) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setActiveFilter("all");
    setCurrentPage(1);
  };

  const handleAddSchedule = (values: ScheduleFormValues) => {
    setSchedules((currentSchedules) => {
      const nextOrder = getNextScheduleOrder(currentSchedules);
      const createdSchedules = values.medicines.map((medicine, index) => createScheduleRecord(values.patientId, medicine, patients, nextOrder + index));
      return [...createdSchedules, ...currentSchedules];
    });
    setIsAddModalOpen(false);
    setAddMedicinePatientId(null);
    setSearch("");
    setActiveFilter("all");
    setCurrentPage(1);
    showToast(values.medicines.length > 1 ? "Beberapa jadwal obat berhasil ditambahkan." : "Jadwal obat berhasil ditambahkan.");
  };

  const handleEditSchedule = (values: ScheduleFormValues) => {
    if (!editingSchedule) return;
    const [medicine] = values.medicines;
    if (!medicine) return;

    setSchedules((currentSchedules) => currentSchedules.map((schedule) => schedule.id === editingSchedule.id ? updateScheduleRecord(schedule, medicine, patients, values.patientId) : schedule));
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
      setSchedules((currentSchedules) =>
        currentSchedules.map((currentSchedule) => {
          if (currentSchedule.id !== schedule.id) return currentSchedule;

          if (currentSchedule.status === "Nonaktif") {
            return {
              ...currentSchedule,
              status: currentSchedule.previousStatus ?? "Aktif",
              previousStatus: undefined,
            };
          }

          return {
            ...currentSchedule,
            previousStatus: currentSchedule.status,
            status: "Nonaktif",
          };
        }),
      );
      showToast(schedule.status === "Nonaktif" ? "Jadwal berhasil diaktifkan." : "Jadwal berhasil dinonaktifkan.");
      return;
    }

    if (action === "delete") {
      const result = await showConfirm("Hapus jadwal obat?", `Jadwal ${schedule.medicineName} untuk ${schedule.patientName} akan dihapus.`, "Ya, Hapus");

      if (result.isConfirmed) {
        setSchedules((currentSchedules) => currentSchedules.filter((currentSchedule) => currentSchedule.id !== schedule.id));
        showToast("Jadwal obat berhasil dihapus.");
      }
    }
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Jadwal Obat"
        action={!readOnly && (
          <Button size="sm" icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
            Tambah Jadwal
          </Button>
        )}
      />

      <SummaryCardGrid stats={summaryStats} />

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.32 }}
      >
        <ScheduleToolbar search={search} activeFilter={activeFilter} hasActiveFilters={Boolean(search || activeFilter !== "all")} onSearchChange={handleSearchChange} onFilterChange={handleFilterChange} onReset={resetFilters} />
      </motion.div>

      <motion.div
        className="mt-6 overflow-hidden rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      >
        <ScheduleTable
          groups={paginatedGroups}
          onViewDetail={(group) => setSelectedPatientId(group.patientId)}
          onAddMedicine={(group) => setAddMedicinePatientId(group.patientId)}
          readOnly={readOnly}
          emptyMessage="Tidak ada data jadwal."
        />
        <PatientPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={patientGroups.length}
          pageSize={pageSize}
          itemLabel="pasien"
          onPageChange={(page) => setCurrentPage(Math.min(Math.max(page, 1), totalPages))}
        />
      </motion.div>

      {!readOnly && <ScheduleModal isOpen={isAddModalOpen} patients={patients} medicineIndexOffsetByPatient={medicineCountByPatient} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddSchedule} />}
      <ScheduleModal
        isOpen={Boolean(addMedicinePatientId)}
        patients={patients}
        initialValues={getEmptyScheduleFormValues(addMedicinePatientId ?? "")}
        patientLocked
        medicineIndexOffset={addMedicinePatientGroup?.schedules.length ?? 0}
        onClose={() => setAddMedicinePatientId(null)}
        onSubmit={handleAddSchedule}
      />
      <ScheduleModal
        isOpen={Boolean(editingSchedule)}
        patients={patients}
        initialValues={editingSchedule ? getScheduleFormValues(editingSchedule) : undefined}
        mode="edit"
        patientLocked
        onClose={() => {
          setEditingSchedule(null);
          setSelectedPatientId(returnToDetailPatientId);
          setReturnToDetailPatientId(null);
        }}
        onSubmit={handleEditSchedule}
      />
      <ScheduleDetailModal group={selectedGroup} readOnly={readOnly} onClose={() => setSelectedPatientId(null)} onAction={handleScheduleAction} />
    </DashboardPageShell>
  );
}
