import { create } from "zustand";
import type { FoodScanRecord } from "@/lib/mocks/foodScans";

interface PatientDashboardState {
  readonly lastScan: FoodScanRecord | null;
  readonly confirmedMedicineIds: readonly string[];
  readonly confirmedScheduleDates: Readonly<Record<string, readonly string[]>>;
  readonly setLastScan: (scan: FoodScanRecord) => void;
  readonly confirmMedicine: (medicineId: string) => void;
  readonly confirmScheduleForDate: (dateKey: string, scheduleId: string) => void;
  readonly resetPatientDashboardState: () => void;
}

export const usePatientDashboardStore = create<PatientDashboardState>()((set) => ({
  lastScan: null,
  confirmedMedicineIds: [],
  confirmedScheduleDates: {},
  setLastScan: (scan) => set({ lastScan: scan }),
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
  resetPatientDashboardState: () => set({ lastScan: null, confirmedMedicineIds: [], confirmedScheduleDates: {} }),
}));
