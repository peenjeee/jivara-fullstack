import type { Metadata } from "next";
import { AuthPageShell, LoginForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Masuk",
  description: "Masuk ke akun Jivara untuk mengakses dashboard pengingat obat, deteksi interaksi makanan-obat, dan monitoring pasien.",
  robots: { index: false, follow: true },
};

export default function LoginPage() {
  return (
    <AuthPageShell>
      <LoginForm />
    </AuthPageShell>
  );
}
