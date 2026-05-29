import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Terlalu banyak permintaan — Jivara",
};

export default function TooManyRequestsPage() {
  return <ErrorPage variant="429" />;
}
