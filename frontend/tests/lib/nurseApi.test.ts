import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { createNurseViaApi, deactivateNurseViaApi, getNursesFromApi, updateNurseViaApi } from "@/lib/nurseApi";
import type { NurseFormValues } from "@/store/nurses";

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockedGet = api.get as Mock;
const mockedPost = api.post as Mock;
const mockedPut = api.put as Mock;
const mockedDelete = api.delete as Mock;
const formValues: NurseFormValues = { fullName: "Nina", email: "nina@test.local", phone: "6281", gender: "Wanita", password: "secret", status: "Aktif" };

describe("nurseApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
    mockedDelete.mockReset();
  });

  it("maps nurse list response", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: "nurse-1", user: { fullName: "Nina", email: "nina@test.local", phone: "6281" }, gender: "female", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" }] } });

    const nurses = await getNursesFromApi();

    expect(mockedGet).toHaveBeenCalledWith("/nurses", { params: { limit: 100 } });
    expect(nurses[0]).toMatchObject({ id: "nurse-1", fullName: "Nina", gender: "Wanita", status: "Aktif", temporaryPassword: false });
  });

  it("creates active nurse with API payload", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { id: "nurse-1", fullName: "Nina", email: "nina@test.local", phone: "6281", gender: "female", isActive: true } } });

    const nurse = await createNurseViaApi(formValues);

    expect(mockedPost).toHaveBeenCalledWith("/nurses", expect.objectContaining({ fullName: "Nina", gender: "female", isActive: true, password: "secret" }));
    expect(nurse).toMatchObject({ id: "nurse-1", temporaryPassword: true });
  });

  it("updates and deactivates nurse with encoded id", async () => {
    mockedPut.mockResolvedValueOnce({ data: { data: { id: "nurse/1", fullName: "Nina", email: "nina@test.local", phone: "6281", gender: "female", isActive: false } } });

    await expect(updateNurseViaApi("nurse/1", { ...formValues, password: "", status: "Nonaktif" })).resolves.toMatchObject({ status: "Nonaktif", temporaryPassword: false });
    await deactivateNurseViaApi("nurse/1");

    expect(mockedPut).toHaveBeenCalledWith("/nurses/nurse%2F1", expect.objectContaining({ isActive: false }));
    expect(mockedDelete).toHaveBeenCalledWith("/nurses/nurse%2F1");
  });
});
