import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Data Pasien",
  description: "Kelola dan pantau data pasien — lihat riwayat obat, status kesehatan, dan catatan perawatan.",
  robots: { index: false, follow: false },
};

export default function PatientsLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
