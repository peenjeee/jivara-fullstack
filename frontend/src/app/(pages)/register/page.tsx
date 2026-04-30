import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { RegisterForm } from "@/components/auth";

export default function RegisterPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-32 pb-20 px-5 flex items-center justify-center bg-surface">
        <RegisterForm />
      </main>
      <Footer />
    </>
  );
}
