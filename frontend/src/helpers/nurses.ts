import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { NurseRecord, PatientNurseAssignment } from "@/lib/mocks/nurses";
import type { PatientRecord } from "@/lib/mocks/patients";

export function getNurseInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NR";
}

export function getNextNurseId(nurses: readonly NurseRecord[]) {
  const nextNumber = nurses.reduce((max, nurse) => {
    const numericId = Number(nurse.id.replace(/\D/g, ""));
    return Number.isFinite(numericId) ? Math.max(max, numericId) : max;
  }, 0) + 1;

  return `NRS-${String(nextNumber).padStart(3, "0")}`;
}

export function getPatientsForNurse(patients: readonly PatientRecord[], assignments: PatientNurseAssignment, nurseId: string) {
  return patients.filter((patient) => assignments[patient.id] === nurseId);
}

export function getNurseByPatientId(nurses: readonly NurseRecord[], assignments: PatientNurseAssignment, patientId: string | undefined) {
  if (!patientId) return undefined;
  return nurses.find((nurse) => nurse.id === assignments[patientId]);
}

export function activityMatchesNurse(activity: ActivityLogRecord, assignments: PatientNurseAssignment, nurseId: string) {
  return activity.sourceNurseId === nurseId
    || activity.targetNurseId === nurseId
    || (activity.patientId ? assignments[activity.patientId] === nurseId : false);
}

export function getAverageAdherence(patients: readonly PatientRecord[]) {
  if (!patients.length) return 0;
  return Math.round(patients.reduce((total, patient) => total + patient.adherence, 0) / patients.length);
}
