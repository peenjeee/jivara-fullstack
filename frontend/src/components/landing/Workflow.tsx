"use client";

import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import { BellRing, Camera, ClipboardList, HeartPulse } from "lucide-react";
import { motion } from "motion/react";

const steps = [
  {
    number: "01",
    title: "Registrasi",
    description: "Perawat mendaftarkan pasien dan jadwal obat secara terpusat melalui dashboard administratif yang aman.",
    icon: ClipboardList,
  },
  {
    number: "02",
    title: "Pengingat Cerdas",
    description: "Pasien menerima notifikasi pengingat berulang untuk konsumsi obat dan cek interaksi makanan.",
    icon: BellRing,
  },
  {
    number: "03",
    title: "Scan Makanan",
    description: "Kamera mendeteksi jenis makanan dan langsung mencocokkan interaksinya dengan obat pasien.",
    icon: Camera,
  },
  {
    number: "04",
    title: "Monitoring",
    description: "Sistem memberikan alert 'Danger' atau 'Caution' ke perawat jika pasien mencoba mengonsumsi makanan yang berisiko.",
    icon: HeartPulse,
  }
];

export default function Workflow() {
  return (
    <Section id="alur" className="relative z-10 bg-bg pt-8 md:pt-12" aria-labelledby="projects-title">
      <SectionHeader
        id="projects-title"
        title="Alur"
        subtitle="Sistem"
      />
      <motion.div
        className="relative overflow-hidden rounded-[36px] bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10"
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="absolute inset-x-10 top-[118px] hidden border-t-2 border-dotted border-primary/40 lg:block" />

        <div className="grid gap-5 lg:grid-cols-4 lg:gap-6">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <motion.article
                key={step.number}
                className="relative rounded-[28px] bg-surface p-5 lg:bg-transparent lg:p-0"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: Number(step.number) * 0.05 }}
              >
                <div className="flex items-start gap-4 lg:flex-col lg:items-center lg:text-center">
                  <div className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary ring-8 ring-white">
                    <Icon size={26} strokeWidth={2.4} />
                  </div>

                  <div className="lg:mt-6">
                    <h3 className="font-display text-xl font-black tracking-[-0.03em] text-text-main">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {step.description}
                    </p>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </motion.div>
    </Section>
  );
}
