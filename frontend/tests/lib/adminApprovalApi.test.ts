import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { approveRegistrationViaApi, getPendingRegistrationsFromApi, rejectRegistrationViaApi } from "@/lib/adminApprovalApi";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

const mockedGet = api.get as Mock;
const mockedPatch = api.patch as Mock;

describe("adminApprovalApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPatch.mockReset();
  });

  it("returns pending registrations", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: "admin-1", fullName: "Admin Baru", email: "admin@test.local", role: "admin", approvalStatus: "pending" }] } });

    await expect(getPendingRegistrationsFromApi()).resolves.toEqual([expect.objectContaining({ id: "admin-1" })]);
    expect(mockedGet).toHaveBeenCalledWith("/auth/registrations/pending");
  });

  it("approves and rejects registrations with encoded ids", async () => {
    await approveRegistrationViaApi("admin/1");
    await rejectRegistrationViaApi("admin/1");

    expect(mockedPatch).toHaveBeenNthCalledWith(1, "/auth/registrations/admin%2F1/approve");
    expect(mockedPatch).toHaveBeenNthCalledWith(2, "/auth/registrations/admin%2F1/reject");
  });
});
