import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Metode tidak didukung — Jivara",
};

export default function MethodNotAllowedPage() {
  return <ErrorPage variant="405" />;
}
