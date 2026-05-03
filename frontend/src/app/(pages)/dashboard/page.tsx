"use client";

import { motion } from 'motion/react';
import { useAuthStore } from '@/store/auth';
import { DashboardLayout } from '@/components/dashboard';
import DashboardPageHeader from '@/components/dashboard/DashboardPageHeader';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { PatientTable } from '@/components/patients';
import SummaryCardGrid from '@/components/ui/SummaryCardGrid';
import { dashboardStats, recentPatients } from '@/lib/mocks/dashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  if (!user) return null;

  return (
    <DashboardLayout>
      <DashboardPageShell>
        <DashboardPageHeader id="overview" title="Ringkasan Pasien" />
        <SummaryCardGrid stats={dashboardStats} />

        <motion.div
          className="mt-6"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.4 }}
        >
          <PatientTable patients={recentPatients.slice(0, 5)} title="Pasien Terbaru" showViewAll actions={["view"]} />
        </motion.div>
      </DashboardPageShell>
    </DashboardLayout>
  );
}
