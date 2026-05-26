import { medicationSchedules } from "./schedules";
import { patients } from "./patients";
import { foodScans } from "./foodScans";

export type ActivityCategory = "Reminder" | "Kepatuhan" | "Scan Makanan" | "Administrasi";
export type ActivitySeverity = "Info" | "Sukses" | "Peringatan" | "Kritis";

export interface ActivityLogRecord {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly category: ActivityCategory;
  readonly severity: ActivitySeverity;
  readonly timestamp: string;
  readonly patientId?: string;
  readonly patientName?: string;
  readonly patientAvatar?: string;
  readonly scheduleId?: string;
  readonly medicineName?: string;
  readonly scanId?: string;
  readonly alertId?: string;
  readonly sourceNurseId?: string;
  readonly targetNurseId?: string;
  readonly read: boolean;
}

export const activityCategories: readonly ActivityCategory[] = ["Reminder", "Kepatuhan", "Scan Makanan", "Administrasi"];

const today = new Date();
const atTime = (dayOffset: number, hour: number, minute: number) => {
  const date = new Date(today);
  date.setDate(today.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

export const activityLogs: ActivityLogRecord[] = [
  {
    id: "ACT-001",
    title: "Reminder obat berhasil dikirim",
    description: `Pengingat minum ${medicationSchedules[0].medicineName} pukul ${medicationSchedules[0].times[0]} berhasil dikirim ke pasien.`,
    category: "Reminder",
    severity: "Sukses",
    timestamp: atTime(0, 8, 0),
    patientId: patients[0].id,
    patientName: patients[0].name,
    patientAvatar: patients[0].avatar,
    scheduleId: medicationSchedules[0].id,
    medicineName: medicationSchedules[0].medicineName,
    read: false,
  },
  {
    id: "ACT-002",
    title: "Stok obat kritis",
    description: `${medicationSchedules[4].medicineName} tersisa ${medicationSchedules[4].stock} item. Segera lakukan pengecekan stok atau hubungi pasien.`,
    category: "Reminder",
    severity: "Kritis",
    timestamp: atTime(0, 7, 45),
    patientId: patients[4].id,
    patientName: patients[4].name,
    patientAvatar: patients[4].avatar,
    scheduleId: medicationSchedules[4].id,
    medicineName: medicationSchedules[4].medicineName,
    read: false,
  },
  {
    id: "ACT-003",
    title: "Kepatuhan pasien menurun",
    description: `${patients[1].name} masuk kategori Need Special Attention dengan kepatuhan ${patients[1].adherence}%.`,
    category: "Kepatuhan",
    severity: "Peringatan",
    timestamp: atTime(0, 7, 20),
    patientId: patients[1].id,
    patientName: patients[1].name,
    patientAvatar: patients[1].avatar,
    read: false,
  },
  {
    id: "ACT-004",
    title: "Jadwal obat selesai",
    description: `Jadwal ${medicationSchedules[3].medicineName} untuk ${patients[3].name} telah mencapai tanggal selesai.`,
    category: "Kepatuhan",
    severity: "Info",
    timestamp: atTime(0, 6, 50),
    patientId: patients[3].id,
    patientName: patients[3].name,
    patientAvatar: patients[3].avatar,
    scheduleId: medicationSchedules[3].id,
    medicineName: medicationSchedules[3].medicineName,
    read: true,
  },
  {
    id: "ACT-005",
    title: "Scan makanan aman",
    description: `${patients[0].name} melakukan scan makanan dan tidak ditemukan interaksi berisiko dengan obat aktif.`,
    category: "Scan Makanan",
    severity: "Sukses",
    timestamp: atTime(-1, 19, 15),
    patientId: patients[0].id,
    patientName: patients[0].name,
    patientAvatar: patients[0].avatar,
    scanId: foodScans[1].id,
    read: true,
  },
  {
    id: "ACT-006",
    title: "Jadwal obat dinonaktifkan",
    description: `Jadwal ${medicationSchedules[5].medicineName} untuk ${patients[5].name} sedang nonaktif dan perlu ditinjau ulang.`,
    category: "Reminder",
    severity: "Peringatan",
    timestamp: atTime(-1, 16, 35),
    patientId: patients[5].id,
    patientName: patients[5].name,
    patientAvatar: patients[5].avatar,
    scheduleId: medicationSchedules[5].id,
    medicineName: medicationSchedules[5].medicineName,
    read: false,
  },
  {
    id: "ACT-007",
    title: "Pasien baru ditambahkan",
    description: `${patients[2].name} berhasil masuk daftar pantauan perawat.`,
    category: "Kepatuhan",
    severity: "Sukses",
    timestamp: atTime(-1, 14, 5),
    patientId: patients[2].id,
    patientName: patients[2].name,
    patientAvatar: patients[2].avatar,
    read: true,
  },
  {
    id: "ACT-008",
    title: "Reminder pasien belum aktif",
    description: `${patients[4].name} memiliki jadwal obat tanpa reminder aktif. Pastikan pasien tetap mendapatkan arahan minum obat.`,
    category: "Reminder",
    severity: "Peringatan",
    timestamp: atTime(-2, 9, 40),
    patientId: patients[4].id,
    patientName: patients[4].name,
    patientAvatar: patients[4].avatar,
    scheduleId: medicationSchedules[4].id,
    medicineName: medicationSchedules[4].medicineName,
    read: false,
  },
  {
    id: "ACT-009",
    title: "Sistem berhasil sinkronisasi",
    description: "Data jadwal obat, pasien, dan status reminder berhasil disiapkan untuk sesi perawat.",
    category: "Reminder",
    severity: "Info",
    timestamp: atTime(-2, 8, 15),
    read: true,
  },
  {
    id: "ACT-010",
    title: "Risiko interaksi makanan terdeteksi",
    description: `${patients[1].name} melakukan scan makanan dengan potensi risiko gula tinggi saat menggunakan ${medicationSchedules[1].medicineName}.`,
    category: "Scan Makanan",
    severity: "Kritis",
    timestamp: atTime(-3, 20, 20),
    patientId: patients[1].id,
    patientName: patients[1].name,
    patientAvatar: patients[1].avatar,
    scheduleId: medicationSchedules[1].id,
    medicineName: medicationSchedules[1].medicineName,
    scanId: foodScans[3].id,
    read: false,
  },
  {
    id: "ACT-011",
    title: "Pasien kembali sesuai jadwal",
    description: `${patients[3].name} kembali berada pada jadwal ideal setelah pembaruan jadwal obat.`,
    category: "Kepatuhan",
    severity: "Sukses",
    timestamp: atTime(-3, 13, 10),
    patientId: patients[3].id,
    patientName: patients[3].name,
    patientAvatar: patients[3].avatar,
    read: true,
  },
  {
    id: "ACT-012",
    title: "Jadwal obat baru tersedia",
    description: `Jadwal ${medicationSchedules[2].medicineName} untuk ${patients[2].name} aktif dan siap dipantau.`,
    category: "Reminder",
    severity: "Info",
    timestamp: atTime(-4, 10, 25),
    patientId: patients[2].id,
    patientName: patients[2].name,
    patientAvatar: patients[2].avatar,
    scheduleId: medicationSchedules[2].id,
    medicineName: medicationSchedules[2].medicineName,
    read: true,
  },
];
