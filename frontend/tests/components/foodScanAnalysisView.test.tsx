import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactEventHandler } from "react";
import { describe, expect, it, vi } from "vitest";
import FoodScanAnalysisView from "@/components/food-scan/FoodScanAnalysisView";
import type { FoodScanAnalysis } from "@/helpers/foodScans";

vi.mock("next/image", () => ({
  default: ({ alt, className, height, onLoad, src, width }: { readonly alt: string; readonly className?: string; readonly height?: number; readonly onLoad?: ReactEventHandler<HTMLImageElement>; readonly src: string; readonly width?: number }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} className={className} data-height={height} data-width={width} onLoad={onLoad} src={src} />
  ),
}));

const analysis: FoodScanAnalysis = {
  scan: {
    id: "scan-1",
    patientId: "patient-1",
    foodName: "Nasi goreng",
    image: "/uploads/scan-1.jpg",
    scannedAt: "2026-05-09T08:00:00.000Z",
    risk: "Low Risk",
    aiReasoning: "Makanan terdeteksi.",
    result: "Aman.",
    recommendation: "Lanjutkan pemantauan.",
  },
  schedules: [],
  interactions: [],
  overallRisk: "Low Risk",
};

describe("FoodScanAnalysisView", () => {
  it("renders the scan result image without forcing a square frame", () => {
    const { container } = render(<FoodScanAnalysisView scanId="scan-1" analysisData={analysis} />);

    const image = screen.getByAltText("Nasi goreng");
    expect(image).toHaveClass("h-auto", "w-full", "object-contain");
    expect(container.querySelector(".aspect-square")).not.toBeInTheDocument();
    expect(container.querySelector("[data-food-scan-result-image-frame]")).toBeInTheDocument();
  });

  it("does not show a low-risk interaction analysis when no food is detected", () => {
    render(
      <FoodScanAnalysisView
        scanId="scan-empty"
        analysisData={{
          scan: {
            id: "scan-empty",
            patientId: "patient-1",
            foodName: "Tidak ada makanan terdeteksi",
            image: "/uploads/scan-empty.jpg",
            scannedAt: "2026-05-09T08:00:00.000Z",
            risk: "Low Risk",
            hasDetectedFood: false,
            aiReasoning: "Model tidak mendeteksi makanan.",
            result: "Tidak ada makanan yang dapat dianalisis dari gambar ini.",
            recommendation: "Coba scan ulang.",
            detectedItems: [],
          },
          schedules: [],
          interactions: [],
          overallRisk: "Low Risk",
        }}
      />,
    );

    expect(screen.getByText("Tidak Terdeteksi")).toBeInTheDocument();
    expect(screen.queryByText("Low Risk")).not.toBeInTheDocument();
    expect(screen.queryByText("Analisis Interaksi Obat")).not.toBeInTheDocument();
  });

  it("does not show the medication meal rule in food interaction cards", () => {
    render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          interactions: [
            {
              foodItem: "nasi-goreng",
              foodDisplay: "Nasi goreng",
              schedule: {
                id: "interaction-1",
                patientId: "patient-1",
                patientName: "Budi Santoso",
                patientAvatar: "BS",
                medicineName: "SIMVASTATIN",
                dose: "-",
                medicineForm: "Tablet",
                stock: 0,
                frequency: "Sesuai jadwal aktif",
                times: [],
                mealRule: "Tidak tergantung makan",
                startDate: "2026-05-09",
                reminderEnabled: true,
                status: "Aktif",
              },
              risk: "Low Risk",
              reasoning: "Kombinasi makanan dan obat ini diprediksi aman.",
              recommendation: "Pantau gejala setelah makan.",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("SIMVASTATIN")).toBeInTheDocument();
    expect(screen.getByText("Dengan Nasi goreng")).toBeInTheDocument();
    expect(screen.queryByText("Tidak tergantung makan")).not.toBeInTheDocument();
  });

  it("shows the overall interaction recommendation from the scan response", () => {
    render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          scan: {
            ...analysis.scan,
            recommendation: "Ditemukan potensi interaksi obat-makanan. Baca penjelasan AI per obat dan konsultasikan dengan dokter atau apoteker.",
          },
          interactions: [
            {
              foodItem: "nasi-goreng",
              foodDisplay: "Nasi goreng",
              schedule: {
                id: "interaction-1",
                patientId: "patient-1",
                patientName: "Budi Santoso",
                patientAvatar: "BS",
                medicineName: "CELESTAR",
                dose: "-",
                medicineForm: "Tablet",
                stock: 0,
                frequency: "Sesuai jadwal aktif",
                times: [],
                mealRule: "Tidak tergantung makan",
                startDate: "2026-05-09",
                reminderEnabled: true,
                status: "Aktif",
              },
              risk: "High Risk",
              reasoning: "Ada potensi interaksi.",
              recommendation: "Pantau gejala setelah makan.",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Rekomendasi keseluruhan")).toBeInTheDocument();
    expect(screen.getByText("Ditemukan potensi interaksi obat-makanan. Baca penjelasan AI per obat dan konsultasikan dengan dokter atau apoteker.")).toHaveClass("text-justify");
  });

  it("hides per-interaction recommendation text when Jivara Interaction Check returns no recommended foods", () => {
    render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          interactions: [
            {
              foodItem: "tumis-kangkung",
              foodDisplay: "tumis kangkung",
              schedule: {
                id: "interaction-1",
                patientId: "patient-1",
                patientName: "Budi Santoso",
                patientAvatar: "BS",
                medicineName: "WARFARIN",
                dose: "-",
                medicineForm: "Tablet",
                stock: 0,
                frequency: "Sesuai jadwal aktif",
                times: [],
                mealRule: "Tidak tergantung makan",
                startDate: "2026-05-09",
                reminderEnabled: true,
                status: "Aktif",
              },
              risk: "High Risk",
              reasoning: "Reasoning OpenRouter dari backend.",
              recommendation: "",
            },
          ],
          recommendedFoods: [],
          foodsToAvoid: [],
        }}
      />,
    );

    expect(screen.getByText("Reasoning OpenRouter dari backend.")).toBeInTheDocument();
    expect(screen.queryByText("Rekomendasi AI")).not.toBeInTheDocument();
    expect(screen.queryByText(/Alternatif makanan aman dari Jivara Interaction Check/i)).not.toBeInTheDocument();
  });

  it("shows safe and limited food recommendation sections when a high-risk interaction exists", () => {
    render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          overallRisk: "High Risk",
          scan: {
            ...analysis.scan,
            risk: "High Risk",
            recommendation: "Pilih alternatif makanan aman dari Jivara Interaction Check.",
          },
          interactions: [
            {
              foodItem: "susu",
              foodDisplay: "Susu",
              schedule: {
                id: "interaction-1",
                patientId: "patient-1",
                patientName: "Budi Santoso",
                patientAvatar: "BS",
                medicineName: "CEFIXIME",
                dose: "-",
                medicineForm: "Tablet",
                stock: 0,
                frequency: "Sesuai jadwal aktif",
                times: [],
                mealRule: "Tidak tergantung makan",
                startDate: "2026-05-09",
                reminderEnabled: true,
                status: "Aktif",
              },
              risk: "High Risk",
              reasoning: "Susu dapat mengganggu penyerapan.",
              recommendation: "",
            },
          ],
          recommendedFoods: [{ foodName: "ayam-goreng", severityScore: 0, riskLevel: "aman", worstCategory: null }],
          foodsToAvoid: [{ foodName: "susu", severityScore: 5, riskLevel: "tinggi", worstCategory: "antibiotik" }],
        }}
      />,
    );

    expect(screen.getByText("Rekomendasi AI")).toBeInTheDocument();
    expect(screen.getByText("Makanan Aman")).toBeInTheDocument();
    expect(screen.getByText("Perlu Dibatasi")).toBeInTheDocument();
    expect(screen.getByText("ayam goreng")).toBeInTheDocument();
    expect(screen.getByText("susu")).toBeInTheDocument();
  });

  it("does not show safe-food recommendations for low-risk scans", () => {
    render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          recommendedFoods: [{ foodName: "apel", severityScore: 0, riskLevel: "aman", worstCategory: null }],
        }}
      />,
    );

    expect(screen.queryByText("Rekomendasi AI")).not.toBeInTheDocument();
    expect(screen.queryByText("apel")).not.toBeInTheDocument();
  });

  it("labels nutrition values as estimates per 100 grams", () => {
    render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          nutritionItems: [
            {
              foodItem: "nasi-goreng",
              foodDisplay: "Nasi Goreng",
              portion: "100 gram",
              nutrition: { calories: 276, proteinG: 3.2, fatG: 3.2, carbsG: 30.2 },
              source: "Jivara Nutrition",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Estimasi per 100 gram • Jivara Nutrition")).toBeInTheDocument();
  });

  it("renders AI reasoning without raw markdown star symbols", () => {
    render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          interactions: [
            {
              foodItem: "nasi-goreng",
              foodDisplay: "nasi goreng",
              schedule: {
                id: "interaction-1",
                patientId: "patient-1",
                patientName: "Budi Santoso",
                patientAvatar: "BS",
                medicineName: "CELESTAR",
                dose: "-",
                medicineForm: "Tablet",
                stock: 0,
                frequency: "Sesuai jadwal aktif",
                times: [],
                mealRule: "Tidak tergantung makan",
                startDate: "2026-05-09",
                reminderEnabled: true,
                status: "Aktif",
              },
              risk: "Low Risk",
              reasoning: "Hai! Obat **CELESTAR** memiliki *risk level* **ringan** dengan skor **2,5/5**. AI service tidak memberikan rekomendasi makanan pengganti, sehingga cukup ikuti arahan dokter.",
              recommendation: "",
            },
          ],
        }}
      />,
    );

    expect(screen.getByText("Obat CELESTAR memiliki risk level ringan dengan skor 2,5/5.")).toHaveClass("text-justify");
    expect(screen.queryByText(/^Hai!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/rekomendasi makanan pengganti/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\*/)).not.toBeInTheDocument();
  });

  it("renders normalized detection boxes without shrinking them as pixel coordinates", () => {
    const { container } = render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          scan: {
            ...analysis.scan,
            detectedItems: [
              {
                label: "nasi-goreng",
                labelDisplay: "Nasi Goreng",
                confidence: 0.81,
                boundingBox: { x1: 0.25, y1: 0.2, x2: 0.75, y2: 0.7 },
              },
            ],
          },
        }}
      />,
    );

    const image = screen.getByAltText("Nasi goreng");
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1000 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 1000 });
    fireEvent.load(image);

    const detectionBox = container.querySelector("[data-food-detection-box]") as HTMLElement;
    expect(detectionBox).toBeInTheDocument();
    expect(detectionBox.style.left).toBe("25%");
    expect(detectionBox.style.top).toBe("20%");
    expect(detectionBox.style.width).toBe("50%");
    expect(detectionBox.style.height).toBe("50%");
  });

  it("clamps overflowing detection boxes by their right and bottom edges", () => {
    const { container } = render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          scan: {
            ...analysis.scan,
            detectedItems: [
              {
                label: "rendang",
                labelDisplay: "Rendang",
                confidence: 0.42,
                boundingBox: { x1: 900, y1: 800, x2: 1300, y2: 1400 },
              },
            ],
          },
        }}
      />,
    );

    const image = screen.getByAltText("Nasi goreng");
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1000 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 1000 });
    fireEvent.load(image);

    const detectionBox = container.querySelector("[data-food-detection-box]") as HTMLElement;
    expect(detectionBox).toBeInTheDocument();
    expect(detectionBox.style.left).toBe("90%");
    expect(detectionBox.style.top).toBe("80%");
    expect(detectionBox.style.width).toBe("10%");
    expect(detectionBox.style.height).toBe("20%");
  });

  it("uses the AI image size metadata when rendering absolute detection boxes", () => {
    const { container } = render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          scan: {
            ...analysis.scan,
            detectedItems: [
              {
                label: "nasi-goreng",
                labelDisplay: "Nasi Goreng",
                confidence: 0.83,
                boundingBox: { x1: 97.1, y1: 211.7, x2: 817.8, y2: 1006.3, imageWidth: 1402, imageHeight: 1122 },
              },
            ],
          },
        }}
      />,
    );

    const image = screen.getByAltText("Nasi goreng");
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1000 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 1000 });
    fireEvent.load(image);

    const detectionBox = container.querySelector("[data-food-detection-box]") as HTMLElement;
    expect(detectionBox).toBeInTheDocument();
    expect(detectionBox.style.left).toBe("6.9258%");
    expect(detectionBox.style.top).toBe("18.8681%");
    expect(detectionBox.style.width).toBe("51.4051%");
    expect(detectionBox.style.height).toBe("70.82%");
  });

  it("keeps every detection label visible when boxes touch the top edge", () => {
    const { container } = render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          scan: {
            ...analysis.scan,
            detectedItems: [
              {
                label: "nasi-goreng",
                labelDisplay: "Nasi Goreng",
                confidence: 0.81,
                boundingBox: { x1: 0.1, y1: 0.2, x2: 0.5, y2: 0.7 },
              },
              {
                label: "rendang",
                labelDisplay: "Rendang",
                confidence: 0.42,
                boundingBox: { x1: 0.3, y1: 0.01, x2: 0.7, y2: 0.4 },
              },
            ],
          },
        }}
      />,
    );

    const image = screen.getByAltText("Nasi goreng");
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1000 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 1000 });
    fireEvent.load(image);

    expect(screen.getByText("Nasi Goreng 81%")).toBeInTheDocument();
    expect(screen.getByText("Rendang 42%")).toBeInTheDocument();

    const labels = Array.from(container.querySelectorAll("[data-food-detection-label]")) as HTMLElement[];
    expect(labels).toHaveLength(2);
    expect(labels[0].className).toContain("-top-6");
    expect(labels[1].className).toContain("top-0");
    expect(labels[1].className).not.toContain("-top-6");
  });

  it("keeps labels inside the image when boxes touch the side edges", () => {
    const { container } = render(
      <FoodScanAnalysisView
        scanId="scan-1"
        analysisData={{
          ...analysis,
          scan: {
            ...analysis.scan,
            detectedItems: [
              {
                label: "nasi-goreng",
                labelDisplay: "Nasi Goreng",
                confidence: 0.81,
                boundingBox: { x1: 0, y1: 0.2, x2: 0.35, y2: 0.7 },
              },
              {
                label: "rendang",
                labelDisplay: "Rendang",
                confidence: 0.42,
                boundingBox: { x1: 0.78, y1: 0.2, x2: 1, y2: 0.5 },
              },
            ],
          },
        }}
      />,
    );

    const image = screen.getByAltText("Nasi goreng");
    Object.defineProperty(image, "naturalWidth", { configurable: true, value: 1000 });
    Object.defineProperty(image, "naturalHeight", { configurable: true, value: 1000 });
    fireEvent.load(image);

    const labels = Array.from(container.querySelectorAll("[data-food-detection-label]")) as HTMLElement[];
    expect(labels).toHaveLength(2);
    expect(labels[0].className).toContain("left-0");
    expect(labels[0].className).not.toContain("-left-0.5");
    expect(labels[1].className).toContain("right-0");
    expect(labels[1].className).not.toContain("-right-0.5");
  });
});
