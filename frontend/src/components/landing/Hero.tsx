"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "motion/react";
import { TypeAnimation } from 'react-type-animation';
import { Download } from "lucide-react";
import Button from "@/components/ui/Button";
import { showConfirm, showToast, showWarning } from "@/lib/swal";

const ModelViewer = dynamic(() => import("@/components/ui/ModelViewer"), {
  ssr: false,
});

export default function Hero() {
  const router = useRouter();
  const [innerHeight, setInnerHeight] = useState(800);
  const [isInstalled, setIsInstalled] = useState(false);
  const [canPromptInstall, setCanPromptInstall] = useState(false);
  const mascotRef = useRef<HTMLDivElement>(null);

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

    const result = await showConfirm("Install Aplikasi Jivara?", "Pasang aplikasi Jivara agar akses dashboard, jadwal obat, dan log aktivitas lebih mudah.", "Install App");

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
      const currentHeight = window.innerHeight;
      setInnerHeight((prev) => (prev !== currentHeight ? currentHeight : prev));
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { scrollY } = useScroll();
  const sectionScale = useTransform(scrollY, [0, innerHeight], [1, 0.92]);
  const sectionOpacity = useTransform(
    scrollY,
    [0, innerHeight * 0.5, innerHeight],
    [1, 0.85, 0]
  );
  const mascotScale = useTransform(scrollY, [0, innerHeight * 0.5], [1, 0.8]);
  const mascotOpacity = useTransform(scrollY, [0, innerHeight * 0.7], [1, 0]);
  const mascotRotate = useTransform(scrollY, [0, innerHeight], [0, -15]);
  const contentY = useTransform(scrollY, [0, innerHeight], ["0%", "20%"]);

  // Mouse-follow orbit: character rotates to face cursor direction.
  const orbitState = useRef({ theta: 20, phi: 75, targetTheta: 20, targetPhi: 75 });

  useEffect(() => {
    let animId: number;

    const lerpOrbit = () => {
      const s = orbitState.current;
      const lerpFactor = 0.08;
      s.theta += (s.targetTheta - s.theta) * lerpFactor;
      s.phi += (s.targetPhi - s.phi) * lerpFactor;

      const mv = mascotRef.current?.querySelector("model-viewer");
      if (mv) {
        mv.setAttribute("camera-orbit", `${s.theta.toFixed(2)}deg ${s.phi.toFixed(2)}deg 105%`);
      }
      animId = requestAnimationFrame(lerpOrbit);
    };

    animId = requestAnimationFrame(lerpOrbit);

    const handleMouseMove = (event: MouseEvent) => {
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      orbitState.current.targetTheta = ((event.clientX - centerX) / centerX) * -50;
      orbitState.current.targetPhi = 75 + ((event.clientY - centerY) / centerY) * -25;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <motion.section
      style={{ scale: sectionScale, opacity: sectionOpacity }}
      className="relative sticky top-0 h-screen overflow-hidden flex flex-col lg:flex-row items-center pt-20 sm:pt-[100px] lg:pt-[140px] px-5 lg:px-[76px] pb-[60px] lg:pb-20 bg-bg isolate text-center lg:text-left gap-10 lg:gap-0 origin-center"
      aria-labelledby="hero-title"
    >
      <motion.div
        ref={mascotRef}
        className="relative lg:absolute lg:top-[20vh] lg:right-[4.5vw] w-[min(280px,70vw)] lg:w-[min(460px,40vw)] h-[min(280px,70vw)] lg:h-[min(580px,60vh)] flex items-center justify-center z-50 mx-auto lg:mx-0 pointer-events-auto"
        aria-label="Maskot Jiva 3D"
        style={{
          scale: mascotScale,
          opacity: mascotOpacity,
          rotate: mascotRotate,
        }}
      >
        <ModelViewer
          src="/models/maskot.glb"
          alt="Jiva - maskot Jivara 3D"
          autoRotate={false}
          cameraControls
          disableZoom
          disablePan
          cameraOrbit="20deg 75deg 105%"
          fieldOfView="30deg"
          shadowIntensity="0"
          exposure="0.6"
          environmentImage=""
          className="w-full h-full"
        />
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
