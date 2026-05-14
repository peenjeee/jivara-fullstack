import { create } from "zustand";
import type { NurseGender, NurseRecord, NurseStatus } from "@/lib/mocks/nurses";

export interface NurseFormValues {
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly gender: NurseGender;
  readonly password: string;
  readonly status: NurseStatus;
}

interface NurseStoreState {
  readonly nurses: NurseRecord[];
  readonly setNurses: (nurses: NurseRecord[]) => void;
}

export const useNurseStore = create<NurseStoreState>()((set) => ({
  nurses: [],
  setNurses: (nurses) => set({ nurses }),
}));
