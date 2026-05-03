"use client";

import { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import LandingBottomNav from "@/components/landing/LandingBottomNav";
import Stats from "@/components/landing/Stats";
import PwaTopLogoBar from "@/components/ui/PwaTopLogoBar";
// import Marquee from "@/components/landing/Marquee";
import Features from "@/components/landing/Features";
import Workflow from "@/components/landing/Workflow";
import SecurityLevels from "@/components/landing/SecurityLevels";
import Footer from "@/components/landing/Footer";
import { useIsStandalonePwa } from "@/hooks";
import { initScrollAnimations } from "@/lib/animations";

export default function HomePage() {
  const isStandalonePwa = useIsStandalonePwa();

  useEffect(() => {
    const cleanup = initScrollAnimations();
    return cleanup;
  }, []);

  return (
    <div className="relative">
      <Navbar />
      {isStandalonePwa && <PwaTopLogoBar />}

      <main id="top" className={`relative ${isStandalonePwa ? "pt-[calc(76px+env(safe-area-inset-top))] pb-28 lg:pt-0 lg:pb-0" : ""}`}>
        <Hero />
        {/* <Marquee /> */}
        <Features />
        <Stats />
        <Workflow />
        <SecurityLevels />
      </main>

      <Footer />
      {isStandalonePwa && <LandingBottomNav />}
    </div>
  );
}
