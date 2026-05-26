"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { AnimatePresence, m, useInView, useScroll, useTransform } from "motion/react";

export default function SystemDemoVideo() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const isInView = useInView(sectionRef, { amount: 0.35 });
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const frameScale = useTransform(scrollYProgress, [0, 0.35, 1], [0.96, 1, 0.98]);
  const frameY = useTransform(scrollYProgress, [0, 1], [32, -24]);
  const videoScale = useTransform(scrollYProgress, [0, 1], [1, 1]);

  const playVideo = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    video.play().catch(() => {
      // Browsers can reject play if visibility changes before playback starts.
    });
  }, []);

  const pauseVideo = () => {
    videoRef.current?.pause();
  };

  const toggleVideo = () => {
    if (isPlaying) {
      pauseVideo();
      return;
    }

    playVideo();
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView) {
      playVideo();
      return;
    }

    video.pause();
  }, [isInView, playVideo]);

  return (
    <m.div
      ref={sectionRef}
      className="mx-auto mt-16 max-w-6xl lg:mt-24"
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <m.div
        className="relative overflow-hidden rounded-[24px] bg-dark p-1 sm:rounded-[28px] sm:p-1.5"
        style={{ y: frameY, scale: frameScale }}
        transition={{ type: "spring", stiffness: 240, damping: 24 }}
      >
        <div className="relative aspect-video overflow-hidden rounded-[20px] bg-slate-950 sm:rounded-[24px]">
          <m.video
            ref={videoRef}
            className="h-full w-full object-cover"
            style={{ scale: videoScale }}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Demo penggunaan sistem Jivara"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
          </m.video>


          <AnimatePresence>
            {!isPlaying && (
              <m.div
                className="absolute inset-0 flex items-center justify-center bg-dark/45 backdrop-blur-[1px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <m.button
                  type="button"
                  className="flex h-20 w-20 items-center justify-center rounded-full border border-white/25 bg-white/20 text-white shadow-[0_18px_50px_rgba(15,23,42,0.25)] backdrop-blur-md transition-colors hover:bg-white/30 sm:h-24 sm:w-24"
                  onClick={playVideo}
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.96 }}
                  aria-label="Putar video demo"
                >
                  <Play className="ml-1 h-9 w-9 fill-current sm:h-11 sm:w-11" />
                </m.button>
              </m.div>
            )}
          </AnimatePresence>

          <m.button
            type="button"
            className="absolute bottom-5 right-5 z-10 flex size-12 items-center justify-center rounded-xl border border-white/15 bg-dark/75 text-white shadow-[0_12px_32px_rgba(15,23,42,0.22)] backdrop-blur-md transition-colors hover:bg-primary"
            onClick={toggleVideo}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.94 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ type: "spring", stiffness: 360, damping: 22, delay: 0.25 }}
            aria-label={isPlaying ? "Jeda video demo" : "Putar video demo"}
          >
            {isPlaying ? <Pause className="size-5 fill-current" /> : <Play className="ml-0.5 size-5 fill-current" />}
          </m.button>
        </div>
      </m.div>
    </m.div>
  );
}
