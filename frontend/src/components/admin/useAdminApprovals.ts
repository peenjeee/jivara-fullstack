"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "@/lib/apiErrors";
import { clearAuditLogCache } from "@/lib/auditLogApi";
import api from "@/lib/axios";
import { showConfirm, showError, showToast } from "@/lib/swal";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
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

type AdminApprovalPage = { users: User[]; summary: AdminApprovalSummary; meta: { page: number; limit: number; total: number } };
const approvalsCache = new Map<string, { data: AdminApprovalPage }>();
const approvalsRequests = new Map<string, Promise<AdminApprovalPage>>();
let approvalsViewCache: {
  approvals: User[];
  summary: AdminApprovalSummary;
  totalApprovals: number;
  search: string;
  filter: ApprovalFilter;
  currentPage: number;
} | null = null;

export const clearApprovalsCache = () => {
  approvalsCache.clear();
  approvalsRequests.clear();
  approvalsViewCache = null;
};

export function useAdminApprovals(canLoad: boolean) {
  const [approvals, setApprovals] = useState<User[]>(() => approvalsViewCache?.approvals ?? []);
  const [summary, setSummary] = useState<AdminApprovalSummary>(() => approvalsViewCache?.summary ?? emptySummary);
  const [totalApprovals, setTotalApprovals] = useState(() => approvalsViewCache?.totalApprovals ?? 0);
  const [search, setSearch] = useState(() => approvalsViewCache?.search ?? "");
  const [filter, setFilter] = useState<ApprovalFilter>(() => approvalsViewCache?.filter ?? "pending");
  const [currentPage, setCurrentPage] = useState(() => approvalsViewCache?.currentPage ?? 1);
  const [loading, setLoading] = useState(!approvalsViewCache);
  const [hasLoadedApprovals, setHasLoadedApprovals] = useState(Boolean(approvalsViewCache));
  const [hasLoadedSummary, setHasLoadedSummary] = useState(Boolean(approvalsViewCache));
  const [loadError, setLoadError] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);
  const isInitialLoad = useRef(true);
  const requestSeqRef = useRef(0);
  const hasLoadedApprovalsRef = useRef(Boolean(approvalsViewCache));
  const debouncedSearch = useDebouncedValue(search);

  const totalPages = Math.max(1, Math.ceil(totalApprovals / pageSize));
  const paginatedApprovals = approvals;

  useEffect(() => {
    hasLoadedApprovalsRef.current = hasLoadedApprovals;
  }, [hasLoadedApprovals]);

  const loadApprovals = useCallback(async (page = currentPage, forceRefresh = false) => {
    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    const query = debouncedSearch.trim();
    const canUseVisibleCache = approvalsViewCache?.currentPage === page
      && approvalsViewCache.search.trim() === query
      && approvalsViewCache.filter === filter;
    setLoading(!canUseVisibleCache);
    try {
      const cacheKey = `${page}:${pageSize}:${query}:${filter}`;
      let data: AdminApprovalPage;

      if (forceRefresh) {
        approvalsCache.delete(cacheKey);
        approvalsRequests.delete(cacheKey);
      }

      const cachedEntry = forceRefresh ? null : approvalsCache.get(cacheKey);
      if (cachedEntry && requestSeq === requestSeqRef.current) {
        setLoadError(false);
        setApprovals(cachedEntry.data.users);
        setSummary(cachedEntry.data.summary);
        setTotalApprovals(cachedEntry.data.meta.total);
        setHasLoadedApprovals(true);
        setHasLoadedSummary(true);
        approvalsViewCache = {
          approvals: cachedEntry.data.users,
          summary: cachedEntry.data.summary,
          totalApprovals: cachedEntry.data.meta.total,
          search,
          filter,
          currentPage: page,
        };
      }

      if (approvalsRequests.has(cacheKey)) {
        data = await approvalsRequests.get(cacheKey)!;
      } else {
        const request = api.get("/auth/admin-approvals", { params: { page, limit: pageSize, ...(query ? { search: query } : {}), ...(filter !== "all" ? { status: filter } : {}) } })
          .then((response) => {
            const result = {
              users: response.data.data.users ?? [],
              summary: response.data.data.summary ?? emptySummary,
              meta: response.data.meta ?? { page, limit: pageSize, total: response.data.data.users?.length ?? 0 },
            };
            approvalsCache.set(cacheKey, { data: result });
            return result;
          })
          .finally(() => {
            approvalsRequests.delete(cacheKey);
          });
        approvalsRequests.set(cacheKey, request);
        data = await request;
      }
      if (requestSeq !== requestSeqRef.current) return;

      setLoadError(false);
      setApprovals(data.users);
      setSummary(data.summary);
      setTotalApprovals(data.meta.total);
      approvalsViewCache = {
        approvals: data.users,
        summary: data.summary,
        totalApprovals: data.meta.total,
        search,
        filter,
        currentPage: page,
      };
      const totalPagesForQuery = Math.max(1, Math.ceil(data.meta.total / pageSize));
      const adjacentPages = [page + 1, page - 1].filter((nextPage) => nextPage >= 1 && nextPage <= totalPagesForQuery);
      void Promise.all(adjacentPages.map((nextPage) => {
        const adjacentCacheKey = `${nextPage}:${pageSize}:${query}:${filter}`;
        if (approvalsCache.has(adjacentCacheKey) || approvalsRequests.has(adjacentCacheKey)) return Promise.resolve();
        const request = api.get("/auth/admin-approvals", { params: { page: nextPage, limit: pageSize, ...(query ? { search: query } : {}), ...(filter !== "all" ? { status: filter } : {}) } })
          .then((response) => {
            const result = {
              users: response.data.data.users ?? [],
              summary: response.data.data.summary ?? emptySummary,
              meta: response.data.meta ?? { page: nextPage, limit: pageSize, total: response.data.data.users?.length ?? 0 },
            };
            approvalsCache.set(adjacentCacheKey, { data: result });
            return result;
          })
          .finally(() => {
            approvalsRequests.delete(adjacentCacheKey);
          });
        approvalsRequests.set(adjacentCacheKey, request);
        return request.catch(() => undefined);
      }));
    } catch (error) {
      if (requestSeq !== requestSeqRef.current) return;
      setLoadError(true);
      if (!hasLoadedApprovalsRef.current) {
        setApprovals([]);
        setSummary(emptySummary);
        setTotalApprovals(0);
      }
      showError(getApiErrorMessage(error, "Gagal memuat daftar pengajuan admin."));
    } finally {
      if (requestSeq === requestSeqRef.current) {
        setHasLoadedApprovals(true);
        setHasLoadedSummary(true);
        setLoading(false);
      }
    }
  }, [currentPage, debouncedSearch, filter, search]);

  useEffect(() => {
    if (!canLoad) return;
    const forceRefresh = isInitialLoad.current && !approvalsViewCache;
    isInitialLoad.current = false;
    void Promise.resolve().then(() => loadApprovals(currentPage, forceRefresh));
  }, [canLoad, currentPage, loadApprovals]);

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
      await loadApprovals(currentPage, true);
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
      await loadApprovals(currentPage, true);
      setRejectingUser(null);
      showToast("Pengajuan admin ditolak.");
    } catch (error) {
      showError(getApiErrorMessage(error, "Gagal menolak pengajuan admin."));
    } finally {
      setProcessingId(null);
    }
  };

  const updateStatus = async (user: User, endpoint: "activate" | "suspend" | "restore") => {
    setProcessingId(user.id);
    try {
      await api.post(`/auth/admin-approvals/${encodeURIComponent(user.id)}/${endpoint}`);
      clearApprovalsCache();
      clearAuditLogCache();
      await loadApprovals(currentPage, true);
      showToast(endpoint === "activate" ? "Admin berhasil diaktifkan kembali." : endpoint === "suspend" ? "Admin berhasil disuspend." : "Pengajuan admin berhasil dipulihkan.", "success");
    } catch (error) {
      showError(getApiErrorMessage(error, endpoint === "activate" ? "Gagal mengaktifkan admin." : endpoint === "suspend" ? "Gagal suspend admin." : "Gagal memulihkan pengajuan admin."));
    } finally {
      setProcessingId(null);
    }
  };

  const handleActivate = async (user: User) => {
    const result = await showConfirm("Aktifkan Admin?", `${user.fullName} akan aktif kembali sebagai admin Jivara.`, "Ya, Aktifkan");
    if (result.isConfirmed) await updateStatus(user, "activate");
  };
  const handleSuspend = async (user: User) => {
    const result = await showConfirm("Suspend Admin?", `${user.fullName} tidak akan bisa mengakses dashboard admin sampai diaktifkan kembali.`, "Ya, Suspend");
    if (result.isConfirmed) await updateStatus(user, "suspend");
  };
  const handleRestore = async (user: User) => {
    const result = await showConfirm("Pulihkan Pengajuan?", `${user.fullName} akan dikembalikan ke status menunggu approval.`, "Ya, Pulihkan");
    if (result.isConfirmed) await updateStatus(user, "restore");
  };

  return {
    currentPage,
    filter,
    filteredApprovals: approvals,
    handleActivate,
    handleApprove,
    handleReject,
    handleRestore,
    handleSuspend,
    hasLoadedApprovals,
    hasLoadedSummary,
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
    summaryLoading: loading,
    totalPages,
    totalApprovals,
  };
}
