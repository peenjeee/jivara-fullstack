import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/store/auth";
import type { User } from "@/types/auth";

const user: User = {
  id: "user-1",
  fullName: "Admin Test",
  email: "admin@test.local",
  phone: "6281",
  role: "admin",
  accountStatus: "active",
  age: 30,
};

describe("auth store", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, hasHydrated: false });
  });

  it("stores user and in-memory token on auth", () => {
    useAuthStore.getState().setAuth(user, "access-token");
    expect(useAuthStore.getState().user?.email).toBe("admin@test.local");
    expect(useAuthStore.getState().token).toBe("access-token");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("updates user without dropping existing fields", () => {
    useAuthStore.getState().setAuth(user, "access-token");
    useAuthStore.getState().updateUser({ fullName: "Updated Admin" });
    expect(useAuthStore.getState().user).toMatchObject({ email: "admin@test.local", fullName: "Updated Admin" });
  });

  it("clears auth state on logout", () => {
    useAuthStore.getState().setAuth(user, "access-token");
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
