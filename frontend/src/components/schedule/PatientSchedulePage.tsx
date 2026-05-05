"use client";

import { useMemo, useState } from "react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { getDateKey, getMonthStart, getSchedulesForDate, isSameDate } from "@/helpers/patientSchedule";
import { patients } from "@/lib/mocks/patients";
import { medicationSchedules } from "@/lib/mocks/schedules";
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
  const patientSchedules = useMemo(() => medicationSchedules.filter((schedule) => schedule.patientId === mockPatient.id), []);
  const schedulesForSelectedDate = useMemo(() => getSchedulesForDate(patientSchedules, selectedDate), [patientSchedules, selectedDate]);
  const selectedDateKey = getDateKey(selectedDate);
  const confirmedScheduleIds = confirmedScheduleDates[selectedDateKey] ?? [];

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
