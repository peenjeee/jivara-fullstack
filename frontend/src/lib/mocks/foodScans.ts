import { patients } from "./patients";

export type FoodScanRisk = "Low Risk" | "High Risk";

export interface FoodScanBoundingBox {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly x1?: number;
  readonly y1?: number;
  readonly x2?: number;
  readonly y2?: number;
}

export interface FoodScanDetectedItem {
  readonly label: string;
  readonly labelDisplay: string;
  readonly confidence: number;
  readonly boundingBox?: FoodScanBoundingBox | null;
}

export interface FoodScanRecord {
  readonly id: string;
  readonly patientId: string;
  readonly foodName: string;
  readonly image: string;
  readonly scannedAt: string;
  readonly risk: FoodScanRisk;
  readonly aiReasoning: string;
  readonly result: string;
  readonly recommendation: string;
  readonly hasDetectedFood?: boolean;
  readonly detectedItems?: readonly FoodScanDetectedItem[];
}

const today = new Date();
const atTime = (dayOffset: number, hour: number, minute: number) => {
  const date = new Date(today);
  date.setDate(today.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const foodScans: FoodScanRecord[] = [
  {
    id: "SCAN-001",
    patientId: patients[0].id,
    foodName: "Oatmeal pisang",
    image: "https://images.unsplash.com/photo-1494597564530-871f2b93ac55?auto=format&fit=crop&w=1200&q=80",
    scannedAt: atTime(0, 7, 10),
    risk: "Low Risk",
    aiReasoning: "Oatmeal dan pisang memiliki profil serat yang stabil serta tidak mengandung komponen yang umum mengganggu obat tekanan darah pasien.",
    result: "Tidak ditemukan interaksi berisiko dengan jadwal obat aktif.",
    recommendation: "Lanjutkan pola sarapan dan tetap minum air putih.",
  },
  {
    id: "SCAN-002",
    patientId: patients[0].id,
    foodName: "Sup ayam rendah garam",
    image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=1200&q=80",
    scannedAt: atTime(-1, 12, 25),
    risk: "Low Risk",
    aiReasoning: "Komposisi rendah garam membantu menjaga tekanan darah tetap stabil dan tidak memberi sinyal interaksi langsung dengan terapi pasien.",
    result: "Komposisi makanan aman untuk obat tekanan darah.",
    recommendation: "Pertahankan porsi garam rendah sesuai arahan.",
  },
  {
    id: "SCAN-003",
    patientId: patients[1].id,
    foodName: "Es teh manis",
    image: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=1200&q=80",
    scannedAt: atTime(0, 19, 15),
    risk: "High Risk",
    aiReasoning: "Kadar gula sederhana tinggi dapat memperburuk kontrol glukosa dan melemahkan manfaat terapi diabetes bila dikonsumsi dekat jadwal obat.",
    result: "Kandungan gula tinggi berpotensi mengganggu kontrol glukosa.",
    recommendation: "Pilih minuman tanpa gula dan pantau gejala setelah makan.",
  },
  {
    id: "SCAN-004",
    patientId: patients[1].id,
    foodName: "Nasi goreng",
    image: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=1200&q=80",
    scannedAt: atTime(-2, 20, 5),
    risk: "High Risk",
    aiReasoning: "Karbohidrat tinggi dan sodium pada nasi goreng dapat menaikkan beban metabolik pasien yang sedang dipantau kepatuhan obatnya.",
    result: "Karbohidrat dan sodium cukup tinggi untuk kondisi pasien.",
    recommendation: "Batasi porsi nasi dan tambahkan sayuran rendah gula.",
  },
  {
    id: "SCAN-005",
    patientId: patients[2].id,
    foodName: "Kopi hitam",
    image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
    scannedAt: atTime(-1, 6, 45),
    risk: "High Risk",
    aiReasoning: "Kafein dan asam kopi berpotensi memperparah keluhan lambung, terutama saat dikonsumsi sebelum makan dan dekat terapi lambung.",
    result: "Kafein dapat memperparah keluhan lambung sebelum sarapan.",
    recommendation: "Minum obat lambung lebih dulu dan hindari kopi saat perut kosong.",
  },
  {
    id: "SCAN-006",
    patientId: patients[3].id,
    foodName: "Bubur ayam",
    image: "https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=1200&q=80",
    scannedAt: atTime(-1, 8, 0),
    risk: "Low Risk",
    aiReasoning: "Bubur ayam memiliki tekstur ringan dan tidak terdeteksi mengandung komponen yang berkonflik dengan jadwal obat pasien.",
    result: "Tidak ada konflik dengan jadwal obat yang sudah selesai.",
    recommendation: "Tetap pantau gejala demam atau nyeri bila muncul kembali.",
  },
  {
    id: "SCAN-007",
    patientId: patients[4].id,
    foodName: "Susu full cream",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=1200&q=80",
    scannedAt: atTime(0, 8, 30),
    risk: "High Risk",
    aiReasoning: "Produk susu dapat mengganggu penyerapan beberapa antibiotik bila dikonsumsi terlalu dekat dengan waktu minum obat.",
    result: "Perlu jeda konsumsi dengan antibiotik agar penyerapan tetap optimal.",
    recommendation: "Beri jeda minimal 2 jam dari jadwal minum obat.",
  },
  {
    id: "SCAN-008",
    patientId: patients[5].id,
    foodName: "Jus jeruk",
    image: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=1200&q=80",
    scannedAt: atTime(-2, 9, 10),
    risk: "Low Risk",
    aiReasoning: "Jus jeruk tidak terdeteksi berisiko pada jadwal yang sedang nonaktif, tetapi tetap perlu ditinjau jika terapi obat dilanjutkan.",
    result: "Tidak ditemukan risiko langsung dengan jadwal nonaktif.",
    recommendation: "Pastikan jadwal obat ditinjau sebelum terapi dilanjutkan.",
  },
];
