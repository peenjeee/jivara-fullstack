import type { ReactNode } from "react";

interface FormStickyActionsProps {
  readonly children: ReactNode;
}

export default function FormStickyActions({ children }: FormStickyActionsProps) {
  return (
    <div className="sticky -bottom-8 z-10 -mx-6 -mb-8 mt-6 rounded-b-[32px] bg-white px-6 pt-4 pb-8 sm:-mx-8 sm:px-8">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        {children}
      </div>
    </div>
  );
}
