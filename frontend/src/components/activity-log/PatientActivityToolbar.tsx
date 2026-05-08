"use client";

import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import FilterPills from "@/components/ui/FilterPills";
import SearchField from "@/components/ui/SearchField";
import SelectField from "@/components/ui/SelectField";
import ToolbarCard from "@/components/ui/ToolbarCard";
import { FORM_PILL_INPUT_CLASS } from "@/components/ui/formStyles";
import { activityCategories, type ActivityCategory } from "@/lib/mocks/activityLogs";
import type { ActivityQuickFilter } from "./ActivityToolbar";

const quickFilters: { readonly label: string; readonly value: ActivityQuickFilter }[] = [
  { label: "Semua", value: "all" },
  { label: "Belum Dibaca", value: "unread" },
  { label: "Kritis", value: "critical" },
  { label: "Peringatan", value: "warning" },
];

interface PatientActivityToolbarProps {
  readonly search: string;
  readonly quickFilter: ActivityQuickFilter;
  readonly category: ActivityCategory | "all";
  readonly hasActiveFilters: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onQuickFilterChange: (value: ActivityQuickFilter) => void;
  readonly onCategoryChange: (value: ActivityCategory | "all") => void;
  readonly onReset: () => void;
}

export default function PatientActivityToolbar({ search, quickFilter, category, hasActiveFilters, onSearchChange, onQuickFilterChange, onCategoryChange, onReset }: PatientActivityToolbarProps) {
  return (
    <ToolbarCard>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-center">
        <SearchField id="patientActivitySearch" value={search} placeholder="Cari aktivitas ..." onChange={onSearchChange} />

        <SelectField
          id="patientActivityCategory"
          value={category}
          options={[{ label: "Semua kategori", value: "all" }, ...activityCategories.filter((currentCategory) => currentCategory !== "Administrasi").map((currentCategory) => ({ label: currentCategory, value: currentCategory }))]}
          className={FORM_PILL_INPUT_CLASS}
          onChange={onCategoryChange}
        />

        {hasActiveFilters && (
          <Button type="button" size="sm" variant="outline" icon={<X size={15} />} onClick={onReset} className="w-full md:w-auto">
            Reset
          </Button>
        )}
      </div>

      <FilterPills options={quickFilters} activeValue={quickFilter} onChange={onQuickFilterChange} className="mt-4" />
    </ToolbarCard>
  );
}
