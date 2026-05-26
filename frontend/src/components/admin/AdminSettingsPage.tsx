"use client";

import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { SecuritySettingsForm, SettingsCard } from "@/components/settings";
import { Bell, ShieldCheck, User } from "lucide-react";
import AdminNotificationSettingsForm from "./AdminNotificationSettingsForm";
import AdminProfileSettingsForm from "./AdminProfileSettingsForm";

export default function AdminSettingsPage() {
  return (
    <DashboardPageShell>
      <DashboardPageHeader title="Pengaturan Admin" />
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <SettingsCard title="Profil Admin" icon={<User size={22} />} delay={0.14}>
          <AdminProfileSettingsForm />
        </SettingsCard>

        <SettingsCard title="Keamanan Akun" icon={<ShieldCheck size={22} />} delay={0.2}>
          <SecuritySettingsForm />
        </SettingsCard>

        <SettingsCard title="Notifikasi Sistem" icon={<Bell size={22} />} delay={0.26} className="xl:col-span-2">
          <AdminNotificationSettingsForm />
        </SettingsCard>
      </div>
    </DashboardPageShell>
  );
}
