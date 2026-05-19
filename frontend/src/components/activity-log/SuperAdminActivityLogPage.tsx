"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle2, ClipboardList, Clock3 } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import DatePickerField from "@/components/ui/DatePickerField";
import FilterPills from "@/components/ui/FilterPills";
import { ActivityDataSkeleton, SummaryCardsSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import SearchField from "@/components/ui/SearchField";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import ToolbarCard from "@/components/ui/ToolbarCard";
import { FORM_PILL_INPUT_CLASS } from "@/components/ui/formStyles";
import { getActivityDateKey } from "@/helpers/activityLogs";
import { getSuperAdminApprovalActivitiesFromApi } from "@/lib/auditLogApi";
import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import ActivityDetailModal from "./ActivityDetailModal";
import ActivityFeed from "./ActivityFeed";

type ApprovalLogFilter = "all" | "incoming" | "approved" | "rejected" | "suspended";

const pageSize = 8;
const filters: { readonly label: string; readonly value: ApprovalLogFilter }[] = [
  { label: "Semua", value: "all" },
  { label: "Pengajuan Masuk", value: "incoming" },
  { label: "Diterima", value: "approved" },
  { label: "Ditolak", value: "rejected" },
  { label: "Suspend", value: "suspended" },
];

const matchesFilter = (activity: ActivityLogRecord, filter: ApprovalLogFilter) => {
  if (filter === "all") return true;
  if (filter === "incoming") return activity.title === "Pengajuan admin masuk";
  if (filter === "approved") return activity.title === "Admin disetujui" || activity.title === "Admin diaktifkan kembali";
  if (filter === "rejected") return activity.title === "Admin ditolak";
  return activity.title === "Admin disuspend";
};

export default function SuperAdminActivityLogPage() {
  const [activities, setActivities] = useState<ActivityLogRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ApprovalLogFilter>("all");
  const [date, setDate] = useState("");
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isMounted = true;
    getSuperAdminApprovalActivitiesFromApi({ forceRefresh: true })
      .then((nextActivities) => {
        if (isMounted) setActivities(nextActivities);
      })
      .catch(() => {
        if (isMounted) setActivities([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const todayKey = new Date().toISOString().slice(0, 10);
  const filteredActivities = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return activities
      .filter((activity) => {
        const matchesSearch = !query || [activity.title, activity.description].some((value) => value.toLowerCase().includes(query));
        const matchesDate = !date || getActivityDateKey(activity.timestamp) === date;
        return matchesSearch && matchesDate && matchesFilter(activity, filter);
      })
      .sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  }, [activities, date, deferredSearch, filter]);

  const stats = [
    { label: "Total Semua Aktivitas", value: String(activities.length), tone: "neutral" as const, color: "pine" as const, icon: ClipboardList },
    { label: "Approval Akun Masuk", value: String(activities.filter((activity) => activity.title === "Pengajuan admin masuk").length), tone: "safe" as const, color: "leaf" as const, icon: Clock3 },
    { label: "Sudah Diproses Hari Ini", value: String(activities.filter((activity) => getActivityDateKey(activity.timestamp) === todayKey && activity.title !== "Pengajuan admin masuk").length), tone: "safe" as const, color: "lime" as const, icon: CheckCircle2 },
  ];

  const hasActiveFilters = Boolean(search || date || filter !== "all");

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
    setDate("");
    setVisibleCount(pageSize);
  };

  return (
      <DashboardPageShell>
      <DashboardPageHeader title="Log Aktivitas" />
      {isLoading ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={stats} />}

      <motion.div className="mt-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.32 }}>
        {isLoading ? <ToolbarSkeleton /> : <ToolbarCard>
          <div className="grid gap-3 lg:grid-cols-[1fr_190px_auto] lg:items-center">
            <SearchField id="superAdminActivitySearch" value={search} placeholder="Cari aktivitas ..." onChange={(value) => { setSearch(value); setVisibleCount(pageSize); }} />
            <DatePickerField id="superAdminActivityDate" value={date} popoverAlign="right" className={FORM_PILL_INPUT_CLASS} onChange={(value) => { setDate(value); setVisibleCount(pageSize); }} />
            {hasActiveFilters && <Button type="button" size="sm" variant="outline" onClick={resetFilters} className="w-full lg:w-auto">Reset</Button>}
          </div>
          <FilterPills options={filters} activeValue={filter} onChange={(value) => { setFilter(value); setVisibleCount(pageSize); }} className="mt-4" />
        </ToolbarCard>}
      </motion.div>

      <motion.div className="mt-6" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}>
        {isLoading ? <ActivityDataSkeleton /> : <ActivityFeed activities={filteredActivities} visibleCount={visibleCount} readOnly onLoadMore={() => setVisibleCount((count) => count + pageSize)} onMarkRead={() => {}} onViewDetail={setSelectedActivity} />}
      </motion.div>

      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </DashboardPageShell>
  );
}
