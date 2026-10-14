import {test,expect} from '@playwright/test';
import {evidencePath} from './evidence-path';

test('S0 pointer hover retains the pure black body with no highlight, mark or peek',async({page,request})=>{
 expect((await request.post(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322')+'/api/push'),{data:{type:'clinical:reset'}})).ok()).toBeTruthy();
 await page.addInitScript(()=>localStorage.setItem('samewave.motion-preference.v1','full'));
 await page.goto('/clinical.html?view=island');await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().connection)).toBe('online');
 const island=page.getByTestId('clinical-island');
 await expect(island).toHaveAttribute('data-surface','idle');
 await expect(island).toHaveAttribute('data-motion-phase','settled');
 await page.addStyleTag({content:'html.clinical-native{background:#001009!important}'});
 const button=island.locator('.ux-idle-button');
 await button.hover();
 await page.waitForTimeout(1100);
 await page.screenshot({path:evidencePath('visual/s0-hover.png'),clip:{x:570,y:0,width:300,height:100}});
 const paint=await button.evaluate(el=>{
  const style=getComputedStyle(el),host=el.closest('.ci-host')!,box=host.getBoundingClientRect();
  const mark=el.querySelector('.ux-idle-mark');
  return {background:style.backgroundColor,cursor:style.cursor,outline:style.outlineStyle,
   markOpacity:mark?getComputedStyle(mark).opacity:'0',width:box.width,height:box.height};
 });
 expect.soft(paint.background).toBe('rgba(0, 0, 0, 0)');
 expect.soft(paint.cursor).toBe('pointer');
 expect.soft(paint.outline).toBe('none');
 expect.soft(paint.markOpacity).toBe('0');
 expect.soft(paint.width).toBe(124);
 expect.soft(paint.height).toBe(32);
});

test('island-only document keeps its entire canvas transparent',async({page,request})=>{
 expect((await request.post(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322')+'/api/push'),{data:{type:'clinical:reset'}})).ok()).toBeTruthy();
 await page.goto('/clinical.html?view=island');await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().connection)).toBe('online');
 await expect(page.getByTestId('clinical-island')).toHaveAttribute('data-motion-phase','settled');
 const backgrounds=await page.evaluate(()=>[document.documentElement,document.body,document.getElementById('root')!].map(e=>getComputedStyle(e).backgroundColor));
 expect(backgrounds).toEqual(['rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)','rgba(0, 0, 0, 0)']);
});

test('active Compact keeps its finite Peek and blank center without painting a hover card',async({page,request})=>{
 const post=async(data:object)=>expect((await request.post(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322')+'/api/push'),{data})).ok()).toBeTruthy();
 await post({type:'clinical:reset'});
 await post({type:'clinical:configure',settings:{autoPreview:false}});
 await page.addInitScript(()=>localStorage.setItem('samewave.motion-preference.v1','full'));
 await page.goto('/clinical.html?view=island');await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().connection)).toBe('online');
 const island=page.getByTestId('clinical-island');
 await expect(island).toHaveAttribute('data-motion-phase','settled');await post({type:'clinical:configure',settings:{autoPreview:false}});
 await post({type:'clinical:scenario',scenario:'S02',stage:0});
 await expect(island).toHaveAttribute('data-surface','compact');
 await expect(island).toHaveAttribute('data-motion-phase','settled');
 await island.getByRole('button',{name:'展开协作详情'}).hover();
 await expect(island).toHaveAttribute('data-peek','true');
 await expect(island).toHaveAttribute('data-motion-phase','settled');
 const box=(await island.boundingBox())!;
 expect(box.width).toBeCloseTo(268*1.05,1);
 expect(box.height).toBeCloseTo(36*1.05,1);
 expect(await island.locator('.ux-center').evaluate(e=>e.getBoundingClientRect().width)).toBe(124);
 expect(await island.locator('.ux-compact-button').evaluate(e=>getComputedStyle(e).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
 await page.mouse.move(1,800);
 await expect(island).toHaveAttribute('data-peek','false');
 await expect(island).toHaveAttribute('data-motion-phase','settled');
 expect((await island.boundingBox())!.width).toBe(268);
});

test('v1 visual matrix preserves geometry, hierarchy, controls and neutral backgrounds',async({page,request})=>{
 const post=async(data:object)=>expect((await request.post(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322')+'/api/push'),{data})).ok()).toBeTruthy();
 await post({type:'clinical:reset'});
 await page.addInitScript(()=>localStorage.setItem('samewave.motion-preference.v1','full'));
 await page.goto('/clinical.html?view=island');await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().connection)).toBe('online');
 const island=page.getByTestId('clinical-island');
 const settle=async(surface:string)=>{await expect(island).toHaveAttribute('data-surface',surface);await expect(island).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(450);};
 const capture=async(name:string,width:number,height:number)=>{
  const r=(await island.boundingBox())!;
  expect(r.width).toBe(width);expect(r.height).toBe(height);
  expect(await island.locator('.ci-fill').evaluate(e=>getComputedStyle(e).fill)).toBe('rgb(0, 0, 0)');
  await page.screenshot({path:evidencePath(`visual/${name}.png`),clip:{x:420,y:0,width:600,height:400}});
 };
 await settle('idle');
 for(const [name,color,dark] of [['light','#fafafa',false],['dark','#001009',true],['black','#000',true]] as const){
  await page.addStyleTag({content:`html.clinical-native{background:${color}!important}`});
  await post({type:'clinical:preferences',settings:{backgroundDark:dark}});
  await capture(`s0-${name}`,124,32);
 }
 await page.addStyleTag({content:'html.clinical-native{background:#dbe5e8!important}'});
 await post({type:'clinical:preferences',settings:{backgroundDark:false}});
 await post({type:'clinical:scenario',scenario:'S02',stage:0});
 await post({type:'clinical:view',mode:'open',scenario:'S02'});await settle('rich');
 await capture('s5-rich',372,168);
 expect(await island.locator('.ux-title-large').evaluate(e=>getComputedStyle(e).fontSize)).toBe('17px');
 await island.getByRole('button',{name:'详情',exact:true}).click();await settle('stack');
 await capture('s6-stack',400,280);
 await island.getByRole('button',{name:'收起协作详情'}).click();await page.mouse.move(1,800);await settle('compact');
 await capture('s1-compact',268,36);
 await post({type:'clinical:configure',settings:{autoPreview:false}});
 await post({type:'clinical:scenario',scenario:'S09',stage:0});
 await post({type:'clinical:view',mode:'compact'});
 await expect(island.locator('.ux-minimal')).toBeVisible();await settle('compact');
 const mini=(await island.locator('.ux-minimal').boundingBox())!;
 expect(mini.width).toBe(36);expect(mini.height).toBe(36);
 await capture('s1-s2',268,36);
 await post({type:'clinical:reset'});await settle('idle');await post({type:'clinical:configure',settings:{autoPreview:true}});
 await post({type:'clinical:scenario',scenario:'S02',stage:0});await settle('alert');
 await island.hover();await capture('s4-alert',372,88);
 await post({type:'clinical:reset'});await page.mouse.move(1,800);await settle('idle');
 await post({type:'clinical:preferences',settings:{dock:'floating'}});await settle('idle');
 expect((await island.boundingBox())!.y).toBe(8);
 await capture('s0-floating',124,32);
});
