"use client";

import { motion } from "motion/react";

interface SecurityCardProps {
  title: string;
  description: string;
  color: string;
}

export default function SecurityCard({
  title,
  description,
  color,
}: SecurityCardProps) {
  return (
    <motion.article
      className="pt-7 border-t border-line cursor-default"
      whileHover={{
        y: -6,
        x: 4,
        scale: 1.03,
      }}
      transition={{
        type: "spring",
        stiffness: 350,
        damping: 22,
      }}
    >
      <h3
        className={`font-display text-xl font-black tracking-[-0.03em] ${color}`}
      >
        {title}
      </h3>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
    </motion.article>
  );
}
