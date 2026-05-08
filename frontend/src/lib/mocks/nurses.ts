export type NurseStatus = "Aktif" | "Nonaktif";
export type NurseGender = "Pria" | "Wanita";

export interface NurseRecord {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly gender: NurseGender;
  readonly status: NurseStatus;
  readonly joinedAt: string;
  readonly temporaryPassword: boolean;
}

export type PatientNurseAssignment = Record<string, string>;

export const nurses: NurseRecord[] = [
  {
    id: "NRS-001",
    fullName: "Nurse Jivara",
    email: "nurse@jivara.id",
    phone: "+628121120001",
    gender: "Wanita",
    status: "Aktif",
    joinedAt: "12 Jan 2026",
    temporaryPassword: false,
  },
  {
    id: "NRS-002",
    fullName: "Siti Rahmawati",
    email: "siti.rahmawati@jivara.id",
    phone: "+628121120002",
    gender: "Wanita",
    status: "Aktif",
    joinedAt: "18 Jan 2026",
    temporaryPassword: false,
  },
  {
    id: "NRS-003",
    fullName: "Dimas Pradana",
    email: "dimas.pradana@jivara.id",
    phone: "+628121120003",
    gender: "Pria",
    status: "Nonaktif",
    joinedAt: "02 Feb 2026",
    temporaryPassword: false,
  },
];

export const patientNurseAssignments: PatientNurseAssignment = {
  "JVR-01": "NRS-001",
  "JVR-02": "NRS-001",
  "JVR-03": "NRS-002",
  "JVR-04": "NRS-002",
  "JVR-05": "NRS-003",
  "JVR-06": "NRS-003",
};
