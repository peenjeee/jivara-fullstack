import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SITE_URL } from "@/config/seo";

export const metadata: Metadata = {
  title: "Tim Jivara - Pengembang di Balik Platform Kesehatan AI",
  description:
    "Kenali tim di balik Jivara - pengembang, desainer, dan profesional kesehatan yang membangun platform pengingat obat dan deteksi interaksi makanan-obat berbasis AI.",
  alternates: {
    canonical: `${SITE_URL}/team`,
  },
  openGraph: {
    title: "Tim Jivara - Meet the Team",
    description:
      "Tim yang membangun platform kesehatan AI Jivara - pengingat obat, deteksi interaksi makanan-obat, dan monitoring pasien jarak jauh.",
    url: `${SITE_URL}/team`,
    images: [
      {
        url: "/images/team/team.png",
        width: 960,
        height: 242,
        alt: "Tim Jivara",
      },
    ],
  },
};

export default function TeamLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
