import {test,expect} from '@playwright/test';
import catalogue from '../src/clinical/catalogue.json' with {type:'json'};
const base='http://127.0.0.1:17322';
const post=async(request:any,data:object)=>expect((await request.post(base+'/api/push',{data})).ok()).toBeTruthy();
const island=(page:any)=>page.getByTestId('clinical-island');
async function settled(page:any,surface?:string){const e=island(page);if(surface)await expect(e).toHaveAttribute('data-surface',surface);await expect(e).toHaveAttribute('data-motion-phase','settled',{timeout:8000});await page.waitForTimeout(350);return e;}
async function open(request:any,page:any,id='S03',stage=0){await post(request,{type:'clinical:scenario',scenario:id,stage});await post(request,{type:'clinical:view',mode:'open',scenario:id});await settled(page,'rich');}
async function details(page:any){await island(page).getByRole('button',{name:'详情',exact:true}).click();await settled(page,'stack');}
test.beforeEach(async({page,request})=>{await post(request,{type:'clinical:reset'});await page.goto('/clinical.html');await expect(page.getByTestId('clinical-scenario-S03')).toBeVisible();await settled(page,'idle');});
test('hover is a finite 5% Peek, not an auto-open; explicit reading survives pointer leave',async({page,request})=>{
 const e=island(page);await e.hover();await expect(e).toHaveAttribute('data-peek','true');await settled(page,'idle');expect((await e.boundingBox())!.width).toBeCloseTo(130.2,1);
 await page.mouse.move(1,1000);await settled(page,'idle');await expect.poll(async()=>(await e.boundingBox())!.width).toBeCloseTo(124,1);
 await open(request,page);await page.mouse.move(1,1000);await page.waitForTimeout(600);await expect(e).toHaveAttribute('data-surface','rich');
 await e.getByRole('button',{name:'收起协作详情'}).click();await page.mouse.move(1,1000);await settled(page,'compact');
});
test('all fourteen source scenarios and 84 states remain read-only behind the new information levels',async({page,request})=>{
 test.setTimeout(120000);for(const d of catalogue){
  await post(request,{type:'clinical:reset'});await post(request,{type:'clinical:configure',settings:{reduced:true,role:d.scope,autoPreview:false}});
  for(let stage=0;stage<6;stage++){
   await post(request,{type:'clinical:scenario',scenario:d.id,stage});if(stage===0){await post(request,{type:'clinical:view',mode:'open',scenario:d.id});await settled(page,'rich');await details(page);}
   await expect(island(page)).toContainText(d.stages[stage].body);await expect(island(page).locator('.ci-guard')).toContainText(d.guard);
   expect(await island(page).getByRole('button',{name:/确认收到|接收任务|完成处置|确认输血/}).count()).toBe(0);
  }
 }
});
test('source route is identity/version checked; opening still does not confirm reception',async({page,request})=>{
 await open(request,page);await island(page).getByRole('button',{name:'打开危急值流程'}).click();await expect(page.getByRole('dialog',{name:'模拟来源边界'})).toBeVisible();await expect(page.getByRole('dialog')).toContainText('DEMO-S03');
 const state=await(await request.get(base+'/api/clinical-state')).json();expect(state.activities[0].sourceState).toBe('源系统：待接收');await page.getByRole('button',{name:'返回灵动岛'}).click();
});
test('finance authorization and privacy delete sensitive data, including during transitions',async({page,request})=>{
 await open(request,page,'S05');await expect(island(page)).toContainText('当前岗位没有');
 await post(request,{type:'clinical:configure',settings:{role:'finance'}});await settled(page,'rich');await details(page);await expect(island(page)).toContainText('320');
 await post(request,{type:'clinical:configure',settings:{privacy:true}});await expect(island(page)).not.toContainText('320');await expect(island(page)).not.toContainText('王某某');expect(await island(page).locator('[title*="320"]').count()).toBe(0);
 await post(request,{type:'clinical:configure',settings:{privacy:false}});await settled(page,'rich');await details(page);await expect(island(page)).toContainText('320');
});
test('mismatch, failed route, stale source and withdrawal are still distinct',async({page,request})=>{
 await open(request,page);await post(request,{type:'clinical:configure',settings:{routeFault:'mismatch'}});await island(page).getByRole('button',{name:'打开危急值流程'}).click();await expect(island(page)).toContainText('对象或版本不匹配');await settled(page,'stack');
 await post(request,{type:'clinical:configure',settings:{routeFault:'failed'}});await island(page).getByRole('button',{name:'打开危急值流程'}).click();await expect(island(page)).toContainText('未能打开来源');
 await post(request,{type:'clinical:configure',settings:{connectivity:'stale'}});await expect(island(page)).toContainText('上次记录（非当前）');await expect(island(page).getByRole('button',{name:'打开危急值流程'})).toBeDisabled();
 await post(request,{type:'clinical:reset'});await open(request,page,'S08',5);await details(page);await expect(island(page)).toContainText('无替代版本');
});
test('important source interrupts ordinary activity without restarting the personal timer',async({page,request})=>{
 await post(request,{type:'clinical:personal',command:'start',duration:60000});await post(request,{type:'clinical:view',mode:'timer'});await settled(page,'rich');const before=await(await request.get(base+'/api/clinical-state')).json();
 await post(request,{type:'clinical:scenario',scenario:'S03',stage:0});await expect(island(page).getByRole('heading')).toContainText('危急值');await settled(page,'rich');
 await post(request,{type:'clinical:scenario',scenario:'S04',stage:0});await expect(island(page).getByRole('heading')).toContainText('危急值');
 const after=await(await request.get(base+'/api/clinical-state')).json();expect(after.timer.deadline).toBe(before.timer.deadline);
 await island(page).getByRole('button',{name:'活动与个人工具'}).click();await settled(page,'stack');await expect(island(page).locator('.ci-switcher')).toContainText('个人番茄钟');
});
test('rapid open/close and privacy/lock leave no stale interaction layer',async({page,request})=>{
 await open(request,page);for(let i=0;i<6;i++){await post(request,{type:'clinical:view',mode:'compact'});await post(request,{type:'clinical:view',mode:'open',scenario:'S03'});}
 await settled(page,'rich');expect(await island(page).locator('.ci-content').evaluate((e:HTMLElement)=>e.inert)).toBe(false);
 await post(request,{type:'clinical:configure',settings:{locked:true,role:'none'}});await expect(island(page)).toHaveAttribute('data-hidden','true');await expect(island(page)).not.toContainText('王某某');
 await post(request,{type:'clinical:configure',settings:{locked:false,reduced:true}});await settled(page,'rich');await expect(island(page)).toContainText('详情已保护');
});
test('forced colors retain focus and settled idle does not continuously repaint',async({page})=>{
 await page.emulateMedia({forcedColors:'active',reducedMotion:'reduce'});await settled(page,'idle');const e=island(page);await e.getByRole('button',{name:'打开协作动态'}).focus();
 expect(await e.getByRole('button',{name:'打开协作动态'}).evaluate(el=>getComputedStyle(el).outlineStyle)).not.toBe('none');
 const n=await e.evaluate(el=>new Promise<number>(resolve=>{let n=0;const ro=new MutationObserver(rows=>n+=rows.length);ro.observe(el,{attributes:true,childList:true,subtree:true});setTimeout(()=>{ro.disconnect();resolve(n);},700);}));expect(n).toBe(0);
});
