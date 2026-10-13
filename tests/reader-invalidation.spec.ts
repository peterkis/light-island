import {test,expect} from '@playwright/test';
import type {WebSocketRoute} from '@playwright/test';
const base='http://127.0.0.1:17322';
for(const phase of ['sum','read','paused'] as const)test(`island reader disposes ${phase} on authoritative deletion and ignores a late report`,async({page,request})=>{
 let socket:WebSocketRoute|undefined,reply='';
 await page.routeWebSocket('ws://127.0.0.1:17322/events',route=>{const server=route.connectToServer();server.onMessage(raw=>{const event=JSON.parse(raw.toString());if(event.type==='clinical:lab-report'){socket=route;reply=raw.toString();}route.send(raw);});});
 const push=async(data:object)=>expect((await request.post(base+'/api/push',{data})).ok()).toBeTruthy();
 await push({type:'clinical:reset'});await page.goto('/clinical.html');await expect(page.getByTestId('clinical-scenario-S04')).toBeVisible();await expect(page.locator('.cs-connection')).toContainText('模拟消息源已连接');
 await push({type:'clinical:configure',settings:{reduced:true}});await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
 const island=page.getByTestId('clinical-island');await island.getByRole('button',{name:'查看检验报告摘要'}).click();
 await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().lab.hasReport)).toBe(true);
 if(phase!=='sum'){await island.getByRole('button',{name:'阅读报告',exact:true}).click();await expect(island).toHaveAttribute('data-lab-state','read');}
 if(phase==='paused'){await page.mouse.move(1,1);await island.locator('.lab-body').hover();}
 const snapshot=await(await request.get(base+'/api/clinical-state')).json();
 if(!socket||!reply)throw new Error('Expected report response');socket.send(JSON.stringify({...snapshot,type:'clinical:snapshot',activities:[]}));
 await expect(island).toHaveAttribute('data-lab-state','idle');await expect(island.locator('.lab-row')).toHaveCount(0);
 expect(await page.evaluate(()=>window.__CLINICAL_DEBUG__?.().lab)).toMatchObject({hasReport:false,hasActivity:false,protected:false});
 socket.send(reply);await page.waitForTimeout(150);await expect(island).toHaveAttribute('data-lab-state','idle');await expect(island).not.toContainText('张**');
});
test('a malformed timer does not replace the last valid state or crash the island',async({page,request})=>{
 let socket:WebSocketRoute|undefined,syncs=0;const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.routeWebSocket('ws://127.0.0.1:17322/events',route=>{socket=route;const server=route.connectToServer();route.onMessage(raw=>{if(JSON.parse(raw.toString()).type==='clinical:sync')syncs++;server.send(raw);});});
 await request.post(base+'/api/push',{data:{type:'clinical:reset'}});await page.goto('/clinical.html');
 await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer.status)).toBe('idle');
 await expect.poll(()=>syncs).toBe(1);const before=await page.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer);
 if(!socket)throw new Error('Expected socket');socket.send(JSON.stringify({type:'clinical:timer',timer:null}));
 await expect.poll(()=>page.evaluate(()=>window.__CLINICAL_DEBUG__?.().queue.rejected)).toBeGreaterThan(0);
 expect(await page.evaluate(()=>window.__CLINICAL_DEBUG__?.().timer)).toEqual(before);expect(errors).toEqual([]);
});
