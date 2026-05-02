import "@/styles/globals.css";
import ScrollProvider from "@/providers/ScrollProvider";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
 
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
    <html lang="id" className="relative" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body relative overflow-x-hidden">
        <ScrollProvider>
          {children}
        </ScrollProvider>
      </body>
    </html>
  );
}
