import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Dashboard Jivara — ringkasan jadwal obat, status pasien, dan aktivitas kesehatan terkini.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
