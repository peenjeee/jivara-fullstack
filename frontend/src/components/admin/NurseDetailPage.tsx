"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import { motion } from "motion/react";
import { AlertTriangle, Check, CheckCheck, Shuffle, Trash2, UserRound } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import PatientStatusBadge from "@/components/patients/PatientStatusBadge";
import ActivityFeed from "@/components/activity-log/ActivityFeed";
import ActivityDetailModal from "@/components/activity-log/ActivityDetailModal";
import ActivityToolbar, { type ActivityQuickFilter } from "@/components/activity-log/ActivityToolbar";
import Button from "@/components/ui/Button";
import DetailItem from "@/components/ui/DetailItem";
import { ActivityDataSkeleton, SummaryCardsSkeleton, TableDataSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { getActivityDateKey } from "@/helpers/activityLogs";
import { getAverageAdherence, getNurseInitials } from "@/helpers/nurses";
import { getDashboardRole, isOperationalAdminRole } from "@/components/dashboard/navigation";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord } from "@/lib/mocks/patients";
import { deactivateNurseViaApi } from "@/lib/nurseApi";
import { assignPatientToNurseViaApi, getPatientsAssignedToNurseFromApi } from "@/lib/patientApi";
import { showConfirm, showError, showToast, showWarning } from "@/lib/swal";
import { useActivityLogStore } from "@/store/activityLog";
import { useNurseStore } from "@/store/nurses";
import { useAuthStore } from "@/store/auth";
import BulkReassignModal from "./BulkReassignModal";
import NurseStatusBadge from "./NurseStatusBadge";

interface NurseDetailPageProps {
  readonly nurseId: string;
}

const loadBatchSize = 6;

const getApiErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) return null;
  return error.response?.data?.message || null;
};

