import { defineConfig, devices } from '@playwright/test';
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [
    { name: 'movil', testMatch: /publico-.*\.spec\.ts/, use: { ...devices['Pixel 7'] } },
    { name: 'escritorio', testMatch: /admin-.*\.spec\.ts/, use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: { command: 'npm run dev', url: 'http://localhost:3000/r/salud', reuseExistingServer: true, timeout: 180_000 },
});
