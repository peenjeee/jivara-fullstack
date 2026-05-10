import type { BrowserContext, Page, Route } from "@playwright/test";

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
  const appUrl = `http://localhost:${process.env.PLAYWRIGHT_PORT ?? 3000}`;
  const fulfillStatus = async (route: Route) => {
    await route.fulfill({ json: { data: { user } } });
  };
  const fulfillRefresh = async (route: Route) => {
    await route.fulfill({ json: { data: { access_token: token, user } } });
  };
  const fulfillLogout = async (route: Route) => {
    await route.fulfill({ json: { data: {} } });
  };

  await context.route("**/api/auth/status", fulfillStatus);
  await context.route("**/api/auth/refresh", fulfillRefresh);
  await context.route("**/api/auth/logout", fulfillLogout);
  await page.route("**/api/auth/status", fulfillStatus);
  await page.route("**/api/auth/refresh", fulfillRefresh);
  await page.route("**/api/auth/logout", fulfillLogout);
  await context.addCookies([
    { name: "jivara-token", value: token, url: appUrl },
    { name: "jivara-refresh-token", value: "e2e-refresh-token", url: appUrl },
    { name: "jivara-role", value: role, url: appUrl },
    { name: "jivara-account-status", value: user.accountStatus, url: appUrl },
  ]);
  const seedAuth = ({ storedUser }: { storedUser: E2EUser }) => {
    window.localStorage.setItem("jivara-auth-storage", JSON.stringify({
      state: { user: storedUser, isAuthenticated: true },
      version: 2,
    }));
  };

  await context.addInitScript(seedAuth, { storedUser: user });
  await page.addInitScript(seedAuth, { storedUser: user });
}

export async function waitForHydration(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.nextjsRouterTree !== undefined || document.readyState === "complete");
  await page.waitForLoadState("networkidle");
}

export async function gotoApp(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
}
