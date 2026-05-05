"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import DashboardNotificationAlerts from "@/components/dashboard/DashboardNotificationAlerts";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { PatientTable } from "@/components/patients";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { dashboardStats, recentPatients } from "@/lib/mocks/dashboard";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";

export default function NurseDashboardPage() {
  const router = useRouter();
  const { isSplashFinished } = useSplashScreen();

  if (!isSplashFinished) return null;

  return (
    <DashboardPageShell>
      <DashboardPageHeader id="overview" title="Ringkasan Pasien" />
      <SummaryCardGrid stats={dashboardStats} />
      <DashboardNotificationAlerts />

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      >
        <PatientTable
          patients={recentPatients.slice(0, 5)}
          title="Pasien Terbaru"
          showViewAll
          actions={["view"]}
          onAction={(_, patient) => router.push(`/patients/${encodeURIComponent(patient.id)}`)}
        />
      </motion.div>
    </DashboardPageShell>
  );
}
