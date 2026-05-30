"use client";

import { Plus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import FormStickyActions from "@/components/ui/FormStickyActions";
import SelectField from "@/components/ui/SelectField";
import type { PatientRecord } from "@/lib/mocks/patients";
import type { MealRule, MedicationScheduleStatus, MedicineForm } from "@/lib/mocks/schedules";
import { getMedicineCatalogFromApi, type MedicineCatalogOption } from "@/lib/scheduleApi";
import { showWarning } from "@/lib/swal";
import ScheduleMedicineBlock from "./ScheduleMedicineBlock";
import { emptyMedicine, emptyScheduleFormValues, type ScheduleFormValues } from "./scheduleFormUtils";
import { SCHEDULE_INPUT_CLASS } from "./ScheduleTimeFields";

interface ScheduleFormProps {
  readonly patients: readonly PatientRecord[];
  readonly initialValues?: ScheduleFormValues;
  readonly mode?: "add" | "edit";
  readonly patientLocked?: boolean;
  readonly medicineIndexOffset?: number;
  readonly medicineIndexOffsetByPatient?: Readonly<Record<string, number>>;
  readonly onSubmit: (values: ScheduleFormValues) => void | Promise<void>;
  readonly onCancel: () => void;
}

const EMPTY_MEDICINE_INDEX_OFFSET_BY_PATIENT: Readonly<Record<string, number>> = {};

export default function ScheduleForm({ patients, initialValues, mode = "add", patientLocked = false, medicineIndexOffset = 0, medicineIndexOffsetByPatient = EMPTY_MEDICINE_INDEX_OFFSET_BY_PATIENT, onSubmit }: ScheduleFormProps) {
  const values = initialValues ?? emptyScheduleFormValues;
  const [medicineKeys, setMedicineKeys] = useState(() => values.medicines.map((_, index) => index));
  const [selectedPatientId, setSelectedPatientId] = useState(values.patientId);
  const [medicineCatalogOptions, setMedicineCatalogOptions] = useState<MedicineCatalogOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canManageBlocks = mode === "add";
  const displayIndexOffset = patientLocked ? medicineIndexOffset : medicineIndexOffsetByPatient[selectedPatientId] ?? 0;
  const patientOptions = Array.from(new Map(patients.map((patient) => [patient.id, patient])).values()).map((patient) => ({ label: patient.name, value: patient.id }));

  useEffect(() => {
    let isMounted = true;
    getMedicineCatalogFromApi()
      .then((catalog) => {
        if (isMounted) setMedicineCatalogOptions(catalog);
      })
      .catch(() => {
        if (isMounted) setMedicineCatalogOptions([]);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleMedicineSearch = (search: string) => {
    const query = search.trim();
    if (query.length < 2) return;
    getMedicineCatalogFromApi(query)
      .then((catalog) => setMedicineCatalogOptions(catalog))
      .catch(() => undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    const formData = new FormData(event.currentTarget);
    const patientId = String(formData.get("patientId") ?? "");
    const medicines = medicineKeys.map((key) => ({
      medicineName: String(formData.get(`medicineName-${key}`) ?? "").trim(),
      registrationNumber: String(formData.get(`registrationNumber-${key}`) ?? "").trim(),
      compositionNormalized: String(formData.get(`compositionNormalized-${key}`) ?? "").trim(),
      activeSubstances: String(formData.get(`activeSubstances-${key}`) ?? "").trim(),
      drugCategories: String(formData.get(`drugCategories-${key}`) ?? "").trim(),
      dose: String(formData.get(`dose-${key}`) ?? "").trim(),
      medicineForm: String(formData.get(`medicineForm-${key}`) ?? "") as MedicineForm | "",
      stock: Number(formData.get(`stock-${key}`) ?? 0),
      frequency: String(formData.get(`frequency-${key}`) ?? "").trim(),
      times: formData.getAll(`times-${key}`).flatMap((time) => {
        const trimmedTime = String(time).trim();
        return trimmedTime ? [trimmedTime] : [];
      }),
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

    setIsSubmitting(true);
    try {
      await onSubmit({ patientId, medicines });
    } finally {
      setIsSubmitting(false);
    }
  };

  const addMedicineBlock = () => {
    setMedicineKeys((currentKeys) => [...currentKeys, Math.max(...currentKeys, -1) + 1]);
  };

  return (
    <form onSubmit={handleSubmit} className="min-w-0 space-y-5" noValidate>
      <FormField label="Pasien" required>
        {patientLocked && <input type="hidden" name="patientId" value={values.patientId} />}
        <SelectField
          id="schedulePatientId"
          name={patientLocked ? undefined : "patientId"}
          defaultValue={values.patientId}
          options={[{ label: "Pilih pasien", value: "", disabled: true }, ...patientOptions]}
          placeholder="Pilih pasien"
          className={SCHEDULE_INPUT_CLASS}
          required
          disabled={patientLocked}
          onChange={setSelectedPatientId}
        />
      </FormField>

      <div className="min-w-0 space-y-5">
        {medicineKeys.map((key, index) => {
          const medicineValues = values.medicines[index] ?? emptyMedicine;

          return (
            <ScheduleMedicineBlock
              key={key}
              index={index}
              displayIndexOffset={displayIndexOffset}
              fieldKey={key}
              values={medicineValues}
              medicineCatalogOptions={medicineCatalogOptions}
              onMedicineSearch={handleMedicineSearch}
              removable={canManageBlocks && medicineKeys.length > 1}
              onRemove={() => setMedicineKeys((currentKeys) => currentKeys.filter((currentKey) => currentKey !== key))}
            />
          );
        })}
      </div>

      {canManageBlocks && (
        <button type="button" disabled={isSubmitting} onClick={addMedicineBlock} className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary hover:bg-primary hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
          <Plus size={16} /> Tambah Obat
        </button>
      )}

      <FormStickyActions>
        <Button size="sm" type="submit" loading={isSubmitting} loadingLabel={mode === "edit" ? "Menyimpan obat…" : "Menyimpan jadwal…"}>
          {mode === "edit" ? "Simpan Obat" : "Simpan Jadwal"}
        </Button>
      </FormStickyActions>
    </form>
  );
}
