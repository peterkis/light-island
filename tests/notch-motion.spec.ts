import { test, expect } from '@playwright/test';
import {evidencePath} from './evidence-path';
async function post(request: any, data: object) { expect((await request.post('http://127.0.0.1:17321/api/push', { data })).ok()).toBeTruthy(); }
test.beforeEach(async ({ page, request }) => {
  await post(request,{type:'reset'}); await post(request,{type:'configure',settings:{engine:'gsap',shape:'notch',theme:'ink',focus:false,privacy:true,reduced:false}});
  await page.goto('/'); await expect(page.getByTestId('scenario-critical')).toBeEnabled();
  await expect(page.getByTestId('island')).toHaveAttribute('data-motion-phase','settled');
});
test('U-shaped idle and finite hover expansion return to a quiet state', async ({ page }) => {
  const island=page.getByTestId('island');
  expect((await island.boundingBox())!.height).toBe(34);
  await island.hover(); await expect(island).toHaveAttribute('data-motion-phase','settled');
  await expect.poll(async ()=>(await island.boundingBox())!.width).toBe(170);
  expect((await island.boundingBox())!.height).toBe(37);
  await page.mouse.move(3,3);
  await expect.poll(async ()=>(await island.boundingBox())!.width).toBe(160);
  const epoch=await island.getAttribute('data-motion-epoch');await page.waitForTimeout(600);
  expect(await island.getAttribute('data-motion-epoch')).toBe(epoch);
});
test('content survives an exit, then swaps; text is never scaled', async ({ page, request }) => {
  await post(request,{type:'demo',scenario:'critical'});
  const island=page.getByTestId('island'); await expect(island).toHaveAttribute('data-motion-phase','settled');
  await expect(island).toHaveAttribute('data-mode','expanded');
  await post(request,{type:'view',mode:'compact'});
  await expect(island).toHaveAttribute('data-mode','compact');
  await expect(island).toHaveAttribute('data-motion-phase','settled');
  const result=await page.locator('.notch-content').evaluate(e=>({inert:(e as HTMLElement).inert,transform:getComputedStyle(e).transform,opacity:getComputedStyle(e).opacity}));
  expect(result.inert).toBe(false); expect(result.opacity).toBe('1'); expect(result.transform).toBe('matrix(1, 0, 0, 1, 0, 0)');
});
test('rapid interrupts settle at the newest state, with no invisible interaction layer', async ({ page, request }) => {
  await post(request,{type:'demo',scenario:'critical'});
  for (const mode of ['compact','inbox','expanded','compact','expanded']) { await post(request,{type:'view',mode}); await page.waitForTimeout(45); }
  const island=page.getByTestId('island');await expect(island).toHaveAttribute('data-mode','expanded');await expect(island).toHaveAttribute('data-motion-phase','settled');
  await page.getByRole('button',{name:'确认收到',exact:true}).click();
  await expect(island).toHaveAttribute('data-mode','success');
  const data=await (await request.get('http://127.0.0.1:17321/api/state')).json(); expect(data.receipts).toHaveLength(1);
});
test('reduced-motion updates live, restores opacity and keeps the receipt path', async ({ page, request }) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await post(request,{type:'demo',scenario:'critical'});
  const island=page.getByTestId('island');await expect(island).toHaveClass(/reduced/);
  await expect(island).toHaveAttribute('data-motion-phase','settled');expect((await island.boundingBox())!.height).toBe(56);
  await page.getByRole('button',{name:'确认收到',exact:true}).click();await expect(island).toHaveAttribute('data-mode','success');
});
test('legacy capsule remains fixed-height across all modes', async ({ page, request }) => {
  await page.getByRole('button',{name:'等高胶囊',exact:true}).click();
  const island=page.getByTestId('island');await expect(island).toHaveAttribute('data-shape','capsule');
  await expect(island).toHaveAttribute('data-motion-phase','settled'); expect((await island.boundingBox())!.height).toBe(56);
  for (const mode of ['inbox','expanded','thread','compact']) { await post(request,{type:'view',mode});await expect(island).toHaveAttribute('data-mode',mode);await expect(island).toHaveAttribute('data-motion-phase','settled');expect((await island.boundingBox())!.height).toBe(56); }
});

for (const scale of [1.25, 1.5, 2]) test(`browser DPR ${scale}: U silhouette, centering and actions remain bounded`, async ({ browser, request }) => {
  // Browser raster-scale coverage only; this does not claim Windows OS-DPI hardware validation.
  const context=await browser.newContext({viewport:{width:1280,height:200},deviceScaleFactor:scale});
  try {
    const page=await context.newPage();await page.goto('http://127.0.0.1:1420/?view=island');
    const island=page.getByTestId('island');await expect(island).toHaveAttribute('data-motion-phase','settled');
    expect(await page.evaluate(()=>devicePixelRatio)).toBe(scale);
    await post(request,{type:'demo',scenario:'critical'});await expect(island).toHaveAttribute('data-mode','expanded');await expect(island).toHaveAttribute('data-motion-phase','settled');
    const b=(await island.boundingBox())!;expect(b.height).toBe(56);expect(b.y).toBe(0);expect(Math.abs(b.x+b.width/2-640)).toBeLessThan(.6);
    for(const name of ['确认收到','收起灵动岛']) { const button=(await page.getByRole('button',{name,exact:true}).boundingBox())!;expect(button.x).toBeGreaterThan(b.x);expect(button.x+button.width).toBeLessThan(b.x+b.width); }
    await page.screenshot({path:evidencePath(`notch-browser-dpr-${scale}.png`),omitBackground:true,scale:'device'});
    await page.getByRole('button',{name:'确认收到',exact:true}).click();await expect(island).toHaveAttribute('data-mode','success');
  } finally { await context.close(); }
});
