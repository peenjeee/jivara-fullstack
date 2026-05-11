"use client";

import { motion } from "motion/react";
import { Plus } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import PatientPagination from "@/components/patients/PatientPagination";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import ScheduleDetailModal from "./ScheduleDetailModal";
import ScheduleModal from "./ScheduleModal";
import ScheduleTable from "./ScheduleTable";
import ScheduleToolbar from "./ScheduleToolbar";
import { getEmptyScheduleFormValues } from "./ScheduleForm";
import { useScheduleManager } from "./useScheduleManager";
interface SchedulePageProps {
  readonly initialPatientName?: string;
  readonly readOnly?: boolean;
}

export default function SchedulePage({ initialPatientName = "", readOnly = false }: SchedulePageProps) {
  const schedule = useScheduleManager(initialPatientName);

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Jadwal Obat"
        action={!readOnly && (
            <Button size="sm" icon={<Plus size={16} />} onClick={() => schedule.setIsAddModalOpen(true)}>
            Tambah Jadwal
          </Button>
        )}
      />

      <SummaryCardGrid stats={schedule.summaryStats} />

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.32 }}
      >
        <ScheduleToolbar search={schedule.search} activeFilter={schedule.activeFilter} hasActiveFilters={Boolean(schedule.search || schedule.activeFilter !== "all")} onSearchChange={schedule.handleSearchChange} onFilterChange={schedule.handleFilterChange} onReset={schedule.resetFilters} />
      </motion.div>

      <motion.div
        className="mt-6 overflow-hidden rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      >
        <ScheduleTable
          groups={schedule.paginatedGroups}
          onViewDetail={(group) => schedule.setSelectedPatientId(group.patientId)}
          onAddMedicine={(group) => schedule.setAddMedicinePatientId(group.patientId)}
          readOnly={readOnly}
          emptyMessage="Tidak ada data jadwal."
        />
        <PatientPagination
          currentPage={schedule.currentPage}
          totalPages={schedule.totalPages}
          totalItems={schedule.patientGroups.length}
          pageSize={10}
          itemLabel="pasien"
          onPageChange={schedule.setCurrentPage}
        />
      </motion.div>

      {!readOnly && <ScheduleModal isOpen={schedule.isAddModalOpen} patients={schedule.patients} medicineIndexOffsetByPatient={schedule.medicineCountByPatient} onClose={() => schedule.setIsAddModalOpen(false)} onSubmit={schedule.handleAddSchedule} />}
      <ScheduleModal
        isOpen={Boolean(schedule.addMedicinePatientId)}
        patients={schedule.patients}
        initialValues={getEmptyScheduleFormValues(schedule.addMedicinePatientId ?? "")}
        patientLocked
        medicineIndexOffset={schedule.addMedicinePatientGroup?.schedules.length ?? 0}
        onClose={() => schedule.setAddMedicinePatientId(null)}
        onSubmit={schedule.handleAddSchedule}
      />
      <ScheduleModal
        isOpen={Boolean(schedule.editingSchedule)}
        patients={schedule.patients}
        initialValues={schedule.getEditingScheduleValues()}
        mode="edit"
        patientLocked
        onClose={schedule.closeEditSchedule}
        onSubmit={schedule.handleEditSchedule}
      />
      <ScheduleDetailModal group={schedule.selectedGroup} readOnly={readOnly} onClose={() => schedule.setSelectedPatientId(null)} onAction={schedule.handleScheduleAction} />
    </DashboardPageShell>
  );
}
