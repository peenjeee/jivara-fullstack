"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AUTH_EXPIRED_EVENT } from "@/lib/authNavigation";

interface AuthNavigationProviderProps {
  readonly children: ReactNode;
}

export default function AuthNavigationProvider({ children }: AuthNavigationProviderProps) {
  const router = useRouter();

  useEffect(() => {
    const handleAuthExpired = () => {
      router.replace("/login?loggedOut=1");
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
  }, [router]);

  return <>{children}</>;
}
