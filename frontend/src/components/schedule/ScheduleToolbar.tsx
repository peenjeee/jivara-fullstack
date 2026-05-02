"use client";

import { Search } from "lucide-react";
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
  readonly onSearchChange: (value: string) => void;
  readonly onFilterChange: (value: ScheduleFilter) => void;
}

export default function ScheduleToolbar({ search, activeFilter, onSearchChange, onFilterChange }: ScheduleToolbarProps) {
  return (
    <section className="rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)]">
      <div className="grid gap-4 lg:items-center">
        <label className="flex min-h-12 items-center gap-3 rounded-full bg-surface px-4 text-muted">
          <Search size={18} />
          <input
            id="scheduleSearch"
            name="scheduleSearch"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full bg-transparent text-sm font-semibold text-text-main outline-none placeholder:text-muted"
            placeholder="Cari nama pasien ..."
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((filter) => {
          const isActive = activeFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onFilterChange(filter.value)}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                isActive ? "bg-primary text-white" : "bg-surface text-muted hover:bg-line/60 hover:text-text-main"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
