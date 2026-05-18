import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import axios from "axios";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import LoginForm from "@/components/auth/LoginForm";
import { closeAlert, showError, showLoading, showToast, showWarning } from "@/lib/swal";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types/auth";

const push = vi.fn();
const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
}));

vi.mock("axios", () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
    })),
    post: vi.fn(),
  },
}));

vi.mock("@/lib/swal", () => ({
  closeAlert: vi.fn(),
  showError: vi.fn(),
  showLoading: vi.fn(),
  showToast: vi.fn(),
  showWarning: vi.fn(),
}));

const axiosPost = axios.post as Mock;

const user: User = {
  id: "user-1",
  fullName: "Nurse Test",
  email: "nurse@test.local",
  role: "nurse",
  accountStatus: "active",
  age: 28,
};

describe("auth login feature", () => {
  beforeEach(() => {
    push.mockClear();
    replace.mockClear();
    window.history.replaceState(null, "", "/login");
    axiosPost.mockReset();
    vi.mocked(closeAlert).mockClear();
    vi.mocked(showError).mockClear();
    vi.mocked(showLoading).mockClear();
    vi.mocked(showToast).mockClear();
    vi.mocked(showWarning).mockClear();
    useAuthStore.setState({ user: null, isAuthenticated: false, hasHydrated: true });
  });

  it("validates required fields before requesting login", () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));

    expect(showWarning).toHaveBeenCalledWith("Harap isi semua kolom yang tersedia.");
    expect(axiosPost).not.toHaveBeenCalled();
  });

  it("logs in, stores auth state, and redirects to callback url", async () => {
    window.history.replaceState(null, "", "/login?callbackUrl=/patients");
    axiosPost.mockResolvedValueOnce({ data: { data: { user, access_token: "access-token" } } });
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "nurse@test.local" } });
    fireEvent.change(screen.getByLabelText(/^kata sandi/i), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/patients"));
    expect(axiosPost).toHaveBeenCalledWith("/api/auth/login", { identifier: "nurse@test.local", password: "secret123" });
    expect(showLoading).toHaveBeenCalledWith("Mohon Tunggu", "Sedang masuk ke akun Anda...");
    expect(showToast).toHaveBeenCalledWith("Anda berhasil masuk.", "success");
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true });
  });

  it("shows login error when authentication fails", async () => {
    axiosPost.mockRejectedValueOnce(new Error("invalid"));
    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: "nurse@test.local" } });
    fireEvent.change(screen.getByLabelText(/^kata sandi/i), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /masuk/i }));

    await waitFor(() => expect(showError).toHaveBeenCalledWith("Login gagal. Periksa kembali email dan kata sandi Anda."));
    expect(closeAlert).toHaveBeenCalledTimes(1);
    expect(push).not.toHaveBeenCalled();
  });
});
