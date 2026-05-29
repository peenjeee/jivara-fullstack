import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Data sedang konflik — Jivara",
};

export default function ConflictPage() {
  return <ErrorPage variant="409" />;
}
