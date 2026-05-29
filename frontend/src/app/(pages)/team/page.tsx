import type { Metadata } from "next";
import TeamPageClient from "@/components/landing/TeamPageClient";

export const metadata: Metadata = {
  title: "Tim Jivara",
  description:
    "Mengenal tim di balik Jivara — platform kesehatan berbasis AI untuk kepatuhan obat, deteksi interaksi makanan, dan pemantauan pasien jarak jauh.",
};

export default function TeamPage() {
  return <TeamPageClient />;
}
