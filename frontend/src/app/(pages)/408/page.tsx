import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Permintaan terlalu lama — Jivara",
};

export default function RequestTimeoutPage() {
  return <ErrorPage variant="408" />;
}
