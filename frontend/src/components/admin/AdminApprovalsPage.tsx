"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import { Ban, CheckCircle2, Clock3, PauseCircle, Power, RotateCcw, XCircle } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import PatientPagination from "@/components/patients/PatientPagination";
import Button from "@/components/ui/Button";
import FilterPills from "@/components/ui/FilterPills";
import IconActionButton from "@/components/ui/IconActionButton";
import Modal from "@/components/ui/Modal";
import SearchField from "@/components/ui/SearchField";
import { SummaryCardsSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import RefreshingNotice from "@/components/ui/RefreshingNotice";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import ToolbarCard from "@/components/ui/ToolbarCard";
import type { User } from "@/types/auth";
import { useAuthStore } from "@/store/auth";
import AccountStatusBadge from "./AccountStatusBadge";
import { pageSize, useAdminApprovals, type ApprovalFilter } from "./useAdminApprovals";

const approvalFilters: { readonly label: string; readonly value: ApprovalFilter }[] = [
  { label: "Semua", value: "all" },
  { label: "Menunggu", value: "pending" },
  { label: "Diterima", value: "active" },
  { label: "Tolak", value: "rejected" },
  { label: "Suspend", value: "suspended" },
];

export default function AdminApprovalsPage() {
  const shouldAnimate = useDashboardEntranceMotion();
  const { replace } = useRouter();
  const role = useAuthStore((state) => state.user?.role);
  const hasAuthHydrated = useAuthStore((state) => state.hasHydrated);
  const approvals = useAdminApprovals(hasAuthHydrated && role === "super_admin");
  const isUpdatingApprovals = approvals.loading && approvals.hasLoadedApprovals;

  const stats = [
    { label: "Menunggu Diterima", value: String(approvals.summary.pending), tone: approvals.summary.pending ? "critical" as const : "safe" as const, color: "lime" as const, icon: Clock3 },
    { label: "Akun Diterima", value: String(approvals.summary.active), tone: "safe" as const, color: "leaf" as const, icon: CheckCircle2 },
    { label: "Akun Ditolak", value: String(approvals.summary.rejected), tone: approvals.summary.rejected ? "critical" as const : "neutral" as const, color: "danger" as const, icon: Ban },
    { label: "Akun Disuspend", value: String(approvals.summary.suspended), tone: approvals.summary.suspended ? "critical" as const : "neutral" as const, color: "pine" as const, icon: PauseCircle },
  ];

  useEffect(() => {
    if (!hasAuthHydrated) return;
    if (role !== "super_admin") {
      replace("/dashboard");
      return;
    }
  }, [hasAuthHydrated, role, replace]);

  if (!hasAuthHydrated || role !== "super_admin") return null;

  return (
      <DashboardPageShell>
      <DashboardPageHeader title="Persetujuan Admin" />
      {approvals.summaryLoading && !approvals.hasLoadedSummary ? <SummaryCardsSkeleton count={4} /> : <SummaryCardGrid stats={approvals.loadError ? [] : stats} desktopColumns={4} />}

      {!approvals.summaryLoading && !approvals.loading && approvals.loadError && (
        <section className="mt-6 rounded-[32px] bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
          <p className="text-sm font-bold text-muted">Data persetujuan admin belum bisa dimuat.</p>
        </section>
      )}

      {!approvals.loadError && <m.div className="mt-6" {...getDashboardEntranceMotion(shouldAnimate, 0.12, 20)}>
        {approvals.loading && !approvals.hasLoadedApprovals ? <ToolbarSkeleton /> : <ToolbarCard>
          <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
            <SearchField id="adminApprovalSearch" value={approvals.search} placeholder="Cari akun admin ..." onChange={(value) => { approvals.setSearch(value); approvals.setCurrentPage(1); }} />
            {(approvals.search || approvals.filter !== "pending") && <Button type="button" size="sm" variant="outline" onClick={approvals.resetFilters}>Reset</Button>}
          </div>
          <FilterPills options={approvalFilters} activeValue={approvals.filter} onChange={(value) => { approvals.setFilter(value); approvals.setCurrentPage(1); }} className="mt-4" />
        </ToolbarCard>}
      </m.div>}

      {!approvals.loadError && <m.section className="relative mt-6 overflow-hidden rounded-3xl bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)]" aria-busy={isUpdatingApprovals || undefined} {...getDashboardEntranceMotion(shouldAnimate, 0.2, 24)}>
        <RefreshingNotice active={isUpdatingApprovals} />
        {approvals.loading && !approvals.hasLoadedApprovals ? <ApprovalSkeleton /> : (
          <div className={isUpdatingApprovals ? "opacity-60 transition-opacity" : "transition-opacity"}>
            <ApprovalList approvals={approvals.paginatedApprovals} activeFilter={approvals.filter} processingId={approvals.processingId} onApprove={approvals.handleApprove} onActivate={approvals.handleActivate} onSuspend={approvals.handleSuspend} onRestore={approvals.handleRestore} onReject={approvals.setRejectingUser} />
            {approvals.hasLoadedApprovals && <PatientPagination
              currentPage={approvals.currentPage}
              totalPages={approvals.totalPages}
              totalItems={approvals.totalApprovals}
              pageSize={pageSize}
              itemLabel="admin"
              onPageChange={approvals.setCurrentPage}
            />}
          </div>
        )}
      </m.section>}

      <RejectApprovalModal key={approvals.rejectingUser?.id ?? "empty"} user={approvals.rejectingUser} loading={approvals.processingId === approvals.rejectingUser?.id} onClose={() => approvals.setRejectingUser(null)} onSubmit={approvals.handleReject} />
    </DashboardPageShell>
  );
}

function ApprovalList({ approvals, activeFilter, processingId, onApprove, onActivate, onSuspend, onRestore, onReject }: { readonly approvals: User[]; readonly activeFilter: ApprovalFilter; readonly processingId: string | null; readonly onApprove: (user: User) => void; readonly onActivate: (user: User) => void; readonly onSuspend: (user: User) => void; readonly onRestore: (user: User) => void; readonly onReject: (user: User) => void }) {
  if (approvals.length === 0) {
    return <div className="px-6 py-14 text-center text-sm font-bold text-muted">{getEmptyApprovalMessage(activeFilter)}</div>;
  }

  return (
    <>
      <div className="hidden overflow-x-auto sm:block" data-lenis-prevent>
        <table className="w-full text-left">
          <thead className="bg-surface text-xs font-extrabold uppercase tracking-[0.08em] text-muted">
            <tr>
              <th className="px-5 py-4">Admin</th>
              <th className="px-5 py-4">Kontak</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4">Tanggal Daftar</th>
              <th className="px-5 py-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {approvals.map((user, index) => (
              <tr key={`approval-row-${user.id}-${index}`} className="transition-colors hover:bg-surface/60">
                <td className="px-5 py-4 font-extrabold text-text-main">{user.fullName}</td>
                <td className="px-5 py-4 text-sm font-bold text-muted"><span className="block text-text-main">{user.email}</span>{user.phone ?? "-"}</td>
                <td className="px-5 py-4"><AccountStatusBadge status={user.accountStatus} /></td>
                <td className="px-5 py-4 text-sm font-bold text-muted">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("id-ID") : "-"}</td>
                <td className="px-5 py-4"><ApprovalActions user={user} processingId={processingId} onApprove={onApprove} onActivate={onActivate} onSuspend={onSuspend} onRestore={onRestore} onReject={onReject} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-line sm:hidden">
        {approvals.map((user, index) => (
          <article key={`approval-card-${user.id}-${index}`} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="break-words font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">{user.fullName}</h2>
              <AccountStatusBadge status={user.accountStatus} />
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-muted">
              <span>{user.email}</span>
              {user.phone && <span>{user.phone}</span>}
              {user.createdAt && <span>Daftar {new Date(user.createdAt).toLocaleDateString("id-ID")}</span>}
            </div>
            <div className="mt-4">
              <ApprovalActions user={user} processingId={processingId} onApprove={onApprove} onActivate={onActivate} onSuspend={onSuspend} onRestore={onRestore} onReject={onReject} />
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function getEmptyApprovalMessage(filter: ApprovalFilter) {
  const messages: Record<ApprovalFilter, string> = {
    all: "Belum ada data admin.",
    pending: "Tidak ada pengajuan admin yang menunggu persetujuan.",
    active: "Tidak ada admin yang diterima.",
    rejected: "Tidak ada pengajuan admin yang ditolak.",
    suspended: "Tidak ada admin yang disuspend.",
  };

  return messages[filter];
}

function ApprovalActions({ user, processingId, onApprove, onActivate, onSuspend, onRestore, onReject }: { readonly user: User; readonly processingId: string | null; readonly onApprove: (user: User) => void; readonly onActivate: (user: User) => void; readonly onSuspend: (user: User) => void; readonly onRestore: (user: User) => void; readonly onReject: (user: User) => void }) {
  if ((user.accountStatus ?? "active") === "active") {
    return (
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <IconActionButton label={`Suspend ${user.fullName}`} tone="warning" loading={processingId === user.id} disabled={Boolean(processingId)} onClick={() => onSuspend(user)}><PauseCircle size={16} /></IconActionButton>
      </div>
    );
  }

  if (user.accountStatus === "suspended") {
    return (
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <IconActionButton label={`Aktifkan kembali ${user.fullName}`} tone="blue" loading={processingId === user.id} disabled={Boolean(processingId)} onClick={() => onActivate(user)}><Power size={16} /></IconActionButton>
      </div>
    );
  }

  if (user.accountStatus === "rejected") {
    return (
      <div className="flex flex-wrap gap-2 sm:justify-end">
        <IconActionButton label={`Pulihkan ${user.fullName}`} tone="warning" loading={processingId === user.id} disabled={Boolean(processingId)} onClick={() => onRestore(user)}><RotateCcw size={16} /></IconActionButton>
      </div>
    );
  }

  if (user.accountStatus !== "pending") {
    return <p className="text-sm font-extrabold text-muted sm:text-right">Sudah diproses</p>;
  }

  return (
    <div className="flex flex-wrap gap-2 sm:justify-end">
      <IconActionButton label={`Setujui ${user.fullName}`} tone="primary" loading={processingId === user.id} disabled={Boolean(processingId)} onClick={() => onApprove(user)}><CheckCircle2 size={17} /></IconActionButton>
      <IconActionButton label={`Tolak ${user.fullName}`} tone="danger" disabled={Boolean(processingId)} onClick={() => onReject(user)}><XCircle size={17} /></IconActionButton>
    </div>
  );
}

function ApprovalSkeleton() {
  return (
    <div className="divide-y divide-line">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="px-6 py-5">
          <div className="h-6 w-52 animate-pulse rounded-xl bg-line/70" />
          <div className="mt-3 h-4 w-72 max-w-full animate-pulse rounded-xl bg-line/60" />
        </div>
      ))}
    </div>
  );
}

function RejectApprovalModal({ user, loading, onClose, onSubmit }: { readonly user: User | null; readonly loading: boolean; readonly onClose: () => void; readonly onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");

  return (
    <Modal isOpen={Boolean(user)} title="Tolak Pengajuan Admin" onClose={onClose}>
      <div className="space-y-5">
        <label className="block text-sm font-extrabold text-text-main" htmlFor="rejectReason">Alasan Penolakan</label>
        <textarea
          id="rejectReason"
          name="reason"
          aria-label="Alasan penolakan pengajuan admin"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={4}
          className="w-full resize-none rounded-2xl border border-line bg-white px-4 py-3 text-sm font-semibold text-text-main outline-none transition-colors focus:border-primary"
          placeholder="Isi alasan penolakan."
        />
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" icon={<XCircle size={16} />} loading={loading} onClick={() => onSubmit(reason.trim())}>Tolak Pengajuan</Button>
        </div>
      </div>
    </Modal>
  );
}
