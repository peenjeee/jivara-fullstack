import Section from "@/components/ui/Section";
import SectionHeader from "@/components/ui/SectionHeader";
import SecurityCard from "@/components/ui/SecurityCard";

const levels = [
  {
    title: "Low Risk",
    color: "text-leaf",
    description: "Tidak ada interaksi signifikan. Makanan aman dikonsumsi sesuai anjuran obat yang sedang aktif."
  },
  {
    title: "High Risk",
    color: "text-danger",
    description: "Risiko tinggi interaksi serius. Pasien dilarang mengonsumsi makanan ini, dan peringatan dikirim ke perawat."
  }
];

export default function SecurityLevels() {
  return (
    <Section id="keamanan" className="relative z-10 bg-surface" aria-labelledby="stack-title">
      <SectionHeader
        id="stack-title"
        title="Tingkat"
        subtitle="Keamanan"
        description="Klasifikasi interaksi makanan dan obat yang konsisten untuk meminimalisir risiko medis dan efek samping."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-x-[64px] lg:gap-y-[58px]">
        {levels.map((level) => (
          <SecurityCard
            key={level.title}
            {...level}
          />
        ))}
      </div>
    </Section>
  );
}
