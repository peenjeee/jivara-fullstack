import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import Section from "@/components/ui/Section";
import Link from "next/link";

export default function DocsPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const swaggerUrl = apiUrl.replace(/\/api$/, '') + '/api-docs';

  return (
    <>
      <Navbar />
      <Section className="min-h-[70vh] pt-32 lg:pt-48 pb-20">
        <div className="max-w-[800px]">
          <h1 className="font-display text-xl lg:text-2xl font-extrabold uppercase mb-12 tracking-tight text-dark">
            Dokumentasi Jivara
          </h1>
          <div className="mt-8">
            <Link 
              href={swaggerUrl} 
              style={{ textDecoration: 'underline', textUnderlineOffset: '4px' }}
              className="inline-flex items-center gap-2 text-dark font-medium hover:text-primary transition-colors"
            >
              &bull; Buka Dokumentasi API
            </Link>
          </div>
        </div>
      </Section>
      <Footer />
    </>
  );
}

