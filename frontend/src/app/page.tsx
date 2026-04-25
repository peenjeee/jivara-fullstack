"use client";

import { useEffect } from "react";
import Navbar from "@/app/components/landing/Navbar";
import Hero from "@/app/components/landing/Hero";
// import Marquee from "@/app/components/landing/Marquee";
import Features from "@/app/components/landing/Features";
import Workflow from "@/app/components/landing/Workflow";
import SecurityLevels from "@/app/components/landing/SecurityLevels";
import Footer from "@/app/components/landing/Footer";
import { initScrollAnimations } from "@/utils/animations";

export default function HomePage() {
  useEffect(() => {
    const cleanup = initScrollAnimations();
    return cleanup;
  }, []);

  return (
    <>
      <Navbar />

      <main id="top">
        <Hero />
        {/* <Marquee /> */}
        <Features />
        <Workflow />
        <SecurityLevels />
      </main>

      <Footer />
    </>
  );
}