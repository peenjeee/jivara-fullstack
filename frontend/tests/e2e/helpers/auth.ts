import type { BrowserContext, Page } from "@playwright/test";

type Role = "super_admin" | "admin" | "nurse" | "patient";

interface E2EUser {
  readonly id: string;
  readonly fullName: string;
  readonly email: string;
  readonly role: Role;
  readonly accountStatus: string;
  readonly age: number;
}

const defaultUserByRole: Record<Role, E2EUser> = {
  super_admin: { id: "super-1", fullName: "Super Admin", email: "super@test.local", role: "super_admin", accountStatus: "active", age: 35 },
  admin: { id: "admin-1", fullName: "Admin Test", email: "admin@test.local", role: "admin", accountStatus: "active", age: 30 },
  nurse: { id: "nurse-1", fullName: "Nurse Test", email: "nurse@test.local", role: "nurse", accountStatus: "active", age: 28 },
  patient: { id: "patient-1", fullName: "Patient Test", email: "patient@test.local", role: "patient", accountStatus: "active", age: 40 },
};

const base64Url = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");

export const createJwt = (role: Role) => [
  base64Url({ alg: "none", typ: "JWT" }),
  base64Url({ role, exp: Math.floor(Date.now() / 1000) + 60 * 60 }),
  "e2e",
].join(".");

export async function loginAs(context: BrowserContext, page: Page, role: Role, user = defaultUserByRole[role]) {
  const token = createJwt(role);
  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({ json: { data: { user } } });
  });
  await page.route("**/api/auth/refresh", async (route) => {
    await route.fulfill({ json: { data: { access_token: token, user } } });
  });
  await page.route("**/api/auth/logout", async (route) => {
    await route.fulfill({ json: { data: {} } });
  });
  await context.addCookies([
    { name: "jivara-token", value: token, domain: "127.0.0.1", path: "/" },
    { name: "jivara-refresh-token", value: "e2e-refresh-token", domain: "127.0.0.1", path: "/" },
    { name: "jivara-role", value: role, domain: "127.0.0.1", path: "/" },
    { name: "jivara-account-status", value: user.accountStatus, domain: "127.0.0.1", path: "/" },
  ]);
  await context.addInitScript(({ storedUser }) => {
    window.localStorage.setItem("jivara-auth-storage", JSON.stringify({
      state: { user: storedUser, isAuthenticated: true, hasHydrated: true },
      version: 2,
    }));
  }, { storedUser: user });
}
