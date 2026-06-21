import { defineConfig } from "playwright/test";

export default defineConfig({
  testDir: "./src/browser-smoke",
  testMatch: /.*\.pw\.ts/,
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5184",
    browserName: "chromium",
    headless: true,
    screenshot: "off",
    trace: "off",
    video: "off"
  },
  webServer: {
    command: "npm run dev -- --port 5184 --strictPort",
    url: "http://127.0.0.1:5184",
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: "pipe",
    stderr: "pipe"
  }
});
