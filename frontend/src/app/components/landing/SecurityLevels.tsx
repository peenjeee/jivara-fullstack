const levels = [
  {
    title: "Safe (Aman)",
    color: "text-safe",
    description: "Tidak ada interaksi signifikan. Makanan ini aman dikonsumsi bersamaan dengan obat yang sedang aktif."
  },
  {
    title: "Caution (Hati-hati)",
    color: "text-warning",
    description: "Perlu penyesuaian porsi atau pengaturan jarak waktu konsumsi. Sebaiknya konsultasi jika ragu."
  },
  {
    title: "Danger (Bahaya)",
    color: "text-danger",
    description: "Risiko tinggi interaksi serius. Pasien dilarang mengonsumsi makanan ini, dan peringatan akan dikirim ke perawat."
  }
];

export default function SecurityLevels() {
  return (
    <section id="keamanan" className="py-[98px] px-5 md:px-[84px] bg-surface text-text-main" aria-labelledby="stack-title">
      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-5 lg:gap-20 items-start mb-10 lg:mb-20">
        <h2 id="stack-title" className="font-display text-[clamp(34px,10vw,44px)] lg:text-[62px] font-extrabold leading-none lg:leading-[0.98]">
          <span className="block">Tingkat</span>
          <span className="block text-muted">Keamanan</span>
        </h2>
        <p className="max-w-full lg:max-w-[500px] text-muted text-sm lg:text-sm leading-relaxed lg:leading-[1.7]">
          Klasifikasi interaksi makanan dan obat yang konsisten untuk meminimalisir risiko medis dan efek samping.
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-x-[50px] lg:gap-y-[58px]">
        {levels.map((level) => (
          <article key={level.title} className="pt-7 border-t border-line">
            <h3 className={`mb-7 ${level.color} font-display text-base font-extrabold tracking-[0.16em] uppercase`}>
              {level.title}
            </h3>
            <p className="text-[#a2a9b5] text-sm leading-relaxed">{level.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
