"use client";

import ErrorPage from "@/components/errors/ErrorPage";
import { useSplashScreen } from "@/components/ui/AppSplashScreen";

export default function OfflinePageClient() {
  const { isSplashFinished } = useSplashScreen();

  if (!isSplashFinished) return null;

  return <ErrorPage variant="offline" />;
}
