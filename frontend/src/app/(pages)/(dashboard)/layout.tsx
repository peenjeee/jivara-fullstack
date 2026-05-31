import type { ReactNode } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function ProtectedDashboardLayout({ children }: { readonly children: ReactNode }) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
