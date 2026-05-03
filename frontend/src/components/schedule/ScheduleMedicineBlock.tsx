"use client";

import { Trash2 } from "lucide-react";
import DatePickerField from "@/components/ui/DatePickerField";
import FormField from "@/components/ui/FormField";
import FormSection from "@/components/ui/FormSection";
import NumberStepper from "@/components/ui/NumberStepper";
import SelectField from "@/components/ui/SelectField";
import Switch from "@/components/ui/Switch";
import type { MealRule, MedicationScheduleStatus, MedicineForm } from "@/lib/mocks/schedules";
import type { ScheduleMedicineFormValues } from "./ScheduleForm";
import ScheduleTimeFields, { SCHEDULE_INPUT_CLASS } from "./ScheduleTimeFields";

const medicineForms: MedicineForm[] = ["Tablet", "Kapsul", "Sirup", "Injeksi", "Tetes", "Lainnya"];
const mealRules: MealRule[] = ["Sebelum makan", "Sesudah makan", "Tidak tergantung makan"];
const statuses: MedicationScheduleStatus[] = ["Aktif", "Selesai", "Nonaktif"];

interface ScheduleMedicineBlockProps {
  readonly index: number;
  readonly displayIndexOffset?: number;
  readonly fieldKey: number;
  readonly values: ScheduleMedicineFormValues;
  readonly removable: boolean;
  readonly onRemove: () => void;
}

export default function ScheduleMedicineBlock({ index, displayIndexOffset = 0, fieldKey, values, removable, onRemove }: ScheduleMedicineBlockProps) {
  const fieldId = (name: string) => `${name}-${fieldKey}`;

  return (
    <FormSection animated delay={index * 0.04} className="min-w-0">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">Obat {displayIndexOffset + index + 1}</h3>
        {removable && (
          <button type="button" onClick={onRemove} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl hover:bg-danger/10 text-danger" aria-label="Hapus obat">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <FormField label="Nama Obat" required>
          <input id={fieldId("medicineName")} name={fieldId("medicineName")} defaultValue={values.medicineName} className={SCHEDULE_INPUT_CLASS} placeholder="Nama obat" required />
        </FormField>
        <FormField label="Dosis" required>
          <input id={fieldId("dose")} name={fieldId("dose")} defaultValue={values.dose} className={SCHEDULE_INPUT_CLASS} placeholder="Dosis" required />
        </FormField>
        <FormField label="Bentuk Obat" required>
          <SelectField id={fieldId("medicineForm")} name={fieldId("medicineForm")} defaultValue={values.medicineForm} options={[{ label: "Pilih bentuk obat", value: "", disabled: true }, ...medicineForms.map((form) => ({ label: form, value: form }))]} placeholder="Pilih bentuk obat" className={SCHEDULE_INPUT_CLASS} required />
        </FormField>
        <FormField label="Stok Obat" required>
          <NumberStepper id={fieldId("stock")} name={fieldId("stock")} defaultValue={values.stock} min={1} required ariaLabel="Stok obat" />
        </FormField>
        <FormField label="Frekuensi" required>
          <input id={fieldId("frequency")} name={fieldId("frequency")} defaultValue={values.frequency} className={SCHEDULE_INPUT_CLASS} placeholder="Frekuensi" required />
        </FormField>
        <FormField label="Aturan Makan" required>
          <SelectField id={fieldId("mealRule")} name={fieldId("mealRule")} defaultValue={values.mealRule} options={[{ label: "Pilih aturan makan", value: "", disabled: true }, ...mealRules.map((rule) => ({ label: rule, value: rule }))]} placeholder="Pilih aturan makan" className={SCHEDULE_INPUT_CLASS} required />
        </FormField>
        <FormField label="Status" required>
          <SelectField id={fieldId("status")} name={fieldId("status")} defaultValue={values.status} options={[{ label: "Pilih status", value: "", disabled: true }, ...statuses.map((status) => ({ label: status, value: status }))]} placeholder="Pilih status" className={SCHEDULE_INPUT_CLASS} required />
        </FormField>
        <FormField label="Tanggal Mulai" required>
          <DatePickerField id={fieldId("startDate")} name={fieldId("startDate")} defaultValue={values.startDate} className={SCHEDULE_INPUT_CLASS} required />
        </FormField>
        <FormField label="Tanggal Selesai">
          <DatePickerField id={fieldId("endDate")} name={fieldId("endDate")} defaultValue={values.endDate} className={SCHEDULE_INPUT_CLASS} />
        </FormField>
      </div>

      <div className="mt-4">
        <ScheduleTimeFields name={fieldId("times")} initialTimes={values.times} />
      </div>

      <label className="mt-4 flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-shadow focus-within:shadow-[0_0_0_2px_rgba(20,114,69,0.18),0_2px_8px_rgba(15,23,42,0.08)]">
        <span>
          <span className="block text-sm font-extrabold text-text-main">Reminder aktif</span>
        </span>
        <Switch id={fieldId("reminderEnabled")} name={fieldId("reminderEnabled")} defaultChecked={values.reminderEnabled} ariaLabel="Reminder aktif" />
      </label>

      <div className="mt-4">
        <FormField label="Instruksi Khusus">
          <textarea id={fieldId("instructions")} name={fieldId("instructions")} defaultValue={values.instructions} className={`${SCHEDULE_INPUT_CLASS} min-h-28 resize-none py-3`} placeholder="Instruksi khusus ..." />
        </FormField>
      </div>
    </FormSection>
  );
}
