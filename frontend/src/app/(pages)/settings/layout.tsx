import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pengaturan",
  description: "Kelola pengaturan akun Jivara — profil, notifikasi, dan preferensi aplikasi.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { readonly children: ReactNode }) {
  return children;
}
