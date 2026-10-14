import { defineConfig } from '@playwright/test';
import {resolve} from 'node:path';
const evidence=resolve(process.env.ISLAND_E2E_EVIDENCE_DIR??`evidence/optimization-${new Date().toISOString().replace(/[:.]/g,'-')}`);
process.env.ISLAND_E2E_EVIDENCE_DIR=evidence;
const clinicalPort=process.env.ISLAND_TEST_SOURCE_PORT??'17322',legacyPort=process.env.ISLAND_TEST_LEGACY_PORT??'17321',webPort=process.env.ISLAND_TEST_WEB_PORT??'1420';
process.env.ISLAND_TEST_SOURCE_URL=`http://127.0.0.1:${clinicalPort}`;
process.env.ISLAND_TEST_LEGACY_URL=`http://127.0.0.1:${legacyPort}`;
export default defineConfig({
  testDir: './tests', testMatch: /.*\.spec\.ts/, fullyParallel: false, workers: 1,
  outputDir: resolve(evidence,'test-results'),
  timeout: 35000, reporter: [['list'], ['json', { outputFile: resolve(evidence,'playwright-results.json') }]],
  use: { channel: 'chrome', baseURL: `http://127.0.0.1:${webPort}`, viewport: { width: 1440, height: 1050 }, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: [
    { command:'npm run clinical:server',env:{ISLAND_DEMO_PORT:clinicalPort},url:`http://127.0.0.1:${clinicalPort}/api/clinical-state`, reuseExistingServer: false, timeout: 60000 },
    { command:`npm run dev -- --port ${webPort}`,env:{VITE_ISLAND_DEMO_URL:`ws://127.0.0.1:${clinicalPort}/events`,VITE_ISLAND_LEGACY_URL:`ws://127.0.0.1:${legacyPort}/events`},url:`http://127.0.0.1:${webPort}`, reuseExistingServer: false, timeout: 60000 },
    { command:'npm run demo:server',env:{ISLAND_DEMO_PORT:legacyPort},url:`http://127.0.0.1:${legacyPort}/api/health`, reuseExistingServer: false, timeout: 60000 },
  ],
});
