"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Edit3, Eye, Power, Plus, Trash2 } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import FilterPills from "@/components/ui/FilterPills";
import IconActionButton from "@/components/ui/IconActionButton";
import SearchField from "@/components/ui/SearchField";
import ToolbarCard from "@/components/ui/ToolbarCard";
import PatientPagination from "@/components/patients/PatientPagination";
import { getNurseInitials, getPatientsForNurse } from "@/helpers/nurses";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { patients } from "@/lib/mocks/patients";
import type { NurseRecord, NurseStatus } from "@/lib/mocks/nurses";
import { showConfirm, showToast, showWarning } from "@/lib/swal";
import { useNurseStore, type NurseFormValues } from "@/store/nurses";
import { useAuthStore } from "@/store/auth";
import NurseModal from "./NurseModal";
import NurseStatusBadge from "./NurseStatusBadge";

type NurseFilter = "all" | NurseStatus;

const filters: { readonly label: string; readonly value: NurseFilter }[] = [
  { label: "Semua", value: "all" },
  { label: "Aktif", value: "Aktif" },
  { label: "Nonaktif", value: "Nonaktif" },
];

const pageSize = 10;

export default function NurseListPage() {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const nurses = useNurseStore((state) => state.nurses);
  const assignments = useNurseStore((state) => state.assignments);
  const addNurse = useNurseStore((state) => state.addNurse);
  const updateNurse = useNurseStore((state) => state.updateNurse);
  const toggleNurseStatus = useNurseStore((state) => state.toggleNurseStatus);
  const deleteNurse = useNurseStore((state) => state.deleteNurse);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<NurseFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNurse, setEditingNurse] = useState<NurseRecord | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (!hasAuthHydrated || dashboardRole === "admin" || dashboardRole === "nurse") return;
    router.replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, router]);

  const filteredNurses = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return nurses.filter((nurse) => {
      const matchesSearch = !query || [nurse.fullName, nurse.email, nurse.phone, nurse.id].some((value) => value.toLowerCase().includes(query));
      const matchesFilter = filter === "all" || nurse.status === filter;
      return matchesSearch && matchesFilter;
    });
  }, [deferredSearch, filter, nurses]);
  const totalPages = Math.max(1, Math.ceil(filteredNurses.length / pageSize));
  const paginatedNurses = filteredNurses.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (!hasAuthHydrated || dashboardRole === "patient") return null;

  const handleAddNurse = (values: NurseFormValues) => {
    addNurse(values);
    setIsModalOpen(false);
    showToast("Perawat berhasil ditambahkan.", "success");
  };

  const handleEditNurse = (values: NurseFormValues) => {
    if (!editingNurse) return;
    updateNurse(editingNurse.id, values);
    setEditingNurse(null);
    showToast("Data perawat berhasil diperbarui.");
  };

  const handleToggleStatus = async (nurse: NurseRecord) => {
    const nextStatus = nurse.status === "Aktif" ? "Nonaktif" : "Aktif";
    const result = await showConfirm(`${nextStatus}kan perawat?`, `${nurse.fullName} akan berubah status menjadi ${nextStatus}.`, `Ya, ${nextStatus}kan`);
    if (!result.isConfirmed) return;
    toggleNurseStatus(nurse.id);
    showToast(`Status perawat menjadi ${nextStatus}.`);
  };

  const handleDelete = async (nurse: NurseRecord) => {
    const assignedCount = getPatientsForNurse(patients, assignments, nurse.id).length;
    if (assignedCount > 0) {
      showWarning(`${nurse.fullName} masih menangani ${assignedCount} pasien. Reassign pasien terlebih dahulu sebelum menghapus perawat.`, "Tidak Bisa Dihapus");
      return;
    }

    const result = await showConfirm("Hapus perawat?", `Data ${nurse.fullName} akan dihapus dari daftar perawat.`, "Ya, Hapus");
    if (!result.isConfirmed) return;
    deleteNurse(nurse.id);
    showToast("Perawat berhasil dihapus.");
  };

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
    setCurrentPage(1);
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Daftar Perawat"
        action={<Button size="sm" icon={<Plus size={16} />} onClick={() => setIsModalOpen(true)}>Tambah Perawat</Button>}
      />

      <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}>
        <ToolbarCard>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <SearchField id="nurseSearch" value={search} placeholder="Cari perawat ..." onChange={(value) => { setSearch(value); setCurrentPage(1); }} />
            {(search || filter !== "all") && <Button type="button" size="sm" variant="outline" onClick={resetFilters}>Reset</Button>}
          </div>
          <FilterPills options={filters} activeValue={filter} onChange={(value) => { setFilter(value); setCurrentPage(1); }} className="mt-4" />
        </ToolbarCard>
      </motion.div>

      <motion.section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}>
        <div className="hidden overflow-x-auto sm:block" data-lenis-prevent>
          <table className="w-full text-left">
            <thead className="bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-4">Perawat</th>
                <th className="px-5 py-4">Kontak</th>
                <th className="px-5 py-4">Gender</th>
                <th className="px-5 py-4">Pasien</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {paginatedNurses.map((nurse) => {
                const assignedCount = getPatientsForNurse(patients, assignments, nurse.id).length;
                return (
                  <tr key={nurse.id} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-4"><NurseIdentity nurse={nurse} /></td>
                    <td className="px-5 py-4 text-sm font-bold text-muted"><span className="block text-text-main">{nurse.email}</span>{nurse.phone}</td>
                    <td className="px-5 py-4 text-sm font-bold text-muted">{nurse.gender}</td>
                    <td className="px-5 py-4 text-sm font-extrabold text-text-main">{assignedCount}</td>
                    <td className="px-5 py-4"><NurseStatusBadge status={nurse.status} /></td>
                    <td className="px-5 py-4"><NurseActions nurse={nurse} onView={() => router.push(`/nurses/${encodeURIComponent(nurse.id)}`)} onEdit={() => setEditingNurse(nurse)} onToggle={() => handleToggleStatus(nurse)} onDelete={() => handleDelete(nurse)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line sm:hidden">
          {paginatedNurses.map((nurse) => {
            const assignedCount = getPatientsForNurse(patients, assignments, nurse.id).length;
            return (
              <article key={nurse.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <NurseIdentity nurse={nurse} />
                  <NurseActions nurse={nurse} onView={() => router.push(`/nurses/${encodeURIComponent(nurse.id)}`)} onEdit={() => setEditingNurse(nurse)} onToggle={() => handleToggleStatus(nurse)} onDelete={() => handleDelete(nurse)} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-extrabold text-muted">
                  <NurseStatusBadge status={nurse.status} />
                  <span>{nurse.gender}</span>
                  <span>{assignedCount} pasien</span>
                </div>
              </article>
            );
          })}
        </div>
        <PatientPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredNurses.length}
          pageSize={pageSize}
          itemLabel="perawat"
          onPageChange={(page) => setCurrentPage(Math.min(Math.max(page, 1), totalPages))}
        />
      </motion.section>

      <NurseModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddNurse} />
      <NurseModal isOpen={Boolean(editingNurse)} mode="edit" nurse={editingNurse} onClose={() => setEditingNurse(null)} onSubmit={handleEditNurse} />
    </DashboardPageShell>
  );
}

function NurseIdentity({ nurse }: { readonly nurse: NurseRecord }) {
  return (
    <div className="flex items-center gap-4">
      <span className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{getNurseInitials(nurse.fullName)}</span>
      <div className="min-w-0">
        <p className="break-words font-extrabold leading-tight text-text-main">{nurse.fullName}</p>
        <p className="mt-0.5 text-sm font-semibold text-muted">Bergabung {nurse.joinedAt}</p>
      </div>
    </div>
  );
}

function NurseActions({ nurse, onView, onEdit, onToggle, onDelete }: { readonly nurse: NurseRecord; readonly onView: () => void; readonly onEdit: () => void; readonly onToggle: () => void; readonly onDelete: () => void }) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <IconActionButton label={`Lihat detail ${nurse.fullName}`} tone="primary" size="sm" onClick={onView}><Eye size={16} /></IconActionButton>
      <IconActionButton label={`Edit ${nurse.fullName}`} tone="warning" size="sm" onClick={onEdit}><Edit3 size={16} /></IconActionButton>
      <IconActionButton label={`${nurse.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"} ${nurse.fullName}`} tone="blue" size="sm" onClick={onToggle}><Power size={16} /></IconActionButton>
      <IconActionButton label={`Hapus ${nurse.fullName}`} tone="delete" size="sm" onClick={onDelete}><Trash2 size={16} /></IconActionButton>
    </div>
  );
}
