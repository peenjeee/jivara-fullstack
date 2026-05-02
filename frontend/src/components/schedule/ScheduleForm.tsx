"use client";

import { Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import FormStickyActions from "@/components/ui/FormStickyActions";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MealRule, MedicationScheduleRecord, MedicationScheduleStatus, MedicineForm } from "@/lib/mocks/schedules";
import { showWarning } from "@/lib/swal";
import ScheduleMedicineBlock from "./ScheduleMedicineBlock";
import { SCHEDULE_INPUT_CLASS } from "./ScheduleTimeFields";

export interface ScheduleMedicineFormValues {
  readonly medicineName: string;
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

interface ScheduleFormProps {
  readonly patients: readonly PatientRecord[];
  readonly initialValues?: ScheduleFormValues;
  readonly mode?: "add" | "edit";
  readonly patientLocked?: boolean;
  readonly medicineIndexOffset?: number;
  readonly medicineIndexOffsetByPatient?: Readonly<Record<string, number>>;
  readonly onSubmit: (values: ScheduleFormValues) => void;
  readonly onCancel: () => void;
}

const emptyMedicine: ScheduleMedicineFormValues = {
  medicineName: "",
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

const emptyValues: ScheduleFormValues = {
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

export default function ScheduleForm({ patients, initialValues, mode = "add", patientLocked = false, medicineIndexOffset = 0, medicineIndexOffsetByPatient = {}, onSubmit }: ScheduleFormProps) {
  const values = initialValues ?? emptyValues;
  const [medicineKeys, setMedicineKeys] = useState(() => values.medicines.map((_, index) => index));
  const [selectedPatientId, setSelectedPatientId] = useState(values.patientId);
  const canManageBlocks = mode === "add";
  const displayIndexOffset = patientLocked ? medicineIndexOffset : medicineIndexOffsetByPatient[selectedPatientId] ?? 0;

  const handleSubmit = (formData: FormData) => {
    const patientId = String(formData.get("patientId") ?? "");
    const medicines = medicineKeys.map((key) => ({
      medicineName: String(formData.get(`medicineName-${key}`) ?? "").trim(),
      dose: String(formData.get(`dose-${key}`) ?? "").trim(),
      medicineForm: String(formData.get(`medicineForm-${key}`) ?? "") as MedicineForm | "",
      stock: Number(formData.get(`stock-${key}`) ?? 0),
      frequency: String(formData.get(`frequency-${key}`) ?? "").trim(),
      times: formData.getAll(`times-${key}`).map((time) => String(time).trim()).filter(Boolean),
      mealRule: String(formData.get(`mealRule-${key}`) ?? "") as MealRule | "",
      startDate: String(formData.get(`startDate-${key}`) ?? ""),
      endDate: String(formData.get(`endDate-${key}`) ?? ""),
      reminderEnabled: formData.get(`reminderEnabled-${key}`) === "on",
      instructions: String(formData.get(`instructions-${key}`) ?? "").trim(),
      status: String(formData.get(`status-${key}`) ?? "") as MedicationScheduleStatus | "",
    }));

    const hasInvalidMedicine = medicines.some((medicine) => !medicine.medicineName || !medicine.dose || !medicine.medicineForm || !medicine.frequency || !medicine.mealRule || !medicine.status || !medicine.startDate || medicine.times.length === 0 || medicine.stock < 1);

    if (!patientId || medicines.length === 0 || hasInvalidMedicine) {
      showWarning("Lengkapi pasien, obat, dosis, bentuk obat, frekuensi, aturan makan, status, stok, tanggal mulai, dan minimal satu waktu minum untuk setiap obat.", "Data belum lengkap");
      return;
    }

    onSubmit({ patientId, medicines });
  };

  const addMedicineBlock = () => {
    setMedicineKeys((currentKeys) => [...currentKeys, Math.max(...currentKeys, -1) + 1]);
  };

  return (
    <form action={handleSubmit} className="space-y-5" noValidate>
      <Field label="Pasien" required>
        {patientLocked && <input type="hidden" name="patientId" value={values.patientId} />}
        <select
          id="schedulePatientId"
          name={patientLocked ? undefined : "patientId"}
          defaultValue={values.patientId}
          className={SCHEDULE_INPUT_CLASS}
          required
          disabled={patientLocked}
          onChange={(event) => setSelectedPatientId(event.target.value)}
        >
          <option value="">Pilih pasien</option>
          {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.name}</option>)}
        </select>
      </Field>

      <div className="space-y-5">
        {medicineKeys.map((key, index) => {
          const medicineValues = values.medicines[index] ?? emptyMedicine;

          return (
            <ScheduleMedicineBlock
              key={key}
              index={index}
              displayIndexOffset={displayIndexOffset}
              fieldKey={key}
              values={medicineValues}
              removable={canManageBlocks && medicineKeys.length > 1}
              onRemove={() => setMedicineKeys((currentKeys) => currentKeys.filter((currentKey) => currentKey !== key))}
            />
          );
        })}
      </div>

      {canManageBlocks && (
        <button type="button" onClick={addMedicineBlock} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-extrabold text-primary">
          <Plus size={16} /> Tambah Obat
        </button>
      )}

      <FormStickyActions>
        <Button size="sm" type="submit">
          {mode === "edit" ? "Simpan Obat" : "Simpan Jadwal"}
        </Button>
      </FormStickyActions>
    </form>
  );
}

function Field({ label, required = false, children }: { readonly label: string; readonly required?: boolean; readonly children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-extrabold text-text-main">{label}{required && <span className="text-danger"> *</span>}</span>
      {children}
    </label>
  );
}
