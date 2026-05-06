import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Log Aktivitas",
  description: "Log aktivitas kesehatan — riwayat minum obat, hasil scan makanan, dan catatan perawatan pasien.",
  robots: { index: false, follow: false },
};

export default function ActivityLogLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
