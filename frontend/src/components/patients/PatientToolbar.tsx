"use client";

import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import FilterPills from "@/components/ui/FilterPills";
import SearchField from "@/components/ui/SearchField";
import ToolbarCard from "@/components/ui/ToolbarCard";
import type { PatientStatus } from "@/lib/mocks/patients";

export type PatientFilter = "all" | PatientStatus;

const filters: { label: string; value: PatientFilter }[] = [
  { label: "Semua Pasien", value: "all" },
  { label: "Need Special Attention", value: "Need Special Attention" },
  { label: "On Ideal Schedule", value: "On Ideal Schedule" },
  { label: "Lagging Behind", value: "Lagging Behind" },
  { label: "Complete", value: "Complete" },
  { label: "Nonaktif", value: "Nonaktif" },
];

interface PatientToolbarProps {
  readonly search: string;
  readonly activeFilter: PatientFilter;
  readonly hasActiveFilters: boolean;
  readonly onSearchChange: (value: string) => void;
  readonly onFilterChange: (value: PatientFilter) => void;
  readonly onReset: () => void;
  readonly framed?: boolean;
}

export default function PatientToolbar({ search, activeFilter, hasActiveFilters, onSearchChange, onFilterChange, onReset, framed = true }: PatientToolbarProps) {
  const content = (
    <>
      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
        <SearchField id="patientSearch" value={search} placeholder="Cari nama pasien ..." onChange={onSearchChange} />
        {hasActiveFilters && (
          <Button type="button" size="sm" variant="outline" icon={<X size={15} />} onClick={onReset} className="w-full lg:w-auto">
            Reset
          </Button>
        )}
      </div>

      <FilterPills options={filters} activeValue={activeFilter} onChange={onFilterChange} className="mt-4" />
    </>
  );

  return framed ? (
    <ToolbarCard>
      {content}
    </ToolbarCard>
  ) : (
    <div className="relative z-10">
      {content}
    </div>
  );
}
