"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  variant?: "primary" | "outline";
  size?: "sm" | "md" | "lg";
}

export default function Button({
  children,
  className = "",
  icon,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-bold tracking-[0.1em] uppercase leading-none rounded-full transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] relative overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed group";

  const sizeStyles = {
    sm: "py-3 px-7 text-[13px] gap-2.5",
    md: "py-4 px-9 text-[13px] gap-2.5",
    lg: "py-5 px-10 text-base gap-3",
  };

  const variantStyles = {
    primary:
      "bg-primary text-white border border-white/10 hover:-translate-y-[3px] hover:brightness-105 active:-translate-y-px active:scale-[0.97]",
    outline:
      "bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white hover:-translate-y-[3px] active:-translate-y-px active:scale-[0.97]",
  };

  return (
    <button
      {...props}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}

      {icon && (
        <span className="relative z-10 transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-[3px] flex items-center justify-center">
          {icon}
        </span>
      )}
    </button>
  );
}
