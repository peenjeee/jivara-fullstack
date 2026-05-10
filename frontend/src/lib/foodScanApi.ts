import api from "@/lib/axios";
import type { FoodScanAnalysis } from "@/helpers/foodScans";
import type { FoodScanRecord, FoodScanRisk } from "@/lib/mocks/foodScans";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

interface PatientResponse {
  id: string;
  fullName?: string | null;
}

interface UploadResponse {
  image_id: string;
  upload_url: string;
  timestamp: string;
}

interface DetectedItemResponse {
  label: string;
  label_display: string;
  confidence: number;
}

interface DetectResponse {
  scan_id: string;
  detected_items: DetectedItemResponse[];
  inference_time_ms: number;
  model_version: string;
  timestamp: string;
}

interface InteractionResponse {
  interactions: Array<{
    food_item: string;
    food_display: string;
    medication: string;
    severity: string;
    severity_label: string;
    interaction_description: string;
    recommendation: string;
  }>;
  overall_risk_level: string;
  overall_recommendation: string;
  disclaimer: string;
}

const getInitials = (name?: string | null) => name?.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "PX";

const getBackendOrigin = () => {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";
  return apiUrl.replace(/\/api\/?$/, "");
};

const getPatient = async () => {
  const response = await api.get<{ data: PatientResponse[] }>("/patients", { params: { limit: 1 } });
  const patient = response.data.data[0];

  if (!patient?.id) {
    throw new Error("Data pasien tidak ditemukan untuk scan makanan.");
  }

  return patient;
};

const toFoodName = (items: DetectedItemResponse[]) => {
  if (items.length === 0) return "Makanan terdeteksi";
  return items.map((item) => item.label_display).join(", ");
};

const toRisk = (riskLevel: string): FoodScanRisk => {
  if (["tinggi", "critical", "high"].includes(riskLevel.toLowerCase())) return "High Risk";
  return "Low Risk";
};

const createSchedule = (interaction: InteractionResponse["interactions"][number], patient: PatientResponse, index: number): MedicationScheduleRecord => ({
  id: `API-FOOD-INTERACTION-${index}`,
  patientId: patient.id,
  patientName: patient.fullName || "Pasien",
  patientAvatar: getInitials(patient.fullName),
  medicineName: interaction.medication,
  dose: "-",
  medicineForm: "Tablet",
  stock: 0,
  frequency: "Sesuai jadwal aktif",
  times: [],
  mealRule: "Tidak tergantung makan",
  startDate: new Date().toISOString().slice(0, 10),
  reminderEnabled: true,
  status: "Aktif",
});

export const scanFoodImage = async (file: File): Promise<FoodScanAnalysis> => {
  const patient = await getPatient();
  const patientId = patient.id;
  const formData = new FormData();
  formData.append("patientId", patientId);
  formData.append("image", file);

  const uploadResponse = await api.post<{ data: UploadResponse }>("/food-scans", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  const upload = uploadResponse.data.data;
  const detectResponse = await api.post<{ data: DetectResponse }>(`/food-scans/${encodeURIComponent(upload.image_id)}/detections`, {
    patientId,
  });
  const detection = detectResponse.data.data;
  const detectedLabels = detection.detected_items.map((item) => item.label);

  const [interactionResponse] = await Promise.all([
    api.post<{ data: InteractionResponse }>(`/food-scans/${encodeURIComponent(upload.image_id)}/interactions`, {
      patientId,
      detectedItems: detectedLabels,
    }),
    api.post("/nutrition-estimates", {
      detectedItems: detection.detected_items.map((item) => ({ label: item.label, confidence: item.confidence })),
    }),
  ]);

  const interactionData = interactionResponse.data.data;
  const risk = toRisk(interactionData.overall_risk_level);
  const image = upload.upload_url.startsWith("http") ? upload.upload_url : `${getBackendOrigin()}${upload.upload_url}`;
  const foodName = toFoodName(detection.detected_items);
  const scan: FoodScanRecord = {
    id: upload.image_id,
    patientId,
    foodName,
    image,
    scannedAt: upload.timestamp,
    risk,
    aiReasoning: `Model ${detection.model_version} mendeteksi ${foodName} dalam ${detection.inference_time_ms} ms dan mencocokkannya dengan obat aktif pasien.`,
    result: interactionData.interactions.length > 0 ? "Ditemukan potensi interaksi obat-makanan." : "Tidak ditemukan interaksi signifikan pada makanan yang terdeteksi.",
    recommendation: interactionData.overall_recommendation || interactionData.disclaimer,
  };
  const interactions = interactionData.interactions.map((interaction, index) => ({
    schedule: createSchedule(interaction, patient, index),
    risk: risk,
    reasoning: interaction.interaction_description,
    recommendation: interaction.recommendation,
  }));

  return {
    scan,
    schedules: interactions.map((interaction) => interaction.schedule),
    interactions,
    overallRisk: risk,
  };
};
