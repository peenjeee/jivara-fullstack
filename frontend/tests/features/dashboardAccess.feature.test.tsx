import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardRoleGate from "@/components/dashboard/DashboardRoleGate";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types/auth";

const replace = vi.fn();

vi.mock("next/navigation", () => {
  const mockRedirect = vi.fn((url: string) => {
    replace(url);
    const error: Error & { digest?: string } = new Error("NEXT_REDIRECT");
    error.digest = `NEXT_REDIRECT${url}`;
    throw error;
  });
  return {
    redirect: mockRedirect,
    useRouter: () => ({ replace }),
  };
});

const nurseUser: User = {
  id: "user-1",
  fullName: "Nurse Test",
  email: "nurse@test.local",
  role: "nurse",
  accountStatus: "active",
  age: 28,
};

describe("dashboard access feature", () => {
  beforeEach(() => {
    replace.mockClear();
    useAuthStore.setState({ user: null, isAuthenticated: false, hasHydrated: false });
  });

  it("shows protected content for allowed hydrated role", () => {
    useAuthStore.setState({ user: nurseUser, hasHydrated: true, isAuthenticated: true });

    render(<DashboardRoleGate allowedRoles={["nurse"]}>Konten perawat</DashboardRoleGate>);

    expect(screen.getByText("Konten perawat")).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login", () => {
    useAuthStore.setState({ user: null, hasHydrated: true, isAuthenticated: false });

    try { render(<DashboardRoleGate allowedRoles={["nurse"]}>Konten perawat</DashboardRoleGate>); } catch {}
    expect(replace).toHaveBeenCalledWith("/login");
  });

  it("redirects disallowed roles to their fallback dashboard", () => {
    useAuthStore.setState({ user: nurseUser, hasHydrated: true, isAuthenticated: true });

    try { render(<DashboardRoleGate allowedRoles={["admin"]}>Konten admin</DashboardRoleGate>); } catch {}
    expect(replace).toHaveBeenCalledWith("/dashboard");
    expect(screen.queryByText("Konten admin")).not.toBeInTheDocument();
  });

  it("redirects super admin to admin approvals fallback", () => {
    useAuthStore.setState({
      user: { id: "super-1", fullName: "Super Admin", email: "super@test.local", role: "super_admin", accountStatus: "active", age: 35 },
      hasHydrated: true,
      isAuthenticated: true,
    });

    try { render(<DashboardRoleGate allowedRoles={["admin"]}>Konten admin</DashboardRoleGate>); } catch {}
    expect(replace).toHaveBeenCalledWith("/admin-approvals");
  });
});
