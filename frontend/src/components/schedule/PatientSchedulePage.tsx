"use client";

import { useEffect, useMemo, useState } from "react";
import { AlarmClock, CalendarClock, CheckCircle2 } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import { getDateKey, getMonthStart, getSchedulesForDate, isSameDate } from "@/helpers/patientSchedule";
import { patients } from "@/lib/mocks/patients";
import { medicationSchedules, type MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { getSchedulesFromApi } from "@/lib/scheduleApi";
import { showConfirm, showToast } from "@/lib/swal";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import PatientDailyMedicineList from "./PatientDailyMedicineList";
import PatientMedicationCalendar from "./PatientMedicationCalendar";
import PatientScheduleDaySummary from "./PatientScheduleDaySummary";

const mockPatient = patients[0];

export default function PatientSchedulePage() {
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [visibleMonth, setVisibleMonth] = useState(getMonthStart(today));
  const lastScan = usePatientDashboardStore((state) => state.lastScan);
  const confirmedScheduleDates = usePatientDashboardStore((state) => state.confirmedScheduleDates);
  const confirmScheduleForDate = usePatientDashboardStore((state) => state.confirmScheduleForDate);
  const [allSchedules, setAllSchedules] = useState<MedicationScheduleRecord[]>(medicationSchedules);
  const patientSchedules = useMemo(() => {
    const apiPatientSchedules = allSchedules.filter((schedule) => schedule.patientName === mockPatient.name);
    if (apiPatientSchedules.length > 0) return apiPatientSchedules;
    return allSchedules.filter((schedule) => schedule.patientId === mockPatient.id);
  }, [allSchedules]);

  useEffect(() => {
    let isMounted = true;

    getSchedulesFromApi()
      .then((apiSchedules) => {
        if (isMounted) setAllSchedules(apiSchedules);
      })
      .catch(() => {
        if (isMounted) setAllSchedules(medicationSchedules);
      });

    return () => {
      isMounted = false;
    };
  }, []);
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
      value: String(completedScheduleCount),
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

    confirmScheduleForDate(selectedDateKey, scheduleId);
    showToast("Obat berhasil dikonfirmasi.", "success");
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Jadwal Obat" />
      <SummaryCardGrid stats={scheduleStats} />

      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
        <PatientMedicationCalendar
          month={visibleMonth}
          selectedDate={selectedDate}
          schedules={patientSchedules}
          confirmedScheduleDates={confirmedScheduleDates}
          onMonthChange={setVisibleMonth}
          onDateSelect={handleDateSelect}
        />
        <PatientScheduleDaySummary
          selectedDate={selectedDate}
          schedulesForDate={schedulesForSelectedDate}
          allSchedules={patientSchedules}
          confirmedScheduleDates={confirmedScheduleDates}
        />
      </div>

      <div className="mt-6 space-y-6">
        <PatientDailyMedicineList
          selectedDate={selectedDate}
          schedules={schedulesForSelectedDate}
          canConfirm={Boolean(lastScan)}
          confirmedScheduleIds={confirmedScheduleIds}
          onConfirm={(schedule) => handleConfirmSchedule(schedule.id)}
        />
      </div>
    </DashboardPageShell>
  );
}
