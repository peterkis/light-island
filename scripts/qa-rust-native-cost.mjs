// Finite Release measurements against the QA-owned WebView only.
import {chromium, expect} from '@playwright/test';
import {readFile, writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {join, resolve} from 'node:path';
import assert from 'node:assert/strict';

const output = process.env.ISLAND_QA_OUTPUT;
assert(output, 'ISLAND_QA_OUTPUT must identify an owned QA session');
const verification = JSON.parse(execFileSync('powershell', ['-NoProfile', '-File',
  'scripts/optimization-qa.ps1', '-Action', 'Verify', '-Output', output],
{encoding: 'utf8'}).replace(/^\uFEFF/, ''));
assert(verification.verified && verification.port === 9223);
const out = resolve(output);
const owner = JSON.parse((await readFile(join(out, 'ownership.json'), 'utf8')).replace(/^\uFEFF/, ''));
const browser = await chromium.connectOverCDP('http://127.0.0.1:9223');
const page = browser.contexts().flatMap(context => context.pages()).find(p => p.url().includes('clinical.html?view=island'));
assert(page, 'Owned clinical island required');
const rows = [];
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const post = async data => assert((await fetch('http://127.0.0.1:17322/api/push', {
  method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data),
})).ok);
const report = {exeSHA256: owner.exeSHA256, ownership: verification, rows, errors,
  scope: 'Sequential Rust command round trips including IPC, with opt-in diagnostics; warm Release, no DWM frame claim'};
try {
  await post({type: 'clinical:reset'});
  await post({type: 'clinical:configure', settings: {privacy: false, locked: false, fullscreen: false, role: 'clinician', reduced: false, textScale: 1}});
  await post({type: 'clinical:scenario', scenario: 'S03', stage: 0});
  await expect(page.getByTestId('clinical-island')).toHaveAttribute('data-motion-phase', 'settled', {timeout: 15000});
  report.metrics = await page.evaluate(() => window.__TAURI_INTERNALS__.invoke('clinical_metrics'));
  const samples = await page.evaluate(async () => {
    const island = document.querySelector('[data-testid=clinical-island]');
    const path = island.querySelector('.ci-fill');
    const length = path.getTotalLength();
    const originalWidth = Number(island.dataset.currentWidth);
    const originalHeight = Number(island.dataset.currentHeight);
    const points = Array.from({length: 128}, (_, i) => {
      const p = path.getPointAtLength(length * i / 128);
      return [p.x / originalWidth, p.y / originalHeight];
    });
    const shape = (width, height) => ({width, height, radius: 40, ear: 10, top: 0, shift: 0,
      polygons: [points.map(([x, y]) => [x * width, y * height])]});
    const cases = ['metrics-control', 'region-only', 'region-handoff', 'cached-shadow', 'changing-shadow', 'luminance'];
    const result = [];
    const epoch = Date.now();
    let sequence = 0;
    for (let round = 0; round < 3; round++) {
      for (const kind of cases.slice(round).concat(cases.slice(0, round))) {
        for (let i = -3; i < 24; i++) {
          const width = kind === 'changing-shadow' ? 372 + (i + 3) % 8 : 372;
          const height = kind === 'changing-shadow' ? 168 + (i + 3) % 5 : 168;
          const target = shape(width, height);
          const started = performance.now();
          if (kind === 'metrics-control') {
            await window.__TAURI_INTERNALS__.invoke('clinical_metrics');
          } else if (kind === 'luminance') {
            const value = await window.__TAURI_INTERNALS__.invoke('clinical_background_luminance', {bodyHeight: 168});
            if (!Number.isFinite(value) || value < 0 || value > 1) throw new Error('Invalid luminance');
          } else {
            const accepted = await window.__TAURI_INTERNALS__.invoke('clinical_layout', {
              epoch, sequence: ++sequence, phase: 'frame', expanded: true, visible: true,
              bodyWidth: width, height, radius: 40, ear: 10, top: 0, shift: 0,
              shadowAlpha: kind.includes('shadow') ? 1 : 0, polygons: target.polygons,
              previous: kind === 'region-only' ? null : shape(width - 2, height - 1),
            });
            if (!accepted) throw new Error('Benchmark epoch rejected');
          }
          const ms = performance.now() - started;
          if (i >= 0) result.push({round, kind, ms, sequence: ['metrics-control', 'luminance'].includes(kind) ? null : sequence});
        }
      }
    }
    const diagnostics = await window.__TAURI_INTERNALS__.invoke('hover_diagnostics', {clear: true});
    const timings = new Map(diagnostics.events.filter(event => event.kind === 'clinical-layout' && event.detail.epoch === epoch).map(event => [event.detail.sequence, event.detail]));
    return result.map(row => ({...row, native: row.sequence === null ? null : timings.get(row.sequence) ?? null}));
  });
  rows.push(...samples);
  report.summary = Object.fromEntries([...new Set(rows.map(row => row.kind))].map(kind => {
    const values = rows.filter(row => row.kind === kind).map(row => row.ms).sort((a, b) => a - b);
    return [kind, {n: values.length, medianMs: values[Math.floor(values.length / 2)],
      p95Ms: values[Math.ceil(values.length * .95) - 1]}];
  }));
  assert.deepEqual(errors, []);
  report.status = 'PASS';
} catch (error) {
  report.status = 'FAIL';
  report.failure = String(error);
  process.exitCode = 1;
} finally {
  await post({type: 'clinical:reset'});
  await page.reload();
  await writeFile(join(out, 'rust-native-cost.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({...report, rows: undefined}, null, 2));
  await browser.close();
}
