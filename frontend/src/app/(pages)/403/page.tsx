import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Akses halaman dibatasi — Jivara",
};

export default function ForbiddenPage() {
  return <ErrorPage variant="403" />;
}
