import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/auth";
import { SimpleFooter } from "@/components/landing/Footer";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <main className="flex flex-1 items-start justify-center px-5 pt-0 pb-50">
        <section className="flex w-full max-w-md flex-col items-center gap-0">
          <Link href="/" aria-label="Jivara beranda" className="flex w-full justify-center overflow-hidden">
            <Image src="/images/logo/text.png" alt="Jivara" width={260} height={84} priority className="mb-[-42px] h-auto w-[210px] translate-x-[-6px] sm:w-[260px]" />
          </Link>
          <LoginForm />
        </section>
      </main>
      <SimpleFooter />
    </div>
  );
}
