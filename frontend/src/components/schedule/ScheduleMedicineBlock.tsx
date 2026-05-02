"use client";

import { motion } from "motion/react";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
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
    <motion.section
      className="rounded-3xl bg-surface p-4 sm:p-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: index * 0.04 }}
    >
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">Obat {displayIndexOffset + index + 1}</h3>
        {removable && (
          <button type="button" onClick={onRemove} className="inline-flex h-10 w-10 items-center justify-center rounded-2xl hover:bg-danger/10 text-danger" aria-label="Hapus obat">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nama Obat" required>
          <input id={fieldId("medicineName")} name={fieldId("medicineName")} defaultValue={values.medicineName} className={SCHEDULE_INPUT_CLASS} placeholder="Nama obat" required />
        </Field>
        <Field label="Dosis" required>
          <input id={fieldId("dose")} name={fieldId("dose")} defaultValue={values.dose} className={SCHEDULE_INPUT_CLASS} placeholder="Dosis" required />
        </Field>
        <Field label="Bentuk Obat" required>
          <select id={fieldId("medicineForm")} name={fieldId("medicineForm")} defaultValue={values.medicineForm} className={SCHEDULE_INPUT_CLASS} required>
            <option value="" disabled>Pilih bentuk obat</option>
            {medicineForms.map((form) => <option key={form} value={form}>{form}</option>)}
          </select>
        </Field>
        <Field label="Stok Obat" required>
          <input id={fieldId("stock")} name={fieldId("stock")} type="number" min={1} defaultValue={values.stock} className={SCHEDULE_INPUT_CLASS} required />
        </Field>
        <Field label="Frekuensi" required>
          <input id={fieldId("frequency")} name={fieldId("frequency")} defaultValue={values.frequency} className={SCHEDULE_INPUT_CLASS} placeholder="Frekuensi" required />
        </Field>
        <Field label="Aturan Makan" required>
          <select id={fieldId("mealRule")} name={fieldId("mealRule")} defaultValue={values.mealRule} className={SCHEDULE_INPUT_CLASS} required>
            <option value="" disabled>Pilih aturan makan</option>
            {mealRules.map((rule) => <option key={rule} value={rule}>{rule}</option>)}
          </select>
        </Field>
        <Field label="Status" required>
          <select id={fieldId("status")} name={fieldId("status")} defaultValue={values.status} className={SCHEDULE_INPUT_CLASS} required>
            <option value="" disabled>Pilih status</option>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
        </Field>
        <Field label="Tanggal Mulai" required>
          <input id={fieldId("startDate")} name={fieldId("startDate")} type="date" defaultValue={values.startDate} className={SCHEDULE_INPUT_CLASS} required />
        </Field>
        <Field label="Tanggal Selesai">
          <input id={fieldId("endDate")} name={fieldId("endDate")} type="date" defaultValue={values.endDate} className={SCHEDULE_INPUT_CLASS} />
        </Field>
      </div>

      <div className="mt-4">
        <ScheduleTimeFields name={fieldId("times")} initialTimes={values.times} />
      </div>

      <label className="mt-4 flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-shadow focus-within:shadow-[0_0_0_2px_rgba(20,114,69,0.18),0_2px_8px_rgba(15,23,42,0.08)]">
        <span>
          <span className="block text-sm font-extrabold text-text-main">Reminder aktif</span>
        </span>
        <input id={fieldId("reminderEnabled")} name={fieldId("reminderEnabled")} type="checkbox" defaultChecked={values.reminderEnabled} className="h-5 w-5 accent-primary" />
      </label>

      <div className="mt-4">
        <Field label="Instruksi Khusus">
          <textarea id={fieldId("instructions")} name={fieldId("instructions")} defaultValue={values.instructions} className={`${SCHEDULE_INPUT_CLASS} min-h-28 resize-none py-3`} placeholder="Instruksi khusus ..." />
        </Field>
      </div>
    </motion.section>
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
