import { create } from "zustand";
import { getNextNurseId } from "@/helpers/nurses";
import { nurses as initialNurses, patientNurseAssignments, type NurseGender, type NurseRecord, type NurseStatus, type PatientNurseAssignment } from "@/lib/mocks/nurses";

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
  readonly assignments: PatientNurseAssignment;
  readonly setNurses: (nurses: NurseRecord[]) => void;
  readonly addNurse: (values: NurseFormValues) => NurseRecord;
  readonly updateNurse: (nurseId: string, values: NurseFormValues) => void;
  readonly toggleNurseStatus: (nurseId: string) => void;
  readonly deleteNurse: (nurseId: string) => void;
  readonly reassignPatients: (patientIds: readonly string[], targetNurseId: string) => void;
}

const formatJoinedAt = () => new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });

export const useNurseStore = create<NurseStoreState>()((set, get) => ({
  nurses: initialNurses,
  assignments: patientNurseAssignments,
  setNurses: (nurses) => set({ nurses }),
  addNurse: (values) => {
    const nurse: NurseRecord = {
      id: getNextNurseId(get().nurses),
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      gender: values.gender,
      status: values.status,
      joinedAt: formatJoinedAt(),
      temporaryPassword: true,
    };

    set((state) => ({ nurses: [nurse, ...state.nurses] }));
    return nurse;
  },
  updateNurse: (nurseId, values) => set((state) => ({
    nurses: state.nurses.map((nurse) => nurse.id === nurseId
      ? {
          ...nurse,
          fullName: values.fullName,
          email: values.email,
          phone: values.phone,
          gender: values.gender,
          status: values.status,
          temporaryPassword: values.password ? true : nurse.temporaryPassword,
        }
      : nurse),
  })),
  toggleNurseStatus: (nurseId) => set((state) => ({
    nurses: state.nurses.map((nurse) => nurse.id === nurseId ? { ...nurse, status: nurse.status === "Aktif" ? "Nonaktif" : "Aktif" } : nurse),
  })),
  deleteNurse: (nurseId) => set((state) => ({
    nurses: state.nurses.filter((nurse) => nurse.id !== nurseId),
  })),
  reassignPatients: (patientIds, targetNurseId) => set((state) => ({
    assignments: patientIds.reduce<PatientNurseAssignment>((nextAssignments, patientId) => ({
      ...nextAssignments,
      [patientId]: targetNurseId,
    }), state.assignments),
  })),
}));
