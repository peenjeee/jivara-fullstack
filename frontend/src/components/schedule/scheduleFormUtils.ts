import type { PatientRecord } from "@/lib/mocks/patients";
import type { MealRule, MedicationScheduleRecord, MedicationScheduleStatus, MedicineForm } from "@/lib/mocks/schedules";

export interface ScheduleMedicineFormValues {
  readonly medicineName: string;
  readonly registrationNumber?: string;
  readonly compositionNormalized?: string;
  readonly activeSubstances?: string;
  readonly drugCategories?: string;
  readonly dose: string;
  readonly medicineForm: MedicineForm | "";
  readonly stock: number;
  readonly frequency: string;
  readonly times: readonly string[];
  readonly mealRule: MealRule | "";
  readonly startDate: string;
  readonly endDate?: string;
  readonly reminderEnabled: boolean;
  readonly instructions?: string;
  readonly status: MedicationScheduleStatus | "";
}

export interface ScheduleFormValues {
  readonly patientId: string;
  readonly medicines: readonly ScheduleMedicineFormValues[];
}

export const emptyMedicine: ScheduleMedicineFormValues = {
  medicineName: "",
  registrationNumber: "",
  compositionNormalized: "",
  activeSubstances: "",
  drugCategories: "",
  dose: "",
  medicineForm: "",
  stock: 1,
  frequency: "",
  times: ["08:00"],
  mealRule: "",
  startDate: new Date().toISOString().slice(0, 10),
  endDate: "",
  reminderEnabled: true,
  instructions: "",
  status: "",
};

export const emptyScheduleFormValues: ScheduleFormValues = {
  patientId: "",
  medicines: [emptyMedicine],
};

export function getEmptyScheduleFormValues(patientId = ""): ScheduleFormValues {
  return {
    patientId,
    medicines: [emptyMedicine],
  };
}

export function getScheduleFormValues(schedule: MedicationScheduleRecord): ScheduleFormValues {
  return {
    patientId: schedule.patientId,
    medicines: [{
      medicineName: schedule.medicineName,
      registrationNumber: schedule.registrationNumber ?? "",
      compositionNormalized: schedule.compositionNormalized ?? "",
      activeSubstances: schedule.activeSubstances ?? "",
      drugCategories: schedule.drugCategories ?? "",
      dose: schedule.dose,
      medicineForm: schedule.medicineForm,
      stock: schedule.stock,
      frequency: schedule.frequency,
      times: schedule.times,
      mealRule: schedule.mealRule,
      startDate: schedule.startDate,
      endDate: schedule.endDate ?? "",
      reminderEnabled: schedule.reminderEnabled,
      instructions: schedule.instructions ?? "",
      status: schedule.status,
    }],
  };
}

export function createScheduleRecord(patientId: string, values: ScheduleMedicineFormValues, patients: readonly PatientRecord[], nextOrder: number): MedicationScheduleRecord {
  const patient = patients.find((currentPatient) => currentPatient.id === patientId);

  return {
    id: `SCH-${String(nextOrder).padStart(3, "0")}`,
    patientId,
    patientName: patient?.name ?? "Pasien tidak diketahui",
    patientAvatar: patient?.avatar ?? "??",
    medicineName: values.medicineName,
    registrationNumber: values.registrationNumber || undefined,
    compositionNormalized: values.compositionNormalized || undefined,
    activeSubstances: values.activeSubstances || undefined,
    drugCategories: values.drugCategories || undefined,
    dose: values.dose,
    medicineForm: values.medicineForm as MedicineForm,
    stock: values.stock,
    frequency: values.frequency,
    times: values.times,
    mealRule: values.mealRule as MealRule,
    startDate: values.startDate,
    endDate: values.endDate || undefined,
    reminderEnabled: values.reminderEnabled,
    instructions: values.instructions || undefined,
    status: values.status as MedicationScheduleStatus,
  };
}

export function updateScheduleRecord(schedule: MedicationScheduleRecord, values: ScheduleMedicineFormValues, patients: readonly PatientRecord[], patientId = schedule.patientId): MedicationScheduleRecord {
  const patient = patients.find((currentPatient) => currentPatient.id === patientId);

  return {
    ...schedule,
    patientId,
    patientName: patient?.name ?? schedule.patientName,
    patientAvatar: patient?.avatar ?? schedule.patientAvatar,
    medicineName: values.medicineName,
    registrationNumber: values.registrationNumber || undefined,
    compositionNormalized: values.compositionNormalized || undefined,
    activeSubstances: values.activeSubstances || undefined,
    drugCategories: values.drugCategories || undefined,
    dose: values.dose,
    medicineForm: values.medicineForm as MedicineForm,
    stock: values.stock,
    frequency: values.frequency,
    times: values.times,
    mealRule: values.mealRule as MealRule,
    startDate: values.startDate,
    endDate: values.endDate || undefined,
    reminderEnabled: values.reminderEnabled,
    instructions: values.instructions || undefined,
    status: values.status as MedicationScheduleStatus,
    previousStatus: values.status === "Nonaktif" ? schedule.previousStatus : undefined,
  };
}
