"use client";

import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { Plus } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import Button from "@/components/ui/Button";
import { ButtonSkeleton, TableDataSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import AddPatientModal from "./AddPatientModal";
import AssignPatientNursesModal from "./AssignPatientNursesModal";
import PatientPagination from "./PatientPagination";
import PatientTable from "./PatientTable";
import PatientToolbar from "./PatientToolbar";
import { usePatientList } from "./usePatientList";

interface PatientListPageProps {
  readonly mode?: "manage" | "readonly";
  readonly canDeletePatients?: boolean;
  readonly canAssignNurses?: boolean;
}

export default function PatientListPage({ mode = "manage", canDeletePatients = false, canAssignNurses = false }: PatientListPageProps) {
  const shouldAnimate = useDashboardEntranceMotion();
  const { push } = useRouter();
  const shouldLoadNurses = canAssignNurses || mode === "readonly";
  const patientList = usePatientList((patientId) => push(`/patients/${encodeURIComponent(patientId)}`), { shouldLoadNurses });
  const baseActions = mode === "readonly"
    ? ["view"] as const
    : canDeletePatients
      ? ["view", "edit", "delete", "activate"] as const
      : ["view", "edit"] as const;
  const patientActions = mode !== "readonly" && canAssignNurses
    ? [...baseActions, "assign"] as const
    : baseActions;

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Daftar Pasien"
        action={mode === "manage" && (patientList.isLoading && !patientList.hasLoadedPatients
          ? <ButtonSkeleton />
          : <Button size="sm" icon={<Plus size={16} />} onClick={() => patientList.setIsAddModalOpen(true)}>
            Tambah Pasien Baru
          </Button>
        )}
      />

      <m.div
        className="mt-6"
        {...getDashboardEntranceMotion(shouldAnimate, 0.1, 20)}
      >
        {patientList.isLoading && !patientList.hasLoadedPatients ? <ToolbarSkeleton /> : <PatientToolbar
          search={patientList.search}
          activeFilter={patientList.activeFilter}
          hasActiveFilters={Boolean(patientList.search || patientList.activeFilter !== "all")}
          onSearchChange={patientList.handleSearchChange}
          onFilterChange={patientList.handleFilterChange}
          onReset={patientList.resetFilters}
        />}
      </m.div>

      <m.div
        className="mt-6 overflow-hidden rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
        {...getDashboardEntranceMotion(shouldAnimate, 0.18, 24)}
      >
        {patientList.isLoading ? <TableDataSkeleton /> : (
          <>
            <PatientTable patients={patientList.paginatedPatients} actions={patientActions} processingAction={patientList.processingAction} onAction={patientList.handlePatientAction} embedded emptyMessage="Tidak ada data pasien." assignedNurseByPatientId={mode === "readonly" ? patientList.assignedNurseByPatientId : undefined} />
            <PatientPagination currentPage={patientList.currentPage} totalPages={patientList.totalPages} totalItems={patientList.totalPatients} pageSize={patientList.pageSize} onPageChange={patientList.setCurrentPage} />
          </>
        )}
      </m.div>
      {mode === "manage" && <AddPatientModal isOpen={patientList.isAddModalOpen} onClose={() => patientList.setIsAddModalOpen(false)} onSubmit={patientList.handleAddPatient} />}
      <AddPatientModal
        isOpen={mode === "manage" && Boolean(patientList.editingPatient)}
        initialValues={
          patientList.editingPatient
            ? {
                fullName: patientList.editingPatient.name,
                age: patientList.editingPatient.age,
                gender: patientList.editingPatient.gender,
                phone: patientList.editingPatient.phone ?? "",
                email: patientList.editingPatient.email ?? "",
                password: "********",
                address: patientList.editingPatient.address ?? "",
              }
            : undefined
        }
        mode="edit"
        onClose={() => patientList.setEditingPatient(null)}
        onSubmit={patientList.handleEditPatient}
      />
      {mode === "manage" && <AssignPatientNursesModal isOpen={Boolean(patientList.assigningPatient)} patient={patientList.assigningPatient} nurses={patientList.nurses} isLoadingNurses={patientList.isLoadingNurses} onClose={() => patientList.setAssigningPatient(null)} onSubmit={patientList.handleAssignNurses} />}
    </DashboardPageShell>
  );
}
