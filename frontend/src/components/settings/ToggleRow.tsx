"use client";

import { motion } from "motion/react";

interface ToggleRowProps {
  readonly title: string;
  readonly description: string;
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
}

export default function ToggleRow({ title, description, checked, onChange }: ToggleRowProps) {
  return (
    <motion.label
      className="flex cursor-pointer items-center justify-between gap-5 rounded-3xl bg-surface p-5"
      whileHover={{ y: -2, backgroundColor: "rgba(20, 114, 69, 0.06)" }}
      whileTap={{ scale: 0.99 }}
      transition={{ type: "spring", stiffness: 360, damping: 24 }}
    >
      <span>
        <span className="block font-extrabold text-text-main">{title}</span>
        <span className="mt-1 block text-sm leading-6 text-muted">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 shrink-0 accent-primary"
      />
    </motion.label>
  );
}
