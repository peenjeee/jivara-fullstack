"use client";

import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import FilterPills from "@/components/ui/FilterPills";
import SearchField from "@/components/ui/SearchField";
import ToolbarCard from "@/components/ui/ToolbarCard";
import type { PatientStatus } from "@/lib/mocks/patients";

export type ScheduleFilter = "all" | PatientStatus;

const filters: { label: string; value: ScheduleFilter }[] = [
  { label: "Semua Pasien", value: "all" },
  { label: "Need Special Attention", value: "Need Special Attention" },
  { label: "On Ideal Schedule", value: "On Ideal Schedule" },
  { label: "Lagging Behind", value: "Lagging Behind" },
];

interface ScheduleToolbarProps {
  readonly search: string;
  readonly activeFilter: ScheduleFilter;
  readonly hasActiveFilters: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onFilterChange: (value: ScheduleFilter) => void;
  readonly onReset: () => void;
}

export default function ScheduleToolbar({ search, activeFilter, hasActiveFilters, onSearchChange, onFilterChange, onReset }: ScheduleToolbarProps) {
  return (
    <ToolbarCard>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <SearchField id="scheduleSearch" value={search} placeholder="Cari nama pasien ..." onChange={onSearchChange} />
        {hasActiveFilters && (
          <Button type="button" size="sm" variant="outline" icon={<X size={15} />} onClick={onReset} className="w-full lg:w-auto">
            Reset
          </Button>
        )}
      </div>

      <FilterPills options={filters} activeValue={activeFilter} onChange={onFilterChange} className="mt-4" />
    </ToolbarCard>
  );
}
