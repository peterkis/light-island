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
Expected: 0
Received: 8
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" getByRole('dialog', { name: '模拟来源边界' }).locator('.lab-row') with timeout 5000ms
  - waiting for getByRole('dialog', { name: '模拟来源边界' }).locator('.lab-row')
    14 × locator resolved to 8 elements
       - unexpected value "8"

```

# Page snapshot

```yaml
- main [ref=f1e3]:
  - dialog "模拟来源边界" [ref=f1e4]:
    - generic [ref=f1e5]:
      - generic [ref=f1e6]: 模拟来源边界 · 非真实 HIS / LIS
      - button "返回灵动岛" [ref=f1e10] [cursor=pointer]: 返回
    - text: SOURCE OBJECT / READ ONLY
    - heading "检验报告已出" [level=1] [ref=f1e13]
    - paragraph [ref=f1e14]: 模拟检验报告
    - generic [ref=f1e15]:
      - generic [ref=f1e16]:
        - term [ref=f1e17]: 来源
        - definition [ref=f1e18]: PACS / LIS
      - generic [ref=f1e19]:
        - term [ref=f1e20]: 院区
        - definition [ref=f1e21]: DEMO-本部
      - generic [ref=f1e22]:
        - term [ref=f1e23]: 原始就诊
        - definition [ref=f1e24]: DEMO-VISIT-006
      - generic [ref=f1e25]:
        - term [ref=f1e26]: 来源对象
        - definition [ref=f1e27]: DEMO-S04
      - generic [ref=f1e28]:
        - term [ref=f1e29]: 来源版本
        - definition [ref=f1e30]: v1
      - generic [ref=f1e31]:
        - term [ref=f1e32]: 来源状态
        - definition [ref=f1e33]: 只读报告已发布
    - paragraph [ref=f1e34]: 血常规 肝功能 CRP 3 项异常
    - generic [ref=f1e35]:
      - heading "血常规 + 肝功能 + CRP" [level=2] [ref=f1e36]
      - paragraph [ref=f1e37]: 张** 静脉血 10:42
      - generic [ref=f1e38]:
        - heading "异常 3 项" [level=3] [ref=f1e39]
        - article [ref=f1e40]:
          - generic [ref=f1e41]: 白细胞WBC
          - generic [ref=f1e42]: 参考 3.5–9.5
          - strong [ref=f1e43]:
            - text: 11.2×10⁹/L
            - emphasis [ref=f1e44]: ↑
        - article [ref=f1e48]:
          - generic [ref=f1e49]: 血红蛋白HGB
          - generic [ref=f1e50]: 参考 130–175
          - strong [ref=f1e51]:
            - text: 128g/L
            - emphasis [ref=f1e52]: ↓
        - article [ref=f1e56]:
          - generic [ref=f1e57]: C反应蛋白CRP
          - generic [ref=f1e58]: 参考 0–6
          - strong [ref=f1e59]:
            - text: 18.4mg/L
            - emphasis [ref=f1e60]: ↑
      - generic [ref=f1e64]:
        - heading "其余 5 项正常" [level=3] [ref=f1e65]
        - article [ref=f1e66]:
          - generic [ref=f1e67]: 红细胞RBC
          - generic [ref=f1e68]: 参考 4.3–5.8
          - strong [ref=f1e69]: 4.6×10¹²/L
        - article [ref=f1e73]:
          - generic [ref=f1e74]: 血小板PLT
          - generic [ref=f1e75]: 参考 125–350
          - strong [ref=f1e76]: 235×10⁹/L
        - article [ref=f1e80]:
          - generic [ref=f1e81]: 谷丙转氨酶ALT
          - generic [ref=f1e82]: 参考 9–50
          - strong [ref=f1e83]: 32U/L
        - article [ref=f1e87]:
          - generic [ref=f1e88]: 谷草转氨酶AST
          - generic [ref=f1e89]: 参考 15–40
          - strong [ref=f1e90]: 28U/L
        - article [ref=f1e94]:
          - generic [ref=f1e95]: 总胆红素TBIL
          - generic [ref=f1e96]: 参考 3.4–20.5
          - strong [ref=f1e97]: 14.2μmol/L
    - paragraph [ref=f1e105]: 这里仅验证“跳转到正确对象”的原型链路。未连接真实医疗系统，未完成临床接收、复核、处置或任务转移。
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
  33 |   await expect(source.locator('.lab-row')).toHaveCount(8);
  34 |   invalidate=true;
  35 |   await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
  36 |   if(change.startsWith('snapshot')){
  37 |    await expect(source.locator('.lab-row')).toHaveCount(8);
  38 |    await push({type:'clinical:refresh'});
  39 |   }
> 40 |   await expect(source.locator('.lab-row')).toHaveCount(0);
     |                                            ^ Error: expect(locator).toHaveCount(expected) failed
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