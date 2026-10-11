import {test,expect} from '@playwright/test';

test('wall-clock rollback cannot extend the report reading lifetime',async({page,request})=>{
 const push=async(data:object)=>expect((await request.post('http://127.0.0.1:17322/api/push',{data})).ok()).toBeTruthy();
 await push({type:'clinical:reset'});
 await page.goto('/clinical.html');
 const island=page.getByTestId('clinical-island');
 await expect(page.getByTestId('clinical-scenario-S04')).toBeVisible();
 await push({type:'clinical:configure',settings:{reduced:true}});
 // Install before entering the reading session so its time origin stays stable.
 await page.clock.install();
 await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
 await island.getByRole('button',{name:'查看检验报告摘要'}).click();
 await island.getByRole('button',{name:'阅读报告',exact:true}).click();
 await expect(island).toHaveAttribute('data-lab-state','read');
 // Leave ample room for browser protocol latency while the clock is running.
 await page.clock.pauseAt(await page.evaluate(()=>Date.now())+10000);
 await page.getByTestId('clinical-background').click();
 await expect(island.getByRole('button',{name:'已隐藏，轻触查看'})).toBeVisible();
 const monotonicBefore=await page.evaluate(()=>performance.now());
 await page.clock.setSystemTime(await page.evaluate(()=>Date.now())-3600000);
 expect(await page.evaluate(()=>performance.now())).toBe(monotonicBefore);
 await page.clock.runFor(61000);
 // The completion toast may already have elapsed; neither state retains a report.
 await expect(island).toHaveAttribute('data-lab-state',/^(done|idle)$/);
 await expect(island.locator('.lab-row')).toHaveCount(0);
 await expect(island).not.toContainText('张**');
});
