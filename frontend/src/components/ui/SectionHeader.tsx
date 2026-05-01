import React from "react";

interface SectionHeaderProps {
  id?: string;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  description?: string;
  className?: string;
  light?: boolean;
}

export default function SectionHeader({
  id,
  title,
  subtitle,
  description,
  className = "",
  light = false,
}: SectionHeaderProps) {
  const titleColor = light ? "text-white" : "text-text-main";
  const subtitleColor = light ? "text-white/60" : "text-(--primary)";
  const descColor = light ? "text-white/80" : "text-(--text-main)";

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 lg:gap-20 items-start mb-10 lg:mb-20 ${className}`}>
      <h2 id={id} className={`font-display text-[clamp(34px,10vw,44px)] lg:text-[72px] font-extrabold leading-[0.9] ${titleColor}`}>
        {typeof title === "string" ? (
          <span className="block">{title}</span>
        ) : title}
        {subtitle && (
          <span className={`block ${subtitleColor}`}>
            {subtitle}
          </span>
        )}
      </h2>
      {description && (
        <p className={`max-w-full lg:max-w-[500px] text-sm leading-relaxed lg:leading-[1.7] ${descColor}`}>
          {description}
        </p>
      )}
    </div>
  );
}
