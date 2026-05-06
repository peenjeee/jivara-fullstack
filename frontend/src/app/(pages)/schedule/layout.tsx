import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Jadwal Obat",
  description: "Kelola jadwal pengingat obat pasien — atur waktu minum obat, dosis, dan frekuensi secara digital.",
  robots: { index: false, follow: false },
};

export default function ScheduleLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
