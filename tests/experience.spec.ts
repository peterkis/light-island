import { test, expect } from '@playwright/test';
import {evidencePath} from './evidence-path';
async function control(request: any, value: object) { await request.post('http://127.0.0.1:17321/api/push', { data: value }); }
test.beforeEach(async ({ page, request }) => {
  await control(request, { type: 'reset' });
  await control(request, { type: 'configure', settings: { theme: 'ink', engine: 'gsap', shape: 'notch', focus: false, privacy: true, reduced: false } });
  await page.goto('/');
  await expect(page.getByTestId('scenario-critical')).toBeEnabled();
});
test('quiet state, background interaction and studio screenshot', async ({ page }) => {
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'compact');
  await page.getByTestId('background-action').click();
  await expect(page.getByTestId('background-count')).toContainText('1 次');
  await page.screenshot({ path: evidencePath('01-studio-obsidian.png'), fullPage: true });
});
test('three real themes share the interaction model', async ({ page }) => {
  for (const theme of ['cloud', 'dusk', 'ink']) {
    await page.getByTestId(`theme-${theme}`).click();
    await expect(page.getByTestId('island')).toHaveAttribute('data-theme', theme);
    await page.getByTestId('scenario-service').click();
    await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'peek');
    await page.waitForTimeout(550);
    await page.screenshot({ path: evidencePath(`02-theme-${theme}.png`), fullPage: true });
    await page.keyboard.press('Escape');
  }
});
test('routine message retracts without acknowledging', async ({ page }) => {
  await page.getByTestId('scenario-report').click();
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'peek');
  await page.mouse.move(10, 10); await page.waitForTimeout(6800);
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'compact');
  const s = await page.evaluate(() => window.__ISLAND_DEBUG__?.snapshot()) as any;
  expect(s.model.items[0].status).toBe('unread');
});
test('critical stays pending, server confirms only after roundtrip', async ({ page, request }) => {
  await page.getByTestId('scenario-critical').click();
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'expanded');
  await expect(page.getByRole('heading', { name: '危急提醒需要你的关注' })).toBeVisible();
  await page.waitForTimeout(6800);
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'expanded');
  await page.getByLabel('切换脱敏详情').click();
  await expect(page.getByRole('heading', { name: '检验危急值已发布', exact: true })).toBeVisible();
  await page.screenshot({ path: evidencePath('03-critical-expanded.png'), fullPage: true });
  await page.getByRole('button', { name: '确认收到', exact: true }).click();
  await expect(page.getByRole('button', { name: '等待服务端回执' })).toBeVisible();
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'success');
  const response = await request.get('http://127.0.0.1:17321/api/state');
  const body = await response.json(); expect(body.receipts).toHaveLength(1); expect(body.receipts[0].kind).toBe('received-not-treated');
});
test('ordinary arrivals cannot replace pending critical', async ({ page }) => {
  await page.getByTestId('scenario-critical').click();
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'expanded');
  await page.getByTestId('scenario-service').click();
  await expect(page.getByRole('heading', { name: '危急提醒需要你的关注' })).toBeVisible();
});
test('focus suppresses routine but not critical', async ({ page }) => {
  await page.getByRole('switch', { name: '专注模式' }).click();
  await page.getByTestId('scenario-service').click(); await page.waitForTimeout(300);
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'compact');
  await page.getByTestId('scenario-critical').click();
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'expanded');
});
test('twelve routine updates aggregate into one item', async ({ page, request }) => {
  await control(request, { type: 'demo', scenario: 'burst' }); await page.waitForTimeout(2400);
  const s = await page.evaluate(() => window.__ISLAND_DEBUG__?.snapshot()) as any;
  expect(s.model.items).toHaveLength(1); expect(s.model.items[0].count).toBe(12);
});
test('CSS engine, inbox, escape and reduced motion', async ({ page }) => {
  await page.getByRole('button', { name: '原生 CSS', exact: true }).click();
  await page.getByRole('button', { name: /打开消息中心，/ }).click();
  await expect(page.getByRole('heading', { name: '消息中心0' })).toBeVisible();
  await page.waitForTimeout(500); await page.screenshot({ path: evidencePath('04-inbox-empty.png'), fullPage: true });
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('island')).toHaveAttribute('data-mode', 'compact');
  await page.getByRole('switch', { name: '减少动态' }).click();
  await expect(page.getByTestId('island')).toHaveClass(/reduced/);
});
test('narrow viewport stays within bounds', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByTestId('scenario-critical').click(); await page.waitForTimeout(550);
  const bounds = await page.getByTestId('island').boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: evidencePath('05-narrow-layout.png'), fullPage: true });
});
test('visible compositor cadence sample and browser runtime errors', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.getByRole('button', { name: '运行一轮动效采样' }).click();
  await page.waitForTimeout(7000);
  await page.screenshot({ path: evidencePath('06-frame-sample.png'), fullPage: true });
  expect(errors).toEqual([]);
});
