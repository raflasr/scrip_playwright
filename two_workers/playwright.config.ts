import { defineConfig } from '@playwright/test';

export default defineConfig({
  fullyParallel: true,
  workers: 2,
  timeout: 120_000,          // 2 menit per test
  use: {
    baseURL: 'https://hakuhodo-dev.devnstg.com/',
    headless: false,
    navigationTimeout: 90_000,
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: 'worker-A',
      testMatch: '**/ef22.spec.ts',
      use: { browserName: 'chromium' },
    },
    {
      name: 'worker-B',
      testMatch: '**/ef22.spec.ts',
      use: { browserName: 'chromium' },
    },
  ],
});
