  "use client";

import Link from "next/link";
import { m } from "motion/react";
import { Mail } from "lucide-react";
import { useState } from "react";

const socialLinks = [
  { label: "Email", href: "https://instagram.com/jivara.health", icon: Mail },
  { label: "Instagram", href: "https://instagram.com/jivara.health", icon: InstagramIcon },
] as const;

const footerLinks = [
  { label: "Team", href: "/team", external: false },
  { label: "API Docs", href: "/docs", external: true },
] as const;

function InstagramIcon({ size = 21 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
      <circle cx="17.5" cy="6.5" r="1.3" fill="currentColor" />
    </svg>
  );
}

export default function Footer({ className = "" }: { readonly className?: string }) {
  const [year] = useState(() => new Date().getFullYear());
  return (
    <footer id="kontak" className={`relative overflow-hidden mt-[70px] pt-16 lg:pt-24 px-5 lg:px-[84px] pb-10 lg:pb-16 rounded-t-[54px] bg-primary text-white border-t border-line ${className}`}>
      <div className="max-w-[1440px] mx-auto">
        <m.h2
          className="relative z-10 mb-12 lg:mb-20 font-display text-[clamp(28px,8vw,48px)] lg:text-[80px] font-extrabold leading-none lg:leading-[0.9] uppercase break-words"
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="block">Mulai</span>
          <span className="block text-white">Sekarang</span>
        </m.h2>

        <m.div
          className="relative z-10 border-t border-white/10 pt-10"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        >
          <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-md">
              <h3 className="font-display text-3xl font-extrabold tracking-[-0.04em] text-white">Jivara</h3>
              <p className="mt-4 text-sm leading-6 text-white/70">
                Monitoring kepatuhan obat dan keamanan interaksi makanan untuk kesehatan yang lebih baik.
              </p>

              <div className="mt-7 flex gap-3">
                {socialLinks.map((link) => {
                  const Icon = link.icon;

                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white hover:!text-primary"
                      aria-label={link.label}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel={link.href.startsWith("http") ? "noreferrer" : undefined}
                    >
                      <Icon size={21} />
                    </Link>
                  );
                })}
              </div>
            </div>

            <nav className="flex flex-wrap gap-4 lg:justify-end" aria-label="Navigasi footer">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="text-xs font-extrabold uppercase tracking-[0.16em] !text-white/70 transition-colors hover:!text-[var(--bg)]"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </m.div>

        <div className="relative mt-20 lg:mt-32">
          <m.strong
            className="block absolute right-0 bottom-full mb-4 lg:mb-6 text-white/[0.08] font-display text-[clamp(48px,12vw,150px)] leading-none text-right"
            initial={{ opacity: 0, x: 80 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.9, ease:   [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            Jivara
          </m.strong>

          <m.div
            className="flex flex-col lg:flex-row justify-between items-center pt-10 border-t border-white/10 text-white/70 text-[11px] font-bold tracking-[0.16em] uppercase gap-6 lg:gap-0 text-center lg:text-left"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
          >
            <span>&copy; {year} Jivara</span>
            <span>Stay on track, stay healthy</span>
          </m.div>
        </div>
      </div>
    </footer>
  );
}

export function SimpleFooter({ className = "" }: { readonly className?: string }) {
  const [year] = useState(() => new Date().getFullYear());
  return (
    <footer className={`bg-primary px-5 py-8 text-white ${className}`}>
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center justify-between gap-4 text-center text-[11px] font-extrabold uppercase tracking-[0.16em] text-white/70 sm:flex-row sm:text-left">
        <span>&copy; {year} Jivara</span>
        <span>Stay on track, stay healthy</span>
      </div>
    </footer>
  );
}
