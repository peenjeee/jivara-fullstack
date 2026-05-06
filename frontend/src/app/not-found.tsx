import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Halaman Tidak Ditemukan",
  description: "Halaman yang Anda cari tidak ditemukan. Kembali ke beranda Jivara.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <ErrorPage variant="404" />;
}
