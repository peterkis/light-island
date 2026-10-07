import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', testMatch: /.*\.spec\.ts/, fullyParallel: false, workers: 1,
  timeout: 35000, reporter: [['list'], ['json', { outputFile: 'evidence/playwright-results.json' }]],
  use: { channel: 'chrome', baseURL: 'http://127.0.0.1:1420', viewport: { width: 1440, height: 1050 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command: 'npm run clinical:server', url: 'http://127.0.0.1:17322/api/clinical-state', reuseExistingServer: true, timeout: 60000 },
    { command: 'npm run dev', url: 'http://127.0.0.1:1420', reuseExistingServer: true, timeout: 60000 },
    { command: 'npm run demo:server', url: 'http://127.0.0.1:17321/api/health', reuseExistingServer: true, timeout: 60000 },
  ],
});
