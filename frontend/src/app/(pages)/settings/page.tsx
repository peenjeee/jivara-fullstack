"use client";

import { motion } from "motion/react";
import { Bell, ShieldCheck, User } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import {
  NotificationSettingsForm,
  ProfileSettingsForm,
  SecuritySettingsForm,
  SettingsCard,
} from "@/components/settings";
import { useAuthStore } from "@/store/auth";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  if (!user) return null;

  return (
    <DashboardLayout>
      <motion.main
        className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:ml-[280px] lg:w-[calc(100%-280px)] lg:max-w-none lg:px-10 lg:py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
        >
          <h1 className="mt-2 font-display text-3xl font-extrabold tracking-[-0.04em] text-text-main sm:text-4xl">
            Pengaturan
          </h1>
        </motion.section>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <SettingsCard title="Profil" icon={<User size={22} />} delay={0.14}>
            <ProfileSettingsForm />
          </SettingsCard>

          <SettingsCard title="Keamanan" icon={<ShieldCheck size={22} />} delay={0.2}>
            <SecuritySettingsForm />
          </SettingsCard>
        </div>

        <SettingsCard className="mt-5" title="Notifikasi" icon={<Bell size={22} />} delay={0.26}>
          <NotificationSettingsForm />
        </SettingsCard>
      </motion.main>
    </DashboardLayout>
  );
}
