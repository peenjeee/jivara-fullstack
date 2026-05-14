import { beforeEach, describe, expect, it } from "vitest";
import { useNurseStore } from "@/store/nurses";

describe("nurse store", () => {
  beforeEach(() => {
    useNurseStore.setState({ nurses: [] });
  });

  it("stores nurses loaded from the API", () => {
    useNurseStore.getState().setNurses([{ id: "nurse-1", fullName: "Nurse A", email: "a@test.local", phone: "6281", gender: "Wanita", status: "Aktif", joinedAt: "01 Jan 2026", temporaryPassword: false }]);
    expect(useNurseStore.getState().nurses).toEqual([expect.objectContaining({ id: "nurse-1", fullName: "Nurse A" })]);
  });
});
