import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import api from "@/lib/axios";
import { clearNursesCache, createNurseViaApi, deactivateNurseViaApi, getNursesFromApi, updateNurseViaApi } from "@/lib/nurseApi";
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
const nurseId = "11111111-1111-4111-8111-111111111111";
const formValues: NurseFormValues = { fullName: "Nina", email: "nina@test.local", phone: "6281", gender: "Wanita", password: "secret", status: "Aktif" };

describe("nurseApi", () => {
  beforeEach(() => {
    mockedGet.mockReset();
    mockedPost.mockReset();
    mockedPut.mockReset();
    mockedDelete.mockReset();
    clearNursesCache();
  });

  it("maps nurse list response", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: nurseId, user: { fullName: "Nina", email: "nina@test.local", phone: "6281" }, gender: "female", isActive: true, createdAt: "2026-05-09T08:00:00.000Z" }] } });

    const nurses = await getNursesFromApi();

    expect(mockedGet).toHaveBeenCalledWith("/nurses", { params: { limit: 100 } });
    expect(nurses[0]).toMatchObject({ id: nurseId, fullName: "Nina", gender: "Wanita", status: "Aktif", temporaryPassword: false });
  });

  it("creates active nurse with API payload", async () => {
    mockedPost.mockResolvedValueOnce({ data: { data: { id: nurseId, fullName: "Nina", email: "nina@test.local", phone: "6281", gender: "female", isActive: true } } });

    const nurse = await createNurseViaApi(formValues);

    expect(mockedPost).toHaveBeenCalledWith("/nurses", expect.objectContaining({ fullName: "Nina", gender: "female", isActive: true, password: "secret" }));
    expect(nurse).toMatchObject({ id: nurseId, temporaryPassword: true });
  });

  it("updates and deactivates nurse with encoded id", async () => {
    mockedPut.mockResolvedValueOnce({ data: { data: { id: nurseId, fullName: "Nina", email: "nina@test.local", phone: "6281", gender: "female", isActive: false } } });

    await expect(updateNurseViaApi(nurseId, { ...formValues, password: "", status: "Nonaktif" })).resolves.toMatchObject({ status: "Nonaktif", temporaryPassword: false });
    await deactivateNurseViaApi(nurseId);

    expect(mockedPut).toHaveBeenCalledWith(`/nurses/${nurseId}`, expect.objectContaining({ isActive: false }));
    expect(mockedDelete).toHaveBeenCalledWith(`/nurses/${nurseId}`);
  });

  it("resolves local nurse id before update", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: [{ id: nurseId, fullName: "Nina", email: "nina@test.local", phone: "6281", gender: "female", isActive: true }] } });
    mockedPut.mockResolvedValueOnce({ data: { data: { id: nurseId, fullName: "Nina", email: "nina@test.local", phone: "6281", gender: "female", isActive: true } } });

    await expect(updateNurseViaApi("NURSE-001", formValues)).resolves.toMatchObject({ id: nurseId });

    expect(mockedGet).toHaveBeenCalledWith("/nurses", { params: { limit: 100 } });
    expect(mockedPut).toHaveBeenCalledWith(`/nurses/${nurseId}`, expect.objectContaining({ email: "nina@test.local" }));
  });
});
