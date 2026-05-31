import { patients, type PatientStatus } from "./patients";
import { getTodayAppDateKey } from "@/lib/appTimezone";

export type MedicationScheduleStatus = "Aktif" | "Selesai" | "Nonaktif";
export type MealRule = "Sebelum makan" | "Sesudah makan" | "Tidak tergantung makan";
export type MedicineForm = string;

export interface MedicationScheduleRecord {
  readonly id: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly patientAvatar: string;
  readonly patientStatus?: PatientStatus;
  readonly medicineName: string;
  readonly registrationNumber?: string;
  readonly compositionNormalized?: string;
  readonly activeSubstances?: string;
  readonly drugCategories?: string;
  readonly dose: string;
  readonly medicineForm: MedicineForm;
  readonly stock: number;
  readonly frequency: string;
  readonly times: readonly string[];
  readonly mealRule: MealRule;
  readonly startDate: string;
  readonly endDate?: string;
  readonly reminderEnabled: boolean;
  readonly instructions?: string;
  readonly status: MedicationScheduleStatus;
  readonly previousStatus?: Exclude<MedicationScheduleStatus, "Nonaktif">;
}

export interface PatientScheduleGroup {
  readonly patientId: string;
  readonly patientName: string;
  readonly patientAvatar: string;
  readonly patientStatus: PatientStatus;
  readonly schedules: readonly MedicationScheduleRecord[];
  readonly summaryStatus: MedicationScheduleStatus;
  readonly nextSchedule: string;
  readonly activeReminders: number;
  readonly totalMedicineStock: number;
  readonly lowStockCount: number;
}

const today = getTodayAppDateKey();

export const medicationSchedules: MedicationScheduleRecord[] = [
  {
    id: "SCH-001",
    patientId: patients[0].id,
    patientName: patients[0].name,
    patientAvatar: patients[0].avatar,
    medicineName: "Amlodipine",
    dose: "5 mg",
    medicineForm: "Tablet",
    stock: 24,
    frequency: "1 kali sehari",
    times: ["08:00"],
    mealRule: "Sesudah makan",
    startDate: today,
    reminderEnabled: true,
    instructions: "Pantau tekanan darah setiap pagi.",
    status: "Aktif",
  },
  {
    id: "SCH-002",
    patientId: patients[1].id,
    patientName: patients[1].name,
    patientAvatar: patients[1].avatar,
    medicineName: "Metformin",
    dose: "500 mg",
    medicineForm: "Tablet",
    stock: 12,
    frequency: "2 kali sehari",
    times: ["07:30", "19:30"],
    mealRule: "Sesudah makan",
    startDate: today,
    endDate: "2026-06-30",
    reminderEnabled: true,
    instructions: "Scan makanan sebelum makan dan hindari minuman tinggi gula.",
    status: "Aktif",
  },
  {
    id: "SCH-003",
    patientId: patients[2].id,
    patientName: patients[2].name,
    patientAvatar: patients[2].avatar,
    medicineName: "Omeprazole",
    dose: "20 mg",
    medicineForm: "Kapsul",
    stock: 30,
    frequency: "1 kali sehari",
    times: ["06:30"],
    mealRule: "Sebelum makan",
    startDate: today,
    reminderEnabled: true,
    instructions: "Minum 30 menit sebelum sarapan.",
    status: "Aktif",
  },
  {
    id: "SCH-004",
    patientId: patients[3].id,
    patientName: patients[3].name,
    patientAvatar: patients[3].avatar,
    medicineName: "Paracetamol",
    dose: "500 mg",
    medicineForm: "Tablet",
    stock: 8,
    frequency: "Jika demam atau nyeri",
    times: ["09:00", "15:00", "21:00"],
    mealRule: "Tidak tergantung makan",
    startDate: "2026-04-20",
    endDate: today,
    reminderEnabled: false,
    status: "Selesai",
  },
  {
    id: "SCH-005",
    patientId: patients[4].id,
    patientName: patients[4].name,
    patientAvatar: patients[4].avatar,
    medicineName: "Cefixime",
    dose: "100 mg",
    medicineForm: "Sirup",
    stock: 1,
    frequency: "2 kali sehari",
    times: ["08:00", "20:00"],
    mealRule: "Sesudah makan",
    startDate: "2026-04-25",
    endDate: "2026-05-05",
    reminderEnabled: false,
    instructions: "Jadwal dihentikan sementara oleh perawat.",
    status: "Nonaktif",
  },
  {
    id: "SCH-006",
    patientId: patients[5].id,
    patientName: patients[5].name,
    patientAvatar: patients[5].avatar,
    medicineName: "Cefixime",
    dose: "100 mg",
    medicineForm: "Sirup",
    stock: 1,
    frequency: "2 kali sehari",
    times: ["08:00", "20:00"],
    mealRule: "Sesudah makan",
    startDate: "2026-04-25",
    endDate: "2026-05-05",
    reminderEnabled: false,
    instructions: "Jadwal dihentikan sementara oleh perawat.",
    status: "Nonaktif",
  }
];
