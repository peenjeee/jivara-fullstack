import { create } from "zustand";
import type { FoodScanRecord } from "@/lib/mocks/foodScans";

interface PatientDashboardState {
  readonly patientId: string | null;
  readonly lastScan: FoodScanRecord | null;
  readonly confirmedMedicineIds: readonly string[];
  readonly confirmedScheduleDates: Readonly<Record<string, readonly string[]>>;
  readonly setPatientId: (patientId: string | null) => void;
  readonly setLastScan: (scan: FoodScanRecord) => void;
  readonly setConfirmedScheduleDates: (dates: Readonly<Record<string, readonly string[]>>) => void;
  readonly confirmMedicine: (medicineId: string) => void;
  readonly confirmScheduleForDate: (dateKey: string, scheduleId: string) => void;
  readonly resetPatientDashboardState: () => void;
}

export const usePatientDashboardStore = create<PatientDashboardState>()((set) => ({
  patientId: null,
  lastScan: null,
  confirmedMedicineIds: [],
  confirmedScheduleDates: {},
  setPatientId: (patientId) => set({ patientId }),
  setLastScan: (scan) => set({ lastScan: scan }),
  setConfirmedScheduleDates: (dates) => set({ confirmedScheduleDates: dates }),
  confirmMedicine: (medicineId) =>
    set((state) => ({
      confirmedMedicineIds: state.confirmedMedicineIds.includes(medicineId)
        ? state.confirmedMedicineIds
        : [...state.confirmedMedicineIds, medicineId],
    })),
  confirmScheduleForDate: (dateKey, scheduleId) =>
    set((state) => {
      const currentScheduleIds = state.confirmedScheduleDates[dateKey] ?? [];
      if (currentScheduleIds.includes(scheduleId)) return state;

      return {
        confirmedMedicineIds: state.confirmedMedicineIds.includes(scheduleId)
          ? state.confirmedMedicineIds
          : [...state.confirmedMedicineIds, scheduleId],
        confirmedScheduleDates: {
          ...state.confirmedScheduleDates,
          [dateKey]: [...currentScheduleIds, scheduleId],
        },
      };
    }),
  resetPatientDashboardState: () => set({ patientId: null, lastScan: null, confirmedMedicineIds: [], confirmedScheduleDates: {} }),
}));
