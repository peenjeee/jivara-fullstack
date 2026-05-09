import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import AdminApprovalsPage from "@/components/admin/AdminApprovalsPage";
import api from "@/lib/axios";
import { showConfirm, showError, showToast } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/admin-approvals",
}));

vi.mock("@/lib/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("@/lib/swal", () => ({
  showConfirm: vi.fn(),
  showError: vi.fn(),
  showToast: vi.fn(),
}));

const mockedGet = api.get as Mock;
const mockedPost = api.post as Mock;

const pendingAdmin = {
  id: "admin-1",
  fullName: "Admin Baru",
  email: "admin@test.local",
  phone: "6281",
  role: "admin",
  accountStatus: "pending",
  age: 30,
  createdAt: "2026-05-09T08:00:00.000Z",
};

describe("admin approvals feature", () => {
  beforeEach(() => {
    replace.mockClear();
    mockedGet.mockReset();
    mockedPost.mockReset();
    vi.mocked(showConfirm).mockReset();
    vi.mocked(showError).mockClear();
    vi.mocked(showToast).mockClear();
    useAuthStore.setState({
      user: { id: "super-1", fullName: "Super Admin", email: "super@test.local", role: "super_admin", accountStatus: "active", age: 35 },
      token: "token",
      isAuthenticated: true,
      hasHydrated: true,
    });
  });

  it("loads pending admins and approves one after confirmation", async () => {
    mockedGet.mockResolvedValueOnce({ data: { data: { users: [pendingAdmin], summary: { pending: 1, active: 0, rejected: 0, suspended: 0 } } } });
    mockedPost.mockResolvedValueOnce({ data: { data: {} } });
    vi.mocked(showConfirm).mockResolvedValueOnce({ isConfirmed: true, isDenied: false, isDismissed: false });

    render(<AdminApprovalsPage />);

    expect(await screen.findAllByText("Admin Baru")).not.toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Setujui Admin Baru" })[0]);

    await waitFor(() => expect(mockedPost).toHaveBeenCalledWith("/auth/admin-approvals/admin-1/approve"));
    expect(showToast).toHaveBeenCalledWith("Admin berhasil disetujui.", "success");
    expect(screen.getByText("Tidak ada pengajuan admin yang menunggu persetujuan.")).toBeInTheDocument();
  });

  it("redirects non-super-admin users away", async () => {
    useAuthStore.setState({
      user: { id: "admin-2", fullName: "Admin", email: "admin@test.local", role: "admin", accountStatus: "active", age: 30 },
      token: "token",
      isAuthenticated: true,
      hasHydrated: true,
    });

    render(<AdminApprovalsPage />);

    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
    expect(mockedGet).not.toHaveBeenCalled();
  });

  it("shows an error when approvals cannot be loaded", async () => {
    mockedGet.mockRejectedValueOnce(new Error("network"));

    render(<AdminApprovalsPage />);

    await waitFor(() => expect(showError).toHaveBeenCalledWith("Gagal memuat daftar pengajuan admin."));
  });
});
