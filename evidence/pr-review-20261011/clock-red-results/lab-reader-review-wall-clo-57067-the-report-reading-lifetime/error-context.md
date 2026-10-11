# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lab-reader-review.spec.ts >> wall-clock rollback cannot extend the report reading lifetime
- Location: tests\lab-reader-review.spec.ts:3:1

# Error details

```
Error: expect(locator).toHaveAttribute(expected) failed

Locator:  getByTestId('clinical-island')
Expected: "done"
Received: "read"
Timeout:  5000ms

Call log:
  - Expect "toHaveAttribute" getByTestId('clinical-island') with timeout 5000ms
  - waiting for getByTestId('clinical-island')
    14 × locator resolved to <div data-rim="false" data-peek="false" data-dock="notch" data-neck="false" data-native="false" data-hidden="false" data-view="expanded" data-lab-state="read" data-enlarged="false" data-surface="lab-read" data-target-width="400" data-target-height="580" data-velocity-x="0.0000" data-velocity-y="0.0000" data-motion-phase="settled" data-native-fallback="false" data-testid="clinical-island" data-current-width="400.0000" data-target-surface="lab-read" data-current-height="580.0000" data-layout-epoch="1…>…</div>
       - unexpected value "read"

```

```yaml
- region "检验报告阅读":
  - heading "检验报告已隐藏" [level=2]
  - paragraph: 模拟报告 仅会话展示
  - region "检验项目滚动区域"
  - button "完整报告"
  - button "阅后即焚"
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | 
  3  | test('wall-clock rollback cannot extend the report reading lifetime',async({page,request})=>{
  4  |  const push=async(data:object)=>expect((await request.post('http://127.0.0.1:17322/api/push',{data})).ok()).toBeTruthy();
  5  |  await push({type:'clinical:reset'});
  6  |  await page.goto('/clinical.html');
  7  |  const island=page.getByTestId('clinical-island');
  8  |  await expect(page.getByTestId('clinical-scenario-S04')).toBeVisible();
  9  |  await push({type:'clinical:configure',settings:{reduced:true}});
  10 |  // Install before entering the reading session so its time origin stays stable.
  11 |  await page.clock.install();
  12 |  await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
  13 |  await island.getByRole('button',{name:'查看检验报告摘要'}).click();
  14 |  await island.getByRole('button',{name:'阅读报告',exact:true}).click();
  15 |  await expect(island).toHaveAttribute('data-lab-state','read');
  16 |  await page.clock.pauseAt(await page.evaluate(()=>Date.now())+100);
  17 |  await page.getByTestId('clinical-background').click();
  18 |  await expect(island.getByRole('button',{name:'已隐藏，轻触查看'})).toBeVisible();
  19 |  const monotonicBefore=await page.evaluate(()=>performance.now());
  20 |  await page.clock.setSystemTime(await page.evaluate(()=>Date.now())-3600000);
  21 |  expect(await page.evaluate(()=>performance.now())).toBe(monotonicBefore);
  22 |  await page.clock.runFor(61000);
> 23 |  await expect(island).toHaveAttribute('data-lab-state','done');
     |                       ^ Error: expect(locator).toHaveAttribute(expected) failed
  24 |  await expect(island.locator('.lab-row')).toHaveCount(0);
  25 |  await expect(island).not.toContainText('张**');
  26 | });
  27 | 
```