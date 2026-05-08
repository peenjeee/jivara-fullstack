import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Data Perawat",
  description: "Kelola akun perawat, status akses, assignment pasien, dan reassign pasien secara terpusat.",
  robots: { index: false, follow: false },
};

export default function NursesLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
