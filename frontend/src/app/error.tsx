"use client";

import { ErrorPage } from "@/components/errors";

interface AppErrorProps {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}

export default function AppError({ error, reset }: AppErrorProps) {
  return (
    <ErrorPage variant="500" reset={reset}>
      {error.digest ? `Kode referensi: ${error.digest}` : "Silakan coba lagi. Jika masalah berlanjut, hubungi admin Jivara."}
    </ErrorPage>
  );
}
