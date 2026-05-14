"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { AlertTriangle, Bell, CheckCheck, ClipboardList } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import Button from "@/components/ui/Button";
import { ActivityDataSkeleton, SummaryCardsSkeleton, ToolbarSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { FoodScanDetailModal } from "@/components/food-scan";
import PatientMedicineDetailModal from "@/components/schedule/PatientMedicineDetailModal";
import { getDateKey } from "@/helpers/patientSchedule";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import type { ActivityCategory, ActivityLogRecord } from "@/lib/mocks/activityLogs";
import { getPatientActivitiesFromApi, getPatientDashboardData } from "@/lib/patientDashboardApi";
import { showToast } from "@/lib/swal";
import { useActivityLogStore } from "@/store/activityLog";
import ActivityDetailModal from "./ActivityDetailModal";
import type { ActivityQuickFilter } from "./ActivityToolbar";
import PatientActivityCalendar from "./PatientActivityCalendar";
import PatientActivityToolbar from "./PatientActivityToolbar";

interface PatientActivityLogPageProps {
  readonly initialCategory?: string;
}

export default function PatientActivityLogPage({ initialCategory }: PatientActivityLogPageProps) {
  const activities = useActivityLogStore((state) => state.activities);
  const setActivities = useActivityLogStore((state) => state.setActivities);
  const markActivityAsRead = useActivityLogStore((state) => state.markAsRead);
  const markAllActivitiesAsRead = useActivityLogStore((state) => state.markAllAsRead);
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState<ActivityQuickFilter>("all");
  const [category, setCategory] = useState<ActivityCategory | "all">(isActivityCategory(initialCategory) ? initialCategory : "all");
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [selectedActivity, setSelectedActivity] = useState<ActivityLogRecord | null>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<MedicationScheduleRecord | null>(null);
  const [schedules, setSchedules] = useState<MedicationScheduleRecord[]>([]);
  const [selectedFoodScanId, setSelectedFoodScanId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const deferredSearch = useDeferredValue(search);
  const todayKey = getDateKey(new Date());

  useEffect(() => {
    let isMounted = true;

    Promise.all([getPatientActivitiesFromApi(), getPatientDashboardData()])
      .then(([nextActivities, dashboardData]) => {
        if (!isMounted) return;
        setActivities(nextActivities);
        setSchedules(dashboardData.schedules);
      })
      .catch(() => {
        if (!isMounted) return;
        setActivities([]);
        setSchedules([]);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [setActivities]);

  const patientActivities = useMemo(() => activities, [activities]);

  const summaryStats = useMemo(() => {
    const unread = patientActivities.filter((activity) => !activity.read).length;
    const warningCritical = patientActivities.filter((activity) => activity.severity === "Peringatan" || activity.severity === "Kritis").length;
    const todayTotal = patientActivities.filter((activity) => getDateKey(new Date(activity.timestamp)) === todayKey).length;

    return [
      { label: "Belum Dibaca", value: String(unread), tone: "neutral" as const, color: "pine" as const, icon: Bell },
      { label: "Peringatan/Kritis", value: String(warningCritical), tone: "critical" as const, color: "lime" as const, icon: AlertTriangle },
      { label: "Total Hari Ini", value: String(todayTotal), tone: "safe" as const, color: "leaf" as const, icon: ClipboardList },
    ];
  }, [patientActivities, todayKey]);

  const filteredActivities = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    return patientActivities.filter((activity) => {
      const matchesSearch = !query || [activity.title, activity.description, activity.medicineName ?? "", activity.category]
        .some((value) => value.toLowerCase().includes(query));
      const matchesQuickFilter = quickFilter === "all"
        || (quickFilter === "unread" && !activity.read)
        || (quickFilter === "critical" && activity.severity === "Kritis")
        || (quickFilter === "warning" && activity.severity === "Peringatan");
      const matchesCategory = category === "all" || activity.category === category;

      return matchesSearch && matchesQuickFilter && matchesCategory;
    });
  }, [category, deferredSearch, patientActivities, quickFilter]);

  const hasUnread = patientActivities.some((activity) => !activity.read);
  const hasActiveFilters = Boolean(search || quickFilter !== "all" || category !== "all");

  const resetFilters = () => {
    setSearch("");
    setQuickFilter("all");
    setCategory("all");
  };

  const markAllAsRead = () => {
    markAllActivitiesAsRead();
    showToast("Semua aktivitas ditandai sudah dibaca.");
  };

  const viewActivityDetail = (activity: ActivityLogRecord) => {
    if (!activity.read) markActivityAsRead(activity.id);
    setSelectedActivity(activity.read ? activity : { ...activity, read: true });
  };

  const viewFoodScan = (scanId: string) => {
    setSelectedActivity(null);
    setSelectedFoodScanId(scanId);
  };

  const viewSchedule = (activity: ActivityLogRecord) => {
    const schedule = schedules.find((currentSchedule) => currentSchedule.id === activity.scheduleId)
      ?? schedules.find((currentSchedule) => currentSchedule.medicineName === activity.medicineName);

    if (!schedule) return;

    setSelectedActivity(null);
    setSelectedSchedule(schedule);
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

      {isLoading ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={summaryStats} />}

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.32 }}
      >
        {isLoading ? <ToolbarSkeleton /> : <PatientActivityToolbar
          search={search}
          quickFilter={quickFilter}
          category={category}
          hasActiveFilters={hasActiveFilters}
          onSearchChange={setSearch}
          onQuickFilterChange={setQuickFilter}
          onCategoryChange={setCategory}
          onReset={resetFilters}
        />}
      </motion.div>

      <div className="mt-6">
        {isLoading ? <ActivityDataSkeleton rows={6} /> : <PatientActivityCalendar month={visibleMonth} activities={filteredActivities} onMonthChange={setVisibleMonth} onViewDetail={viewActivityDetail} />}
      </div>

      <ActivityDetailModal activity={selectedActivity} useScheduleQuery={false} onClose={() => setSelectedActivity(null)} onViewFoodScan={viewFoodScan} onViewSchedule={viewSchedule} />
      <PatientMedicineDetailModal schedule={selectedSchedule} onClose={() => setSelectedSchedule(null)} />
      <FoodScanDetailModal scanId={selectedFoodScanId} onClose={() => setSelectedFoodScanId(null)} />
    </DashboardPageShell>
  );
}

function isActivityCategory(value: string | undefined): value is ActivityCategory {
  return value === "Reminder" || value === "Kepatuhan" || value === "Scan Makanan";
}
