"use client";

import { Bell, ShieldCheck, User } from "lucide-react";
import { DashboardLayout } from "@/components/dashboard";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
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
      <DashboardPageShell>
        <DashboardPageHeader title="Pengaturan" delay={0.08} />

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
      </DashboardPageShell>
    </DashboardLayout>
  );
}
