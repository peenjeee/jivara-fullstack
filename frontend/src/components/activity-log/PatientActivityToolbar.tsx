"use client";

import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import DatePickerField from "@/components/ui/DatePickerField";
import FilterPills from "@/components/ui/FilterPills";
import SearchField from "@/components/ui/SearchField";
import SelectField from "@/components/ui/SelectField";
import type { SelectFieldOption } from "@/components/ui/SelectField";
import ToolbarCard from "@/components/ui/ToolbarCard";
import { FORM_PILL_INPUT_CLASS } from "@/components/ui/formStyles";
import { activityCategories, type ActivityCategory } from "@/lib/mocks/activityLogs";
import type { ActivityQuickFilter } from "./ActivityToolbar";

const quickFilters: { readonly label: string; readonly value: ActivityQuickFilter }[] = [
  { label: "Semua", value: "all" },
  { label: "Belum Dibaca", value: "unread" },
  { label: "Sukses", value: "success" },
  { label: "Info", value: "info" },
  { label: "Peringatan", value: "warning" },
  { label: "Kritis", value: "critical" },
];

const patientActivityCategoryOptions: SelectFieldOption<ActivityCategory | "all">[] = [
  { label: "Semua kategori", value: "all" },
  ...activityCategories.reduce<SelectFieldOption<ActivityCategory | "all">[]>((acc, currentCategory) => {
    if (currentCategory !== "Administrasi") acc.push({ label: currentCategory, value: currentCategory });
    return acc;
  }, []),
];

interface PatientActivityToolbarProps {
  readonly search: string;
  readonly quickFilter: ActivityQuickFilter;
  readonly category: ActivityCategory | "all";
  readonly date: string;
  readonly hasActiveFilters: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onQuickFilterChange: (value: ActivityQuickFilter) => void;
  readonly onCategoryChange: (value: ActivityCategory | "all") => void;
  readonly onDateChange: (value: string) => void;
  readonly onReset: () => void;
}

export default function PatientActivityToolbar({ search, quickFilter, category, date, hasActiveFilters, onSearchChange, onQuickFilterChange, onCategoryChange, onDateChange, onReset }: PatientActivityToolbarProps) {
  return (
    <ToolbarCard>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_180px_auto] lg:items-center">
        <SearchField id="patientActivitySearch" value={search} placeholder="Cari aktivitas ..." onChange={onSearchChange} />

        <SelectField
          id="patientActivityCategory"
          value={category}
          options={patientActivityCategoryOptions}
          className={FORM_PILL_INPUT_CLASS}
          onChange={onCategoryChange}
        />

        <DatePickerField id="patientActivityDate" value={date} mode="range" popoverAlign="right" className={FORM_PILL_INPUT_CLASS} onChange={onDateChange} />

        {hasActiveFilters && (
          <Button type="button" size="sm" variant="outline" icon={<X size={15} />} onClick={onReset} className="w-full lg:w-auto">
            Reset
          </Button>
        )}
      </div>

      <FilterPills options={quickFilters} activeValue={quickFilter} onChange={onQuickFilterChange} className="mt-4" />
    </ToolbarCard>
  );
}
