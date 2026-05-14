import type { ActivityLogRecord } from "@/lib/mocks/activityLogs";
import type { PatientRecord } from "@/lib/mocks/patients";

export function getNurseInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "NR";
}

export function activityMatchesNurse(activity: ActivityLogRecord, assignments: Readonly<Record<string, string>>, nurseId: string) {
  return activity.sourceNurseId === nurseId
    || activity.targetNurseId === nurseId
    || (activity.patientId ? assignments[activity.patientId] === nurseId : false);
}

export function getAverageAdherence(patients: readonly PatientRecord[]) {
  if (!patients.length) return 0;
  return Math.round(patients.reduce((total, patient) => total + patient.adherence, 0) / patients.length);
}
