"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "motion/react";
import { TypeAnimation } from 'react-type-animation';
import { Download } from "lucide-react";
import Button from "@/components/ui/Button";
import { showConfirm, showToast, showWarning } from "@/lib/swal";

export default function Hero() {
  const router = useRouter();
  const [innerHeight, setInnerHeight] = useState(800);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canPromptInstall, setCanPromptInstall] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const getIsStandalone = () => mediaQuery.matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
    const updateInstallState = () => {
      const standalone = getIsStandalone();
      if (standalone) window.localStorage.setItem("jivara-pwa-installed", "true");
      setIsInstalled(standalone || window.localStorage.getItem("jivara-pwa-installed") === "true");
      setCanPromptInstall(Boolean(window.__jivaraInstallPrompt));
    };
    const handleAppInstalled = () => {
      window.localStorage.setItem("jivara-pwa-installed", "true");
      updateInstallState();
    };

    updateInstallState();
    const installStateTimer = window.setTimeout(() => {
      const hasPrompt = Boolean(window.__jivaraInstallPrompt);
      setCanPromptInstall(hasPrompt);
      if (!hasPrompt && navigator.serviceWorker?.controller) setIsInstalled(true);
    }, 1200);
    mediaQuery.addEventListener("change", updateInstallState);
    window.addEventListener("beforeinstallprompt", updateInstallState);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.clearTimeout(installStateTimer);
      mediaQuery.removeEventListener("change", updateInstallState);
      window.removeEventListener("beforeinstallprompt", updateInstallState);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

    if (isStandalone) {
      router.push("/dashboard");
      return;
    }

    if (isInstalled && !canPromptInstall) {
      showWarning("Aplikasi Jivara sudah terpasang. Buka aplikasi dari homescreen, launcher, atau daftar aplikasi browser.", "Buka App");
      return;
    }

    const installPrompt = window.__jivaraInstallPrompt;

    if (!installPrompt) {
      showWarning("Untuk memasang aplikasi Jivara, buka menu browser lalu pilih Install App atau Add to Home Screen. Di iOS, gunakan Share lalu Add to Home Screen.", "Install App");
      return;
    }

    const result = await showConfirm("Install aplikasi Jivara?", "Pasang Aplikasi Jivara agar akses dashboard, jadwal obat, dan log aktivitas lebih mudah.", "Install App");

    if (!result.isConfirmed) return;

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    window.__jivaraInstallPrompt = null;

    if (choice.outcome === "accepted") {
      showToast("Jivara sedang dipasang.", "success");
    }
  };

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
        className="relative lg:absolute lg:top-[20vh] lg:right-[4.5vw] w-[min(280px,70vw)] lg:w-[min(460px,40vw)] h-auto lg:h-[min(580px,60vh)] flex items-center justify-center z-50 mx-auto lg:mx-0 pointer-events-none lg:pointer-events-auto"
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
            className="w-full h-auto drop-shadow-2xl"
          />
        </motion.div>
      </motion.div>

      <motion.div
        className="relative z-[5] w-full lg:w-[min(900px,100%)] flex flex-col items-center lg:items-start"
        style={{
          y: contentY,
        }}
      >
        <h1 id="hero-title" className="font-display text-[clamp(28px,8vw,44px)] lg:text-[clamp(40px,6.4vw,76px)] font-extrabold leading-[1.1] lg:leading-[1.05] tracking-[-0.02em]">
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
            Stay on Track, Stay
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
              className="block min-h-[1.05em] text-primary"
            />
          </motion.span>
        </h1>
        <motion.p
          className="w-full max-w-[450px] lg:max-w-[560px] mt-4 lg:mt-7 text-muted text-base lg:text-[18px] font-normal leading-relaxed lg:leading-[1.6]"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.5 }}
        >
          <strong className="text-primary font-extrabold">Jivara</strong> membantu pasien patuh minum obat dan mendeteksi interaksi berbahaya dengan makanan menggunakan teknologi <i className="text-dark font-extrabold not-italic">Computer Vision</i>
        </motion.p>

        <motion.div
          className="mt-7 flex justify-center lg:justify-start"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.62 }}
        >
          <Button type="button" size="sm" icon={<Download size={16} />} onClick={handleInstallClick}>
            {isInstalled && !canPromptInstall ? "Buka App" : "Install App"}
          </Button>
        </motion.div>

      </motion.div>
    </motion.section>
  );
}
