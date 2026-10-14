import {test,expect} from '@playwright/test';
import type {WebSocketRoute} from '@playwright/test';

for(const change of ['activity-revision','withdrawal','snapshot-revision','snapshot-absent']){
 test(`ticket-backed report clears on ${change} and rejects a late reply`,async({page,request})=>{
  const push=async(data:object)=>expect((await request.post(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322')+'/api/push'),{data})).ok()).toBeTruthy();
  let invalidate=false,sourceReply='',sourceSocket:WebSocketRoute|undefined;
  await page.routeWebSocket(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322').replace('http:','ws:')+'/events'),socket=>{
   const server=socket.connectToServer();
   server.onMessage(raw=>{
    const message=JSON.parse(raw.toString());
    if(message.type==='clinical:source'&&!message.error){sourceReply=raw.toString();sourceSocket=socket;}
    if(invalidate&&message.type==='clinical:activity'){
     if(change.startsWith('snapshot'))return;
     if(change==='withdrawal')message.activity.withdrawn=true;
    }
    if(invalidate&&change==='snapshot-absent'&&message.type==='clinical:snapshot')message.activities=[];
    socket.send(JSON.stringify(message));
   });
  });
  await push({type:'clinical:reset'});
  await page.goto('/workbench.html');
  await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
  const activity=(await (await request.get(((process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322')+'/api/clinical-state'))).json()).activities[0];
  const ticket=await page.evaluate(({activity:a,endpoint})=>new Promise<string>((resolve,reject)=>{
   const socket=new WebSocket(endpoint);let sourceSessionId='';
   const timeout=setTimeout(()=>{socket.close();reject(new Error('Ticket request timed out'));},5000);
   socket.onmessage=event=>{const reply=JSON.parse(event.data);if(reply.type==='transport:hello'){sourceSessionId=reply.sourceSessionId;socket.send(JSON.stringify({type:'transport:subscribe',protocolVersion:2,role:'source',clientId:crypto.randomUUID()}));}if(reply.type==='transport:ready')socket.send(JSON.stringify({type:'clinical:open',requestId:'source-lifetime',identity:a.identity,version:a.version,routeKind:a.routeKind,sourceSessionId}));if(reply.type==='clinical:route'){clearTimeout(timeout);socket.close();reply.ticket?resolve(reply.ticket):reject(new Error('Ticket refused'));}};
  }),{activity,endpoint:(process.env.ISLAND_TEST_SOURCE_URL??'http://127.0.0.1:17322').replace('http:','ws:')+'/events'});
  await page.goto('/clinical.html?source='+ticket);
  const source=page.getByRole('dialog',{name:'模拟来源边界'});
  await expect(source.locator('.lab-row')).toHaveCount(8);
  invalidate=true;
  await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
  if(change.startsWith('snapshot')){
   await expect(source.locator('.lab-row')).toHaveCount(8);
   await push({type:'clinical:refresh'});
  }
  await expect(source.locator('.lab-row')).toHaveCount(0);
  await expect(source).not.toContainText('张**');
  await expect(source.getByRole('heading',{name:'来源详情未显示'})).toBeVisible();
  if(!sourceSocket||!sourceReply)throw new Error('Source response was not observed');
  sourceSocket.send(sourceReply);
  await page.waitForTimeout(250);
  await expect(source.locator('.lab-row')).toHaveCount(0);
 });
}
