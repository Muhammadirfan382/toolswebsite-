import { defineConfig, devices } from '@playwright/test';

const PORT = 4322;
// Locally we use the installed Microsoft Edge (no browser download). CI installs Chromium.
const channel = process.env.CI ? undefined : process.env.PW_CHANNEL ?? 'msedge';

export default defineConfig({
  testDir: 'tests/e2e',
  globalSetup: './tests/fixtures/generate.ts',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    acceptDownloads: true,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], channel } }],
  webServer: {
    command: `node scripts/serve-dist.mjs ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
  },
});
