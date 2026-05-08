"use client";

import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import DatePickerField from "@/components/ui/DatePickerField";
import FilterPills from "@/components/ui/FilterPills";
import SearchField from "@/components/ui/SearchField";
import SelectField from "@/components/ui/SelectField";
import ToolbarCard from "@/components/ui/ToolbarCard";
import { FORM_PILL_INPUT_CLASS } from "@/components/ui/formStyles";
import { activityCategories, type ActivityCategory } from "@/lib/mocks/activityLogs";
import type { NurseRecord } from "@/lib/mocks/nurses";

export type ActivityQuickFilter = "all" | "unread" | "critical" | "warning";

const quickFilters: { readonly label: string; readonly value: ActivityQuickFilter }[] = [
  { label: "Semua", value: "all" },
  { label: "Belum Dibaca", value: "unread" },
  { label: "Kritis", value: "critical" },
  { label: "Peringatan", value: "warning" },
];

interface ActivityToolbarProps {
  readonly search: string;
  readonly quickFilter: ActivityQuickFilter;
  readonly category: ActivityCategory | "all";
  readonly nurseId?: string;
  readonly nurses?: readonly NurseRecord[];
  readonly date: string;
  readonly hasActiveFilters: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onQuickFilterChange: (value: ActivityQuickFilter) => void;
  readonly onCategoryChange: (value: ActivityCategory | "all") => void;
  readonly onNurseChange?: (value: string) => void;
  readonly onDateChange: (value: string) => void;
  readonly onReset: () => void;
}

export default function ActivityToolbar({ search, quickFilter, category, nurseId = "all", nurses = [], date, hasActiveFilters, onSearchChange, onQuickFilterChange, onCategoryChange, onNurseChange, onDateChange, onReset }: ActivityToolbarProps) {
  return (
    <ToolbarCard>
      <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px_180px_auto] lg:items-center">
        <SearchField id="activitySearch" value={search} placeholder="Cari aktivitas ..." onChange={onSearchChange} />

        <SelectField
          id="activityCategory"
          value={category}
          options={[{ label: "Semua kategori", value: "all" }, ...activityCategories.map((currentCategory) => ({ label: currentCategory, value: currentCategory }))]}
          className={FORM_PILL_INPUT_CLASS}
          onChange={onCategoryChange}
        />

        <SelectField
          id="activityNurse"
          value={nurseId}
          options={[{ label: "Semua perawat", value: "all" }, ...nurses.map((nurse) => ({ label: nurse.fullName, value: nurse.id }))]}
          className={FORM_PILL_INPUT_CLASS}
          onChange={onNurseChange}
        />

        <DatePickerField id="activityDate" value={date} popoverAlign="right" className={FORM_PILL_INPUT_CLASS} onChange={onDateChange} />

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
