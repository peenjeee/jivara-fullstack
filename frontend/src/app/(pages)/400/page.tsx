import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Permintaan tidak bisa diproses — Jivara",
};

export default function BadRequestPage() {
  return <ErrorPage variant="400" />;
}
