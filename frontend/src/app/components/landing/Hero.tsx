import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative min-h-[auto] lg:min-h-screen flex flex-col lg:flex-row items-center pt-20 sm:pt-[100px] lg:pt-[140px] px-5 lg:px-[76px] pb-[60px] lg:pb-20 bg-bg isolate text-center lg:text-left gap-10 lg:gap-0" aria-labelledby="hero-title">
      <div className="relative lg:absolute lg:top-[15vh] lg:right-[2vw] w-[min(280px,70vw)] lg:w-[min(460px,40vw)] h-auto lg:h-[min(580px,60vh)] flex items-center justify-center z-10 mx-auto lg:mx-0" aria-label="Jiva mascot window">
        <Image
          src="/images/maskot/maskot.png"
          alt="Jiva - maskot Jivara"
          width={420}
          height={420}
          priority
          className="w-full h-auto animate-mascot-float"
        />
      </div>

      <div className="relative z-[5] w-full lg:w-[min(900px,100%)] flex flex-col items-center lg:items-start">
        <h1 id="hero-title" className="font-display text-[clamp(30px,10vw,48px)] lg:text-[clamp(42px,8vw,92px)] font-extrabold leading-[1.1] lg:leading-[1.05] tracking-[-0.02em] uppercase">
          <span className="block text-primary animate-[fadeLift_0.85s_cubic-bezier(0.16,1,0.3,1)_0.22s_both]">Jivara</span>
          <span className="block text-dark animate-[fadeLift_0.85s_cubic-bezier(0.16,1,0.3,1)_0.32s_both]">Stay on Track, Stay Healthy</span>
        </h1>
        <p className="w-full max-w-[450px] lg:max-w-[600px] mt-4 lg:mt-7 text-muted text-base lg:text-[19px] font-normal leading-relaxed lg:leading-[1.6] animate-[fadeLift_0.85s_cubic-bezier(0.16,1,0.3,1)_0.45s_both]">
          <strong className="text-primary font-extrabold">Jivara</strong> membantu pasien patuh minum obat dan mendeteksi interaksi berbahaya dengan makanan menggunakan teknologi <i className="text-dark font-extrabold not-italic">Computer Vision</i>
        </p>
      </div>
    </section>
  );
}
