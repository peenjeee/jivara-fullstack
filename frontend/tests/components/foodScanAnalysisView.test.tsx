import { render, screen } from "@testing-library/react";
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
});
