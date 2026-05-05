"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { LogIn } from "lucide-react";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import LandingBottomNav from "@/components/landing/LandingBottomNav";
import Marquee from "@/components/ui/Marquee";
import PwaTopLogoBar from "@/components/ui/PwaTopLogoBar";
import { useIsStandalonePwa } from "@/hooks";

export default function TeamPage() {
  const isStandalonePwa = useIsStandalonePwa();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      {isStandalonePwa && (
        <PwaTopLogoBar
          rightAction={(
            <Link href="/login" className="group inline-flex h-10 items-center gap-2 rounded-full px-3 py-2 text-[13px] font-extrabold uppercase tracking-[0.1em] text-text-main transition-colors hover:!text-primary">
              Masuk <LogIn size={19} className="transition-colors group-hover:!text-primary" aria-hidden="true" focusable="false" />
            </Link>
          )}
        />
      )}

      <main className={`overflow-hidden pt-28 lg:pt-34 ${isStandalonePwa ? "pt-[calc(96px+env(safe-area-inset-top))] pb-28 lg:pt-34 lg:pb-0" : ""}`}>
        <section className="relative mx-auto flex w-full max-w-[1440px] flex-col items-center px-5 pb-0 pt-10 text-center sm:px-8 sm:pt-12 lg:px-[84px] lg:pt-0">
          <motion.div
            className="relative z-20 mx-auto max-w-4xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          >
            <h1 className="font-display text-[clamp(32px,8vw,64px)] font-extrabold leading-[1.02] tracking-[-0.06em] text-text-main">
              Meet the Team Behind Jivara
            </h1>
            <p className="mx-auto mt-5 max-w-3xl text-sm font-semibold leading-7 text-muted sm:text-base lg:text-lg">
              A care-focused team building safer medication routines, smarter food interaction checks, and calmer patient monitoring.
            </p>
          </motion.div>

          <div className="relative mt-10 flex min-h-[330px] w-full items-end justify-center sm:mt-14 sm:min-h-[470px] lg:mt-18 lg:min-h-[620px]">
            <div className="pointer-events-none absolute inset-x-0 top-6 z-0 overflow-hidden text-center sm:top-4 lg:top-0" aria-hidden="true">
              <motion.p
                className="whitespace-nowrap text-center font-display text-[clamp(92px,22vw,300px)] font-extrabold leading-none tracking-[-0.035em] text-text-main/[0.08]"
                initial={{ opacity: 0, scale: 0.92, y: 24 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1], delay: 0.18 }}
              >
                JIVARA
              </motion.p>
            </div>

            <motion.div
              className="relative z-20 w-full translate-y-2 sm:translate-y-6 lg:translate-y-8"
              initial={{ opacity: 0, y: 52, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.28 }}
            >
              <div className="relative left-1/2 w-[112vw] -translate-x-1/2 -translate-y-32 sm:w-[108vw] sm:-translate-y-34 lg:w-[104vw] lg:-translate-y-28">
                <Image
                  src="/images/team/team.png"
                  alt="Jivara team"
                  width={960}
                  height={242}
                  priority
                  sizes="(max-width: 640px) 112vw, (max-width: 1024px) 108vw, 104vw"
                  className="h-auto w-full max-w-none object-cover"
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[6%] " aria-hidden="true" />
              </div>
            </motion.div>
          </div>
          <Marquee className="-mt-32 sm:-mt-34 lg:-mt-28" />
        </section>
      </main>

      <Footer className={`lg:mt-25  ${isStandalonePwa ? "pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-16" : ""}`} />
      {isStandalonePwa && <LandingBottomNav />}
      </div>
  );
}
