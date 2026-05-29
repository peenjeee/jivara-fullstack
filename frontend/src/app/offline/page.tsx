import type { Metadata } from "next";
import OfflinePageClient from "@/components/errors/OfflinePageClient";

export const metadata: Metadata = {
  title: "Koneksi terputus — Jivara",
  description: "Jivara tidak bisa memuat halaman karena perangkat sedang offline.",
};

export default function OfflinePage() {
  return <OfflinePageClient />;
}
