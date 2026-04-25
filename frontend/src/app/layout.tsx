import type { Metadata } from "next";
import { Syne, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/globals.css";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-syne"
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter"
});

export const metadata: Metadata = {
  title: "Jivara | Stay on Track, Stay Healthy",
  description:
    "Platform kesehatan berbasis AI untuk pengingat obat, deteksi interaksi makanan-obat, dan pemantauan pasien jarak jauh.",
  keywords: ["jivara", "medication reminder", "food safety", "AI healthcare", "patient monitoring"],
  openGraph: {
    title: "Jivara — AI Health Companion",
    description: "Pengingat obat, scan makanan AI, dan monitoring perawat dalam satu aplikasi.",
    type: "website"
  },
  icons: {
    icon: "/favicon.ico",
  }
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="id" className={`${syne.variable} ${inter.variable}`}>
      <body className="font-body">
        {children}
      </body>
    </html>
  );
}
