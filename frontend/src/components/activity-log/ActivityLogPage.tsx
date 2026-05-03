"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Bell, CheckCheck, ClipboardList } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { getActivityDateKey } from "@/helpers/activityLogs";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { showToast } from "@/lib/swal";
import { useActivityLogStore } from "@/store/activityLog";
import ActivityDetailModal from "./ActivityDetailModal";
import ActivityFeed from "./ActivityFeed";
import ActivityToolbar, { type ActivityQuickFilter } from "./ActivityToolbar";

const loadBatchSize = 8;

export default function ActivityLogPage() {
  const activities = useActivityLogStore((state) => state.activities);
  const markActivityAsRead = useActivityLogStore((state) => state.markAsRead);
  const markAllActivitiesAsRead = useActivityLogStore((state) => state.markAllAsRead);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<ActivityQuickFilter>("all");
  const [category, setCategory] = useState<ActivityCategory | "all">("all");
  const [date, setDate] = useState("");
  const [visibleCount, setVisibleCount] = useState(loadBatchSize);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogRecord | null>(null);
  const deferredSearch = useDeferredValue(search);

  const todayKey = new Date().toISOString().slice(0, 10);

  const summaryStats = useMemo(() => {
    const unread = activities.filter((activity) => !activity.read).length;
    const warningCritical = activities.filter((activity) => activity.severity === "Peringatan" || activity.severity === "Kritis").length;
    const todayTotal = activities.filter((activity) => getActivityDateKey(activity.timestamp) === todayKey).length;

    return [
      { label: "Belum Dibaca", value: String(unread), tone: "neutral" as const, color: "pine" as const, icon: Bell },
      { label: "Peringatan/Kritis", value: String(warningCritical), tone: "critical" as const, color: "lime" as const, icon: AlertTriangle },
      { label: "Total Hari Ini", value: String(todayTotal), tone: "safe" as const, color: "leaf" as const, icon: ClipboardList },
    ];
  }, [activities, todayKey]);

  const filteredActivities = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return activities
      .filter((activity) => {
        const matchesSearch = !query || [activity.title, activity.description, activity.patientName ?? "", activity.medicineName ?? "", activity.category]
          .some((value) => value.toLowerCase().includes(query));
        const matchesQuickFilter = quickFilter === "all"
          || (quickFilter === "unread" && !activity.read)
          || (quickFilter === "critical" && activity.severity === "Kritis")
          || (quickFilter === "warning" && activity.severity === "Peringatan");
        const matchesCategory = category === "all" || activity.category === category;
        const matchesDate = !date || getActivityDateKey(activity.timestamp) === date;

        return matchesSearch && matchesQuickFilter && matchesCategory && matchesDate;
      })
      .sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  }, [activities, category, date, deferredSearch, quickFilter]);

  const hasUnread = activities.some((activity) => !activity.read);
  const hasActiveFilters = Boolean(search || quickFilter !== "all" || category !== "all" || date);

  const resetFilters = () => {
    setSearch("");
    setQuickFilter("all");
    setCategory("all");
    setDate("");
    setVisibleCount(loadBatchSize);
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(loadBatchSize);
  };

  const handleQuickFilterChange = (value: ActivityQuickFilter) => {
    setQuickFilter(value);
    setVisibleCount(loadBatchSize);
  };

  const handleCategoryChange = (value: ActivityCategory | "all") => {
    setCategory(value);
    setVisibleCount(loadBatchSize);
  };

  const handleDateChange = (value: string) => {
    setDate(value);
    setVisibleCount(loadBatchSize);
  };

  const markAsRead = (activityId: string) => {
    markActivityAsRead(activityId);
  };

  const markAllAsRead = () => {
    markAllActivitiesAsRead();
    showToast("Semua aktivitas ditandai sudah dibaca.");
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Log Aktivitas"
        action={hasUnread && (
          <Button size="sm" icon={<CheckCheck size={16} />} onClick={markAllAsRead}>
            Tandai Semua Dibaca
          </Button>
        )}
      />

      <SummaryCardGrid stats={summaryStats} />

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.32 }}
      >
        <ActivityToolbar
          search={search}
          quickFilter={quickFilter}
          category={category}
          date={date}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={handleSearchChange}
          onQuickFilterChange={handleQuickFilterChange}
          onCategoryChange={handleCategoryChange}
          onDateChange={handleDateChange}
          onReset={resetFilters}
        />
      </motion.div>

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      >
        <ActivityFeed
          activities={filteredActivities}
          visibleCount={visibleCount}
          onLoadMore={() => setVisibleCount((currentCount) => currentCount + loadBatchSize)}
          onMarkRead={markAsRead}
          onViewDetail={setSelectedActivity}
        />
      </motion.div>

      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} />
    </DashboardPageShell>
  );
}
