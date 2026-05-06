import type { Metadata } from "next";
import { AuthPageShell, RegisterForm } from "@/components/auth";

export const metadata: Metadata = {
  title: "Daftar Akun",
  description: "Buat akun Jivara gratis untuk memulai pengingat obat otomatis, deteksi interaksi makanan-obat, dan monitoring pasien jarak jauh.",
  robots: { index: false, follow: true },
};

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm />
    </AuthPageShell>
  );
}
