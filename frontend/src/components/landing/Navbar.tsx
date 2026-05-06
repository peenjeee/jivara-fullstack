"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useIsStandalonePwa, useScrollThreshold, useLockBodyScroll } from "@/hooks";
import Button from "@/components/ui/Button";
import Image from "next/image";

const NAV_LINKS = [
  { name: "Fitur", href: "/#fitur" },
  { name: "Tentang", href: "/#tentang" },
  { name: "Alur", href: "/#alur" },
  { name: "Keamanan", href: "/#keamanan" },
  { name: "Kontak", href: "/#kontak" },
] as const;

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isStandalonePwa = useIsStandalonePwa();
  const isScrolled = useScrollThreshold(20);

  useLockBodyScroll(isMenuOpen);

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-[10000] transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] px-4 lg:px-[84px] ${isStandalonePwa ? "hidden lg:block" : ""} ${isScrolled
          ? "h-[72px] bg-white/85 backdrop-blur-[20px] shadow-[0_8px_26px_rgba(15,23,42,0.06)]"
          : "h-[72px] lg:h-[90px] bg-bg"
          }`}
        aria-label="Navigasi utama"
      >
        <div className="max-w-[1440px] mx-auto h-full flex justify-between items-center relative w-full">
          <Link
            className="font-display text-2xl font-extrabold tracking-[-0.02em] text-text-main"
            href="/"
            aria-label="Jivara home"
          >
            <Image
              src="/images/logo/notext.png"
              alt="Jiva - maskot Jivara"
              width={100}
              height={100}
              sizes="100px"
              className="w-full h-auto drop-shadow-2xl"
            />
          </Link>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-8 xl:gap-10">
              {NAV_LINKS.map((link) => (
                <motion.div
                  key={link.name}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Link
                    href={link.href}
                    className="group text-xs font-bold tracking-[0.16em] uppercase text-text-main relative transition-colors duration-200 hover:text-primary"
                  >
                    {link.name}
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                  </Link>
                </motion.div>
              ))}
            </div>

            <Link href="/login" className="hidden lg:block">
              <Button size="sm" icon={<LogIn size={16} strokeWidth={2.5} />}>
                Masuk
              </Button>
            </Link>

            <button
              className={`flex lg:hidden flex-col gap-[5px] w-11 h-11 justify-center items-center z-[40000] rounded-xl cursor-pointer transition-all duration-300 shrink-0`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Tutup menu" : "Buka menu"}
            >
              <span
                className={`w-5 h-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${isMenuOpen ? "bg-white translate-y-[7px] rotate-45" : "bg-text-main"}`}
              />
              <span
                className={`w-5 h-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${isMenuOpen ? "bg-white opacity-0 translate-x-[10px]" : "bg-text-main"}`}
              />
              <span
                className={`w-5 h-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${isMenuOpen ? "bg-white -translate-y-[7px] -rotate-45" : "bg-text-main"}`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer with AnimatePresence */}
      <AnimatePresence>
        {isMenuOpen && !isStandalonePwa && (
          <div className="fixed inset-0 z-[35000] lg:hidden">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40 backdrop-blur-[8px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              onClick={() => setIsMenuOpen(false)}
            />

            {/* Drawer Panel */}
            <motion.div
              className="absolute top-0 right-0 w-4/5 max-w-[340px] h-full bg-bg pt-5 px-8 pb-10 flex flex-col shadow-[-10px_0_50px_rgba(0,0,0,0.1)]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 30,
              }}
            >
              <div className="flex items-center mb-4">
                <Image
                  src="/images/logo/notext.png"
                  alt="Jivara"
                  width={132}
                  height={42}
                  sizes="118px"
                  className="h-auto w-[118px]"
                />
              </div>

              <div className="flex flex-col gap-7">
                {NAV_LINKS.map((link, i) => (
                  <motion.div
                    key={link.name}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: 0.1 + i * 0.08,
                      type: "spring",
                      stiffness: 300,
                      damping: 25,
                    }}
                  >
                    <motion.div
                      whileHover={{ x: 8, scale: 1.05 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="group w-fit text-xs font-medium tracking-[0.16em] uppercase text-text-main relative transition-colors duration-200 hover:text-primary"
                      >
                        {link.name}
                        <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
                      </Link>
                    </motion.div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                className="mt-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, type: "spring", stiffness: 300, damping: 25 }}
              >
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full" size="lg" icon={<LogIn size={18} />}>
                    Masuk
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
