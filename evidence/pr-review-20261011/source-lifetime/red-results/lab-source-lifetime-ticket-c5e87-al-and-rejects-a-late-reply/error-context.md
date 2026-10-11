# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: lab-source-lifetime.spec.ts >> ticket-backed report clears on withdrawal and rejects a late reply
- Location: tests\lab-source-lifetime.spec.ts:5:2

# Error details

```
Error: expect(locator).toHaveCount(expected) failed

Locator:  getByRole('dialog', { name: '模拟来源边界' }).locator('.lab-row')
Expected: 8
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('dialog', { name: '模拟来源边界' }).locator('.lab-row') with timeout 5000ms
  - waiting for getByRole('dialog', { name: '模拟来源边界' }).locator('.lab-row')
    14 × locator resolved to 0 elements
       - unexpected value "0"

```

# Page snapshot

```yaml
- main [ref=f1e3]:
  - dialog "模拟来源边界" [ref=f1e4]:
    - generic [ref=f1e5]:
      - generic [ref=f1e6]: 模拟来源边界 · 非真实 HIS / LIS
      - button "返回灵动岛" [ref=f1e10] [cursor=pointer]: 返回
    - heading "来源详情未显示" [level=1] [ref=f1e13]
    - paragraph [ref=f1e14]: 正在核对对象、版本与演示权限…
    - text: 来源对象或权限变化后，请返回重新打开。
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import type {WebSocketRoute} from '@playwright/test';
  3  | 
  4  | for(const change of ['activity-revision','withdrawal','snapshot-revision','snapshot-absent']){
  5  |  test(`ticket-backed report clears on ${change} and rejects a late reply`,async({page,request})=>{
  6  |   const push=async(data:object)=>expect((await request.post('http://127.0.0.1:17322/api/push',{data})).ok()).toBeTruthy();
  7  |   let invalidate=false,sourceReply='',sourceSocket:WebSocketRoute|undefined;
  8  |   await page.routeWebSocket('ws://127.0.0.1:17322/events',socket=>{
  9  |    const server=socket.connectToServer();
  10 |    server.onMessage(raw=>{
  11 |     const message=JSON.parse(raw.toString());
  12 |     if(message.type==='clinical:source'&&!message.error){sourceReply=raw.toString();sourceSocket=socket;}
  13 |     if(invalidate&&message.type==='clinical:activity'){
  14 |      if(change.startsWith('snapshot'))return;
  15 |      if(change==='withdrawal')message.activity.withdrawn=true;
  16 |     }
  17 |     if(invalidate&&change==='snapshot-absent'&&message.type==='clinical:snapshot')message.activities=[];
  18 |     socket.send(JSON.stringify(message));
  19 |    });
  20 |   });
  21 |   await push({type:'clinical:reset'});
  22 |   await page.goto('/clinical.html');
  23 |   await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
  24 |   const activity=(await (await request.get('http://127.0.0.1:17322/api/clinical-state')).json()).activities[0];
  25 |   const ticket=await page.evaluate(a=>new Promise<string>((resolve,reject)=>{
  26 |    const socket=new WebSocket('ws://127.0.0.1:17322/events');
  27 |    const timeout=setTimeout(()=>{socket.close();reject(new Error('Ticket request timed out'));},5000);
  28 |    socket.onopen=()=>socket.send(JSON.stringify({type:'clinical:open',requestId:'source-lifetime',identity:a.identity,version:a.version,routeKind:a.routeKind}));
  29 |    socket.onmessage=event=>{const reply=JSON.parse(event.data);if(reply.type==='clinical:route'){clearTimeout(timeout);socket.close();reply.ticket?resolve(reply.ticket):reject(new Error('Ticket refused'));}};
  30 |   }),activity);
  31 |   await page.goto('/clinical.html?source='+ticket);
  32 |   const source=page.getByRole('dialog',{name:'模拟来源边界'});
> 33 |   await expect(source.locator('.lab-row')).toHaveCount(8);
     |                                            ^ Error: expect(locator).toHaveCount(expected) failed
  34 |   invalidate=true;
  35 |   await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
  36 |   if(change.startsWith('snapshot')){
  37 |    await expect(source.locator('.lab-row')).toHaveCount(8);
  38 |    await push({type:'clinical:refresh'});
  39 |   }
  40 |   await expect(source.locator('.lab-row')).toHaveCount(0);
  41 |   await expect(source).not.toContainText('张**');
  42 |   await expect(source.getByRole('heading',{name:'来源详情未显示'})).toBeVisible();
  43 |   if(!sourceSocket||!sourceReply)throw new Error('Source response was not observed');
  44 |   sourceSocket.send(sourceReply);
  45 |   await page.waitForTimeout(250);
  46 |   await expect(source.locator('.lab-row')).toHaveCount(0);
  47 |  });
  48 | }
  49 | 
```