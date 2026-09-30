import { test, expect } from '@playwright/test';
const base = 'http://127.0.0.1:17321';
async function post(request: any, data: object) { const r = await request.post(`${base}/api/push`, { data }); expect(r.ok()).toBeTruthy(); }
test.beforeEach(async ({ page, request }) => {
  await post(request, { type: 'reset' });
  await post(request, { type: 'configure', settings: { theme: 'ink', engine: 'gsap', shape: 'notch', privacy: true, focus: false, reduced: false } });
  await page.goto('/'); await expect(page.getByTestId('scenario-critical')).toBeEnabled();
  await page.waitForTimeout(500);
});
for (const engine of ['gsap', 'css']) test(`${engine}: bounded shallow height and no center drift during live transitions`, async ({ page, request }) => {
  await post(request, { type: 'configure', settings: { engine } });
  const sampler = page.evaluate(() => new Promise<any[]>(resolve => {
    const samples: any[] = []; const start = performance.now();
    function tick() {
      const r = document.querySelector('[data-testid="island"]')!.getBoundingClientRect();
      const p = document.querySelector('.island-stage')!.getBoundingClientRect();
      samples.push({ width: r.width, height: r.height, top: r.top - p.top, center: r.x + r.width / 2 - p.x - p.width / 2 });
      if (performance.now() - start < 2100) requestAnimationFrame(tick); else resolve(samples);
    }
    requestAnimationFrame(tick);
  }));
  await post(request, { type: 'demo', scenario: 'critical' }); await page.waitForTimeout(650);
  await post(request, { type: 'view', mode: 'compact' }); await page.waitForTimeout(600);
  await post(request, { type: 'view', mode: 'inbox' });
  const samples = await sampler;
  expect(samples.length).toBeGreaterThan(20);
  for (const s of samples) { expect(s.height).toBeGreaterThanOrEqual(33.9); expect(s.height).toBeLessThanOrEqual(56.1); expect(Math.abs(s.top)).toBeLessThan(.1); expect(Math.abs(s.center)).toBeLessThan(.6); }
  expect(Math.max(...samples.map(s => s.width)) - Math.min(...samples.map(s => s.width))).toBeGreaterThan(350);
});
test('message center, thread, confirmation and success remain a single horizontal row', async ({ page, request }) => {
  const island = page.getByTestId('island');
  for (const scenario of ['critical', 'unstable']) await post(request, { type: 'demo', scenario });
  await expect.poll(() => page.evaluate(() => window.__ISLAND_DEBUG__?.snapshot().model.items.length)).toBe(2);
  await expect(island).toHaveAttribute('data-mode', 'expanded');
  await page.getByRole('button', { name: '查看协作脉络', exact: true }).click();
  await expect(island).toHaveAttribute('data-mode', 'thread');
  await page.getByRole('button', { name: '下一条消息', exact: true }).click();
  await expect(page.locator('.rail-pager')).toContainText('2/2');
  await page.getByRole('button', { name: '返回消息', exact: true }).click();
  await page.getByRole('button', { name: '确认收到', exact: true }).click();
  await expect(island).toHaveAttribute('data-mode', 'success');
  expect((await island.boundingBox())!.height).toBe(56);
});
test('narrow preview keeps the acknowledgement and close controls within the pill', async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await post(request, { type: 'demo', scenario: 'critical' });
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'expanded');
  await page.waitForTimeout(550);
  const r = (await page.getByTestId('island').boundingBox())!;
  for (const name of ['确认收到', '收起灵动岛', '切换脱敏详情']) {
    const b = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
    expect(b.x).toBeGreaterThanOrEqual(r.x); expect(b.x + b.width).toBeLessThanOrEqual(r.x + r.width + 1);
    expect(b.y + b.height).toBeLessThanOrEqual(r.y + 56);
  }
  await page.getByRole('button', { name: '确认收到', exact: true }).click();
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'success');
});
