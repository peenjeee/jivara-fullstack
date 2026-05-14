"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, Bell, CheckCheck, ClipboardList } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import { ActivityDataSkeleton, SummaryCardsSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { FoodScanDetailModal } from "@/components/food-scan";
import { getActivityDateKey } from "@/helpers/activityLogs";
import { activityMatchesNurse } from "@/helpers/nurses";
import { getAlertActivitiesFromApi, resolveAlertViaApi } from "@/lib/alertsApi";
import { getAuditActivitiesFromApi } from "@/lib/auditLogApi";
import { getPatientsFromApi } from "@/lib/patientApi";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { showToast } from "@/lib/swal";
import { useActivityLogStore } from "@/store/activityLog";
import { useNurseStore } from "@/store/nurses";
import ActivityDetailModal from "./ActivityDetailModal";
import ActivityFeed from "./ActivityFeed";
import ActivityToolbar, { type ActivityQuickFilter } from "./ActivityToolbar";

const loadBatchSize = 8;

interface ActivityLogPageProps {
  readonly initialPatientName?: string;
  readonly initialCategory?: string;
  readonly readOnly?: boolean;
}

export default function ActivityLogPage({ initialPatientName = "", initialCategory, readOnly = false }: ActivityLogPageProps) {
  const router = useRouter();
  const activities = useActivityLogStore((state) => state.activities);
  const setActivities = useActivityLogStore((state) => state.setActivities);
  const nurses = useNurseStore((state) => state.nurses);
  const markActivityAsRead = useActivityLogStore((state) => state.markAsRead);
  const markAllActivitiesAsRead = useActivityLogStore((state) => state.markAllAsRead);
  const [search, setSearch] = useState(initialPatientName);
  const [quickFilter, setQuickFilter] = useState<ActivityQuickFilter>("all");
  const [category, setCategory] = useState<ActivityCategory | "all">(isActivityCategory(initialCategory) ? initialCategory : "all");
  const [nurseId, setNurseId] = useState("all");
  const [date, setDate] = useState("");
  const [visibleCount, setVisibleCount] = useState(loadBatchSize);
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogRecord | null>(null);
  const [selectedFoodScanId, setSelectedFoodScanId] = useState<string | null>(null);
  const [patientAssignments, setPatientAssignments] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    let isMounted = true;

    const activityRequest = readOnly
      ? Promise.all([getAuditActivitiesFromApi(), getAlertActivitiesFromApi()]).then(([auditActivities, alertActivities]) => [...alertActivities, ...auditActivities])
      : getAlertActivitiesFromApi();

    Promise.all([activityRequest, getPatientsFromApi()])
      .then(([nextActivities, patients]) => {
        if (!isMounted) return;
        setActivities(nextActivities);
        setPatientAssignments(Object.fromEntries(patients.flatMap((patient) => patient.assignedNurseId ? [[patient.id, patient.assignedNurseId]] : [])));
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
  }, [readOnly, setActivities]);

  const todayKey = new Date().toISOString().slice(0, 10);

  const summaryStats = useMemo(() => {
    const unread = activities.filter((activity) => !activity.read).length;
    const warningCritical = activities.filter((activity) => activity.severity === "Peringatan" || activity.severity === "Kritis").length;
    const todayTotal = activities.filter((activity) => getActivityDateKey(activity.timestamp) === todayKey).length;

    return [
      readOnly
        ? { label: "Total Aktivitas", value: String(activities.length), tone: "neutral" as const, color: "pine" as const, icon: ClipboardList }
        : { label: "Belum Dibaca", value: String(unread), tone: "neutral" as const, color: "pine" as const, icon: Bell },
      { label: "Peringatan/Kritis", value: String(warningCritical), tone: "critical" as const, color: "lime" as const, icon: AlertTriangle },
      { label: "Total Hari Ini", value: String(todayTotal), tone: "safe" as const, color: "leaf" as const, icon: ClipboardList },
    ];
  }, [activities, readOnly, todayKey]);

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
        const matchesNurse = nurseId === "all" || activityMatchesNurse(activity, patientAssignments, nurseId);
        const matchesDate = !date || getActivityDateKey(activity.timestamp) === date;

        return matchesSearch && matchesQuickFilter && matchesCategory && matchesNurse && matchesDate;
      })
      .sort((first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime());
  }, [activities, category, date, deferredSearch, nurseId, patientAssignments, quickFilter]);

  const hasUnread = activities.some((activity) => !activity.read);
  const hasActiveFilters = Boolean(search || quickFilter !== "all" || category !== "all" || nurseId !== "all" || date);

  const resetFilters = () => {
    setSearch("");
    setQuickFilter("all");
    setCategory("all");
    setNurseId("all");
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
    if (readOnly) return;
    markActivityAsRead(activityId);
  };

  const markAllAsRead = () => {
    if (readOnly) return;
    filteredActivities.forEach((activity) => {
      if (activity.category === "Kepatuhan") resolveAlertViaApi(activity.id).catch(() => { });
    });
    markAllActivitiesAsRead();
    showToast("Semua aktivitas ditandai sudah dibaca.");
  };

  const viewFoodScan = (scanId: string) => {
    setSelectedActivity(null);
    setSelectedFoodScanId(scanId);
  };

  const viewSchedule = (activity: ActivityLogRecord) => {
    const href = activity.patientName
      ? `/schedule?patientName=${encodeURIComponent(activity.patientName)}${activity.medicineName ? `&medicineName=${encodeURIComponent(activity.medicineName)}` : ""}`
      : "/schedule";

    setSelectedActivity(null);
    window.setTimeout(() => router.push(href), 380);
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader
        title="Log Aktivitas"
        action={!readOnly && hasUnread && (
          <Button size="sm" icon={<CheckCheck size={16} />} onClick={markAllAsRead}>
            Tandai Semua Dibaca
          </Button>
        )}
      />

      {isLoading ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={summaryStats} />}

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.32 }}
      >
        {isLoading ? <ToolbarSkeleton /> : <ActivityToolbar
          search={search}
          quickFilter={quickFilter}
          category={category}
          nurseId={nurseId}
          nurses={nurses}
          date={date}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={handleSearchChange}
          onQuickFilterChange={handleQuickFilterChange}
          onCategoryChange={handleCategoryChange}
          onNurseChange={(value) => { setNurseId(value); setVisibleCount(loadBatchSize); }}
          onDateChange={handleDateChange}
          onReset={resetFilters}
        />}
      </motion.div>

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      >
        {isLoading ? <ActivityDataSkeleton /> : <ActivityFeed
          activities={filteredActivities}
          visibleCount={visibleCount}
          readOnly={readOnly}
          onLoadMore={() => setVisibleCount((currentCount) => currentCount + loadBatchSize)}
          onMarkRead={markAsRead}
          onViewDetail={setSelectedActivity}
        />}
      </motion.div>

      <ActivityDetailModal activity={selectedActivity} onClose={() => setSelectedActivity(null)} onViewFoodScan={viewFoodScan} onViewSchedule={viewSchedule} />
      <FoodScanDetailModal scanId={selectedFoodScanId} onClose={() => setSelectedFoodScanId(null)} />
    </DashboardPageShell>
  );
}

function isActivityCategory(value: string | undefined): value is ActivityCategory {
  return value === "Reminder" || value === "Kepatuhan" || value === "Scan Makanan" || value === "Administrasi";
}
