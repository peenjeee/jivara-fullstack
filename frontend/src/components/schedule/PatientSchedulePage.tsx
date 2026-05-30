"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AlarmClock, CalendarClock, Pill } from "lucide-react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { PatientScheduleContentSkeleton, SummaryCardsSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import type { SummaryCardItem } from "@/components/ui/SummaryCard";
import { getDateKey, getMonthStart, getScheduleDoseWindow, getSchedulesForDate, isSameDate } from "@/helpers/patientSchedule";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";
import { confirmMedicationScheduleViaApi, getConfirmedScheduleDates, getPatientScheduleData } from "@/lib/patientDashboardApi";
import { showConfirm, showToast } from "@/lib/swal";
import { usePatientDashboardStore } from "@/store/patientDashboard";
import PatientDailyMedicineList from "./PatientDailyMedicineList";
import PatientMedicationCalendar from "./PatientMedicationCalendar";
import PatientScheduleDaySummary from "./PatientScheduleDaySummary";

let patientScheduleViewCache: {
  selectedDate: Date;
  visibleMonth: Date;
  patientSchedules: MedicationScheduleRecord[];
  confirmedScheduleDates: Record<string, string[]>;
} | null = null;

interface PatientScheduleState {
  readonly selectedDate: Date;
  readonly visibleMonth: Date;
  readonly patientSchedules: MedicationScheduleRecord[];
  readonly isLoading: boolean;
  readonly hasLoadedSchedules: boolean;
}

type PatientScheduleAction = { readonly type: "patch"; readonly payload: Partial<PatientScheduleState> };

function patientScheduleReducer(state: PatientScheduleState, action: PatientScheduleAction): PatientScheduleState {
  return action.type === "patch" ? { ...state, ...action.payload } : state;
}

export default function PatientSchedulePage() {
  const today = new Date();
  const lastScan = usePatientDashboardStore((state) => state.lastScan);
  const confirmedScheduleDates = usePatientDashboardStore((state) => state.confirmedScheduleDates);
  const setScheduleContext = usePatientDashboardStore((state) => state.setScheduleContext);
  const [confirmingScheduleId, setConfirmingScheduleId] = useState<string | null>(null);
  const [state, dispatch] = useReducer(patientScheduleReducer, {
    selectedDate: patientScheduleViewCache?.selectedDate ?? today,
    visibleMonth: patientScheduleViewCache?.visibleMonth ?? getMonthStart(today),
    patientSchedules: patientScheduleViewCache?.patientSchedules ?? [],
    isLoading: !patientScheduleViewCache,
    hasLoadedSchedules: Boolean(patientScheduleViewCache),
  });
  const { selectedDate, visibleMonth, patientSchedules, isLoading, hasLoadedSchedules } = state;
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let isMounted = true;

    getPatientScheduleData(visibleMonth, { forceRefresh: true })
      .then((data) => {
        if (!isMounted) return;
        const nextConfirmedScheduleDates = getConfirmedScheduleDates(data.medicationLogs);
        setScheduleContext({ patientId: data.patient.id, confirmedScheduleDates: nextConfirmedScheduleDates });
        dispatch({ type: "patch", payload: { patientSchedules: data.schedules, hasLoadedSchedules: true, isLoading: false } });
        patientScheduleViewCache = {
          selectedDate: stateRef.current.selectedDate,
          visibleMonth,
          patientSchedules: data.schedules,
          confirmedScheduleDates: nextConfirmedScheduleDates,
        };
      })
      .catch(() => {
        if (!isMounted) return;
        setScheduleContext({ patientId: null, confirmedScheduleDates: {} });
        dispatch({ type: "patch", payload: { patientSchedules: [], hasLoadedSchedules: true, isLoading: false } });
      });

    return () => {
      isMounted = false;
    };
  }, [setScheduleContext, visibleMonth]);
  const schedulesForSelectedDate = useMemo(() => getSchedulesForDate(patientSchedules, selectedDate), [patientSchedules, selectedDate]);
  const selectedDateKey = getDateKey(selectedDate);
  const confirmedScheduleIds = confirmedScheduleDates[selectedDateKey] ?? [];
  const activeSchedules = patientSchedules.filter((schedule) => schedule.status === "Aktif");
  useEffect(() => {
    if (!hasLoadedSchedules) return;
    patientScheduleViewCache = { selectedDate, visibleMonth, patientSchedules, confirmedScheduleDates: { ...confirmedScheduleDates } as Record<string, string[]> };
  }, [confirmedScheduleDates, hasLoadedSchedules, patientSchedules, selectedDate, visibleMonth]);
  const scheduleStats: SummaryCardItem[] = [
    {
      label: "Jadwal Obat Aktif",
      value: String(activeSchedules.length),
      tone: "safe",
      color: "pine",
      icon: CalendarClock,
    },
    {
      label: "Total Semua Obat",
      value: String(patientSchedules.length),
      tone: "safe",
      color: "leaf",
      icon: Pill,
    },
    {
      label: "Reminder Obat Aktif",
      value: String(activeSchedules.filter((schedule) => schedule.reminderEnabled).length),
      tone: "safe",
      color: "lime",
      icon: AlarmClock,
    },
  ];

  const handleDateSelect = (date: Date) => {
    dispatch({ type: "patch", payload: { selectedDate: date, visibleMonth: getMonthStart(date) } });
  };

  const handleConfirmSchedule = async (scheduleId: string) => {
    if (confirmingScheduleId || !isSameDate(selectedDate, today) || !lastScan?.hasDetectedFood) return;

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
    if (schedule.status !== "Aktif" || schedule.stock <= 0) {
      showToast(schedule.status === "Nonaktif" ? "Obat sedang nonaktif, jadi tidak bisa dikonfirmasi." : "Obat sudah selesai, jadi tidak bisa dikonfirmasi.", "warning");
      return;
    }

    const doseWindow = getScheduleDoseWindow(schedule, selectedDate, confirmedScheduleDates);
    if (doseWindow.doseIndex === null || !doseWindow.canConfirm) return;

    setConfirmingScheduleId(scheduleId);
    try {
      await confirmMedicationScheduleViaApi(schedule, selectedDate, doseWindow.doseIndex);
      const refreshedData = await getPatientScheduleData(visibleMonth, { forceRefresh: true });
      const nextConfirmedScheduleDates = getConfirmedScheduleDates(refreshedData.medicationLogs);
      setScheduleContext({ patientId: refreshedData.patient.id, confirmedScheduleDates: nextConfirmedScheduleDates });
      dispatch({ type: "patch", payload: { patientSchedules: refreshedData.schedules } });
      patientScheduleViewCache = {
        selectedDate,
        visibleMonth,
        patientSchedules: refreshedData.schedules,
        confirmedScheduleDates: nextConfirmedScheduleDates,
      };
      showToast("Obat berhasil dikonfirmasi.", "success");
    } catch {
      showToast("Gagal mengonfirmasi obat. Coba muat ulang jadwal.", "error");
    } finally {
      setConfirmingScheduleId(null);
    }
  };

  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Jadwal Obat" />
      {isLoading && !hasLoadedSchedules ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={scheduleStats} />}

      {isLoading && !hasLoadedSchedules ? <div className="mt-6"><PatientScheduleContentSkeleton /></div> : <>
        <div className="mt-6 space-y-6">
          <PatientDailyMedicineList
            selectedDate={selectedDate}
            schedules={schedulesForSelectedDate}
            canConfirm={Boolean(lastScan?.hasDetectedFood)}
            hasFoodScan={Boolean(lastScan)}
            confirmedScheduleIds={confirmedScheduleIds}
            confirmedScheduleDates={confirmedScheduleDates}
            confirmingScheduleId={confirmingScheduleId}
            onConfirm={(schedule) => handleConfirmSchedule(schedule.id)}
          />
        </div>

        <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,0.72fr)]">
          <PatientMedicationCalendar
            month={visibleMonth}
            selectedDate={selectedDate}
            schedules={patientSchedules}
            confirmedScheduleDates={confirmedScheduleDates}
            onMonthChange={(month) => dispatch({ type: "patch", payload: { visibleMonth: month } })}
            onDateSelect={handleDateSelect}
          />
          <PatientScheduleDaySummary
            selectedDate={selectedDate}
            schedulesForDate={schedulesForSelectedDate}
            allSchedules={patientSchedules}
            confirmedScheduleDates={confirmedScheduleDates}
          />
        </div>
      </>}
    </DashboardPageShell>
  );
}
