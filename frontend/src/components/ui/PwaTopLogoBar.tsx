"use client";

import Image from "next/image";
import { m } from "motion/react";
import type { ReactNode } from "react";

interface PwaTopLogoBarProps {
  readonly rightAction?: ReactNode;
}

export default function PwaTopLogoBar({ rightAction }: PwaTopLogoBarProps) {
  return (
    <m.header
      className="fixed inset-x-0 top-0 z-[30000] h-[calc(76px+env(safe-area-inset-top))] bg-white/95 px-4 pt-[env(safe-area-inset-top)] shadow-[0_8px_26px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex h-[76px] items-center justify-between">
        <Image
          src="/images/logo/notext.png"
          alt="Jivara"
          width={132}
          height={42}
          sizes="118px"
          preload
          fetchPriority="high"
          className="h-[42px] w-[118px] object-contain"
        />
        {rightAction && (
          <m.div className="shrink-0" whileHover={{ y: -1 }} whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 420, damping: 18 }}>
            {rightAction}
          </m.div>
        )}
      </div>
    </m.header>
  );
}
