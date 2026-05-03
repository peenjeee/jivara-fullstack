import type { ReactNode } from "react";

interface ToolbarCardProps {
  readonly children: ReactNode;
  readonly className?: string;
}

export default function ToolbarCard({ children, className = "" }: ToolbarCardProps) {
  return (
    <section className={`rounded-3xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${className}`}>
      {children}
    </section>
  );
}
