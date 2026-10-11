import {test,expect} from '@playwright/test';
import {evidencePath} from './evidence-path';
const post=async(request:any,data:object)=>expect((await request.post('http://127.0.0.1:17322/api/push',{data})).ok()).toBeTruthy();
for(const scale of [1,2,2.25])test(`actual computed font at ${scale} scale preserves source actions`,async({page,request})=>{
 await post(request,{type:'clinical:reset'});await page.goto('/clinical.html');
 await page.getByLabel('文本倍率').selectOption(String(scale));
 await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});await post(request,{type:'clinical:view',mode:'open',scenario:'S03'});
 const island=page.getByTestId('clinical-island');await expect(island).toHaveAttribute('data-view','expanded');await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(200);
 const heading=island.getByRole('heading',{level:2});expect(await heading.evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(17*scale,2);
 const r=(await island.boundingBox())!,button=island.getByRole('button',{name:'打开危急值流程'}),b=(await button.boundingBox())!;
 expect(b.y).toBeGreaterThanOrEqual(r.y);expect(b.y+b.height).toBeLessThanOrEqual(r.y+r.height+1);
 await island.getByRole('button',{name:'详情',exact:true}).click();await expect(island).toHaveAttribute('data-surface','stack');await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(350);
 expect(await island.getByRole('heading',{level:2}).evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(15*scale,2);
 expect(await island.locator('.ci-preview-body').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(13*scale,2);
 const scroll=island.getByRole('region',{name:'来源详情滚动区域'});await scroll.focus();await page.keyboard.press('End');await expect.poll(()=>scroll.evaluate(e=>e.scrollTop)).toBeGreaterThan(0);
 expect(await scroll.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);
 await button.click();await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('button',{name:'返回灵动岛'}).click();
 await page.screenshot({path:evidencePath(`accessibility-text-${scale}.png`),fullPage:true});
});

test('keyboard traverses details and returns focus to compact trigger',async({page,request})=>{
 await post(request,{type:'clinical:reset'});await post(request,{type:'clinical:configure',settings:{autoPreview:false}});await page.goto('/clinical.html');await expect(page.getByText('模拟消息源已连接',{exact:true})).toBeVisible();await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});
 const island=page.getByTestId('clinical-island'),trigger=island.getByRole('button',{name:'展开协作详情'});
 const settle=async(surface:string)=>{await expect(island).toHaveAttribute('data-surface',surface);await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(350);};
 await settle('compact');await trigger.focus();await page.keyboard.press('Enter');await settle('rich');await expect(island.getByRole('button',{name:'收起协作详情'})).toBeFocused();
 await page.keyboard.press('Tab');await expect(island.getByRole('button',{name:'活动与个人工具'})).toBeFocused();await page.keyboard.press('Tab');await expect(island.getByRole('button',{name:'详情',exact:true})).toBeFocused();
 await page.keyboard.press('Enter');await settle('stack');await page.keyboard.press('Tab');await expect(island.getByRole('region',{name:'来源详情滚动区域'})).toBeFocused();
 await page.keyboard.press('Escape');await settle('rich');await page.keyboard.press('Escape');await settle('compact');await expect(trigger).toBeFocused();
});

test('forced colors and reduced motion preserve focus and protected announcements',async({page,request})=>{
 await post(request,{type:'clinical:reset'});await page.emulateMedia({reducedMotion:'reduce',forcedColors:'active'});await page.goto('/clinical.html');await expect(page.getByText('模拟消息源已连接',{exact:true})).toBeVisible();await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});
 const island=page.getByTestId('clinical-island');await expect(island).toHaveAttribute('data-surface','rich');await expect(island).toHaveAttribute('data-motion-phase','settled');await island.getByRole('button',{name:'详情',exact:true}).focus();
 expect(await island.getByRole('button',{name:'详情',exact:true}).evaluate(e=>getComputedStyle(e).outlineStyle)).not.toBe('none');
 await post(request,{type:'clinical:configure',settings:{role:'finance'}});await expect(island).toContainText('详情已保护');await expect(page.locator('.ci-sr')).toHaveText('新消息');
 expect(await island.getByRole('button',{name:/打开危急/}).count()).toBe(0);expect(await island.locator('.ci-content').evaluate(e=>getComputedStyle(e).filter)).toBe('none');
});
