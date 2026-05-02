import type { PatientRecord } from "@/lib/mocks/patients";

const patientIdPrefix = "JVR-";

export function getNextPatientOrder(patients: readonly PatientRecord[]) {
  const highestOrder = patients.reduce((highest, patient) => {
    const order = Number(patient.id.replace(patientIdPrefix, ""));
    return Number.isFinite(order) ? Math.max(highest, order) : highest;
  }, 0);

  return highestOrder + 1;
}
