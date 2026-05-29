import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Akses pembayaran diperlukan — Jivara",
};

export default function PaymentRequiredPage() {
  return <ErrorPage variant="402" />;
}
