"use client";

import { useEffect, useMemo, useState } from "react";
import { AlarmClock, CalendarClock, CheckCircle2 } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { ActivityDataSkeleton, SummaryCardsSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import { getDateKey, getMonthStart, getSchedulesForDate, isSameDate } from "@/helpers/patientSchedule";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { confirmMedicationScheduleViaApi, getConfirmedScheduleDates, getPatientDashboardData } from "@/lib/patientDashboardApi";
import { showConfirm, showToast } from "@/lib/swal";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import PatientDailyMedicineList from "./PatientDailyMedicineList";
import PatientMedicationCalendar from "./PatientMedicationCalendar";
import PatientScheduleDaySummary from "./PatientScheduleDaySummary";

export default function PatientSchedulePage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(getMonthStart(today));
  const lastScan = usePatientDashboardStore((state) => state.lastScan);
  const confirmedScheduleDates = usePatientDashboardStore((state) => state.confirmedScheduleDates);
  const setConfirmedScheduleDates = usePatientDashboardStore((state) => state.setConfirmedScheduleDates);
  const setPatientId = usePatientDashboardStore((state) => state.setPatientId);
  const confirmScheduleForDate = usePatientDashboardStore((state) => state.confirmScheduleForDate);
  const [patientSchedules, setPatientSchedules] = useState<MedicationScheduleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getPatientDashboardData()
      .then((data) => {
        if (!isMounted) return;
        setPatientId(data.patient.id);
        setPatientSchedules(data.schedules);
        setConfirmedScheduleDates(getConfirmedScheduleDates(data.medicationLogs));
      })
      .catch(() => {
        if (!isMounted) return;
        setPatientId(null);
        setPatientSchedules([]);
        setConfirmedScheduleDates({});
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [setConfirmedScheduleDates, setPatientId]);
  const schedulesForSelectedDate = useMemo(() => getSchedulesForDate(patientSchedules, selectedDate), [patientSchedules, selectedDate]);
  const selectedDateKey = getDateKey(selectedDate);
  const confirmedScheduleIds = confirmedScheduleDates[selectedDateKey] ?? [];
  const activeSchedules = patientSchedules.filter((schedule) => schedule.status === "Aktif");
  const completedScheduleCount = Object.values(confirmedScheduleDates).reduce((total, scheduleIds) => {
    const patientConfirmedIds = scheduleIds.filter((scheduleId) => patientSchedules.some((schedule) => schedule.id === scheduleId));
    return total + patientConfirmedIds.length;
  }, 0);
  const scheduleStats: SummaryCardItem[] = [
    {
      label: "Jadwal Aktif",
      value: String(activeSchedules.length),
      tone: "safe",
      color: "pine",
      icon: CalendarClock,
    },
    {
      label: "Total Selesai",
      value: `${completedScheduleCount}/${activeSchedules.length}`,
      tone: "safe",
      color: "leaf",
      icon: CheckCircle2,
    },
    {
      label: "Reminder Aktif",
      value: String(activeSchedules.filter((schedule) => schedule.reminderEnabled).length),
      tone: "safe",
      color: "lime",
      icon: AlarmClock,
    },
  ];

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setVisibleMonth(getMonthStart(date));
  };

  const handleConfirmSchedule = async (scheduleId: string) => {
    if (!isSameDate(selectedDate, today) || !lastScan) return;

    if (lastScan.risk === "High Risk") {
      const result = await showConfirm(
        "Hasil scan berisiko",
        "Makanan terakhir berpotensi berinteraksi dengan obat. Ikuti rekomendasi AI sebelum melanjutkan.",
        "Tetap Konfirmasi",
      );

      if (!result.isConfirmed) return;
    }

    const schedule = patientSchedules.find((currentSchedule) => currentSchedule.id === scheduleId);
    if (!schedule) return;

    try {
      await confirmMedicationScheduleViaApi(schedule, selectedDate);
      confirmScheduleForDate(selectedDateKey, scheduleId);
    } catch {
      return;
    }

    showToast("Obat berhasil dikonfirmasi.", "success");
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Jadwal Obat" />
      {isLoading ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={scheduleStats} />}

      <div className="mt-6 space-y-6">
        {isLoading ? <ActivityDataSkeleton rows={3} /> : <PatientDailyMedicineList
          selectedDate={selectedDate}
          schedules={schedulesForSelectedDate}
          canConfirm={Boolean(lastScan)}
          confirmedScheduleIds={confirmedScheduleIds}
          onConfirm={(schedule) => handleConfirmSchedule(schedule.id)}
        />}
      </div>

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        {isLoading ? <ActivityDataSkeleton rows={6} /> : <PatientMedicationCalendar
          month={visibleMonth}
          selectedDate={selectedDate}
          schedules={patientSchedules}
          confirmedScheduleDates={confirmedScheduleDates}
          onMonthChange={setVisibleMonth}
          onDateSelect={handleDateSelect}
        />}
        {isLoading ? <ActivityDataSkeleton rows={4} /> : <PatientScheduleDaySummary
          selectedDate={selectedDate}
          schedulesForDate={schedulesForSelectedDate}
          allSchedules={patientSchedules}
          confirmedScheduleDates={confirmedScheduleDates}
        />}
      </div>
    </DashboardPageShell>
  );
}
