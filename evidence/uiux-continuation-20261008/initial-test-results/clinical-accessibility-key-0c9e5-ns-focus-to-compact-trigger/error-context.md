# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: clinical-accessibility.spec.ts >> keyboard traverses details and returns focus to compact trigger
- Location: tests\clinical-accessibility.spec.ts:20:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('clinical-island')
Expected: "compact"
Received: "idle"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByTestId('clinical-island') with timeout 5000ms
  - waiting for getByTestId('clinical-island')
    13 × locator resolved to <div data-view="idle" data-rim="false" data-peek="false" data-dock="notch" data-neck="false" data-surface="idle" data-native="false" data-hidden="false" data-enlarged="false" data-target-width="124" data-target-height="32" class="ci-host ux-host " data-velocity-x="0.0000" data-velocity-y="0.0000" data-target-surface="idle" data-motion-phase="settled" data-native-fallback="false" data-testid="clinical-island" data-current-width="124.0000" data-current-height="32.0000" data-layout-epoch="179144771417…>…</div>
       - unexpected value "idle"

```

```yaml
- button "打开协作动态"
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | const post=async(request:any,data:object)=>expect((await request.post('http://127.0.0.1:17322/api/push',{data})).ok()).toBeTruthy();
  3  | for(const scale of [1,2,2.25])test(`actual computed font at ${scale} scale preserves source actions`,async({page,request})=>{
  4  |  await post(request,{type:'clinical:reset'});await page.goto('/clinical.html');
  5  |  await page.getByLabel('文本倍率').selectOption(String(scale));
  6  |  await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});await post(request,{type:'clinical:view',mode:'open',scenario:'S03'});
  7  |  const island=page.getByTestId('clinical-island');await expect(island).toHaveAttribute('data-view','expanded');await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(200);
  8  |  const heading=island.getByRole('heading',{level:2});expect(await heading.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(17*scale,2);
  9  |  const r=(await island.boundingBox())!,button=island.getByRole('button',{name:'打开危急值流程'}),b=(await button.boundingBox())!;
  10 |  expect(b.y).toBeGreaterThanOrEqual(r.y);expect(b.y+b.height).toBeLessThanOrEqual(r.y+r.height+1);
  11 |  await island.getByRole('button',{name:'详情',exact:true}).click();await expect(island).toHaveAttribute('data-surface','stack');await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(350);
  12 |  expect(await island.getByRole('heading',{level:2}).evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(15*scale,2);
  13 |  expect(await island.locator('.ci-preview-body').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(13*scale,2);
  14 |  const scroll=island.getByRole('region',{name:'来源详情滚动区域'});await scroll.focus();await page.keyboard.press('End');await expect.poll(()=>scroll.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
  15 |  expect(await scroll.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
  16 |  await button.click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'返回灵动岛'}).click();
  17 |  await page.screenshot({path:`evidence/uiux-continuation-20261008/accessibility-text-${scale}.png`,fullPage:true});
  18 | });
  19 | 
  20 | test('keyboard traverses details and returns focus to compact trigger',async({page,request})=>{
  21 |  await post(request,{type:'clinical:reset'});await post(request,{type:'clinical:configure',settings:{autoPreview:false}});await page.goto('/clinical.html');await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});
  22 |  const island=page.getByTestId('clinical-island'),trigger=island.getByRole('button',{name:'展开协作详情'});
> 23 |  const settle=async(surface:string)=>{await expect(island).toHaveAttribute('data-surface',surface);await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(350);};
     |                                                            ^ Error: expect(locator).toHaveAttribute(expected) failed
  24 |  await settle('compact');await trigger.focus();await page.keyboard.press('Enter');await settle('rich');await expect(island.getByRole('button',{name:'收起协作详情'})).toBeFocused();
  25 |  await page.keyboard.press('Tab');await expect(island.getByRole('button',{name:'活动与个人工具'})).toBeFocused();await page.keyboard.press('Tab');await expect(island.getByRole('button',{name:'详情',exact:true})).toBeFocused();
  26 |  await page.keyboard.press('Enter');await settle('stack');await page.keyboard.press('Tab');await expect(island.getByRole('region',{name:'来源详情滚动区域'})).toBeFocused();
  27 |  await page.keyboard.press('Escape');await settle('rich');await page.keyboard.press('Escape');await settle('compact');await expect(trigger).toBeFocused();
  28 | });
  29 | 
  30 | test('forced colors and reduced motion preserve focus and protected announcements',async({page,request})=>{
  31 |  await post(request,{type:'clinical:reset'});await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await page.goto('/clinical.html');await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});
  32 |  const island=page.getByTestId('clinical-island');await expect(island).toHaveAttribute('data-surface','rich');await expect(island).toHaveAttribute('data-motion-phase','settled');await island.getByRole('button',{name:'详情',exact:true}).focus();
  33 |  expect(await island.getByRole('button',{name:'详情',exact:true}).evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
  34 |  await post(request,{type:'clinical:configure',settings:{role:'finance'}});await expect(island).toContainText('详情已保护');await expect(page.locator('.ci-sr')).toHaveText('新消息');
  35 |  expect(await island.getByRole('button',{name:/打开危急/}).count()).toBe(0);expect(await island.locator('.ci-content').evaluate(e=>getComputedStyle(e).filter)).toBe('none');
  36 | });
  37 | 
```