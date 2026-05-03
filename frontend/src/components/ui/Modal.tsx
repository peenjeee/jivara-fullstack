"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface ModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
}

export default function Modal({ isOpen, title, description, children, onClose }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[50000] flex items-start justify-center overflow-x-hidden overflow-y-auto p-4 sm:items-center" data-lenis-prevent>
          <motion.div
            className="absolute inset-0 bg-dark/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />

          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            data-lenis-prevent
            className="relative max-h-[calc(100dvh-2rem)] w-full min-w-0 max-w-[calc(100vw-2rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[32px] bg-white p-6 pb-8 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:max-h-[92vh] sm:max-w-2xl sm:p-8"
            initial={{ opacity: 0, y: 28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="sticky -top-6 z-10 -mx-6 -mt-6 mb-7 flex items-start justify-between gap-5 rounded-t-[32px]  bg-white px-6 pt-6 pb-5 sm:-top-8 sm:-mx-8 sm:-mt-8 sm:px-8 sm:pt-8">
              <div className="min-w-0">
                <h2 id="modal-title" className="font-display text-2xl font-extrabold tracking-[-0.04em] text-text-main sm:text-3xl">
                  {title}
                </h2>
                {description && <p className="mt-2 text-sm leading-6 text-muted">{description}</p>}
              </div>

              <button
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-muted transition-colors hover:text-text-main"
                onClick={onClose}
                aria-label="Tutup modal"
              >
                <X size={20} />
              </button>
            </div>

            {children}
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
