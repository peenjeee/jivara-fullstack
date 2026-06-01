"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { m } from "motion/react";
import DashboardPageHeader from "@/components/dashboard/DashboardPageHeader";
import DashboardPageShell from "@/components/dashboard/DashboardPageShell";
import { PatientTable } from "@/components/patients";
import { SummaryCardsSkeleton, TableDataSkeleton } from "@/components/ui/PageSkeletons";
import SummaryCardGrid from "@/components/ui/SummaryCardGrid";
import { getDashboardEntranceMotion, useDashboardEntranceMotion } from "@/hooks/useDashboardEntranceMotion";
import { emptyNurseDashboardData, getNurseDashboardData, type NurseDashboardData } from "@/lib/dashboardApi";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";

let nurseDashboardCache: NurseDashboardData | null = null;

export default function NurseDashboardPage() {
  const { push } = useRouter();
  const { isSplashFinished } = useSplashScreen();
  const shouldAnimate = useDashboardEntranceMotion();
  const [dashboardData, setDashboardData] = useState<NurseDashboardData>(() => nurseDashboardCache ?? emptyNurseDashboardData);
  const [hasLoadedDashboard, setHasLoadedDashboard] = useState(Boolean(nurseDashboardCache));
  const isLoading = !hasLoadedDashboard;

  useEffect(() => {
    let isMounted = true;

    getNurseDashboardData()
      .then((data) => {
        if (!isMounted) return;
        nurseDashboardCache = data;
        setDashboardData(data);
      })
      .catch(() => {
        if (isMounted && !nurseDashboardCache) setDashboardData({ stats: [], patients: [] });
      })
      .finally(() => {
        if (!isMounted) return;
        setHasLoadedDashboard(true);
      });

    const handleScheduleChanged = () => {
      getNurseDashboardData({ forceRefresh: true })
        .then((data) => {
          nurseDashboardCache = data;
          setDashboardData(data);
        })
        .catch(() => {
          setDashboardData({ stats: [], patients: [] });
        });
    };

    window.addEventListener("jivara:schedule-changed", handleScheduleChanged);
    return () => {
      isMounted = false;
      window.removeEventListener("jivara:schedule-changed", handleScheduleChanged);
    };
  }, []);

  if (!isSplashFinished) return null;

  return (
    <DashboardPageShell>
      <DashboardPageHeader id="overview" title="Ringkasan Pasien" />
      {isLoading ? <SummaryCardsSkeleton /> : <SummaryCardGrid stats={dashboardData.stats} />}

      <m.div
        className="mt-6"
        {...getDashboardEntranceMotion(shouldAnimate, 0.4, 24)}
      >
        {isLoading ? <TableDataSkeleton /> : <PatientTable patients={dashboardData.patients} title="Pasien Terbaru" showViewAll actions={["view"]} onAction={(_, patient) => push(`/patients/${encodeURIComponent(patient.id)}`)} />}
      </m.div>
    </DashboardPageShell>
  );
}
