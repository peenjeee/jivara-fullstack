import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Layanan sementara tidak tersedia — Jivara",
};

export default function ServiceUnavailablePage() {
  return <ErrorPage variant="503" />;
}
