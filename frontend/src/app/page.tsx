import type { Metadata } from "next";
import LandingPageClient from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "Jivara — Stay on Track, Stay Healthy",
  description:
    "Jivara adalah platform kesehatan berbasis AI yang membantu pasien menjaga kepatuhan konsumsi obat, mendeteksi interaksi makanan-obat, serta memberikan analisis gizi dan pengingat cerdas.",
};

export default function HomePage() {
  return <LandingPageClient />;
}
