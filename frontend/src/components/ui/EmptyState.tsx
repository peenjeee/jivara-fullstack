import type { ReactNode } from "react";

interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}

export default function EmptyState({ title, description, action, className = "" }: EmptyStateProps) {
  return (
    <section className={`rounded-3xl bg-white p-8 text-center shadow-[0_10px_30px_rgba(15,23,42,0.08)] ${className}`}>
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h2>
      {description && <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
