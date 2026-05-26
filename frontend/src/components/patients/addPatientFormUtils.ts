import type { PatientRecord } from "@/lib/mocks/patients";

export interface AddPatientValues {
  readonly fullName: string;
  readonly age: number;
  readonly gender: "Pria" | "Wanita";
  readonly phone: string;
  readonly email: string;
  readonly password: string;
  readonly address: string;
}

export function createPatientRecord(values: AddPatientValues, order: number): PatientRecord {
  const initials = values.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name[0]?.toUpperCase())
    .join("");

  return {
    id: `JVR-${String(order).padStart(2, "0")}`,
    name: values.fullName,
    age: values.age,
    gender: values.gender,
    phone: values.phone,
    email: values.email,
    address: values.address,
    status: "On Ideal Schedule",
    lastVisit: new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }),
    adherence: 100,
    avatar: initials || "P",
  };
}
