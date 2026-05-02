"use client";

import Section from "@/components/ui/Section";
import Image from "next/image";
import { motion } from "motion/react";

export default function Features() {
  return (
    <Section id="fitur" className="group relative z-10 min-h-[auto] md:min-h-[840px] grid place-items-center overflow-hidden bg-primary text-white text-center" aria-labelledby="about-title">
      <div className="flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.3, opacity: 0, rotate: -15 }}
          whileInView={{ scale: 1, opacity: 1, rotate: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.1,
          }}
          className="mb-[46px] flex h-[176px] w-[176px] items-center justify-center rounded-full bg-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]"
        >
          <Image
            className="h-auto w-[142px]"
            src="/images/logo/text.png"
            alt="Jivara"
            width={180}
            height={58}
            style={{ height: "auto" }}
          />
        </motion.div>
        <p className="pointer-events-none absolute left-0 right-0 top-[180px] z-[1] block whitespace-nowrap text-center font-display text-[clamp(100px,11vw,178px)] font-extrabold leading-none text-white/10 md:top-[304px]" aria-hidden="true">JIVARA</p>
        <div className="relative z-[2] w-[min(850px,calc(100%-48px))]">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.25 }}
          >
            <motion.h2
              className="mx-auto mt-2 mb-[52px] max-w-[820px] font-display text-[28px] md:text-[45px] font-extrabold leading-[1.3] md:leading-[1.12] cursor-default"
              whileHover={{ scale: 1.02, y: -5 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              Mencegah interaksi obat dan makanan dengan <span className="text-(--lime)">cerdas</span> dan <i className="font-(--font-body) italic font-medium leaf text-(--lime)">mudah</i> digunakan.
            </motion.h2>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
          >
            
              Jivara menghubungkan pasien dan perawat dalam satu ekosistem. Dengan pengingat jadwal obat otomatis, deteksi makanan berbasis AI lewat kamera, dan sistem monitoring, kami memastikan setiap dosis aman dikonsumsi.
          </motion.div>
        </div>
      </div>
    </Section>
  );
}
