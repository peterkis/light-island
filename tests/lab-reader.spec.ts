import {test,expect} from '@playwright/test';
const base='http://127.0.0.1:17322';
const push=async(request:any,data:object)=>expect((await request.post(base+'/api/push',{data})).ok()).toBeTruthy();
const island=(page:any)=>page.getByTestId('clinical-island');
async function capture(page:any,name:string){const b=(await island(page).boundingBox())!;await page.screenshot({path:'evidence/lab-reader-20261009/'+name+'.png',clip:{x:Math.max(0,b.x-32),y:Math.max(0,b.y-8),width:b.width+64,height:b.height+48}});}
async function settled(page:any,state:string){await expect(island(page)).toHaveAttribute('data-lab-state',state);await expect(island(page)).toHaveAttribute('data-motion-phase','settled',{timeout:8000});}
async function report(page:any,request:any,variant='baseline'){
 await push(request,{type:'clinical:scenario',scenario:'S04',stage:0,labVariant:variant});await settled(page,'alert');await island(page).getByRole('button',{name:'查看检验报告摘要'}).click();await settled(page,'sum');await expect(island(page).getByRole('button',{name:'阅读报告',exact:true})).toBeEnabled();
}
async function read(page:any,request:any,variant='baseline'){await report(page,request,variant);await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await settled(page,'read');}
async function freezeTime(page:any){await page.clock.install();await page.clock.pauseAt(await page.evaluate(()=>Date.now())+10000);}
test.beforeEach(async({page,request})=>{await push(request,{type:'clinical:reset'});await page.goto('/clinical.html');await expect(page.getByTestId('clinical-scenario-S04')).toBeVisible();await expect(island(page)).toHaveAttribute('data-motion-phase','settled');});
test('progressive same-body report and manual burn clear rows without source writes or undo',async({page,request})=>{
 await report(page,request);expect((await island(page).boundingBox())!.height).toBeCloseTo(200,1);await expect(island(page)).toContainText('WBC');await capture(page,'summary');await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await settled(page,'read');expect((await island(page).boundingBox())!.height).toBeCloseTo(580,1);await expect(island(page).locator('.lab-row')).toHaveCount(8);expect(await island(page).locator('.wm,[style*="--wm"]').count()).toBe(0);await capture(page,'reader');
 const original=(await(await request.get(base+'/api/clinical-state')).json()).activities[0];await island(page).getByRole('button',{name:'阅后即焚',exact:true}).click();await expect(island(page)).toHaveAttribute('data-lab-state','burn');await expect(island(page)).toHaveAttribute('data-lab-state','done',{timeout:4000});await expect(island(page).locator('.lab-row')).toHaveCount(0);await expect(island(page)).toContainText('本次快览已清除');await expect(island(page)).toHaveAttribute('data-lab-state','idle',{timeout:4000});expect(await island(page).getByRole('button',{name:/撤销/}).count()).toBe(0);expect((await(await request.get(base+'/api/clinical-state')).json()).activities[0]).toEqual(original);
});
test('outside summary closes, outside reader masks and explicit activation reveals',async({page,request})=>{
 await report(page,request);await page.getByTestId('clinical-background').click();await expect(island(page)).toHaveAttribute('data-lab-state','idle');await push(request,{type:'clinical:view',mode:'open',scenario:'S04'});await settled(page,'sum');await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await settled(page,'read');await page.getByTestId('clinical-background').click();await expect(island(page).getByRole('button',{name:'已隐藏，轻触查看'})).toBeVisible();await expect(island(page)).not.toContainText('张**');await expect(island(page).locator('.lab-row')).toHaveCount(0);await island(page).getByRole('button',{name:'已隐藏，轻触查看'}).click();await expect(island(page).locator('.lab-row')).toHaveCount(8);
});
test('idle shield keeps counting while hovered; movement does not reveal',async({page,request})=>{
 await read(page,request);await island(page).locator('.lab-body').hover();const ring=island(page).locator('.lab-countdown span');const before=await ring.textContent();await page.waitForTimeout(1200);expect(await ring.textContent()).toBe(before);await page.waitForTimeout(7200);await expect(island(page).getByRole('button',{name:'已隐藏，轻触查看'})).toBeVisible();await page.mouse.move(700,100);await expect(island(page).locator('.lab-row')).toHaveCount(0);const masked=Number(await ring.textContent());await page.waitForTimeout(1200);expect(Number(await ring.textContent())).toBeLessThan(masked);
});
test('current revision/permission invalidation removes sensitive rows and rejects old sessions',async({page,request})=>{
 await read(page,request);await push(request,{type:'clinical:configure',settings:{privacy:true}});await expect(island(page).locator('.lab-row')).toHaveCount(0);await expect(island(page)).not.toContainText('张**');await push(request,{type:'clinical:configure',settings:{privacy:false}});await push(request,{type:'clinical:view',mode:'open',scenario:'S04'});await settled(page,'sum');await island(page).getByRole('button',{name:'阅读报告',exact:true}).click();await settled(page,'read');await push(request,{type:'clinical:scenario',scenario:'S04',stage:1});await expect(island(page).locator('.lab-row')).toHaveCount(0);await expect(island(page)).toHaveAttribute('data-lab-state','idle');
});
test('important events queue during reading and personal timer deadline is unchanged',async({page,request})=>{
 await push(request,{type:'clinical:personal',command:'start',duration:60000});await read(page,request);const before=(await(await request.get(base+'/api/clinical-state')).json()).timer.deadline;await push(request,{type:'clinical:scenario',scenario:'S03',stage:0});await expect(island(page)).toHaveAttribute('data-lab-state','read');await expect(island(page)).toContainText('血常规');expect((await(await request.get(base+'/api/clinical-state')).json()).timer.deadline).toBe(before);
});
test('normal, qualitative and missing reports render without invalid ranges',async({page,request})=>{
 await read(page,request,'normal');await expect(island(page).locator('.lab-row')).toHaveCount(8);await expect(island(page)).toContainText('其余 8 项正常');await push(request,{type:'clinical:reset'});await read(page,request,'extended');await expect(island(page).locator('.lab-row')).toHaveCount(12);await expect(island(page)).toContainText('阳性');await expect(island(page).locator('.lab-bar')).toHaveCount(8);
});
test('keyboard Escape burns and reduced motion bypasses the burn effect',async({page,request})=>{
 await push(request,{type:'clinical:configure',settings:{reduced:true}});await read(page,request);await island(page).getByRole('button',{name:'阅后即焚',exact:true}).focus();await page.keyboard.press('Escape');await expect(island(page)).toHaveAttribute('data-lab-state','done',{timeout:1000});await expect(island(page).locator('.lab-row')).toHaveCount(0);
});
test('explicit reading and privacy reveal keep focus inside the reader for Escape',async({page,request})=>{
 await push(request,{type:'clinical:configure',settings:{reduced:true}});await read(page,request);
 const region=island(page).getByRole('region',{name:'检验项目滚动区域'});await expect(region).toBeFocused();
 await freezeTime(page);await island(page).getByRole('button',{name:'已隐藏，轻触查看'}).click();await expect(region).toBeFocused();
 await page.keyboard.press('Escape');await page.clock.runFor(60);await expect(island(page)).toHaveAttribute('data-lab-state','done');await expect(island(page).locator('.lab-row')).toHaveCount(0);
});
test('complete report opens the matching read-only source and reader loses focus safely',async({page,request})=>{
 await read(page,request);await island(page).getByRole('button',{name:'完整报告',exact:true}).click();const source=page.getByRole('dialog',{name:'模拟来源边界'});await expect(source).toBeVisible();await expect(source.locator('.lab-row')).toHaveCount(8);await expect(source).toContainText('DEMO-S04');
});
test('elapsed deadline burns automatically and burn ignores replay and pointer actions',async({page,request})=>{
 await read(page,request);await freezeTime(page);await page.mouse.move(1,1000);await page.clock.fastForward(60001);await expect(island(page)).toHaveAttribute('data-lab-state','burn');await expect(page.getByRole('button',{name:'重播：收到检验报告'})).toBeDisabled();await page.clock.runFor(1150);await expect(island(page)).toHaveAttribute('data-lab-state','done');await expect(island(page).locator('.lab-row')).toHaveCount(0);
});
test('a live reduced-motion change applies to automatic clearing',async({page,request})=>{
 await read(page,request);await push(request,{type:'clinical:configure',settings:{reduced:true}});await freezeTime(page);await page.mouse.move(1,1000);await page.clock.fastForward(60001);await page.clock.runFor(60);await expect(island(page)).toHaveAttribute('data-lab-state','done');await expect(island(page).locator('.lab-row')).toHaveCount(0);
});
test('large text and forced colors retain scroll and actionable footer',async({page,request})=>{
 await push(request,{type:'clinical:configure',settings:{textScale:2.25,reduced:true}});await read(page,request);const scroller=island(page).locator('.lab-body');expect(await scroller.evaluate(e=>e.scrollHeight>e.clientHeight)).toBe(true);expect(await island(page).locator('.lab-name').first().evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(31.5,1);expect(await island(page).locator('.lab-countdown span').evaluate(e=>parseFloat(getComputedStyle(e).fontSize))).toBeCloseTo(24.75,1);
 const footer=(await island(page).locator('.lab-reader-footer').boundingBox())!,desktop=(await page.locator('.cs-desktop').boundingBox())!;expect(footer.y+footer.height).toBeLessThanOrEqual(desktop.y+desktop.height);await capture(page,'reader-225');await page.emulateMedia({forcedColors:'active'});await island(page).getByRole('button',{name:'阅后即焚',exact:true}).focus();await expect(island(page).getByRole('button',{name:'阅后即焚',exact:true})).toBeFocused();expect(await island(page).locator('.lab-bar').first().evaluate(e=>getComputedStyle(e).backgroundColor)).not.toBe(await island(page).locator('.lab-zone').first().evaluate(e=>getComputedStyle(e).backgroundColor));await capture(page,'reader-forced-colors');await island(page).getByRole('button',{name:'阅后即焚',exact:true}).click();await expect(island(page)).toHaveAttribute('data-lab-state','done');await expect(island(page)).toHaveAttribute('data-motion-phase','settled');expect(await island(page).locator('.lab-done').evaluate(e=>e.scrollWidth<=e.clientWidth&&e.scrollHeight<=e.clientHeight)).toBe(true);
});
