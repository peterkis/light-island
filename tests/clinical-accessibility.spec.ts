import {test,expect} from '@playwright/test';
const post=async(request:any,data:object)=>expect((await request.post('http://127.0.0.1:17322/api/push',{data})).ok()).toBeTruthy();
for(const scale of [1,2,2.25])test(`actual computed font at ${scale} scale preserves source actions`,async({page,request})=>{
 await post(request,{type:'clinical:reset'});await page.goto('/clinical.html');
 await page.getByLabel('文本倍率').selectOption(String(scale));
 await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});await post(request,{type:'clinical:view',mode:'open',scenario:'S03'});
 const island=page.getByTestId('clinical-island');await expect(island).toHaveAttribute('data-view','expanded');await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(200);
 const heading=island.getByRole('heading',{level:2});expect(await heading.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(15*scale,2);
 const r=(await island.boundingBox())!,button=island.getByRole('button',{name:'打开危急值流程'}),b=(await button.boundingBox())!;
 expect(b.y).toBeGreaterThanOrEqual(r.y);expect(b.y+b.height).toBeLessThanOrEqual(r.y+r.height+1);
 expect(await island.locator('.ci-scroll').evaluate(e=>e.clientHeight)).toBeGreaterThan(15);
 await button.click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'返回灵动岛'}).click();
 await page.screenshot({path:`evidence/clinical-20261004/verified-text-${scale}.png`,fullPage:true});
});
