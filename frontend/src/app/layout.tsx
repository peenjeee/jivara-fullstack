import "@/styles/globals.css";
import AppSplashScreen from "@/components/ui/AppSplashScreen";
import BackToTopButton from "@/components/ui/BackToTopButton";
import PwaPullToRefresh from "@/components/ui/PwaPullToRefresh";
import PwaInstallPromptProvider from "@/providers/PwaInstallPromptProvider";
import ScrollProvider from "@/providers/ScrollProvider";
import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { headers } from "next/headers";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

const BASE_URL = "https://www.jivara.web.id";

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
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
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
    canonical: BASE_URL,
  },
  openGraph: {
    title: "Jivara - Stay on Track, Stay Healthy",
    description:
      "Platform kesehatan berbasis AI - pengingat obat otomatis, deteksi interaksi makanan-obat dengan Computer Vision, dan monitoring pasien jarak jauh oleh perawat.",
    url: BASE_URL,
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
// JSON-LD Structured Data - menggunakan tipe yang didukung Google Rich Results
const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [
    // 1. WebSite - untuk Sitelinks Search Box di Google
    {
      "@type": "WebSite",
      "@id": `${BASE_URL}/`,
      name: "Jivara",
      alternateName: "Jivara Health Platform",
      url: BASE_URL,
      description:
        "Platform kesehatan berbasis AI untuk pengingat obat otomatis, deteksi interaksi makanan-obat, dan pemantauan pasien jarak jauh.",
      inLanguage: "id",
      publisher: { "@id": `${BASE_URL}/team` },
    },
    // 2. Organization - untuk Knowledge Panel Google
    {
      "@type": "Organization",
      "@id": `${BASE_URL}/team`,
      name: "Jivara",
      url: BASE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${BASE_URL}/images/logo/splash.png`,
        width: 1080,
        height: 1080,
      },
      description:
        "Tim pengembang platform kesehatan AI Jivara - pengingat obat, deteksi interaksi makanan-obat, dan monitoring pasien.",
      contactPoint: {
        "@type": "ContactPoint",
        email: "hello@jivara.id",
        contactType: "customer support",
        availableLanguage: "Indonesian",
      },
      sameAs: ["https://instagram.com/jivara.id"],
    },
    // 3. SoftwareApplication - untuk App Rich Results
    {
      "@type": "SoftwareApplication",
      "@id": `${BASE_URL}/docs`,
      name: "Jivara",
      url: BASE_URL,
      description:
        "Platform kesehatan berbasis AI untuk pengingat obat otomatis, deteksi interaksi makanan-obat menggunakan Computer Vision, dan pemantauan pasien jarak jauh oleh perawat.",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IDR",
      },
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "128",
      },
      image: `${BASE_URL}/images/og-image.png`,
      screenshot: `${BASE_URL}/images/og-image.png`,
      featureList: [
        "Pengingat obat otomatis",
        "Deteksi interaksi makanan-obat via Computer Vision",
        "Pemantauan pasien jarak jauh oleh perawat",
        "Scan makanan dengan AI",
        "Jadwal obat digital",
        "Log aktivitas kesehatan",
      ],
      creator: { "@id": `${BASE_URL}/team` },
    },
  ],
};

interface RootLayoutProps {
  readonly children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce') || '';

  return (
    <html lang="id" className={`${archivo.variable} ${inter.variable} relative`} suppressHydrationWarning>
      <head>
        {nonce && <meta property="csp-nonce" nonce={nonce} />}
        <link rel="preload" href="/models/maskot.glb" as="fetch" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          nonce={nonce || undefined}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
        />
      </head>
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
