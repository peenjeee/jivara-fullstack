"use client";

import Link from "next/link";
import { m } from "motion/react";
import { Check, Shuffle, Trash2 } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import PatientStatusBadge from "@/components/patients/PatientStatusBadge";
import PatientPagination from "@/components/patients/PatientPagination";
import PatientToolbar, { type PatientFilter } from "@/components/patients/PatientToolbar";
import ActivityFeed from "@/components/activity-log/ActivityFeed";
import ActivityDetailModal from "@/components/activity-log/ActivityDetailModal";
import ActivityToolbar, { type ActivityQuickFilter } from "@/components/activity-log/ActivityToolbar";
import Button from "@/components/ui/Button";
import DetailItem from "@/components/ui/DetailItem";
import { ActivityDataSkeleton, ActivityToolbarSkeleton, DetailDataSkeleton, SummaryCardsSkeleton, TableDataSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import RefreshingNotice from "@/components/ui/RefreshingNotice";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { getNurseInitials } from "@/helpers/nurses";
import { getDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import { isOperationalAdminRole } from "@/components/dashboard/navigation";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { NurseRecord } from "@/lib/mocks/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";
import BulkReassignModal from "./BulkReassignModal";
import NurseStatusBadge from "./NurseStatusBadge";
import { patientPageSize, useNurseDetailPageController } from "./useNurseDetailPageController";

interface NurseDetailPageProps {
  readonly nurseId: string;
}

export default function NurseDetailPage({ nurseId }: NurseDetailPageProps) {
  return <NurseDetailPageContent key={nurseId} nurseId={nurseId} />;
}

function NurseDetailPageContent({ nurseId }: NurseDetailPageProps) {
  const controller = useNurseDetailPageController(nurseId);

  if (!controller.hasAuthHydrated || (controller.dashboardRole !== "nurse" && !isOperationalAdminRole(controller.dashboardRole))) return null;

  if (controller.state.isLoadingNurse) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader title="Detail Perawat" />
        <DetailDataSkeleton summaryCount={isOperationalAdminRole(controller.dashboardRole) ? 3 : 4} />
      </DashboardPageShell>
    );
  }

  if (!controller.nurse) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader title="Perawat Tidak Ditemukan" description="Data perawat tidak tersedia di saat ini." action={<Link href="/nurses" prefetch={false} className="text-sm font-extrabold text-primary">Kembali</Link>} />
      </DashboardPageShell>
    );
  }

  const isDeleteDisabled = controller.state.isDeleting
    || controller.state.isLoadingNurse
    || controller.state.isLoadingPatients
    || controller.state.isLoadingPatientSummary
    || controller.state.isLoadingActivities
    || !controller.state.hasLoadedPatients
    || !controller.state.hasLoadedPatientSummary
    || !controller.state.hasLoadedActivities;
  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Detail Perawat" />

      <NurseOverviewSection nurse={controller.nurse} shouldAnimate={controller.shouldAnimate} isDeleting={controller.state.isDeleting} isDeleteDisabled={isDeleteDisabled} totalAssignedPatientCount={controller.state.totalAssignedPatientCount} onDelete={controller.handleDelete} />

      {controller.state.isLoadingPatientSummary && !controller.state.hasLoadedPatientSummary
        ? <SummaryCardsSkeleton count={controller.isAdminView ? 3 : 4} />
        : <SummaryCardGrid stats={controller.stats} className={controller.isAdminView ? undefined : "xl:grid-cols-4"} />}

      <PatientAssignmentsSection
        motion={{ shouldAnimate: controller.shouldAnimate }}
        loading={{ isLoading: controller.state.isLoadingPatients, hasLoaded: controller.state.hasLoadedPatients }}
        filters={{ search: controller.state.patientSearch, filter: controller.state.patientFilter, hasActive: controller.hasActivePatientFilters }}
        selection={{ count: controller.selectedPatientIds.length, allSelected: controller.selectablePatients.length > 0 && controller.selectedPatientIds.length === controller.selectablePatients.length, selectedIds: controller.selectedPatientIds }}
        data={{ patients: controller.state.assignedPatients, page: controller.state.patientPage, totalPages: controller.totalPatientPages, totalResults: controller.state.totalPatientResults }}
        onOpenReassign={controller.openReassign}
        onSearchChange={controller.handlePatientSearchChange}
        onFilterChange={controller.handlePatientFilterChange}
        onReset={controller.resetPatientFilters}
        onToggleAll={controller.toggleAllPatients}
        onTogglePatient={controller.togglePatient}
        onPageChange={controller.handlePatientPageChange}
      />

      <NurseActivitySection
        motion={{ shouldAnimate: controller.shouldAnimate }}
        loading={{ isLoading: controller.state.isLoadingActivities, hasLoaded: controller.state.hasLoadedActivities, isLoadingMore: controller.state.isLoadingMoreActivities }}
        filters={{ search: controller.state.activitySearch, quickFilter: controller.state.activityQuickFilter, category: controller.state.activityCategory, date: controller.state.activityDate, hasActive: controller.hasActiveActivityFilters }}
        data={{ activities: controller.filteredNurseActivities, visibleCount: controller.state.visibleActivityCount, isAdminView: controller.isAdminView, hasMore: controller.hasMoreActivities }}
        onSearchChange={controller.handleActivitySearchChange}
        onQuickFilterChange={controller.handleActivityQuickFilterChange}
        onCategoryChange={controller.handleActivityCategoryChange}
        onDateChange={controller.handleActivityDateChange}
        onReset={controller.resetActivityFilters}
        onLoadMore={controller.loadMoreActivities}
        onMarkRead={controller.handleMarkActivityRead}
        onViewDetail={controller.setSelectedActivity}
      />

      <BulkReassignModal isOpen={controller.state.isReassignOpen} selectedCount={controller.selectedPatientIds.length} sourceNurseId={controller.nurse.id} nurses={controller.nurses} onClose={controller.closeReassign} onSubmit={controller.handleReassign} />
      <ActivityDetailModal activity={controller.state.selectedActivity} onClose={() => controller.setSelectedActivity(null)} onViewFoodScan={() => controller.setSelectedActivity(null)} onViewSchedule={() => controller.setSelectedActivity(null)} />
    </DashboardPageShell>
  );
}

