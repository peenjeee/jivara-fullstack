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
    title: "Jivara - Stay on Track, Stay Healthy",
    description: "Pengingat obat, scan makanan AI, dan monitoring perawat dalam satu aplikasi.",
    type: "website"
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  themeColor: "#10b981",
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
