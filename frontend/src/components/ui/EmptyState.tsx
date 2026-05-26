import type { ReactNode } from "react";

interface EmptyStateProps {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
  readonly className?: string;
}

export default function EmptyState({ title, description, action, className = "" }: EmptyStateProps) {
  return (
    <section className={`flex flex-col items-center rounded-3xl p-8 text-center ${className}`}>
      <h2 className="font-display text-1xl font-extrabold tracking-[-0.04em] text-text-main">{title}</h2>
      {description && <p className="mx-auto mt-2 w-full max-w-md text-center text-sm font-semibold leading-6 text-muted" style={{ textAlign: "center" }}>{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