function NurseOverviewSection({ nurse, shouldAnimate, isDeleting, isDeleteDisabled, totalAssignedPatientCount, onDelete }: { readonly nurse: NurseRecord; readonly shouldAnimate: boolean; readonly isDeleting: boolean; readonly isDeleteDisabled: boolean; readonly totalAssignedPatientCount: number; readonly onDelete: () => void }) {
  return (
    <m.section className="mt-6 overflow-hidden rounded-[32px] bg-surface p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7" {...getDashboardEntranceMotion(shouldAnimate, 0.08, 24)}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-2xl font-extrabold text-primary sm:h-24 sm:w-24 sm:text-3xl">{getNurseInitials(nurse.fullName)}</div>
          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <NurseStatusBadge status={nurse.status} />
              {nurse.temporaryPassword && <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-extrabold text-warning-dark">Password Sementara</span>}
            </div>
            <h2 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main sm:text-4xl">{nurse.fullName}</h2>
          </div>
        </div>

        <Button size="sm" variant="outline" icon={<Trash2 size={16} />} loading={isDeleting} disabled={isDeleteDisabled} onClick={onDelete}>Hapus</Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <DetailItem label="Bergabung" value={nurse.joinedAt} />
        <DetailItem label="Kunjungan Terakhir" value={nurse.lastVisit ?? "-"} />
        <DetailItem label="Gender" value={nurse.gender} />
        <DetailItem label="Telepon" value={nurse.phone} />
        <DetailItem label="Email" value={nurse.email} />
      </div>

      {nurse.status === "Nonaktif" && totalAssignedPatientCount > 0 && <div className="mt-5 rounded-2xl bg-warning/10 px-4 py-3 text-sm font-bold leading-6 text-warning-dark">Perawat nonaktif ini masih memiliki {totalAssignedPatientCount} pasien aktif.</div>}
    </m.section>
  );
}

function PatientAssignmentsSection({
  motion,
  loading,
  filters,
  selection,
  data,
  onOpenReassign,
  onSearchChange,
  onFilterChange,
  onReset,
  onToggleAll,
  onTogglePatient,
  onPageChange,
}: {
  readonly motion: { shouldAnimate: boolean };
  readonly loading: { isLoading: boolean; hasLoaded: boolean };
  readonly filters: { search: string; filter: PatientFilter; hasActive: boolean };
  readonly selection: { count: number; allSelected: boolean; selectedIds: readonly string[] };
  readonly data: { patients: readonly PatientRecord[]; page: number; totalPages: number; totalResults: number };
  readonly onOpenReassign: () => void;
  readonly onSearchChange: (value: string) => void;
  readonly onFilterChange: (value: PatientFilter) => void;
  readonly onReset: () => void;
  readonly onToggleAll: () => void;
  readonly onTogglePatient: (patientId: string) => void;
  readonly onPageChange: (page: number) => void;
}) {
  const isUpdatingPatients = loading.isLoading && loading.hasLoaded;

  return (
    <m.section className="relative mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]" aria-busy={isUpdatingPatients || undefined} {...getDashboardEntranceMotion(motion.shouldAnimate, 0.18, 24)}>
      <RefreshingNotice active={isUpdatingPatients} />
      <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">Pasien Ditangani</h2>
        <Button size="sm" icon={<Shuffle size={16} />} disabled={selection.count === 0} onClick={onOpenReassign}>Reassign ({selection.count})</Button>
      </div>
      <div className="px-5 pb-5 sm:px-7">
        {loading.isLoading && !loading.hasLoaded ? <ToolbarSkeleton /> : <PatientToolbar search={filters.search} activeFilter={filters.filter} hasActiveFilters={filters.hasActive} framed={false} onSearchChange={onSearchChange} onFilterChange={onFilterChange} onReset={onReset} />}
      </div>
      {loading.isLoading && !loading.hasLoaded ? <TableDataSkeleton /> : (
        <div className={isUpdatingPatients ? "opacity-60 transition-opacity" : "transition-opacity"}>
          <div className="overflow-x-auto" data-lenis-prevent>
            <table className="w-full text-left">
              <colgroup>
                <col className="w-[6%]" />
                <col className="w-[28%]" />
                <col className="w-[24%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead className="bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
                <tr>
                  <th className="px-5 py-4"><SelectionCheckbox label="Pilih semua pasien" checked={data.patients.length > 0 && selection.allSelected} onChange={onToggleAll} /></th>
                  <th className="px-5 py-4">Pasien</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Kepatuhan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.patients.map((patient, index) => (
                  <tr key={`nurse-detail-patient-${patient.id}-${index}`} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-4"><SelectionCheckbox label={`Pilih ${patient.name}`} checked={selection.selectedIds.includes(patient.id)} disabled={patient.status === "Complete" || patient.status === "Nonaktif"} onChange={() => onTogglePatient(patient.id)} /></td>
                    <td className="px-5 py-4"><Link href={`/patients/${encodeURIComponent(patient.id)}`} prefetch={false} className="font-extrabold text-text-main transition-colors hover:text-primary">{patient.name}</Link></td>
                    <td className="px-5 py-4"><PatientStatusBadge status={patient.status} /></td>
                    <td className="px-5 py-4"><AdherenceBar value={patient.adherence} /></td>
                  </tr>
                ))}
                {data.patients.length === 0 && <tr><td colSpan={4} className="px-5 py-12 text-center text-sm font-bold text-muted">Tidak ada data pasien.</td></tr>}
              </tbody>
            </table>
          </div>
          <PatientPagination currentPage={data.page} totalPages={data.totalPages} totalItems={data.totalResults} pageSize={patientPageSize} itemLabel="pasien" onPageChange={onPageChange} />
        </div>
      )}
    </m.section>
  );
}

