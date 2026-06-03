"use client";

import { m } from "motion/react";
import { Plus } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import Button from "@/components/ui/Button";
import PatientPagination from "@/components/patients/PatientPagination";
import { ButtonSkeleton, SummaryCardsSkeleton, TableDataSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import RefreshingNotice from "@/components/ui/RefreshingNotice";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import ScheduleDetailModal from "./ScheduleDetailModal";
import ScheduleModal from "./ScheduleModal";
import ScheduleTable from "./ScheduleTable";
import ScheduleToolbar from "./ScheduleToolbar";
import { getEmptyScheduleFormValues } from "./scheduleFormUtils";
import { useScheduleManager } from "./useScheduleManager";
interface SchedulePageProps {
  readonly initialPatientId?: string;
  readonly initialPatientName?: string;
  readonly readOnly?: boolean;
}

export default function SchedulePage({ initialPatientId = "", initialPatientName = "", readOnly = false }: SchedulePageProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const schedule = useScheduleManager({ initialPatientId, initialPatientName });
  const isUpdatingSchedules = schedule.isLoading && schedule.hasLoadedSchedules;

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Jadwal Obat"
        action={!readOnly && (schedule.isLoading && !schedule.hasLoadedSchedules
          ? <ButtonSkeleton />
          : <Button size="sm" icon={<Plus size={16} />} onClick={() => schedule.setIsAddModalOpen(true)}>
            Tambah Jadwal
          </Button>
        )}
      />

      {schedule.isSummaryLoading && !schedule.hasLoadedSummary ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={schedule.summaryStats} />}

      <m.div
        className="mt-6"
        {...getDashboardEntranceMotion(shouldAnimate, 0.32, 20)}
      >
        {schedule.isLoading && !schedule.hasLoadedSchedules ? <ToolbarSkeleton /> : <ScheduleToolbar search={schedule.search} activeFilter={schedule.activeFilter} hasActiveFilters={Boolean(schedule.search || schedule.activeFilter !== "all")} onSearchChange={schedule.handleSearchChange} onFilterChange={schedule.handleFilterChange} onReset={schedule.resetFilters} />}
      </m.div>

      <m.div
        className="relative mt-6 min-h-[620px] overflow-hidden rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
        aria-busy={isUpdatingSchedules || undefined}
        {...getDashboardEntranceMotion(shouldAnimate, 0.4, 24)}
      >
        <RefreshingNotice active={isUpdatingSchedules} />
        {schedule.isLoading && !schedule.hasLoadedSchedules ? <TableDataSkeleton /> : (
          <div className={isUpdatingSchedules ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <ScheduleTable groups={schedule.paginatedGroups} onViewDetail={(group) => schedule.setSelectedPatientId(group.patientId)} onAddMedicine={(group) => schedule.setAddMedicinePatientId(group.patientId)} readOnly={readOnly} emptyMessage="Tidak ada data jadwal." />
            <PatientPagination currentPage={schedule.currentPage} totalPages={schedule.totalPatients > 0 ? schedule.totalPages : 1} totalItems={schedule.totalPatients} pageSize={schedule.pageSize} itemLabel="pasien" onPageChange={schedule.setCurrentPage} />
          </div>
        )}
      </m.div>

      {!readOnly && <ScheduleModal isOpen={schedule.isAddModalOpen} patients={schedule.scheduleFormPatients} medicineIndexOffsetByPatient={schedule.medicineCountByPatient} onClose={() => schedule.setIsAddModalOpen(false)} onSubmit={schedule.handleAddSchedule} />}
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
      <ScheduleDetailModal group={schedule.selectedGroup} readOnly={readOnly} processingAction={schedule.processingAction} onClose={() => schedule.setSelectedPatientId(null)} onAction={schedule.handleScheduleAction} />
    </DashboardPageShell>
  );
}
