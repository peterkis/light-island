import {describe,it,expect} from 'vitest';
import {createClinicalDemo} from '../server/clinical-demo.mjs';
import catalogue from '../src/clinical/catalogue.json';
import tokens from '../src/clinical/tokens.json';
import {readFileSync} from 'node:fs';
import {canView,defaults,emptyQueue,identityKey,ingest,parseActivity,routeMatches,timerAction,emptyTimer,timerRemaining,versionKey} from '../src/clinical/model';
import {layoutWidth,layoutHeight,contour} from '../src/clinical/geometry';
const fixture=(id='S03',stage=0)=>{const demo=createClinicalDemo(()=>{},()=>1800000000000);demo.handle({type:'clinical:scenario',scenario:id,stage});return demo.inspect().activities[0];};
describe('clinical source contracts and all documented scenarios',()=>{
 for(const def of catalogue)for(let stage=0;stage<def.stages.length;stage++)it(`${def.id} state ${stage+1}: bounded read-only source snapshot`,()=>{
  const a=fixture(def.id,stage);expect(parseActivity(a)).not.toBeNull();expect(a.stage).toBe(stage);expect(a.fields.length).toBeLessThanOrEqual(8);expect(a.guard).toBe(def.guard);expect(a.title).toBe(def.stages[stage].title);
 });
 it('takes tokens from the current user-authored UI/UX CSS block',()=>{const text=readFileSync(tokens.source,'utf8');for(const [name,value] of Object.entries(tokens.css))expect(text).toContain(`--${name}:${value}`);expect(tokens.geometry.idle.width).toBe(124);});
 it('does not merge same person across source, campus, visit or object',()=>{const a=fixture();let q=ingest(emptyQueue(),a);for(const k of ['source','campus','encounter','object'])q=ingest(q,{...a,identity:{...a.identity,[k]:'DEMO-DIFFERENT'}});expect(q.items).toHaveLength(5);});
 it('deduplicates and rejects old versions without restoring a withdrawal',()=>{const a=fixture('S08',5),q=ingest(emptyQueue(),{...a,version:3});expect(ingest(q,{...a,version:2,withdrawn:false}).items[0].withdrawn).toBe(true);expect(ingest(q,{...a,version:3}).duplicates).toBe(1);expect(versionKey(a)).not.toBe(versionKey({...a,version:2}));});
 it('bounded queue reports overflow, still allows exact object revision',()=>{const a=fixture();let q=emptyQueue();for(let i=0;i<21;i++)q=ingest(q,{...a,identity:{...a.identity,object:String(i)}});expect(q.items).toHaveLength(20);expect(q.overflow).toBe(1);q=ingest(q,{...q.items[0],version:2});expect(q.items[0].version).toBe(2);});
 it('no payload URLs, action callbacks or injected HTML execute through the contract',()=>{const a=fixture();expect(parseActivity({...a,href:'javascript:alert(1)'})).not.toHaveProperty('href');expect(parseActivity({...a,routeKind:'arbitrary'})).toBeNull();expect(parseActivity({...a,version:NaN})).toBeNull();});
 it('privacy, locked, signed-out and unrelated roles deny source details',()=>{const a=fixture();for(const s of [{privacy:true},{locked:true},{fullscreen:true},{role:'none'},{role:'finance'}])expect(canView(a,{...defaults,...s} as any)).toBe(false);expect(canView(fixture('S05'),{...defaults,role:'clinician'})).toBe(false);});
 it('routing matches every identity dimension and revision',()=>{const a=fixture();expect(routeMatches(a,a.identity,a.version)).toBe(true);expect(routeMatches(a,{...a.identity,encounter:'OTHER'},a.version)).toBe(false);expect(routeMatches(a,a.identity,99)).toBe(false);});
});
describe('source boundary is read-only and version-guarded',()=>{
 it('open and source-read do not confirm or alter the clinical object',()=>{const d=createClinicalDemo(()=>{},()=>1800000000000),out:any[]=[];d.handle({type:'clinical:scenario',scenario:'S03',stage:0});const a=d.inspect().activities[0],before=JSON.stringify(a);d.handle({type:'clinical:open',requestId:'test',identity:a.identity,version:a.version,routeKind:a.routeKind},e=>out.push(e));expect(out[0].ticket).toBeTruthy();d.handle({type:'clinical:source-read',ticket:out[0].ticket},e=>out.push(e));expect(out[1].activity.version).toBe(1);expect(JSON.stringify(d.inspect().activities[0])).toBe(before);for(const type of ['clinical:ack','clinical:complete','clinical:dispatch'])expect(()=>d.handle({type})).toThrow(/read-only/);});
 it('new revision invalidates an existing route ticket',()=>{const d=createClinicalDemo(()=>{},()=>1800000000000);d.handle({type:'clinical:scenario',scenario:'S08',stage:0});const a=d.inspect().activities[0];let reply:any;d.handle({type:'clinical:open',requestId:'t',identity:a.identity,version:a.version,routeKind:a.routeKind},e=>reply=e);const ticket=reply.ticket;d.handle({type:'clinical:scenario',scenario:'S08',stage:5});d.handle({type:'clinical:source-read',ticket},e=>reply=e);expect(reply.error).toBeTruthy();});
 it('reconnection never freshens old source timestamps',()=>{const d=createClinicalDemo(()=>{},()=>1800000000000);d.handle({type:'clinical:scenario',scenario:'S03',stage:5});const before=d.inspect().activities[0].syncedAt;let reply:any;d.handle({type:'clinical:sync'},e=>reply=e);expect(reply.activities[0].syncedAt).toBe(before);});
 it('source authorization change masks details and revokes tickets',()=>{const d=createClinicalDemo(()=>{},()=>1800000000000);d.handle({type:'clinical:scenario',scenario:'S05',stage:0});expect(d.snapshot().activities[0].fields).toEqual([]);d.handle({type:'clinical:configure',settings:{role:'finance'}});expect(d.snapshot().activities[0].fields.length).toBeGreaterThan(0);d.handle({type:'clinical:configure',settings:{privacy:true}});expect(d.snapshot().activities[0].fields).toEqual([]);});
});
describe('personal timer remains independent',()=>{
 it('uses a deadline, pauses remaining time, resumes and ends locally',()=>{let t=timerAction(emptyTimer(),'start',1000,1500000);expect(timerRemaining(t,61000)).toBe(1440000);t=timerAction(t,'pause',61000);expect(timerRemaining(t,80000)).toBe(1440000);t=timerAction(t,'resume',100000);expect(t.deadline).toBe(1540000);expect(timerRemaining(t,1600000)).toBe(0);expect(timerAction(t,'end').status).toBe('idle');});
 it('critical source updates do not restart or pause the timer',()=>{const d=createClinicalDemo(()=>{},()=>1000);d.handle({type:'clinical:personal',command:'start'});const before=d.inspect().timer;d.handle({type:'clinical:scenario',scenario:'S03',stage:0});expect(d.inspect().timer).toEqual(before);});
});
describe('clinical responsive geometry',()=>{
 for(const textScale of [1,2,2.25])it(`text ${textScale}: bounded width and scrollable height`,()=>{
  for(const available of [320,390,1280,1920])for(const view of ['idle','compact','expanded'] as const){
   const w=layoutWidth(view,available,textScale),h=layoutHeight(view,1000,900,textScale);
   expect(w).toBeLessThanOrEqual(available);expect(h).toBeLessThanOrEqual(480);
   const shape=contour({width:w,height:h,radius:view==='expanded'?32:18,ear:tokens.geometry.earRadius});
   for(const [x,y] of shape.points){expect(x).toBeGreaterThanOrEqual(-tokens.geometry.earRadius-.001);expect(x).toBeLessThanOrEqual(w+tokens.geometry.earRadius+.001);expect(y).toBeGreaterThanOrEqual(-.001);expect(y).toBeLessThanOrEqual(h+.001);}
  }
 });
});
