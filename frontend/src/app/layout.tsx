import "@/styles/globals.css";
import AppSplashScreen from "@/components/ui/AppSplashScreen";
import BackToTopButton from "@/components/ui/BackToTopButton";
import PwaPullToRefresh from "@/components/ui/PwaPullToRefresh";
import PwaInstallPromptProvider from "@/providers/PwaInstallPromptProvider";
import ScrollProvider from "@/providers/ScrollProvider";
import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import type { ReactNode } from "react";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-archivo",
  weight: ["300", "400", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
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
      { url: "/images/logo/splash.png", sizes: "1080x1080", type: "image/png" },
    ],
    apple: [
      { url: "/images/logo/splash.png", sizes: "1080x1080", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Jivara",
    statusBarStyle: "default",
    startupImage: "/images/logo/splash.png",
  },
  manifest: "/manifest.json",
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="id" className={`${archivo.variable} ${inter.variable} relative`} suppressHydrationWarning>
      <body className="font-body relative overflow-x-hidden">
        <ScrollProvider>
          <PwaInstallPromptProvider>
            {children}
            <AppSplashScreen />
            <PwaPullToRefresh />
            <BackToTopButton />
          </PwaInstallPromptProvider>
        </ScrollProvider>
      </body>
    </html>
  );
}
