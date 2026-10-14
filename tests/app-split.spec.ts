import {test,expect} from '@playwright/test';
const source=process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322';
test('preview tools, source reset and desktop tools stay independently owned',async({context,page,request})=>{
 await request.post(source+'/api/push',{data:{type:'clinical:reset'}});
 await page.goto('/workbench.html');await expect(page.locator('.cs-connection')).toContainText('模拟消息源已连接');
 const desktop=await context.newPage();await desktop.goto('/clinical.html?view=island');
 const status=async()=>((await request.get(source+'/api/health')).json()) as Promise<{clients:number}>;
 await expect.poll(async()=>(await status()).clients).toBeGreaterThanOrEqual(2);
 const d=desktop.getByTestId('clinical-island'),p=page.getByTestId('clinical-island');
 await d.getByRole('button',{name:'打开协作动态'}).click();await expect(d).toHaveAttribute('data-surface','rich');
 await d.getByRole('button',{name:'开始 25 分钟'}).click();
 const deadline=await desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer.deadline);expect(deadline).toBeGreaterThan(Date.now());
 await page.getByRole('button',{name:/01 个人番茄钟/}).click();await expect(p).toHaveAttribute('data-surface','rich');await p.getByRole('button',{name:'开始 25 分钟'}).click();await p.getByRole('button',{name:'结束本次'}).click();
 expect(await desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer.deadline)).toBe(deadline);
 await page.getByTestId('clinical-scenario-S03').click();await expect(p).toContainText('检验危急值');
 expect(await desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().queue.items)).toEqual([]);
 await page.getByRole('button',{name:'重置本地模拟场景'}).click();await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().queue.items.length)).toBe(0);
 expect(await desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer.deadline)).toBe(deadline);
 const target=page.getByRole('combobox',{name:'实验目标'});await expect(target.locator('option',{hasText:'桌面灵动岛'})).toHaveCount(1);await target.selectOption({label:'桌面灵动岛'});
 await page.getByTestId('clinical-scenario-S03').click();await expect.poll(()=>desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().queue.items.length)).toBe(1);
 expect(await page.evaluate(()=>window.__CLINICAL_DEBUG__?.().queue.items)).toEqual([]);
 expect(await desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer.deadline)).toBe(deadline);
 await page.getByRole('button',{name:'重置本地模拟场景'}).click();await expect.poll(()=>desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().queue.items.length)).toBe(0);
 expect(await desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer.deadline)).toBe(deadline);
 await page.close();expect(await desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer.deadline)).toBe(deadline);await desktop.close();
});
test('workbench motion selection remains local while the desktop experiment target is selected',async({context,page,request})=>{
 await request.post(source+'/api/push',{data:{type:'clinical:reset'}});
 await page.goto('/workbench.html');await expect(page.locator('.cs-connection')).toContainText('模拟消息源已连接');
 const desktop=await context.newPage();await desktop.goto('/clinical.html?view=island');
 await expect(page.getByRole('combobox',{name:'实验目标'}).locator('option',{hasText:'桌面灵动岛'})).toHaveCount(1);
 const target=page.getByRole('combobox',{name:'实验目标'}),selector=page.getByRole('combobox',{name:'工作台动效模式'});
 const preview=page.locator('.ci-anchor'),island=desktop.locator('.ci-anchor');
 await page.getByRole('switch',{name:'减少动态',exact:true}).click();await expect(preview).toHaveAttribute('data-motion','reduced');
 await target.selectOption({label:'桌面灵动岛'});await page.getByRole('switch',{name:'减少动态',exact:true}).click();await expect(island).toHaveAttribute('data-motion','reduced');
 await selector.selectOption('full');await expect(preview).toHaveAttribute('data-motion','full');await expect(island).toHaveAttribute('data-motion','reduced');
 await expect.poll(()=>desktop.evaluate(()=>window.__CLINICAL_DEBUG__?.().settings.reduced)).toBe(true);
 await selector.selectOption('reduced');await expect(preview).toHaveAttribute('data-motion','reduced');await expect(island).toHaveAttribute('data-motion','reduced');
 await desktop.close();
});
test('desktop report replay preserves the active preview reading session',async({context,page,request})=>{
 await request.post(source+'/api/push',{data:{type:'clinical:reset'}});
 await page.goto('/workbench.html');await expect(page.locator('.cs-connection')).toContainText('模拟消息源已连接');
 const desktop=await context.newPage();await desktop.goto('/clinical.html?view=island');
 const target=page.getByRole('combobox',{name:'实验目标'});await expect(target.locator('option',{hasText:'桌面灵动岛'})).toHaveCount(1);await page.bringToFront();
 await request.post(source+'/api/push',{data:{type:'clinical:configure',targetClientId:'preview',settings:{autoPreview:true,privacy:false}}});
 const preview=page.getByTestId('clinical-island');await page.getByRole('button',{name:'重播：收到检验报告',exact:true}).click();await expect(preview).toHaveAttribute('data-lab-state','alert');
 await preview.getByRole('button',{name:'查看检验报告摘要'}).click();await expect(preview).toHaveAttribute('data-lab-state','sum');await preview.getByRole('button',{name:'阅读报告',exact:true}).click();await expect(preview).toHaveAttribute('data-lab-state','read');
 const session=await page.evaluate(()=>window.__CLINICAL_DEBUG__?.().lab.session);await target.selectOption({label:'桌面灵动岛'});
 for(const name of ['重播：收到检验报告','全部正常夹具','定性与缺失值夹具']){
  const before=await desktop.evaluate(()=>JSON.stringify(window.__CLINICAL_DEBUG__?.().queue.items));await page.getByRole('button',{name,exact:true}).click();
  await expect.poll(()=>desktop.evaluate(()=>JSON.stringify(window.__CLINICAL_DEBUG__?.().queue.items))).not.toBe(before);
  await expect(preview).toHaveAttribute('data-lab-state','read');expect(await page.evaluate(()=>window.__CLINICAL_DEBUG__?.().lab.session)).toBe(session);
 }
 await desktop.close();
});
