import type { ReactNode } from "react";

interface BadgeProps {
  readonly children: ReactNode;
  readonly toneClass: string;
  readonly size?: "sm" | "md";
  readonly centered?: boolean;
  readonly minWidth?: boolean;
  readonly className?: string;
}

const sizeClasses = {
  sm: "px-3 py-1 text-xs",
  md: "px-3 py-1.5 text-xs",
} as const;

export default function Badge({ children, toneClass, size = "sm", centered = false, minWidth = false, className = "" }: BadgeProps) {
  return (
    <span className={`inline-flex rounded-full font-extrabold leading-tight ${sizeClasses[size]} ${centered ? "justify-center text-center" : "items-center"} ${minWidth ? "min-w-[140px]" : ""} ${toneClass} ${className}`}>
      {children}
    </span>
  );
}
