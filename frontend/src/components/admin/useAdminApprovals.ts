"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { clearAuditLogCache } from "@/lib/auditLogApi";
import api from "@/lib/axios";
import { showConfirm, showError, showToast } from "@/lib/swal";
import type { User } from "@/types/auth";

export type AdminApprovalSummary = {
  readonly pending: number;
  readonly active: number;
  readonly rejected: number;
  readonly suspended: number;
};

export type ApprovalFilter = "all" | "pending" | "active" | "rejected" | "suspended";

export const emptySummary: AdminApprovalSummary = { pending: 0, active: 0, rejected: 0, suspended: 0 };
export const pageSize = 10;

const approvalsCacheTtl = 15_000;
let approvalsCache: { data: { users: User[]; summary: AdminApprovalSummary }; expiresAt: number } | null = null;
let approvalsRequest: Promise<{ users: User[]; summary: AdminApprovalSummary }> | null = null;

export const clearApprovalsCache = () => {
  approvalsCache = null;
  approvalsRequest = null;
};

const removePendingUser = (users: User[], userId: string) => users.filter((item) => item.id !== userId);

export function useAdminApprovals(canLoad: boolean) {
  const [approvals, setApprovals] = useState<User[]>([]);
  const [summary, setSummary] = useState<AdminApprovalSummary>(emptySummary);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ApprovalFilter>("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);
  const deferredSearch = useDeferredValue(search);

  const filteredApprovals = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return approvals.filter((user) => {
      const status = user.accountStatus ?? "active";
      const matchesFilter = filter === "all" || status === filter;
      const matchesSearch = !query || [user.fullName, user.email, user.phone ?? ""].some((value) => value.toLowerCase().includes(query));
      return matchesFilter && matchesSearch;
    });
  }, [approvals, deferredSearch, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredApprovals.length / pageSize));
  const paginatedApprovals = filteredApprovals.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const loadApprovals = useCallback(async () => {
    setLoading(true);
    try {
      const now = Date.now();
      let data: { users: User[]; summary: AdminApprovalSummary };

      if (approvalsCache && approvalsCache.expiresAt > now) {
        data = approvalsCache.data;
      } else if (approvalsRequest) {
        data = await approvalsRequest;
      } else {
        approvalsRequest = api.get("/auth/admin-approvals")
          .then((response) => {
            const result = {
              users: response.data.data.users ?? [],
              summary: response.data.data.summary ?? emptySummary,
            };
            approvalsCache = { data: result, expiresAt: Date.now() + approvalsCacheTtl };
            return result;
          })
          .finally(() => {
            approvalsRequest = null;
          });
        data = await approvalsRequest;
      }

      setLoadError(false);
      setApprovals(data.users);
      setSummary(data.summary);
    } catch (error) {
      setLoadError(true);
      setApprovals([]);
      setSummary(emptySummary);
      showError(getApiErrorMessage(error, "Gagal memuat daftar pengajuan admin."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canLoad) return;
    void Promise.resolve().then(loadApprovals);
  }, [canLoad, loadApprovals]);

  const resetFilters = () => {
    setSearch("");
    setFilter("pending");
    setCurrentPage(1);
  };

  const handleApprove = async (user: User) => {
    const result = await showConfirm("Setujui Admin?", `${user.fullName} akan aktif sebagai admin Jivara.`, "Ya, Setujui");
    if (!result.isConfirmed) return;

    setProcessingId(user.id);
    try {
      await api.post(`/auth/admin-approvals/${encodeURIComponent(user.id)}/approve`);
      clearApprovalsCache();
      clearAuditLogCache();
      setApprovals((current) => removePendingUser(current, user.id));
      setSummary((current) => ({ ...current, pending: Math.max(0, current.pending - 1), active: current.active + 1 }));
      showToast("Admin berhasil disetujui.", "success");
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal menyetujui pengajuan admin."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (reason: string) => {
    if (!rejectingUser) return;
    setProcessingId(rejectingUser.id);
    try {
      await api.post(`/auth/admin-approvals/${encodeURIComponent(rejectingUser.id)}/reject`, { reason });
      clearApprovalsCache();
      clearAuditLogCache();
      setApprovals((current) => removePendingUser(current, rejectingUser.id));
      setSummary((current) => ({ ...current, pending: Math.max(0, current.pending - 1), rejected: current.rejected + 1 }));
      setRejectingUser(null);
      showToast("Pengajuan admin ditolak.");
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal menolak pengajuan admin."));
    } finally {
      setProcessingId(null);
    }
  };

  const updateStatus = async (user: User, status: "active" | "suspended" | "pending", endpoint: "activate" | "suspend" | "restore") => {
    setProcessingId(user.id);
    try {
      await api.post(`/auth/admin-approvals/${encodeURIComponent(user.id)}/${endpoint}`);
      clearApprovalsCache();
      clearAuditLogCache();
      setApprovals((current) => current.map((item) => item.id === user.id ? { ...item, accountStatus: status, ...(status === "pending" ? { rejectedReason: null, rejectedAt: null } : {}) } : item));
      setSummary((current) => {
        if (endpoint === "activate") return { ...current, suspended: Math.max(0, current.suspended - 1), active: current.active + 1 };
        if (endpoint === "suspend") return { ...current, active: Math.max(0, current.active - 1), suspended: current.suspended + 1 };
        return { ...current, rejected: Math.max(0, current.rejected - 1), pending: current.pending + 1 };
      });
      showToast(endpoint === "activate" ? "Admin berhasil diaktifkan kembali." : endpoint === "suspend" ? "Admin berhasil disuspend." : "Pengajuan admin berhasil dipulihkan.", "success");
    } catch (error) {
      showError(getApiErrorMessage(error, endpoint === "activate" ? "Gagal mengaktifkan admin." : endpoint === "suspend" ? "Gagal suspend admin." : "Gagal memulihkan pengajuan admin."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (user: User) => {
    const result = await showConfirm("Aktifkan Admin?", `${user.fullName} akan aktif kembali sebagai admin Jivara.`, "Ya, Aktifkan");
    if (result.isConfirmed) await updateStatus(user, "active", "activate");
  };
  const handleSuspend = async (user: User) => {
    const result = await showConfirm("Suspend Admin?", `${user.fullName} tidak akan bisa mengakses dashboard admin sampai diaktifkan kembali.`, "Ya, Suspend");
    if (result.isConfirmed) await updateStatus(user, "suspended", "suspend");
  };
  const handleRestore = async (user: User) => {
    const result = await showConfirm("Pulihkan Pengajuan?", `${user.fullName} akan dikembalikan ke status menunggu approval.`, "Ya, Pulihkan");
    if (result.isConfirmed) await updateStatus(user, "pending", "restore");
  };

  return {
    currentPage,
    filter,
    filteredApprovals,
    handleActivate,
    handleApprove,
    handleReject,
    handleRestore,
    handleSuspend,
    loading,
    loadError,
    paginatedApprovals,
    processingId,
    rejectingUser,
    resetFilters,
    search,
    setCurrentPage: (page: number) => setCurrentPage(Math.min(Math.max(page, 1), totalPages)),
    setFilter,
    setRejectingUser,
    setSearch,
    summary,
    totalPages,
  };
}
