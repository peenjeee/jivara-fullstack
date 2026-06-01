import { Loader2 } from "lucide-react";

interface RefreshingNoticeProps {
  readonly active: boolean;
  readonly label?: string;
}

export default function RefreshingNotice({ active, label = "Memperbarui hasil..." }: RefreshingNoticeProps) {
  if (!active) return null;

  return (
    <output className="pointer-events-none absolute right-4 top-4 z-10 inline-flex items-center gap-2 rounded-full border border-line bg-white/95 px-3 py-2 text-xs font-extrabold text-primary shadow-[0_8px_24px_rgba(15,23,42,0.12)]" aria-live="polite">
      <Loader2 className="size-4 animate-spin" aria-hidden="true" focusable="false" />
      <span>{label}</span>
    </output>
  );
}
