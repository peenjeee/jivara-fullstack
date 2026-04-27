"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";
import { TypeAnimation } from 'react-type-animation';

export default function Hero() {
  const [innerHeight, setInnerHeight] = useState(800);

  useEffect(() => {
    const handleResize = () => {
      // Hanya update jika nilai berubah untuk efisiensi
      const currentHeight = window.innerHeight;
      setInnerHeight((prev) => (prev !== currentHeight ? currentHeight : prev));
    };

    // Jalankan sekali saat mount
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { scrollY } = useScroll();

  // section untuk efek mengecil
  const sectionScale = useTransform(scrollY, [0, innerHeight], [1, 0.75]);
  const sectionOpacity = useTransform(scrollY, [0, innerHeight * 0.8], [1, 0]);

  // Efek paralaks untuk maskot
  const mascotScale = useTransform(scrollY, [0, innerHeight * 0.8], [1, 0.6]);
  const mascotOpacity = useTransform(scrollY, [0, innerHeight * 0.7], [1, 0]);
  const mascotRotate = useTransform(scrollY, [0, innerHeight], [0, -15]);

  const contentY = useTransform(scrollY, [0, innerHeight], ["0%", "20%"]);

  return (
    <motion.section
      style={{ scale: sectionScale, opacity: sectionOpacity }}
      className="relative sticky top-0 h-screen overflow-hidden flex flex-col lg:flex-row items-center pt-20 sm:pt-[100px] lg:pt-[140px] px-5 lg:px-[76px] pb-[60px] lg:pb-20 bg-bg isolate text-center lg:text-left gap-10 lg:gap-0 origin-center"
      aria-labelledby="hero-title"
    >
      <motion.div
        className="relative lg:absolute lg:top-[15vh] lg:right-[2vw] w-[min(280px,70vw)] lg:w-[min(460px,40vw)] h-auto lg:h-[min(580px,60vh)] flex items-center justify-center z-50 mx-auto lg:mx-0 pointer-events-none lg:pointer-events-auto"
        aria-label="Maskot Jiva"
        style={{
          scale: mascotScale,
          opacity: mascotOpacity,
          rotate: mascotRotate,
        }}
      >
        <motion.div
          className="w-full h-auto"
          whileHover={{
            scale: 1.08,
            rotate: 3,
          }}
          transition={{
            type: "spring",
            stiffness: 250,
            damping: 18,
          }}
        >
          <Image
            src="/images/maskot/maskot.png"
            alt="Jiva - maskot Jivara"
            width={420}
            height={420}
            priority
            className="w-full h-auto animate-mascot-float drop-shadow-2xl"
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-[5] w-full lg:w-[min(900px,100%)] flex flex-col items-center lg:items-start"
        style={{
          y: contentY,
        }}
      >
        <h1 id="hero-title" className="font-display text-[clamp(30px,10vw,48px)] lg:text-[clamp(42px,8vw,92px)] font-extrabold leading-[1.1] lg:leading-[1.05] tracking-[-0.02em] uppercase">
          <motion.span
            className="block text-primary"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
          >
            Jivara
          </motion.span>
          <motion.span
            className="block text-dark"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.35 }}
          >
            Stay on Track, Stay{' '}
            <TypeAnimation
              sequence={[
                'Healthy',
                3000,
                '',
                500,
              ]}
              wrapper="span"
              speed={10}
              repeat={Infinity}
              cursor={false}
              className="text-primary inline-block"
            />
          </motion.span>
        </h1>
        <motion.p
          className="w-full max-w-[450px] lg:max-w-[600px] mt-4 lg:mt-7 text-muted text-base lg:text-[19px] font-normal leading-relaxed lg:leading-[1.6]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        >
          <strong className="text-primary font-extrabold">Jivara</strong> membantu pasien patuh minum obat dan mendeteksi interaksi berbahaya dengan makanan menggunakan teknologi <i className="text-dark font-extrabold not-italic">Computer Vision</i>
        </motion.p>
      </motion.div>
    </motion.section>
  );
}
