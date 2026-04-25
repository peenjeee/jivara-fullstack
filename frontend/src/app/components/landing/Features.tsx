import Image from "next/image";

export default function Features() {
  return (
    <section id="fitur" className="group relative min-h-[auto] md:min-h-[840px] grid place-items-center overflow-hidden bg-primary text-white text-center py-20 md:py-0 px-5 md:px-0" aria-labelledby="about-title">
      <Image
        className="w-[148px] h-[148px] rounded-full object-cover mb-[46px] transition-all duration-[450ms] group-hover:saturate-[1.2] group-hover:scale-[1.04]"
        src="/images/logo/logo.png"
        alt="Jiva Avatar"
        width={148}
        height={148}
        style={{ objectFit: 'contain', background: 'var(--bg)' }}
      />
      <p className="block absolute left-0 right-0 top-[180px] md:top-[304px] text-white/[0.08] font-display text-[clamp(32px,10vw,178px)] font-extrabold leading-none text-center whitespace-nowrap" aria-hidden="true">JIVARA</p>
      <div className="relative z-[2] w-[min(850px,calc(100%-48px))]">
        <h2 className="mx-auto mt-2 mb-[52px] max-w-[820px] font-display text-[28px] md:text-[45px] font-extrabold leading-[1.3] md:leading-[1.12]">
          Mencegah interaksi obat dan makanan dengan <span className="text-dark">cerdas</span> dan <i className="font-[Georgia,serif] italic font-medium">mudah</i> digunakan.
        </h2>
        <p className="max-w-[820px] mx-auto mb-[34px] text-white/90 text-[15px] md:text-[17px] leading-[1.75]">
          Jivara menghubungkan pasien dan perawat dalam satu ekosistem. Dengan pengingat jadwal obat otomatis, deteksi makanan berbasis AI lewat kamera, dan sistem monitoring, kami memastikan setiap dosis aman dikonsumsi.
        </p>
      </div>
    </section>
  );
}
