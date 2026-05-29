import type { Metadata } from "next";
import { ErrorPage } from "@/components/errors";

export const metadata: Metadata = {
  title: "Sesi login diperlukan — Jivara",
};

export default function UnauthorizedPage() {
  return <ErrorPage variant="401" />;
}
