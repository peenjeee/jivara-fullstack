import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PatientAdherenceHeatmap from "@/components/patient-dashboard/PatientAdherenceHeatmap";
import type { MedicationScheduleRecord } from "@/lib/mocks/schedules";

const schedule: MedicationScheduleRecord = {
  id: "schedule-1",
  patientId: "patient-1",
  patientName: "Budi Santoso",
  patientAvatar: "BS",
  medicineName: "Atorvastatin",
  dose: "5 mg",
  medicineForm: "Tablet",
  stock: 0,
  frequency: "2 kali sehari",
  mealRule: "Tidak tergantung makan",
  times: ["08:00", "20:00"],
  startDate: "2026-05-19",
  endDate: "2026-05-19",
  reminderEnabled: true,
  status: "Selesai",
};

describe("PatientAdherenceHeatmap", () => {
  it("keeps recorded adherence visible when local schedule dates miss that day", () => {
    render(
      <PatientAdherenceHeatmap
        schedules={[schedule]}
        dailyBreakdown={[
          { date: "2026-05-14", scheduled: 2, confirmed: 2, missed: 0, snoozed: 0 },
          { date: "2026-05-20", scheduled: 2, confirmed: 0, missed: 0, snoozed: 0 },
        ]}
      />,
    );

    expect(screen.getByRole("button", { name: /14 Mei 2026 - 100% \(2\/2 dosis dikonfirmasi\)/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /20 Mei 2026 - Belum ada data/i })).toBeInTheDocument();
  });
});
