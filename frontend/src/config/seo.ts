const normalizeSiteUrl = (value?: string) => {
  const url = value?.trim().replace(/\/$/, "");
  return url || "https://www.jivara.web.id";
};

export const SITE_URL = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

export const jsonLdGraph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/`,
      name: "Jivara",
      alternateName: "Jivara Health Platform",
      url: SITE_URL,
      description:
        "Platform kesehatan berbasis AI untuk pengingat obat otomatis, deteksi interaksi makanan-obat, dan pemantauan pasien jarak jauh.",
      inLanguage: "id",
      publisher: { "@id": `${SITE_URL}/team` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/team`,
      name: "Jivara",
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo/splash.png`,
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
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/docs`,
      name: "Jivara",
      url: SITE_URL,
      description:
        "Platform kesehatan berbasis AI untuk pengingat obat otomatis, deteksi interaksi makanan-obat menggunakan Computer Vision, dan pemantauan pasien jarak jauh oleh perawat.",
      applicationCategory: "HealthApplication",
      operatingSystem: "Web",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "IDR",
      },
      image: `${SITE_URL}/images/og-image.png`,
      screenshot: `${SITE_URL}/images/og-image.png`,
      featureList: [
        "Pengingat obat otomatis",
        "Deteksi interaksi makanan-obat via Computer Vision",
        "Pemantauan pasien jarak jauh oleh perawat",
        "Scan makanan dengan AI",
        "Jadwal obat digital",
        "Log aktivitas kesehatan",
      ],
      creator: { "@id": `${SITE_URL}/team` },
    },
  ],
};

export const JSON_LD_SCRIPT = JSON.stringify(jsonLdGraph);
