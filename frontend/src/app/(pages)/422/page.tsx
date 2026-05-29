import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Data belum valid — Jivara",
};

export default function UnprocessableContentPage() {
  return <ErrorPage variant="422" />;
}
