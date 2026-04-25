import Navbar from "@/app/components/landing/Navbar";
import Footer from "@/app/components/landing/Footer";

export default function DokumentasiPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-[70vh] pt-32 lg:pt-48 px-5 lg:px-[84px] pb-20">
        <div className="max-w-[800px] mx-auto">
          <h1 className="font-display text-2xl lg:text-5xl font-extrabold uppercase mb-12 tracking-tight text-dark">
            Dokumentasi
          </h1>
        </div>
      </main>
      <Footer />
    </>
  );
}
