import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Dokumentasi API",
  description: "Dokumentasi API Jivara — akses Swagger UI untuk melihat endpoint, autentikasi, dan fitur integrasi platform kesehatan Jivara.",
  alternates: {
    canonical: "https://www.jivara.web.id/docs",
  },
};

export default function DocsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  const swaggerUrl = `${apiUrl.replace(/\/api\/?$/, "")}/api-docs`;

  redirect(swaggerUrl);
}
