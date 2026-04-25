"use client";

import { useState } from "react";
import Link from "next/link";
import { useScrollThreshold, useLockBodyScroll } from "@/utils/hooks";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isScrolled = useScrollThreshold(20);

  useLockBodyScroll(isMenuOpen);

  const navLinks = [
    { name: "Fitur", href: "/#fitur" },
    { name: "Alur", href: "/#alur" },
    { name: "Keamanan", href: "/#keamanan" },
  ];

  return (
    <>
      <nav
        className={`fixed inset-x-0 top-0 z-[10000] border-b border-line transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] px-4 lg:px-[84px] ${
          isScrolled
            ? "h-[72px] bg-white/85 backdrop-blur-[20px] shadow-[0_4px_30px_var(--line)]"
            : "h-[72px] lg:h-[90px] bg-bg"
        }`}
        aria-label="Primary navigation"
      >
        <div className="max-w-[1440px] mx-auto h-full flex justify-between items-center relative w-full">
          <Link
            className="font-display text-2xl font-extrabold tracking-[-0.02em] text-text-main transition-colors duration-200 hover:text-primary"
            href="/"
            aria-label="Jivara home"
          >
            Jivara
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden lg:flex gap-12 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className="group text-xs font-bold tracking-[0.16em] uppercase text-text-main relative transition-colors duration-200 hover:text-primary"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="hidden lg:inline-flex items-center justify-center py-3 px-7 bg-primary text-white !text-white text-[13px] font-bold tracking-[0.05em] uppercase rounded-full transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-primary/20 border border-white/10 relative overflow-hidden gap-2.5 hover:-translate-y-[3px] hover:shadow-primary/40 hover:brightness-105 active:-translate-y-px active:scale-[0.97] active:shadow-primary/30 group"
            >
              Masuk
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-[3px] text-white"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
            </Link>

            <button
              className={`flex lg:hidden flex-col gap-[5px] w-11 h-11 justify-center items-center z-[40000] rounded-xl border-[1.5px] cursor-pointer transition-all duration-300 shrink-0 ${
                isMenuOpen ? "bg-primary border-primary" : "bg-surface border-line"
              }`}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            >
              <span className={`w-5 h-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${isMenuOpen ? "bg-white translate-y-[7px] rotate-45" : "bg-text-main"}`} />
              <span className={`w-5 h-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${isMenuOpen ? "bg-white opacity-0 translate-x-[10px]" : "bg-text-main"}`} />
              <span className={`w-5 h-0.5 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none ${isMenuOpen ? "bg-white -translate-y-[7px] -rotate-45" : "bg-text-main"}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[35000] transition-[visibility] duration-500 lg:hidden ${isMenuOpen ? "visible pointer-events-auto" : "invisible pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/40 backdrop-blur-[8px] transition-opacity duration-500 ${isMenuOpen ? "opacity-100" : "opacity-0"}`}
          onClick={() => setIsMenuOpen(false)}
        />
        <div className={`absolute top-0 right-0 w-4/5 max-w-[340px] h-full bg-bg pt-8 px-8 pb-10 flex flex-col shadow-[-10px_0_50px_rgba(0,0,0,0.1)] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${isMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center mb-12">
            <span className="font-display text-2xl font-extrabold tracking-[-0.02em] text-text-main">
              Jivara
            </span>
          </div>

          <div className="flex flex-col gap-8">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                onClick={() => setIsMenuOpen(false)} 
                className="group w-fit text-xs font-medium tracking-[0.16em] uppercase text-text-main relative transition-colors duration-200 hover:text-primary"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          <div className="mt-auto">
            <Link
              href="/login"
              className="w-full inline-flex items-center justify-center py-5 px-7 bg-primary text-white !text-white text-base font-bold tracking-[0.05em] uppercase rounded-full transition-all duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] shadow-[0_4px_15px_rgba(16,185,129,0.2)] border border-white/10 gap-2.5 hover:-translate-y-[3px] hover:shadow-[0_12px_30px_rgba(16,185,129,0.4)] hover:brightness-105 active:-translate-y-px active:scale-[0.97] active:shadow-[0_5px_15px_rgba(16,185,129,0.3)] group"
              onClick={() => setIsMenuOpen(false)}
            >
              Masuk
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-[3px] text-white"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /><polyline points="10 17 15 12 10 7" /><line x1="15" y1="12" x2="3" y2="12" /></svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
