import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Sistem sedang bermasalah — Jivara",
};

export default function InternalServerErrorPage() {
  return <ErrorPage variant="500" />;
}