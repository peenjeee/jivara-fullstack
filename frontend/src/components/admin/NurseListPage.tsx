"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { Edit3, Eye, Power, Plus } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import Button from "@/components/ui/Button";
import FilterPills from "@/components/ui/FilterPills";
import IconActionButton from "@/components/ui/IconActionButton";
import { ButtonSkeleton, TableDataSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import SearchField from "@/components/ui/SearchField";
import ToolbarCard from "@/components/ui/ToolbarCard";
import PatientPagination from "@/components/patients/PatientPagination";
import { getNurseInitials } from "@/helpers/nurses";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import { getApiErrorMessage } from "@/lib/apiErrors";
import type { NurseRecord, NurseStatus } from "@/lib/mocks/nurses";
import { createNurseViaApi, getNursesPageFromApi, updateNurseViaApi } from "@/lib/nurseApi";
import { showConfirm, showError, showToast } from "@/lib/swal";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
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
let nurseListViewCache: {
  pageNurses: NurseRecord[];
  totalNurses: number;
  search: string;
  filter: NurseFilter;
  currentPage: number;
} | null = null;

const getNurseStatusQuery = (filter: NurseFilter) => {
  if (filter === "Aktif") return "active";
  if (filter === "Nonaktif") return "inactive";
  return undefined;
};

interface NurseListState {
  readonly pageNurses: NurseRecord[];
  readonly totalNurses: number;
  readonly search: string;
  readonly filter: NurseFilter;
  readonly currentPage: number;
  readonly isModalOpen: boolean;
  readonly editingNurse: NurseRecord | null;
  readonly isLoading: boolean;
  readonly hasLoadedNurses: boolean;
  readonly processingAction: string | null;
}

type NurseListAction = { readonly type: "patch"; readonly payload: Partial<NurseListState> };

function nurseListReducer(state: NurseListState, action: NurseListAction): NurseListState {
  return action.type === "patch" ? { ...state, ...action.payload } : state;
}

export default function NurseListPage() {
  const shouldAnimate = useDashboardEntranceMotion();
  const { push, replace } = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const nurses = useNurseStore((state) => state.nurses);
  const setNurses = useNurseStore((state) => state.setNurses);
  const [state, dispatch] = useReducer(nurseListReducer, {
    pageNurses: nurseListViewCache?.pageNurses ?? [],
    totalNurses: nurseListViewCache?.totalNurses ?? 0,
    search: nurseListViewCache?.search ?? "",
    filter: nurseListViewCache?.filter ?? "all",
    currentPage: nurseListViewCache?.currentPage ?? 1,
    isModalOpen: false,
    editingNurse: null,
    isLoading: !nurseListViewCache,
    hasLoadedNurses: Boolean(nurseListViewCache),
    processingAction: null,
  });
  const { pageNurses, totalNurses, search, filter, currentPage, isModalOpen, editingNurse, isLoading, hasLoadedNurses, processingAction } = state;
  const stateRef = useRef(state);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (!hasAuthHydrated || isOperationalAdminRole(dashboardRole) || dashboardRole === "nurse") return;
    replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, replace]);

  const loadNursePage = useCallback(async (page: number, forceRefresh = false) => {
    if (!hasAuthHydrated || (dashboardRole !== "admin" && dashboardRole !== "nurse")) return;

    const canUseVisibleCache = !forceRefresh
      && nurseListViewCache?.currentPage === page
      && nurseListViewCache.search === debouncedSearch
      && nurseListViewCache.filter === filter;
    dispatch({ type: "patch", payload: { isLoading: !canUseVisibleCache } });
    try {
      const result = await getNursesPageFromApi({
        page,
        limit: pageSize,
        search: debouncedSearch,
        status: getNurseStatusQuery(filter),
        forceRefresh,
      });
      dispatch({ type: "patch", payload: { pageNurses: result.nurses, totalNurses: result.meta.total } });
      setNurses(result.nurses);
      nurseListViewCache = {
        pageNurses: result.nurses,
        totalNurses: result.meta.total,
        search: debouncedSearch,
        filter,
        currentPage: page,
      };
    } catch {
      dispatch({ type: "patch", payload: { pageNurses: [], totalNurses: 0 } });
      setNurses([]);
    } finally {
      dispatch({ type: "patch", payload: { hasLoadedNurses: true, isLoading: false } });
    }
  }, [dashboardRole, debouncedSearch, filter, hasAuthHydrated, setNurses]);

  const isInitialLoad = useRef(true);

  useEffect(() => {
    const forceRefresh = isInitialLoad.current;
    isInitialLoad.current = false;
    void loadNursePage(currentPage, forceRefresh);
  }, [currentPage, loadNursePage]);

  const totalPages = Math.max(1, Math.ceil(totalNurses / pageSize));
  const paginatedNurses = pageNurses;

  if (!hasAuthHydrated || (dashboardRole !== "nurse" && !isOperationalAdminRole(dashboardRole))) return null;

  const handleAddNurse = async (values: NurseFormValues) => {
    try {
      await createNurseViaApi(values);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal menambahkan perawat."));
      return;
    }

    dispatch({ type: "patch", payload: { isModalOpen: false, currentPage: 1 } });
    await loadNursePage(1, true);
    showToast("Perawat berhasil ditambahkan.", "success");
  };

  const handleEditNurse = async (values: NurseFormValues) => {
    if (!editingNurse) return;

    try {
      await updateNurseViaApi(editingNurse.id, values);
      await loadNursePage(currentPage, true);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal memperbarui perawat."));
      return;
    }

    dispatch({ type: "patch", payload: { editingNurse: null } });
    showToast("Data perawat berhasil diperbarui.");
  };

  const handleToggleStatus = async (nurse: NurseRecord) => {
    const actionKey = `toggle-${nurse.id}`;
    if (processingAction) return;
    const nextStatus = nurse.status === "Aktif" ? "Nonaktif" : "Aktif";
    const result = await showConfirm(`${nextStatus}kan perawat?`, `${nurse.fullName} akan berubah status menjadi ${nextStatus}.`, `Ya, ${nextStatus}kan`);
    if (!result.isConfirmed) return;

    dispatch({ type: "patch", payload: { processingAction: actionKey } });
    try {
      const updatedNurse = await updateNurseViaApi(nurse.id, {
        fullName: nurse.fullName,
        email: nurse.email,
        phone: nurse.phone,
        gender: nurse.gender,
        status: nextStatus,
        password: "",
      });
      dispatch({ type: "patch", payload: { pageNurses: stateRef.current.pageNurses.map((item) => item.id === nurse.id ? { ...updatedNurse, temporaryPassword: item.temporaryPassword } : item) } });
      setNurses(nurses.map((item) => item.id === nurse.id ? { ...updatedNurse, temporaryPassword: item.temporaryPassword } : item));
      await loadNursePage(currentPage, true);
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal mengubah status perawat."));
      return;
    } finally {
      dispatch({ type: "patch", payload: { processingAction: null } });
    }

    showToast(`Status perawat menjadi ${nextStatus}.`);
  };

  const resetFilters = () => {
    dispatch({ type: "patch", payload: { search: "", filter: "all", currentPage: 1 } });
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Daftar Perawat"
        action={isLoading && !hasLoadedNurses ? <ButtonSkeleton /> : <Button size="sm" icon={<Plus size={16} />} onClick={() => dispatch({ type: "patch", payload: { isModalOpen: true } })}>Tambah Perawat</Button>}
      />

      <m.div className="mt-6" {...getDashboardEntranceMotion(shouldAnimate, 0.1, 20)}>
        {isLoading && !hasLoadedNurses ? <ToolbarSkeleton /> : <ToolbarCard>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <SearchField id="nurseSearch" value={search} placeholder="Cari perawat ..." onChange={(value) => dispatch({ type: "patch", payload: { search: value, currentPage: 1 } })} />
            {(search || filter !== "all") && <Button type="button" size="sm" variant="outline" onClick={resetFilters}>Reset</Button>}
          </div>
          <FilterPills options={filters} activeValue={filter} onChange={(value) => dispatch({ type: "patch", payload: { filter: value, currentPage: 1 } })} className="mt-4" />
        </ToolbarCard>}
      </m.div>

      <m.section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]" {...getDashboardEntranceMotion(shouldAnimate, 0.18, 24)}>
        {isLoading ? <TableDataSkeleton /> : <>
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
              {paginatedNurses.map((nurse, index) => {
                const assignedCount = nurse.assignedPatients ?? 0;
                const handledCount = nurse.handledPatients ?? assignedCount;
                return (
                  <tr key={`nurse-row-${nurse.id}-${index}`} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-4"><NurseIdentity nurse={nurse} /></td>
                    <td className="px-5 py-4 text-sm font-bold text-muted"><span className="block text-text-main">{nurse.email}</span>{nurse.phone}</td>
                    <td className="px-5 py-4 text-sm font-bold text-muted">{nurse.gender}</td>
                    <td className="px-5 py-4 text-sm font-extrabold text-text-main">{handledCount}/{assignedCount}</td>
                     <td className="px-5 py-4"><NurseStatusBadge status={nurse.status} /></td>
                      <td className="px-5 py-4"><NurseActions nurse={nurse} processingAction={processingAction} onView={() => push(`/nurses/${encodeURIComponent(nurse.id)}`)} onEdit={() => dispatch({ type: "patch", payload: { editingNurse: nurse } })} onToggle={() => handleToggleStatus(nurse)} /></td>
                  </tr>
                );
              })}
              {paginatedNurses.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center text-sm font-bold text-muted">
                    Tidak ada perawat yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-line sm:hidden">
          {paginatedNurses.map((nurse, index) => {
            const assignedCount = nurse.assignedPatients ?? 0;
            const handledCount = nurse.handledPatients ?? assignedCount;
            return (
              <article key={`nurse-card-${nurse.id}-${index}`} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <NurseIdentity nurse={nurse} />
                  <NurseActions nurse={nurse} processingAction={processingAction} onView={() => push(`/nurses/${encodeURIComponent(nurse.id)}`)} onEdit={() => dispatch({ type: "patch", payload: { editingNurse: nurse } })} onToggle={() => handleToggleStatus(nurse)} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-extrabold text-muted">
                  <NurseStatusBadge status={nurse.status} />
                  <span>{nurse.gender}</span>
                  <span>{handledCount}/{assignedCount} pasien</span>
                </div>
              </article>
            );
          })}
          {paginatedNurses.length === 0 && (
            <div className="px-5 py-12 text-center text-sm font-bold text-muted">
              Tidak ada perawat yang sesuai dengan pencarian atau filter.
            </div>
          )}
        </div>
        <PatientPagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalNurses}
          pageSize={pageSize}
          itemLabel="perawat"
          onPageChange={(page) => dispatch({ type: "patch", payload: { currentPage: Math.min(Math.max(page, 1), totalPages) } })}
        />
        </>}
      </m.section>

      <NurseModal isOpen={isModalOpen} onClose={() => dispatch({ type: "patch", payload: { isModalOpen: false } })} onSubmit={handleAddNurse} />
      <NurseModal isOpen={Boolean(editingNurse)} mode="edit" nurse={editingNurse} onClose={() => dispatch({ type: "patch", payload: { editingNurse: null } })} onSubmit={handleEditNurse} />
    </DashboardPageShell>
  );
}

