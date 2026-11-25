import { defineConfig, devices } from "@playwright/test";

const origin = "http://127.0.0.1:3101";
export default defineConfig({
  testDir: "./tests/supabase",
  workers: 1,
  timeout: 45_000,
  use: { ...devices["Desktop Chrome"], baseURL: origin, trace: "off" },
  webServer: {
    command: "pnpm start --hostname 127.0.0.1 --port 3101",
    url: origin + "/staff/login",
    reuseExistingServer: false,
  },
});
