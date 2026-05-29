import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Gateway tidak merespons — Jivara",
};

export default function BadGatewayPage() {
  return <ErrorPage variant="502" />;
}
