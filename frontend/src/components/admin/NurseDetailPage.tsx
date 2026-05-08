"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, Check, CheckCheck, Shuffle, Trash2, UserRound } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import PatientStatusBadge from "@/components/patients/PatientStatusBadge";
import ActivityFeed from "@/components/activity-log/ActivityFeed";
import ActivityDetailModal from "@/components/activity-log/ActivityDetailModal";
import Button from "@/components/ui/Button";
import DetailItem from "@/components/ui/DetailItem";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { activityMatchesNurse, getAverageAdherence, getNurseByPatientId, getNurseInitials, getPatientsForNurse } from "@/helpers/nurses";
import { getDashboardRole } from "@/components/dashboard/navigation";
import { patients } from "@/lib/mocks/patients";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { showConfirm, showToast, showWarning } from "@/lib/swal";
import { useActivityLogStore } from "@/store/activityLog";
import { useNurseStore } from "@/store/nurses";
import { useAuthStore } from "@/store/auth";
import BulkReassignModal from "./BulkReassignModal";
import NurseStatusBadge from "./NurseStatusBadge";

interface NurseDetailPageProps {
  readonly nurseId: string;
}

export default function NurseDetailPage({ nurseId }: NurseDetailPageProps) {
  const router = useRouter();
  const userRole = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const dashboardRole = getDashboardRole(userRole);
  const nurses = useNurseStore((state) => state.nurses);
  const assignments = useNurseStore((state) => state.assignments);
  const reassignPatients = useNurseStore((state) => state.reassignPatients);
  const deleteNurse = useNurseStore((state) => state.deleteNurse);
  const activities = useActivityLogStore((state) => state.activities);
  const addActivity = useActivityLogStore((state) => state.addActivity);
  const markActivityAsRead = useActivityLogStore((state) => state.markAsRead);
  const nurse = nurses.find((item) => item.id === nurseId);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [isReassignOpen, setIsReassignOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogRecord | null>(null);

  const assignedPatients = useMemo(() => nurse ? getPatientsForNurse(patients, assignments, nurse.id) : [], [assignments, nurse]);
  const nurseActivities = useMemo(() => nurse ? activities.filter((activity) => activityMatchesNurse(activity, assignments, nurse.id)) : [], [activities, assignments, nurse]);

  useEffect(() => {
    if (!hasAuthHydrated || dashboardRole === "admin" || dashboardRole === "nurse") return;
    router.replace("/dashboard");
  }, [dashboardRole, hasAuthHydrated, router]);

  if (!hasAuthHydrated || dashboardRole === "patient") return null;

  if (!nurse) {
    return (
      <DashboardPageShell>
        <DashboardPageHeader title="Perawat Tidak Ditemukan" description="Data perawat tidak tersedia di mock saat ini." action={<Link href="/nurses" className="text-sm font-extrabold text-primary">Kembali</Link>} />
      </DashboardPageShell>
    );
  }

  const averageAdherence = getAverageAdherence(assignedPatients);
  const riskyPatients = assignedPatients.filter((patient) => patient.status !== "On Ideal Schedule").length;
  const unreadLogs = nurseActivities.filter((activity) => !activity.read).length;
  const isAdminView = dashboardRole === "admin";
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

  const handleReassign = (targetNurseId: string) => {
    const targetNurse = nurses.find((item) => item.id === targetNurseId);
    if (!targetNurse || selectedPatientIds.length === 0) return;

    reassignPatients(selectedPatientIds, targetNurseId);
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
    if (assignedPatients.length > 0) {
      showWarning(`${nurse.fullName} masih menangani ${assignedPatients.length} pasien. Reassign pasien terlebih dahulu.`, "Tidak Bisa Dihapus");
      return;
    }

    const result = await showConfirm("Hapus perawat?", `Data ${nurse.fullName} akan dihapus dari daftar perawat.`, "Ya, Hapus");
    if (!result.isConfirmed) return;
    deleteNurse(nurse.id);
    showToast("Perawat berhasil dihapus.");
    router.replace("/nurses");
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

          <Button size="sm" variant="outline" icon={<Trash2 size={16} />} onClick={handleDelete}>Hapus</Button>
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

      <SummaryCardGrid stats={stats} className={isAdminView ? undefined : "xl:grid-cols-4"} />

      <motion.section className="mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}>
        <div className="flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">Pasien Ditangani</h2>
          </div>
          <Button size="sm" icon={<Shuffle size={16} />} disabled={selectedPatientIds.length === 0} onClick={() => setIsReassignOpen(true)}>Reassign ({selectedPatientIds.length})</Button>
        </div>
        <div className="overflow-x-auto" data-lenis-prevent>
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
              {assignedPatients.map((patient) => {
                const currentNurse = getNurseByPatientId(nurses, assignments, patient.id);
                return (
                  <tr key={patient.id} className="transition-colors hover:bg-surface/60">
                    <td className="px-5 py-4"><SelectionCheckbox label={`Pilih ${patient.name}`} checked={selectedPatientIds.includes(patient.id)} onChange={() => togglePatient(patient.id)} /></td>
                    <td className="px-5 py-4"><Link href={`/patients/${encodeURIComponent(patient.id)}`} className="font-extrabold text-text-main transition-colors hover:text-primary">{patient.name}</Link></td>
                    <td className="px-5 py-4"><PatientStatusBadge status={patient.status} /></td>
                    <td className="px-5 py-4"><AdherenceBar value={patient.adherence} /></td>
                    <td className="px-5 py-4 text-sm font-bold text-muted">{currentNurse?.fullName ?? "Belum ditugaskan"}</td>
                  </tr>
                );
              })}
              {assignedPatients.length === 0 && <tr><td colSpan={5} className="px-5 py-12 text-center text-sm font-bold text-muted">Belum ada pasien assigned.</td></tr>}
            </tbody>
          </table>
        </div>
      </motion.section>

      <section className="mt-8">
        <h2 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main sm:text-3xl">Log Terkait Perawat</h2>
        <div className="mt-5">
          <ActivityFeed activities={nurseActivities} visibleCount={6} readOnly={isAdminView} onLoadMore={() => { }} onMarkRead={markActivityAsRead} onViewDetail={setSelectedActivity} />
        </div>
      </section>

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