function NurseIdentity({ nurse }: { readonly nurse: NurseRecord }) {
  const lastVisit = nurse.lastVisit ?? "Belum pernah login";

  return (
    <div className="flex items-center gap-4">
      <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{getNurseInitials(nurse.fullName)}</span>
      <div className="min-w-0">
        <p className="break-words font-extrabold leading-tight text-text-main">{nurse.fullName}</p>
        <p className="mt-0.5 text-sm font-semibold text-muted">Kunjungan terakhir: {lastVisit}</p>
      </div>
    </div>
  );
}

function NurseActions({ nurse, processingAction, onView, onEdit, onToggle }: { readonly nurse: NurseRecord; readonly processingAction: string | null; readonly onView: () => void; readonly onEdit: () => void; readonly onToggle: () => void }) {
  const isProcessing = Boolean(processingAction);

  return (
    <div className="flex items-center justify-end gap-0.5">
      <IconActionButton label={`Lihat detail ${nurse.fullName}`} tone="primary" size="sm" disabled={isProcessing} onClick={onView}><Eye size={16} /></IconActionButton>
      <IconActionButton label={`Edit ${nurse.fullName}`} tone="warning" size="sm" disabled={isProcessing} onClick={onEdit}><Edit3 size={16} /></IconActionButton>
      <IconActionButton label={`${nurse.status === "Aktif" ? "Nonaktifkan" : "Aktifkan"} ${nurse.fullName}`} tone="blue" size="sm" loading={processingAction === `toggle-${nurse.id}`} disabled={isProcessing} onClick={onToggle}><Power size={16} /></IconActionButton>
    </div>
  );
}
