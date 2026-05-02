"use client";

import "@/styles/globals.css";
import { ErrorPage } from "@/components/errors";

interface GlobalErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="id" className="relative" suppressHydrationWarning>
      <body className="font-body relative overflow-x-hidden">
        <ErrorPage variant="500" reset={reset}>
          {error.digest ? `Kode referensi: ${error.digest}` : "Kesalahan fatal terjadi saat memuat aplikasi."}
        </ErrorPage>
      </body>
    </html>
  );
}
