const steps = [
  {
    number: 1,
    title: "Registrasi",
    description: "Perawat mendaftarkan pasien dan jadwal obat secara terpusat melalui dashboard administratif yang aman.",
    span: "lg:col-span-7"
  },
  {
    number: 2,
    title: "Pengingat Cerdas",
    description: "Pasien menerima notifikasi pengingat berulang untuk konsumsi obat dan cek interaksi makanan.",
    span: "lg:col-span-5"
  },
  {
    number: 3,
    title: "Scan Makanan",
    description: "Kamera mendeteksi jenis makanan dan langsung mencocokkan interaksinya dengan obat pasien.",
    span: "lg:col-span-6",
    label: "Scan"
  },
  {
    number: 4,
    title: "Monitoring",
    description: "Sistem memberikan alert 'Danger' atau 'Caution' ke perawat jika pasien mencoba mengonsumsi makanan yang berisiko.",
    span: "lg:col-span-6"
  }
];

export default function Workflow() {
  return (
    <section id="alur" className="py-20 md:pt-[128px] md:pb-[112px] px-5 md:px-[58px] bg-bg" aria-labelledby="projects-title">
      <div className="mb-8 md:mb-12">
        <h2 id="projects-title" className="font-display text-[clamp(28px,8vw,42px)] lg:text-[72px] font-extrabold leading-none lg:leading-[0.9]">
          <span className="block text-[#111]">Alur</span>
          <span className="block text-[#111]">Sistem</span>
        </h2>
      </div>
      <div className="grid max-w-[1280px] mx-auto grid-cols-1 md:grid-cols-2 lg:grid-cols-12 items-stretch gap-6 md:gap-[30px]">
        {steps.map((step) => (
          <article 
            key={step.number}
            className={`relative min-h-[280px] md:min-h-[320px] flex flex-col lg:flex-row items-start lg:items-end overflow-hidden rounded-[36px] bg-[#10b981] text-white border border-white/10 isolate transform-gpu transition-all duration-[350ms] ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-[10px] hover:rotate-[-0.4deg] hover:shadow-[0_28px_70px_rgba(15,23,42,0.08)] col-span-1 md:col-span-1 ${step.span} p-10 lg:p-0`}
          >
            {step.label && (
              <span className="hidden lg:block absolute top-[44px] left-[44px] text-[rgba(15,23,42,0.06)] font-display text-lg">{step.label}</span>
            )}
            <span className="relative lg:absolute lg:top-8 lg:right-8 w-12 lg:w-[58px] h-12 lg:h-[58px] grid place-items-center rounded-full bg-white text-[#10b981] text-lg lg:text-[22px] font-black mb-5 lg:mb-0">
              {step.number}
            </span>
            <div className="w-full lg:w-[min(520px,calc(100%-96px))] lg:p-[42px]">
              <h3 className="mb-3 font-display text-[22px] md:text-[26px] font-black text-white">{step.title}</h3>
              <p className="mb-4 opacity-90 text-sm leading-relaxed text-white/95">{step.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
