import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Layanan terlalu lama merespons — Jivara",
};

export default function GatewayTimeoutPage() {
  return <ErrorPage variant="504" />;
}
