"use client";

import Image from "next/image";
import { motion } from "motion/react";

export default function PwaTopLogoBar() {
  return (
    <motion.header
      className="fixed inset-x-0 top-0 z-[30000] h-[calc(76px+env(safe-area-inset-top))] bg-white/95 px-4 pt-[env(safe-area-inset-top)] shadow-[0_8px_26px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden"
      initial={{ opacity: 0, y: -18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex h-[76px] items-center justify-center">
        <Image src="/images/logo/notext.png" alt="Jivara" width={132} height={42} priority className="h-auto w-[118px]" />
      </div>
    </motion.header>
  );
}
