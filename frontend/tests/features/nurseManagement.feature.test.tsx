import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NurseListPage from "@/components/admin/NurseListPage";
import { getNursesFromApi, getNursesPageFromApi, updateNurseViaApi } from "@/lib/nurseApi";
import { showConfirm, showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import { useNurseStore } from "@/store/nurses";
import type { NurseRecord } from "@/lib/mocks/nurses";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  usePathname: () => "/nurses",
}));

vi.mock("@/lib/nurseApi", () => ({
  createNurseViaApi: vi.fn(),
  deactivateNurseViaApi: vi.fn(),
  getNursesFromApi: vi.fn(),
  getNursesPageFromApi: vi.fn(),
  updateNurseViaApi: vi.fn(),
}));

vi.mock("@/lib/swal", () => ({
  showConfirm: vi.fn(),
  showError: vi.fn(),
  showToast: vi.fn(),
  showWarning: vi.fn(),
}));

const nurse: NurseRecord = {
  id: "NRS-001",
  fullName: "Suster Nina",
  email: "nina@test.local",
  phone: "6281",
  gender: "Wanita",
  status: "Aktif",
  joinedAt: "09 Mei 2026",
  temporaryPassword: false,
};

describe("nurse management feature", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    vi.mocked(getNursesFromApi).mockReset();
    vi.mocked(getNursesPageFromApi).mockReset();
    vi.mocked(updateNurseViaApi).mockReset();
    vi.mocked(showConfirm).mockReset();
    vi.mocked(showToast).mockClear();
    vi.mocked(showWarning).mockClear();
    useAuthStore.setState({ user: { id: "admin-1", fullName: "Admin", email: "admin@test.local", role: "admin", accountStatus: "active", age: 30 }, isAuthenticated: true, hasHydrated: true });
    useNurseStore.setState({ nurses: [] });
  });

  it("loads nurses, searches, and opens detail", async () => {
    vi.mocked(getNursesFromApi).mockResolvedValue([nurse]);
    vi.mocked(getNursesPageFromApi).mockResolvedValue({ nurses: [nurse], meta: { page: 1, limit: 10, total: 1 } });

    render(<NurseListPage />);

    expect(await screen.findAllByText("Suster Nina")).not.toHaveLength(0);
    fireEvent.change(screen.getByPlaceholderText("Cari perawat ..."), { target: { value: "Nina" } });
    expect(screen.getAllByText("Suster Nina")).not.toHaveLength(0);

    fireEvent.click(screen.getAllByRole("button", { name: "Lihat detail Suster Nina" })[0]);
    expect(push).toHaveBeenCalledWith("/nurses/NRS-001");
  });

  it("toggles nurse status after confirmation", async () => {
    vi.mocked(getNursesFromApi).mockResolvedValue([nurse]);
    vi.mocked(getNursesPageFromApi).mockResolvedValue({ nurses: [nurse], meta: { page: 1, limit: 10, total: 1 } });
    vi.mocked(showConfirm).mockResolvedValueOnce({ isConfirmed: true, isDenied: false, isDismissed: false });
    vi.mocked(updateNurseViaApi).mockResolvedValueOnce({ ...nurse, status: "Nonaktif" });

    render(<NurseListPage />);

    expect(await screen.findAllByText("Suster Nina")).not.toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Nonaktifkan Suster Nina" })[0]);

    await waitFor(() => expect(updateNurseViaApi).toHaveBeenCalledWith("NRS-001", expect.objectContaining({ status: "Nonaktif" })));
    expect(showToast).toHaveBeenCalledWith("Status perawat menjadi Nonaktif.");
  });

  it("redirects patient role away from nurse management", async () => {
    useAuthStore.setState({ user: { id: "patient-1", fullName: "Pasien", email: "patient@test.local", role: "patient", accountStatus: "active", age: 30 }, isAuthenticated: true, hasHydrated: true });

    render(<NurseListPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});
