import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 60000, // dinaikkan karena network latency deployment

  // ====================================================
  // MULTI-WORKER — minimal 2 worker parallel
  // ====================================================
  workers: 2,
  fullyParallel: true,

  use: {
    baseURL: 'https://hakuhodo-dev.devnstg.com/',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // webServer dihapus — tidak perlu spin up local server kalau testing ke deployment
});
