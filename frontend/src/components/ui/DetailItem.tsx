interface DetailItemProps {
  readonly label: string;
  readonly value: string;
  readonly surface?: "white" | "surface";
}

export default function DetailItem({ label, value, surface = "surface" }: DetailItemProps) {
  const surfaceClass = surface === "white" ? "bg-white" : "bg-surface";

  return (
    <div className={`rounded-2xl p-4 ${surfaceClass}`}>
      <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold leading-6 text-text-main">{value}</p>
    </div>
  );
}
