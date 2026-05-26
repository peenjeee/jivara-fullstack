import type { ReactNode } from "react";

interface FormFieldProps {
  readonly label: string;
  readonly required?: boolean;
  readonly htmlFor?: string;
  readonly children: ReactNode;
}

export default function FormField({ label, required = false, htmlFor, children }: FormFieldProps) {
  return (
    <label htmlFor={htmlFor} className="block min-w-0">
      <span className="mb-2 block text-sm font-extrabold text-text-main">{label}{required && <span className="text-danger"> *</span>}</span>
      {children}
    </label>
  );
}
