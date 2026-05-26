import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SITE_URL } from "@/config/seo";

export const metadata: Metadata = {
  title: "Dokumentasi API",
  description: "Dokumentasi API Jivara - akses Swagger UI untuk melihat endpoint, autentikasi, dan fitur integrasi platform kesehatan Jivara.",
  alternates: {
    canonical: `${SITE_URL}/docs`,
  },
};

export default function DocsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.jivara.web.id/api";
  const swaggerUrl = `${apiUrl.replace(/\/api(?:\/v\d+)?\/?$/, "")}/api-docs/`;

  redirect(swaggerUrl);
}
