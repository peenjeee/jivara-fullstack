import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://localhost:${port}`;
const workers = Number(process.env.PLAYWRIGHT_WORKERS ?? 1);

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers,
  reporter: process.env.CI ? "github" : "list",
  timeout: 60_000,
  use: {
    baseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    serviceWorkers: "block",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
        },
      },
    },
  ],
  webServer: {
    command: `npm run build && npm run start -- --hostname localhost --port ${port}`,
    url: baseURL,
    timeout: 180_000,
    reuseExistingServer: false,
    env: {
      NEXT_TELEMETRY_DISABLED: "1",
      NEXT_IMAGE_UNOPTIMIZED: "1",
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:3001/api",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
    },
  },
});
