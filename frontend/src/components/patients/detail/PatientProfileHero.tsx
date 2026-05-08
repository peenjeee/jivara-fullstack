"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { CalendarClock } from "lucide-react";
import DetailItem from "@/components/ui/DetailItem";
import type { PatientRecord } from "@/lib/mocks/patients";
import PatientStatusBadge from "../PatientStatusBadge";

interface PatientProfileHeroProps {
  readonly patient: PatientRecord;
}

export default function PatientProfileHero({ patient }: PatientProfileHeroProps) {
  const scheduleHref = `/schedule?patientName=${encodeURIComponent(patient.name)}`;

  return (
    <motion.section
      className="mt-6 overflow-hidden rounded-[32px] bg-surface p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] sm:p-7"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
    >
      <div>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            {patient.image ? (
              <Image src={patient.image} alt="" width={96} height={96} sizes="(max-width: 640px) 80px, 96px" className="h-20 w-20 shrink-0 rounded-full object-cover sm:h-24 sm:w-24" />
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-primary/10 font-display text-2xl font-extrabold text-primary sm:h-24 sm:w-24 sm:text-3xl">
                {patient.avatar}
              </div>
            )}
            <div className="min-w-0">
              <div className="mb-3 flex flex-wrap items-center gap-3">
                <PatientStatusBadge status={patient.status} />
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-text-main sm:text-4xl">{patient.name}</h1>
            </div>
          </div>

          <Link href={scheduleHref} className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-[13px] font-bold uppercase leading-none tracking-[0.1em] !text-white transition-colors hover:bg-primary-hover">
            <CalendarClock size={16} aria-hidden="true" focusable="false" /> Lihat Jadwal
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <DetailItem label="Umur / Gender" value={`${patient.age} tahun, ${patient.gender}`} />
          <DetailItem label="Telepon" value={patient.phone ?? "Belum tersedia"} />
          <DetailItem label="Email" value={patient.email ?? "Belum tersedia"} />
          <DetailItem label="Alamat" value={patient.address ?? "Belum tersedia"} />
        </div>
      </div>
    </motion.section>
  );
}
