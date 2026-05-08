"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { PatientTable } from "@/components/patients";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { fallbackNurseDashboardData, getNurseDashboardData, type NurseDashboardData } from "@/lib/dashboardApi";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";

export default function NurseDashboardPage() {
  const router = useRouter();
  const { isSplashFinished } = useSplashScreen();
  const [dashboardData, setDashboardData] = useState<NurseDashboardData>(fallbackNurseDashboardData);

  useEffect(() => {
    let isMounted = true;

    getNurseDashboardData()
      .then((data) => {
        if (isMounted) setDashboardData(data);
      })
      .catch(() => {
        if (isMounted) setDashboardData(fallbackNurseDashboardData);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isSplashFinished) return null;

  return (
    <DashboardPageShell>
      <DashboardPageHeader id="overview" title="Ringkasan Pasien" />
      <SummaryCardGrid stats={dashboardData.stats} />

      <motion.div
        className="mt-6"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
      >
        <PatientTable
          patients={dashboardData.patients}
          title="Pasien Terbaru"
          showViewAll
          actions={["view"]}
          onAction={(_, patient) => router.push(`/patients/${encodeURIComponent(patient.id)}`)}
        />
      </motion.div>
    </DashboardPageShell>
  );
}
