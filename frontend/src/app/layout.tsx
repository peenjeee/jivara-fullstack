import "@/styles/globals.css";
import AppSplashScreen from "@/components/ui/AppSplashScreen";
import BackToTopButton from "@/components/ui/BackToTopButton";
import PwaPullToRefresh from "@/components/ui/PwaPullToRefresh";
import AuthNavigationProvider from "@/providers/AuthNavigationProvider";
import MotionProvider from "@/providers/MotionProvider";
import PwaInstallPromptProvider from "@/providers/PwaInstallPromptProvider";
import ScrollProvider from "@/providers/ScrollProvider";
import { JSON_LD_SCRIPT, SITE_URL } from "@/config/seo";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import Script from "next/script";
import type { ReactNode } from "react";

const archivo = Archivo({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-archivo",
  weight: ["300", "400", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: true,
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: "#147245",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Jivara - Platform Kesehatan AI: Pengingat Obat & Deteksi Interaksi Makanan",
    template: "%s | Jivara",
  },
  description:
    "Jivara adalah platform kesehatan berbasis AI untuk pengingat obat otomatis, deteksi interaksi makanan-obat menggunakan Computer Vision, dan pemantauan pasien jarak jauh oleh perawat. Gratis, aman, dan mudah digunakan.",
  keywords: [
    "jivara",
    "pengingat obat",
    "reminder obat",
    "deteksi interaksi obat makanan",
    "keamanan makanan obat",
    "kesehatan AI",
    "monitoring pasien",
    "interaksi obat makanan",
    "aplikasi kesehatan",
    "food drug interaction",
    "medication reminder",
    "computer vision kesehatan",
    "perawat monitoring",
    "jadwal obat",
    "scan makanan",
    "platform kesehatan digital",
    "stay on track stay healthy",
  ],
  authors: [{ name: "Tim Jivara" }],
  creator: "Jivara Team",
  publisher: "Jivara",
  category: "Health & Fitness",
  applicationName: "Jivara",
  generator: "Next.js",
  referrer: "strict-origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "Jivara - Stay on Track, Stay Healthy",
    description:
      "Platform kesehatan berbasis AI - pengingat obat otomatis, deteksi interaksi makanan-obat dengan Computer Vision, dan monitoring pasien jarak jauh oleh perawat.",
    url: SITE_URL,
    siteName: "Jivara",
    locale: "id_ID",
    type: "website",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "Jivara - Platform Kesehatan AI untuk Pengingat Obat dan Deteksi Interaksi Makanan",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Jivara - Platform Kesehatan AI",
    description:
      "Pengingat obat otomatis, deteksi interaksi makanan-obat menggunakan AI Computer Vision, dan monitoring pasien oleh perawat.",
    images: ["/images/og-image.png"],
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
  verification: {
    google: "cA4OyhUu359dNPpjiHWaSN2-ELXIsjC1qdBmu-dDsKM",
  },
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="id" className={`${archivo.variable} ${inter.variable} relative`} suppressHydrationWarning>
      <head>
        <Script
          id="jivara-json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
        >
          {JSON_LD_SCRIPT}
        </Script>
      </head>
      <body className="font-body relative overflow-x-hidden">
        <MotionProvider>
          <ScrollProvider>
            <AuthNavigationProvider>
              <PwaInstallPromptProvider>
                {children}
                <AppSplashScreen />
                <PwaPullToRefresh />
                <BackToTopButton />
                <Analytics />
                <SpeedInsights />
              </PwaInstallPromptProvider>
            </AuthNavigationProvider>
          </ScrollProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
