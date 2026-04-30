"use client";

import { motion } from "motion/react";

export default function SystemDemoVideo() {
  return (
    <motion.div
      className="mx-auto mt-16 max-w-6xl lg:mt-24"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative overflow-hidden rounded-[28px] bg-dark p-2 sm:rounded-[34px] sm:p-3">
        <div className="relative aspect-video overflow-hidden rounded-[22px] bg-slate-950 sm:rounded-[26px]">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            aria-label="Demo penggunaan sistem Jivara"
          >
            <source src="/videos/system-demo.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </motion.div>
  );
}
