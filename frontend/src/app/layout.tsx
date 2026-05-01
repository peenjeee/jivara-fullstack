import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import type { ReactNode } from "react";
import "@/styles/globals.css";
import ScrollProvider from "@/providers/ScrollProvider";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-archivo",
  weight: ["300", "400", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});
 
export const viewport: Viewport = {
  themeColor: "#147245",
};

export const metadata: Metadata = {
  title: "Jivara",
  description:
    "Platform kesehatan berbasis AI untuk pengingat obat, deteksi interaksi makanan-obat, dan pemantauan pasien jarak jauh.",
  keywords: ["jivara", "pengingat obat", "keamanan makanan", "kesehatan AI", "monitoring pasien", "interaksi obat makanan"],
  openGraph: {
    title: "Stay on track, stay healthy",
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
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="id" className={`${archivo.variable} ${inter.variable} relative`}>
      <body className="font-body relative overflow-x-hidden">
        <ScrollProvider>
          {children}
        </ScrollProvider>
      </body>
    </html>
  );
}
