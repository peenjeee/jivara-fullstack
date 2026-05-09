import { beforeEach, describe, expect, it } from "vitest";
import { useNurseStore } from "@/store/nurses";

describe("nurse store", () => {
  beforeEach(() => {
    useNurseStore.setState({ nurses: [], assignments: {} });
  });

  it("adds nurses with generated ids", () => {
    const nurse = useNurseStore.getState().addNurse({ fullName: "Nurse A", email: "a@test.local", phone: "6281", gender: "Wanita", password: "Password123", status: "Aktif" });
    expect(nurse.id).toBe("NRS-001");
    expect(useNurseStore.getState().nurses).toHaveLength(1);
  });

  it("updates nurse data and toggles status", () => {
    const nurse = useNurseStore.getState().addNurse({ fullName: "Nurse A", email: "a@test.local", phone: "6281", gender: "Wanita", password: "Password123", status: "Aktif" });
    useNurseStore.getState().updateNurse(nurse.id, { fullName: "Nurse B", email: "b@test.local", phone: "6282", gender: "Pria", password: "", status: "Aktif" });
    expect(useNurseStore.getState().nurses[0]).toMatchObject({ fullName: "Nurse B", gender: "Pria" });

    useNurseStore.getState().toggleNurseStatus(nurse.id);
    expect(useNurseStore.getState().nurses[0]?.status).toBe("Nonaktif");
  });

  it("reassigns patients to a target nurse", () => {
    useNurseStore.setState({ nurses: [], assignments: { "P-1": "NRS-001" } });
    useNurseStore.getState().reassignPatients(["P-1", "P-2"], "NRS-002");
    expect(useNurseStore.getState().assignments).toEqual({ "P-1": "NRS-002", "P-2": "NRS-002" });
  });
});
