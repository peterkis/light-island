import {test,expect} from '@playwright/test';
import type {WebSocketRoute} from '@playwright/test';

for(const change of ['activity-revision','withdrawal','snapshot-revision','snapshot-absent']){
 test(`ticket-backed report clears on ${change} and rejects a late reply`,async({page,request})=>{
  const push=async(data:object)=>expect((await request.post('http://127.0.0.1:17322/api/push',{data})).ok()).toBeTruthy();
  let invalidate=false,sourceReply='',sourceSocket:WebSocketRoute|undefined;
  await page.routeWebSocket('ws://127.0.0.1:17322/events',socket=>{
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
  await page.goto('/clinical.html');
  await push({type:'clinical:scenario',scenario:'S04',labVariant:'baseline'});
  const activity=(await (await request.get('http://127.0.0.1:17322/api/clinical-state')).json()).activities[0];
  const ticket=await page.evaluate(a=>new Promise<string>((resolve,reject)=>{
   const socket=new WebSocket('ws://127.0.0.1:17322/events');
   const timeout=setTimeout(()=>{socket.close();reject(new Error('Ticket request timed out'));},5000);
   socket.onopen=()=>socket.send(JSON.stringify({type:'clinical:open',requestId:'source-lifetime',identity:a.identity,version:a.version,routeKind:a.routeKind}));
   socket.onmessage=event=>{const reply=JSON.parse(event.data);if(reply.type==='clinical:route'){clearTimeout(timeout);socket.close();reply.ticket?resolve(reply.ticket):reject(new Error('Ticket refused'));}};
  }),activity);
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
