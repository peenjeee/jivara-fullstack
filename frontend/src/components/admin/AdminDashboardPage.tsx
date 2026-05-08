"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ActivityCategoryBadge, ActivitySeverityBadge } from "@/components/activity-log/ActivityBadges";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import PatientStatusBadge from "@/components/patients/PatientStatusBadge";
import Button from "@/components/ui/Button";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import { getPatientsForNurse } from "@/helpers/nurses";
import { approveRegistrationViaApi, getPendingRegistrationsFromApi, rejectRegistrationViaApi, type PendingRegistrationRecord } from "@/lib/adminApprovalApi";
import { getAdminDashboardStats } from "@/lib/dashboardApi";
import type { PatientRecord } from "@/lib/mocks/patients";
import { showConfirm, showError, showToast } from "@/lib/swal";
import { useActivityLogStore } from "@/store/activityLog";
import { useNurseStore } from "@/store/nurses";
import NurseStatusBadge from "./NurseStatusBadge";

export default function AdminDashboardPage() {
  const nurses = useNurseStore((state) => state.nurses);
  const assignments = useNurseStore((state) => state.assignments);
  const activities = useActivityLogStore((state) => state.activities);
  const patients: PatientRecord[] = [];
  const inactiveNursesWithPatients = nurses
    .map((nurse) => ({ nurse, patients: getPatientsForNurse(patients, assignments, nurse.id) }))
    .filter((item) => item.nurse.status === "Nonaktif" && item.patients.length > 0);
  const nurseFollowUps = nurses
    .map((nurse) => {
      const assignedPatients = getPatientsForNurse(patients, assignments, nurse.id);
      const riskyPatients = assignedPatients.filter((patient) => patient.status !== "On Ideal Schedule");
      return { nurse, assignedPatients, riskyPatients };
    })
    .filter((item) => item.nurse.status === "Nonaktif" && item.assignedPatients.length > 0 || item.riskyPatients.length > 0)
    .sort((first, second) => second.riskyPatients.length - first.riskyPatients.length);
  const riskyPatients = patients.filter((patient) => patient.status !== "On Ideal Schedule");
  const priorityActivities = activities.filter((activity) => activity.severity === "Kritis" || activity.severity === "Peringatan" || activity.category === "Administrasi");

  const [stats, setStats] = useState<SummaryCardItem[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistrationRecord[]>([]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([getAdminDashboardStats(), getPendingRegistrationsFromApi()])
      .then(([data, registrations]) => {
        if (!isMounted) return;
        if (isMounted) setStats(data.stats.map((item) => item.label === "Total Perawat" ? { ...item, value: String(nurses.length) } : item));
        setPendingRegistrations(registrations);
      })
      .catch(() => {
        if (!isMounted) return;
        setStats([]);
        setPendingRegistrations([]);
      });

    return () => {
      isMounted = false;
    };
  }, [nurses.length]);

  const handleApproveRegistration = async (registration: PendingRegistrationRecord) => {
    const result = await showConfirm("Setujui pendaftaran?", `${registration.fullName} akan dapat masuk ke Jivara.`, "Ya, Setujui");
    if (!result.isConfirmed) return;

    try {
      await approveRegistrationViaApi(registration.id);
      setPendingRegistrations((current) => current.filter((item) => item.id !== registration.id));
      showToast("Pendaftaran berhasil disetujui.", "success");
    } catch {
      showError("Gagal menyetujui pendaftaran dari API.");
    }
  };

  const handleRejectRegistration = async (registration: PendingRegistrationRecord) => {
    const result = await showConfirm("Tolak pendaftaran?", `${registration.fullName} tidak akan dapat masuk ke Jivara.`, "Ya, Tolak");
    if (!result.isConfirmed) return;

    try {
      await rejectRegistrationViaApi(registration.id);
      setPendingRegistrations((current) => current.filter((item) => item.id !== registration.id));
      showToast("Pendaftaran berhasil ditolak.");
    } catch {
      showError("Gagal menolak pendaftaran dari API.");
    }
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Dashboard Admin" />
      <SummaryCardGrid stats={stats} />

      {inactiveNursesWithPatients.length > 0 && (
        <motion.section className="mt-6 rounded-[24px] bg-warning/10 px-5 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] sm:px-6" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}>
          <p className="text-sm font-extrabold leading-6 text-warning sm:text-base">
            Perawat nonaktif masih menangani {inactiveNursesWithPatients.reduce((total, item) => total + item.patients.length, 0)} pasien aktif. Perlu untuk melakukan reassign pasien.
          </p>
        </motion.section>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AdminPanel title="Pendaftaran Menunggu" href="/dashboard">
          {pendingRegistrations.slice(0, 4).map((registration) => (
            <div key={registration.id} className="rounded-2xl bg-surface px-4 py-3">
              <p className="truncate text-sm font-extrabold text-text-main">{registration.fullName}</p>
              <p className="mt-1 truncate text-xs font-bold text-muted">{registration.email}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => handleApproveRegistration(registration)}>Setujui</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => handleRejectRegistration(registration)}>Tolak</Button>
              </div>
            </div>
          ))}
          {pendingRegistrations.length === 0 && <EmptyInsight message="Tidak ada pendaftaran menunggu persetujuan." />}
        </AdminPanel>

        <AdminPanel title="Perawat Perlu Tindak Lanjut" href="/nurses">
          {nurseFollowUps.slice(0, 4).map(({ nurse, assignedPatients, riskyPatients }) => (
            <Link key={nurse.id} href={`/nurses/${encodeURIComponent(nurse.id)}`} className="flex items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 transition-colors hover:bg-primary/5">
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-text-main">{nurse.fullName}</p>
                <p className="text-xs font-bold text-muted">{assignedPatients.length} pasien - {riskyPatients.length} perlu perhatian</p>
              </div>
              <NurseStatusBadge status={nurse.status} />
            </Link>
          ))}
          {nurseFollowUps.length === 0 && <EmptyInsight message="Semua perawat berada pada kondisi aman." />}
        </AdminPanel>

        <AdminPanel title="Pasien Berisiko" href="/patients">
          {riskyPatients.slice(0, 4).map((patient) => {
            const nurse = nurses.find((item) => item.id === assignments[patient.id]);
            return (
              <Link key={patient.id} href={`/patients/${encodeURIComponent(patient.id)}`} className="block rounded-2xl bg-surface px-4 py-3 transition-colors hover:bg-primary/5">
                <p className="truncate text-sm font-extrabold text-text-main">{patient.name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <PatientStatusBadge status={patient.status} />
                  <span className="text-xs font-bold text-muted">{nurse?.fullName ?? "Belum ditugaskan"}</span>
                </div>
              </Link>
            );
          })}
          {riskyPatients.length === 0 && <EmptyInsight message="Tidak ada pasien berisiko saat ini." />}
        </AdminPanel>

        <AdminPanel title="Aktivitas Prioritas" href="/activity-log">
          {priorityActivities.slice(0, 4).map((activity) => (
            <div key={activity.id} className="rounded-2xl bg-surface px-4 py-3">
              <p className="truncate text-sm font-extrabold text-text-main">{activity.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <ActivityCategoryBadge category={activity.category} />
                <ActivitySeverityBadge severity={activity.severity} />
              </div>
            </div>
          ))}
          {priorityActivities.length === 0 && <EmptyInsight message="Tidak ada aktivitas prioritas." />}
        </AdminPanel>
      </div>
    </DashboardPageShell>
  );
}

function AdminPanel({ title, href, children }: { readonly title: string; readonly href: string; readonly children: ReactNode }) {
  return (
    <motion.section className="rounded-[32px] bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.08)]" initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.28 }}>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h2>
        <Link href={href} className="text-xs font-extrabold uppercase tracking-[0.1em] text-primary">Lihat</Link>
      </div>
      <div className="space-y-3">{children}</div>
    </motion.section>
  );
}

function EmptyInsight({ message }: { readonly message: string }) {
  return <div className="rounded-2xl bg-surface px-4 py-5 text-sm font-bold leading-6 text-muted">{message}</div>;
}
