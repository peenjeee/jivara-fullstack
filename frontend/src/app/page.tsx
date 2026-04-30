"use client";

import { useEffect } from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Stats from "@/components/landing/Stats";
// import Marquee from "@/components/landing/Marquee";
import Features from "@/components/landing/Features";
import Workflow from "@/components/landing/Workflow";
import SecurityLevels from "@/components/landing/SecurityLevels";
import Footer from "@/components/landing/Footer";
import { initScrollAnimations } from "@/lib/animations";

export default function HomePage() {
  useEffect(() => {
    const cleanup = initScrollAnimations();
    return cleanup;
  }, []);

  return (
    <div className="relative">
      <Navbar />

      <main id="top" className="relative">
        <Hero />
        {/* <Marquee /> */}
        <Features />
        <Stats />
        <Workflow />
        <SecurityLevels />
      </main>

      <Footer />
    </div>
  );
}
