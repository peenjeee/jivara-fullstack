"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import AddPatientModal from "./AddPatientModal";
import PatientPagination from "./PatientPagination";
import PatientTable from "./PatientTable";
import PatientToolbar from "./PatientToolbar";
import { usePatientList } from "./usePatientList";

interface PatientListPageProps {
  readonly mode?: "manage" | "readonly";
}

export default function PatientListPage({ mode = "manage" }: PatientListPageProps) {
  const router = useRouter();
  const patientList = usePatientList((patientId) => router.push(`/patients/${encodeURIComponent(patientId)}`));

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Daftar Pasien"
        action={mode === "manage" && (
            <Button size="sm" icon={<Plus size={16} />} onClick={() => patientList.setIsAddModalOpen(true)}>
            Tambah Pasien Baru
          </Button>
        )}
      />

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <PatientToolbar
          search={patientList.search}
          activeFilter={patientList.activeFilter}
          hasActiveFilters={Boolean(patientList.search || patientList.activeFilter !== "all")}
          onSearchChange={patientList.handleSearchChange}
          onFilterChange={patientList.handleFilterChange}
          onReset={patientList.resetFilters}
        />
      </motion.div>

      <motion.div
        className="mt-6 overflow-hidden rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
      >
        <PatientTable patients={patientList.paginatedPatients} actions={mode === "readonly" ? ["view"] : ["view", "edit", "delete"]} onAction={patientList.handlePatientAction} embedded emptyMessage="Tidak ada data pasien." assignedNurseByPatientId={mode === "readonly" ? patientList.assignedNurseByPatientId : undefined} />
        <PatientPagination
          currentPage={patientList.currentPage}
          totalPages={patientList.totalPages}
          totalItems={patientList.filteredPatients.length}
          pageSize={10}
          onPageChange={patientList.setCurrentPage}
        />
      </motion.div>
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
    </DashboardPageShell>
  );
}
