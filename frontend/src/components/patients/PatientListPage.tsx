"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { getNextPatientOrder } from "@/helpers/patients";
import { patients as initialPatients, type PatientRecord } from "@/lib/mocks/patients";
import { showConfirm, showToast } from "@/lib/swal";
import AddPatientModal from "./AddPatientModal";
import { createPatientRecord, type AddPatientValues } from "./AddPatientForm";
import type { PatientAction } from "./PatientActions";
import PatientPagination from "./PatientPagination";
import PatientTable from "./PatientTable";
import PatientToolbar, { type PatientFilter } from "./PatientToolbar";

const pageSize = 10;

export default function PatientListPage() {
  const [patientRecords, setPatientRecords] = useState(initialPatients);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<PatientFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRecord | null>(null);
  const deferredSearch = useDeferredValue(search);

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

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (value: PatientFilter) => {
    setActiveFilter(value);
    setCurrentPage(1);
  };

  const handleAddPatient = (values: AddPatientValues) => {
    setPatientRecords((currentPatients) => [createPatientRecord(values, getNextPatientOrder(currentPatients)), ...currentPatients]);
    setIsAddModalOpen(false);
    setSearch("");
    setActiveFilter("all");
    setCurrentPage(1);
    showToast("Pasien berhasil ditambahkan.", "success");
  };

  const handleEditPatient = (values: AddPatientValues) => {
    if (!editingPatient) return;

    setPatientRecords((currentPatients) =>
      currentPatients.map((patient) =>
        patient.id === editingPatient.id
          ? {
              ...patient,
              name: values.fullName,
              age: values.age,
              gender: values.gender,
              phone: values.phone,
              email: values.email,
              address: values.address,
            }
          : patient,
      ),
    );
    setEditingPatient(null);
    showToast("Data pasien berhasil diperbarui.");
  };

  const handlePatientAction = async (action: PatientAction, patient: PatientRecord) => {
    if (action === "edit") {
      setEditingPatient(patient);
    }

    if (action === "delete") {
      const result = await showConfirm("Hapus pasien?", `Data ${patient.name} akan dihapus dari daftar pasien.`, "Ya, Hapus");

      if (result.isConfirmed) {
        setPatientRecords((currentPatients) => currentPatients.filter((currentPatient) => currentPatient.id !== patient.id));
        showToast("Pasien berhasil dihapus.");
      }
    }
  };

  return (
    <motion.main
      className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:ml-[280px] lg:w-[calc(100%-280px)] lg:max-w-none lg:px-10 lg:py-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.section
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-[-0.04em] text-text-main sm:text-4xl">
            Daftar Pasien
          </h1>
        </div>

        <Button size="sm" icon={<Plus size={16} />} onClick={() => setIsAddModalOpen(true)}>
          Tambah Pasien Baru
        </Button>
      </motion.section>

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <PatientToolbar
          search={search}
          activeFilter={activeFilter}
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
        />
      </motion.div>

      <motion.div
        className="mt-6 overflow-hidden rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.08)]"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
      >
        <PatientTable patients={paginatedPatients} actions={["view", "edit", "delete"]} onAction={handlePatientAction} embedded emptyMessage="Tidak ada data pasien." />
        <PatientPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredPatients.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(Math.min(Math.max(page, 1), totalPages))}
        />
      </motion.div>
      <AddPatientModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onSubmit={handleAddPatient} />
      <AddPatientModal
        isOpen={Boolean(editingPatient)}
        initialValues={
          editingPatient
            ? {
                fullName: editingPatient.name,
                age: editingPatient.age,
                gender: editingPatient.gender,
                phone: editingPatient.phone ?? "",
                email: editingPatient.email ?? "",
                password: "********",
                address: editingPatient.address ?? "",
              }
            : undefined
        }
        mode="edit"
        onClose={() => setEditingPatient(null)}
        onSubmit={handleEditPatient}
      />
    </motion.main>
  );
}
