import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Halaman sudah tidak tersedia — Jivara",
};

export default function GonePage() {
  return <ErrorPage variant="410" />;
}