export default function NurseDetailPage({ nurseId }: NurseDetailPageProps) {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const nurses = useNurseStore((state) => state.nurses);
  const activities = useActivityLogStore((state) => state.activities);
  const addActivity = useActivityLogStore((state) => state.addActivity);
  const markActivityAsRead = useActivityLogStore((state) => state.markAsRead);
  const nurse = nurses.find((item) => item.id === nurseId);
  const [assignedPatients, setAssignedPatients] = useState<PatientRecord[]>([]);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogRecord | null>(null);
  const [activitySearch, setActivitySearch] = useState("");
  const [activityQuickFilter, setActivityQuickFilter] = useState<ActivityQuickFilter>("all");
  const [activityCategory, setActivityCategory] = useState<ActivityCategory | "all">("all");
  const [activityDate, setActivityDate] = useState("");
  const [visibleActivityCount, setVisibleActivityCount] = useState(loadBatchSize);
  const [isLoadingPatients, setIsLoadingPatients] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const deferredActivitySearch = useDeferredValue(activitySearch);

  const assignedPatientIds = useMemo(() => new Set(assignedPatients.map((patient) => patient.id)), [assignedPatients]);
  const nurseActivities = useMemo(() => nurse ? activities.filter((activity) => activity.sourceNurseId === nurse.id || activity.targetNurseId === nurse.id || Boolean(activity.patientId && assignedPatientIds.has(activity.patientId))) : [], [activities, assignedPatientIds, nurse]);
  const filteredNurseActivities = useMemo(() => {
    const query = deferredActivitySearch.trim().toLowerCase();

    return nurseActivities
      .filter((activity) => {
        const matchesSearch = !query || [activity.title, activity.description, activity.patientName ?? "", activity.medicineName ?? "", activity.category]
          .some((value) => value.toLowerCase().includes(query));
        const matchesQuickFilter = activityQuickFilter === "all"
          || (activityQuickFilter === "unread" && !activity.read)
          || (activityQuickFilter === "critical" && activity.severity === "Kritis")
          || (activityQuickFilter === "warning" && activity.severity === "Peringatan");
        const matchesCategory = activityCategory === "all" || activity.category === activityCategory;
        const matchesDate = !activityDate || getActivityDateKey(activity.timestamp) === activityDate;

        return matchesSearch && matchesQuickFilter && matchesCategory && matchesDate;
      })
      .sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  }, [activityCategory, activityDate, activityQuickFilter, deferredActivitySearch, nurseActivities]);

  useEffect(() => {
    if (!hasAuthHydrated || isOperationalAdminRole(dashboardRole) || dashboardRole === "nurse") return;
    router.replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, router]);

  useEffect(() => {
    if (!hasAuthHydrated || (dashboardRole !== "admin" && dashboardRole !== "nurse")) return;

    let isMounted = true;
    getPatientsAssignedToNurseFromApi(nurseId)
      .then((patients) => {
        if (isMounted) setAssignedPatients(patients);
      })
      .catch(() => {
        if (isMounted) setAssignedPatients([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingPatients(false);
      });

    return () => {
      isMounted = false;
    };
  }, [dashboardRole, hasAuthHydrated, nurseId]);

  if (!hasAuthHydrated || (dashboardRole !== "nurse" && !isOperationalAdminRole(dashboardRole))) return null;

  if (!nurse) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader title="Perawat Tidak Ditemukan" description="Data perawat tidak tersedia di saat ini." action={<Link href="/nurses" className="text-sm font-extrabold text-primary">Kembali</Link>} />
      </DashboardPageShell>
    );
  }

  const averageAdherence = getAverageAdherence(assignedPatients);
  const riskyPatients = assignedPatients.filter((patient) => patient.status !== "On Ideal Schedule").length;
  const unreadLogs = nurseActivities.filter((activity) => !activity.read).length;
  const isAdminView = isOperationalAdminRole(dashboardRole);
  const hasActiveActivityFilters = Boolean(activitySearch || activityQuickFilter !== "all" || activityCategory !== "all" || activityDate);
  const stats = [
    { label: "Pasien Ditangani", value: String(assignedPatients.length), tone: "neutral" as const, color: "pine" as const, icon: UserRound },
    { label: "Avg Kepatuhan", value: `${averageAdherence}%`, tone: averageAdherence >= 75 ? "safe" as const : "critical" as const, color: "leaf" as const, icon: CheckCheck },
    { label: "Perlu Perhatian", value: String(riskyPatients), tone: riskyPatients ? "critical" as const : "safe" as const, color: "lime" as const, icon: AlertTriangle },
    ...(!isAdminView ? [{ label: "Log Belum Dibaca", value: String(unreadLogs), tone: unreadLogs ? "critical" as const : "safe" as const, color: unreadLogs ? "danger" as const : "safe" as const, icon: AlertTriangle }] : []),
  ];

  const togglePatient = (patientId: string) => {
    setSelectedPatientIds((current) => current.includes(patientId) ? current.filter((id) => id !== patientId) : [...current, patientId]);
  };

  const toggleAllPatients = () => {
    setSelectedPatientIds((current) => current.length === assignedPatients.length ? [] : assignedPatients.map((patient) => patient.id));
  };

  const handleReassign = async (targetNurseId: string) => {
    const targetNurse = nurses.find((item) => item.id === targetNurseId);
    if (!targetNurse || selectedPatientIds.length === 0) return;

    try {
      await Promise.all(selectedPatientIds.map((patientId) => assignPatientToNurseViaApi(patientId, targetNurseId)));
    } catch (error) {
      const message = getApiErrorMessage(error);
      showError(message || "Gagal memindahkan pasien dari API.");
      return;
    }

    setAssignedPatients((currentPatients) => currentPatients.filter((patient) => !selectedPatientIds.includes(patient.id)));
    addActivity({
      id: `ACT-ADM-${Date.now()}`,
      title: "Bulk reassign pasien",
      description: `${selectedPatientIds.length} pasien dipindahkan dari ${nurse.fullName} ke ${targetNurse.fullName}.`,
      category: "Administrasi",
      severity: "Info",
      timestamp: new Date().toISOString(),
      sourceNurseId: nurse.id,
      targetNurseId,
      read: false,
    });
    setSelectedPatientIds([]);
    setIsReassignOpen(false);
    showToast("Pasien berhasil dipindahkan.");
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    if (assignedPatients.length > 0) {
      showWarning(`${nurse.fullName} masih menangani ${assignedPatients.length} pasien. Reassign pasien terlebih dahulu.`, "Tidak Bisa Dihapus");
      return;
    }

    const result = await showConfirm("Hapus perawat?", `Data ${nurse.fullName} akan dihapus dari daftar perawat.`, "Ya, Hapus");
    if (!result.isConfirmed) return;

    setIsDeleting(true);
    try {
      await deactivateNurseViaApi(nurse.id);
    } catch (error) {
      const message = getApiErrorMessage(error);
      showError(message || "Gagal menonaktifkan perawat dari API.");
      return;
    } finally {
      setIsDeleting(false);
    }

    showToast("Perawat berhasil dihapus.");
    router.replace("/nurses");
  };

  const resetActivityFilters = () => {
    setActivitySearch("");
    setActivityQuickFilter("all");
    setActivityCategory("all");
    setActivityDate("");
    setVisibleActivityCount(loadBatchSize);
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title={nurse.fullName}
      />

      <motion.section
        className="mt-6 overflow-hidden rounded-[32px] bg-surface p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-2xl font-extrabold text-primary sm:h-24 sm:w-24 sm:text-3xl">
              {getNurseInitials(nurse.fullName)}
            </div>
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <NurseStatusBadge status={nurse.status} />
                {nurse.temporaryPassword && <span className="rounded-full bg-warning/10 px-3 py-1 text-xs font-extrabold text-warning">Password Sementara</span>}
              </div>
              <h2 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main sm:text-4xl">{nurse.fullName}</h2>
            </div>
          </div>

          <Button size="sm" variant="outline" icon={<Trash2 size={16} />} loading={isDeleting} onClick={handleDelete}>Hapus</Button>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Bergabung" value={nurse.joinedAt} />
          <DetailItem label="Gender" value={nurse.gender} />
          <DetailItem label="Telepon" value={nurse.phone} />
          <DetailItem label="Email" value={nurse.email} />
        </div>

        {nurse.status === "Nonaktif" && assignedPatients.length > 0 && (
          <div className="mt-5 rounded-2xl bg-warning/10 px-4 py-3 text-sm font-bold leading-6 text-warning">
            Perawat nonaktif ini masih memiliki {assignedPatients.length} pasien aktif.
          </div>
        )}
      </motion.section>

      {isLoadingPatients ? <SummaryCardsSkeleton count={isAdminView ? 3 : 4} /> : <SummaryCardGrid stats={stats} className={isAdminView ? undefined : "xl:grid-cols-4"} />}

      <motion.section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}>
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">Pasien Ditangani</h2>
          </div>
          <Button size="sm" icon={<Shuffle size={16} />} disabled={selectedPatientIds.length === 0} onClick={() => setIsReassignOpen(true)}>Reassign ({selectedPatientIds.length})</Button>
        </div>
        {isLoadingPatients ? <TableDataSkeleton /> : <div className="overflow-x-auto" data-lenis-prevent>
          <table className="w-full text-left">
            <colgroup>
              <col className="w-[6%]" />
              <col className="w-[25%]" />
              <col className="w-[24%]" />
              <col className="w-[20%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead className="bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-5 py-4"><SelectionCheckbox label="Pilih semua pasien" checked={assignedPatients.length > 0 && selectedPatientIds.length === assignedPatients.length} onChange={toggleAllPatients} /></th>
                <th className="px-5 py-4">Pasien</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Kepatuhan</th>
                <th className="px-5 py-4">Perawat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {assignedPatients.map((patient, index) => {
                return (
                  <tr key={`nurse-detail-patient-${patient.id}-${index}`} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-4"><SelectionCheckbox label={`Pilih ${patient.name}`} checked={selectedPatientIds.includes(patient.id)} onChange={() => togglePatient(patient.id)} /></td>
                    <td className="px-5 py-4"><Link href={`/patients/${encodeURIComponent(patient.id)}`} className="font-extrabold text-text-main transition-colors hover:text-primary">{patient.name}</Link></td>
                    <td className="px-5 py-4"><PatientStatusBadge status={patient.status} /></td>
                    <td className="px-5 py-4"><AdherenceBar value={patient.adherence} /></td>
                    <td className="px-5 py-4 text-sm font-bold text-muted">{nurse.fullName}</td>
                  </tr>
                );
              })}
              {assignedPatients.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm font-bold text-muted">Belum ada pasien assigned.</td></tr>}
            </tbody>
          </table>
        </div>}
      </motion.section>

      <motion.section className="mt-8" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.26 }}>
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main sm:text-3xl">Log Terkait Perawat</h2>
        <div className="mt-5">
          {isLoadingPatients ? <ToolbarSkeleton /> : <ActivityToolbar
            search={activitySearch}
            quickFilter={activityQuickFilter}
            category={activityCategory}
            showNurseFilter={false}
            date={activityDate}
            hasActiveFilters={hasActiveActivityFilters}
            onSearchChange={(value) => { setActivitySearch(value); setVisibleActivityCount(loadBatchSize); }}
            onQuickFilterChange={(value) => { setActivityQuickFilter(value); setVisibleActivityCount(loadBatchSize); }}
            onCategoryChange={(value) => { setActivityCategory(value); setVisibleActivityCount(loadBatchSize); }}
            onDateChange={(value) => { setActivityDate(value); setVisibleActivityCount(loadBatchSize); }}
            onReset={resetActivityFilters}
          />}
        </div>
        <div className="mt-6">
          {isLoadingPatients ? <ActivityDataSkeleton /> : <ActivityFeed activities={filteredNurseActivities} visibleCount={visibleActivityCount} readOnly={isAdminView} onLoadMore={() => setVisibleActivityCount((currentCount) => currentCount + loadBatchSize)} onMarkRead={markActivityAsRead} onViewDetail={setSelectedActivity} />}
        </div>
      </motion.section>

      <BulkReassignModal isOpen={isReassignOpen} selectedCount={selectedPatientIds.length} sourceNurseId={nurse.id} nurses={nurses} onClose={() => setIsReassignOpen(false)} onSubmit={handleReassign} />
      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} onViewFoodScan={() => setSelectedActivity(null)} onViewSchedule={() => setSelectedActivity(null)} />
    </DashboardPageShell>
  );
}

function SelectionCheckbox({ label, checked, onChange }: { readonly label: string; readonly checked: boolean; readonly onChange: () => void }) {
  return (
    <label className="inline-flex cursor-pointer items-center justify-center" aria-label={label}>
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20 ${checked ? "border-primary bg-primary" : "border-muted/55 bg-white"}`}>
        <Check size={13} strokeWidth={3.2} className={`text-white transition-opacity ${checked ? "opacity-100" : "opacity-0"}`} />
      </span>
    </label>
  );
}

function AdherenceBar({ value }: { readonly value: number }) {
  const tone = value < 50 ? "bg-danger" : value < 75 ? "bg-warning" : "bg-primary";

  return (
    <div className="flex min-w-[160px] items-center gap-3">
      <div className="h-2 flex-1 rounded-full bg-line">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${value}%` }} />
      </div>
      <span className="w-10 text-right text-sm font-extrabold text-text-main">{value}%</span>
    </div>
  );
}