function NurseActivitySection({
  motion,
  loading,
  filters,
  data,
  onSearchChange,
  onQuickFilterChange,
  onCategoryChange,
  onDateChange,
  onReset,
  onLoadMore,
  onMarkRead,
  onViewDetail,
}: {
  readonly motion: { shouldAnimate: boolean };
  readonly loading: { isLoading: boolean; hasLoaded: boolean; isLoadingMore: boolean };
  readonly filters: { search: string; quickFilter: ActivityQuickFilter; category: ActivityCategory | "all"; date: string; hasActive: boolean };
  readonly data: { activities: readonly ActivityLogRecord[]; visibleCount: number; isAdminView: boolean; hasMore: boolean };
  readonly onSearchChange: (value: string) => void;
  readonly onQuickFilterChange: (value: ActivityQuickFilter) => void;
  readonly onCategoryChange: (value: ActivityCategory | "all") => void;
  readonly onDateChange: (value: string) => void;
  readonly onReset: () => void;
  readonly onLoadMore: () => Promise<void>;
  readonly onMarkRead: (activityId: string) => Promise<void>;
  readonly onViewDetail: (activity: ActivityLogRecord | null) => void;
}) {
  const isUpdatingActivities = loading.isLoading && loading.hasLoaded;

  return (
    <m.section className="mt-8" {...getDashboardEntranceMotion(motion.shouldAnimate, 0.26, 24)}>
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main sm:text-3xl">Log Terkait Perawat</h2>
      <div className="mt-5">
        {loading.isLoading && !loading.hasLoaded ? <ActivityToolbarSkeleton /> : <ActivityToolbar search={filters.search} quickFilter={filters.quickFilter} category={filters.category} showNurseFilter={false} showUnreadFilter={false} date={filters.date} hasActiveFilters={filters.hasActive} onSearchChange={onSearchChange} onQuickFilterChange={onQuickFilterChange} onCategoryChange={onCategoryChange} onDateChange={onDateChange} onReset={onReset} />}
      </div>
      <div className="relative mt-6" aria-busy={isUpdatingActivities || undefined}>
        <RefreshingNotice active={isUpdatingActivities} />
        {loading.isLoading && !loading.hasLoaded ? <ActivityDataSkeleton /> : (
          <div className={isUpdatingActivities ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <ActivityFeed activities={data.activities} visibleCount={data.visibleCount} readOnly={data.isAdminView} hasMore={data.hasMore} isLoadingMore={loading.isLoadingMore} onLoadMore={onLoadMore} onMarkRead={onMarkRead} onViewDetail={onViewDetail} />
          </div>
        )}
      </div>
    </m.section>
  );
}

function SelectionCheckbox({ label, checked, onChange, disabled }: { readonly label: string; readonly checked: boolean; readonly onChange: () => void; readonly disabled?: boolean }) {
  return (
    <label className={`inline-flex items-center justify-center ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`} aria-label={label}>
      <input type="checkbox" aria-label={label} checked={checked} onChange={onChange} disabled={disabled} className="peer sr-only" />
      <span className={`flex size-5 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20 ${checked ? "border-primary bg-primary" : "border-muted/55 bg-white"}`}>
        <Check size={13} strokeWidth={3.2} className={`text-white transition-opacity ${checked ? "opacity-100" : "opacity-0"}`} />
      </span>
    </label>
  );
}

function AdherenceBar({ value }: { readonly value: number }) {
  const tone = value < 50 ? "bg-danger" : value < 75 ? "bg-warning" : "bg-primary";
  return (
    <div className="flex min-w-[160px] items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-line"><div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} /></div>
      <span className="w-10 text-right text-sm font-extrabold text-text-main">{value}%</span>
    </div>
  );
}
