"use client";

import { Check, ChevronDown, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import DatePickerField from "@/components/ui/DatePickerField";
import FormField from "@/components/ui/FormField";
import FormSection from "@/components/ui/FormSection";
import NumberStepper from "@/components/ui/NumberStepper";
import SelectField from "@/components/ui/SelectField";
import Switch from "@/components/ui/Switch";
import type { MealRule, MedicationScheduleStatus, MedicineForm } from "@/lib/mocks/schedules";
import type { MedicineCatalogOption } from "@/lib/scheduleApi";
import type { ScheduleMedicineFormValues } from "./scheduleFormUtils";
import ScheduleTimeFields, { SCHEDULE_INPUT_CLASS } from "./ScheduleTimeFields";

const mealRules: MealRule[] = ["Sebelum makan", "Sesudah makan", "Tidak tergantung makan"];
const statuses: MedicationScheduleStatus[] = ["Aktif", "Selesai", "Nonaktif"];

interface ScheduleMedicineBlockProps {
  readonly index: number;
  readonly displayIndexOffset?: number;
  readonly fieldKey: number;
  readonly values: ScheduleMedicineFormValues;
  readonly medicineCatalogOptions: readonly MedicineCatalogOption[];
  readonly onMedicineSearch: (search: string) => void;
  readonly removable: boolean;
  readonly onRemove: () => void;
}

interface MedicineSearchSelectProps {
  readonly id: string;
  readonly name: string;
  readonly fieldKey: number;
  readonly defaultValue: string;
  readonly defaultRegistrationNumber?: string;
  readonly defaultCompositionNormalized?: string;
  readonly defaultActiveSubstances?: string;
  readonly defaultDrugCategories?: string;
  readonly options: readonly MedicineCatalogOption[];
  readonly onSearch: (search: string) => void;
  readonly onSelectMedicine: (medicine: MedicineCatalogOption) => void;
}

const getMedicineFormFromCatalog = (value?: string | null): MedicineForm => value?.trim() || "Lainnya";

const getInitialMedicineForm = (value?: MedicineForm | "") => value ?? "";

function MedicineSearchSelect({ id, name, fieldKey, defaultValue, defaultRegistrationNumber = "", defaultCompositionNormalized = "", defaultActiveSubstances = "", defaultDrugCategories = "", options, onSearch, onSelectMedicine }: MedicineSearchSelectProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(defaultValue);
  const normalizedQuery = query.trim().toLowerCase();
  const filteredOptions = useMemo(() => (
    normalizedQuery
      ? options.filter((medicine) => `${medicine.productName} ${medicine.registrationNumber} ${medicine.compositionNormalized ?? ""} ${medicine.activeSubstances ?? ""} ${medicine.drugCategories ?? ""} ${medicine.dosageFormGroup ?? ""}`.toLowerCase().includes(normalizedQuery))
      : options
  ), [normalizedQuery, options]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const selectMedicine = (medicine: MedicineCatalogOption) => {
    setQuery(medicine.productName);
    onSelectMedicine(medicine);
    setIsOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative min-w-0 w-full">
      <div className={`flex min-w-0 items-center justify-between gap-3 ${SCHEDULE_INPUT_CLASS} focus-within:border-primary/25 focus-within:ring-2 focus-within:ring-primary/15`}>
        <input
          id={id}
          name={name}
          value={query}
          onChange={(event) => {
            const nextValue = event.currentTarget.value;
            setQuery(nextValue);
            setIsOpen(true);
            onSearch(nextValue);
          }}
          onFocus={() => setIsOpen(true)}
          className="min-w-0 flex-1 bg-transparent p-0 text-text-main outline-none placeholder:text-muted"
          placeholder="Cari / pilih nama obat"
          required
          aria-label="Nama Obat"
          autoComplete="off"
        />
        <input type="hidden" name={`registrationNumber-${fieldKey}`} value={options.find((medicine) => medicine.productName === query)?.registrationNumber ?? defaultRegistrationNumber} />
        <input type="hidden" name={`compositionNormalized-${fieldKey}`} value={options.find((medicine) => medicine.productName === query)?.compositionNormalized ?? defaultCompositionNormalized} />
        <input type="hidden" name={`activeSubstances-${fieldKey}`} value={options.find((medicine) => medicine.productName === query)?.activeSubstances ?? defaultActiveSubstances} />
        <input type="hidden" name={`drugCategories-${fieldKey}`} value={options.find((medicine) => medicine.productName === query)?.drugCategories ?? defaultDrugCategories} />
        <button type="button" onClick={() => setIsOpen((current) => !current)} className="shrink-0 text-text-main" aria-label="Buka pilihan obat">
          <ChevronDown size={18} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {isOpen && (
        <div
          data-lenis-prevent
          data-lenis-prevent-wheel
          data-lenis-prevent-touch
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-2xl border border-line bg-white p-1 shadow-[0_18px_45px_rgba(15,23,42,0.16)]"
          onTouchMove={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          <div aria-label="Pilihan obat" className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? filteredOptions.map((medicine) => {
              const isSelected = medicine.productName === query;

              return (
                <button
                  key={medicine.registrationNumber}
                  type="button"
                  onClick={() => selectMedicine(medicine)}
                  className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition-colors ${isSelected ? "bg-primary/10 text-primary" : "text-text-main hover:bg-surface"}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{medicine.productName}</span>
                    <span className="block truncate text-xs font-semibold text-muted">{medicine.dosageFormGroup || medicine.drugCategories || medicine.registrationNumber}</span>
                  </span>
                  {isSelected && <Check size={16} className="shrink-0" />}
                </button>
              );
            }) : (
              <div className="px-3 py-2.5 text-sm font-bold text-muted">Obat tidak ditemukan</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ScheduleMedicineBlock({ index, displayIndexOffset = 0, fieldKey, values, medicineCatalogOptions, onMedicineSearch, removable, onRemove }: ScheduleMedicineBlockProps) {
  const fieldId = (name: string) => `${name}-${fieldKey}`;
  const [selectedMedicineForm, setSelectedMedicineForm] = useState<MedicineForm | "">(() => getInitialMedicineForm(values.medicineForm));

  return (
    <FormSection animated delay={index * 0.04} className="min-w-0">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h3 className="font-display text-xl font-extrabold tracking-[-0.04em] text-text-main">Obat {displayIndexOffset + index + 1}</h3>
        {removable && (
          <button type="button" onClick={onRemove} className="inline-flex size-10 items-center justify-center rounded-2xl hover:bg-danger/10 text-danger" aria-label="Hapus obat">
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="grid min-w-0 gap-4 sm:grid-cols-2">
        <FormField label="Nama Obat" htmlFor={fieldId("medicineName")} required>
          <MedicineSearchSelect
            id={fieldId("medicineName")}
            name={fieldId("medicineName")}
            defaultValue={values.medicineName}
            fieldKey={fieldKey}
            defaultRegistrationNumber={values.registrationNumber}
            defaultCompositionNormalized={values.compositionNormalized}
            defaultActiveSubstances={values.activeSubstances}
            defaultDrugCategories={values.drugCategories}
            options={medicineCatalogOptions}
            onSearch={onMedicineSearch}
            onSelectMedicine={(medicine) => setSelectedMedicineForm(getMedicineFormFromCatalog(medicine.dosageFormGroup))}
          />
        </FormField>
        <FormField label="Dosis" htmlFor={fieldId("dose")} required>
          <input id={fieldId("dose")} name={fieldId("dose")} defaultValue={values.dose} className={SCHEDULE_INPUT_CLASS} placeholder="Dosis" required aria-label="Dosis" />
        </FormField>
        <FormField label="Bentuk Obat" htmlFor={fieldId("medicineFormDisplay")} required>
          <input type="hidden" name={fieldId("medicineForm")} value={selectedMedicineForm} />
          <input
            id={fieldId("medicineFormDisplay")}
            value={selectedMedicineForm || "Pilih nama obat dahulu"}
            className={`${SCHEDULE_INPUT_CLASS} cursor-not-allowed select-none bg-surface/80 text-text-main disabled:opacity-100`}
            disabled
            readOnly
            aria-label="Bentuk Obat"
          />
        </FormField>
        <FormField label="Stok Obat" required>
          <NumberStepper id={fieldId("stock")} name={fieldId("stock")} defaultValue={values.stock} min={1} required ariaLabel="Stok obat" />
        </FormField>
        <FormField label="Frekuensi" htmlFor={fieldId("frequency")} required>
          <input id={fieldId("frequency")} name={fieldId("frequency")} defaultValue={values.frequency} className={SCHEDULE_INPUT_CLASS} placeholder="Frekuensi" required aria-label="Frekuensi" />
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

      <label htmlFor={fieldId("reminderEnabled")} className="mt-4 flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-surface px-4 py-3 shadow-[0_2px_8px_rgba(15,23,42,0.08)] transition-shadow focus-within:shadow-[0_0_0_2px_rgba(20,114,69,0.18),0_2px_8px_rgba(15,23,42,0.08)]">
        <span>
          <span className="block text-sm font-extrabold text-text-main">Reminder aktif</span>
        </span>
        <Switch id={fieldId("reminderEnabled")} name={fieldId("reminderEnabled")} defaultChecked={values.reminderEnabled} ariaLabel="Reminder aktif" />
      </label>

      <div className="mt-4">
        <FormField label="Instruksi Khusus" htmlFor={fieldId("instructions")}>
          <textarea id={fieldId("instructions")} name={fieldId("instructions")} defaultValue={values.instructions} className={`${SCHEDULE_INPUT_CLASS} min-h-28 resize-none py-3`} placeholder="Instruksi khusus ..." aria-label="Instruksi Khusus" />
        </FormField>
      </div>
    </FormSection>
  );
}
