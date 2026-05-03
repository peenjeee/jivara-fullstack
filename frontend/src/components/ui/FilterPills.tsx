interface FilterPillOption<TValue extends string> {
  readonly label: string;
  readonly value: TValue;
}

interface FilterPillsProps<TValue extends string> {
  readonly options: readonly FilterPillOption<TValue>[];
  readonly activeValue: TValue;
  readonly onChange: (value: TValue) => void;
  readonly className?: string;
}

export default function FilterPills<TValue extends string>({ options, activeValue, onChange, className = "" }: FilterPillsProps<TValue>) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {options.map((option) => {
        const isActive = activeValue === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              isActive ? "bg-primary text-white" : "bg-surface text-muted hover:bg-line/60 hover:text-text-main"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
