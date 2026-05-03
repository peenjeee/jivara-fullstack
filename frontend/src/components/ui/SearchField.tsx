"use client";

import { Search } from "lucide-react";

interface SearchFieldProps {
  readonly id: string;
  readonly name?: string;
  readonly value: string;
  readonly placeholder: string;
  readonly className?: string;
  readonly onChange: (value: string) => void;
}

export default function SearchField({ id, name, value, placeholder, className = "", onChange }: SearchFieldProps) {
  return (
    <label className={`flex min-h-12 items-center gap-3 rounded-full bg-surface px-4 text-muted ${className}`}>
      <Search size={18} />
      <input
        id={id}
        name={name ?? id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-transparent text-sm font-semibold text-text-main outline-none placeholder:text-muted"
        placeholder={placeholder}
      />
    </label>
  );
}
