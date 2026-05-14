export type PatientStatus = "On Ideal Schedule" | "Lagging Behind" | "Need Special Attention";

export interface PatientRecord {
  readonly id: string;
  readonly name: string;
  readonly age: number;
  readonly gender: "Pria" | "Wanita";
  readonly phone?: string;
  readonly email?: string;
  readonly address?: string;
  readonly status: PatientStatus;
  readonly lastVisit: string;
  readonly adherence: number;
  readonly avatar: string;
  readonly image?: string;
  readonly assignedNurseId?: string;
}

const formatToday = () =>
  new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

export const patients: PatientRecord[] = [
  { id: "JVR-01", name: "Panji Ihsanudin Fajri", age: 24, gender: "Pria", phone: "+628121110001", email: "panji@jivara.test", address: "Bandung", status: "On Ideal Schedule", lastVisit: formatToday(), adherence: 92, avatar: "PJ" },
  { id: "JVR-02", name: "Rama Danadipa Putra Wijaya", age: 22, gender: "Pria", phone: "+628121110002", email: "rama@jivara.test", address: "Jakarta", status: "Need Special Attention", lastVisit: formatToday(), adherence: 35, avatar: "RD" },
  { id: "JVR-03", name: "La Rayan", age: 21, gender: "Pria", phone: "+628121110003", email: "rayan@jivara.test", address: "Depok", status: "Lagging Behind", lastVisit: formatToday(), adherence: 60, avatar: "LR" },
  { id: "JVR-04", name: "Rizki Pangestu", age: 24, gender: "Pria", phone: "+628121110004", email: "rizki@jivara.test", address: "Bogor", status: "On Ideal Schedule", lastVisit: formatToday(), adherence: 87, avatar: "RP" },
  { id: "JVR-05", name: "Hanip Rifan", age: 22, gender: "Pria", phone: "+628121110005", email: "hanip@jivara.test", address: "Bekasi", status: "Need Special Attention", lastVisit: formatToday(), adherence: 42, avatar: "HR" },
  { id: "JVR-06", name: "Alfito Juanda", age: 21, gender: "Pria", phone: "+628121110006", email: "alfito@jivara.test", address: "Tangerang", status: "Lagging Behind", lastVisit: formatToday(), adherence: 64, avatar: "AJ" },
];
