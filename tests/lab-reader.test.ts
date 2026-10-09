import {describe,it,expect} from 'vitest';
import {labFixture} from '../server/lab-fixtures.mjs';
import {createClinicalDemo} from '../server/clinical-demo.mjs';
import {parseLabReport,rangeBar,ReadBudget,summaryItems,disposeLabReport} from '../src/clinical/lab-reader/model';
import {labGeometry} from '../src/clinical/lab-reader/geometry';
const identity={source:'LIS',campus:'DEMO',encounter:'DEMO-VISIT',object:'DEMO-LAB'};
const raw=()=>labFixture(identity,1);
const report=()=>parseLabReport(raw(),{identity,version:1,id:raw().id})!;
describe('ephemeral lab report contract',()=>{
 it('checks identity and revision and copies only allowlisted fields',()=>{const fixture={...raw(),html:'<script>unsafe()</script>'};const a=parseLabReport(fixture,{identity,version:1,id:fixture.id});expect(a).not.toHaveProperty('html');expect(a!.items).not.toBe(fixture.items);expect(parseLabReport(fixture,{identity,version:2,id:fixture.id})).toBeNull();expect(parseLabReport(fixture,{identity:{...identity,object:'other'},version:1,id:fixture.id})).toBeNull();});
 it('rejects unsafe/unbounded reports, duplicate ids and nonfinite numbers',()=>{for(const patch of [{maskedName:'真实姓名'},{items:Array(129).fill(raw().items[0])},{items:[raw().items[0],raw().items[0]]},{items:[{...raw().items[0],value:Infinity}]}])expect(parseLabReport({...raw(),...patch},{identity,version:1,id:raw().id})).toBeNull();});
 it('disposes owned outgoing references without modifying the read-only source',()=>{const source=raw(),r=parseLabReport(source,{identity,version:1,id:source.id})!,row=r.items[0];disposeLabReport(r);expect(r.items).toHaveLength(0);expect(r.maskedName).toBe('');expect(row.name).toBe('');expect(row.value).toBeNull();expect(source.items[0].name).toBe('白细胞');});
 it('matches every fixture range coordinate and source-ordered three chips',()=>{const a=report();const expected=[85.61,25.25,98,36.36,49.49,52.77,50.91,55.98];a.items.forEach((item,i)=>expect(rangeBar(item)!.dot).toBeCloseTo(expected[i],2));expect(rangeBar(a.items[2])!.left).toBe(2);expect(rangeBar(a.items[2])!.width).toBeCloseTo(60.5,2);expect(summaryItems(a.items).map(i=>i.abbr)).toEqual(['WBC','HGB','CRP']);});
 it('degrades qualitative, missing, single-sided and equal ranges without invalid CSS',()=>{for(const patch of [{text:'阳性'},{value:null},{lo:null},{hi:null},{lo:5,hi:5},{lo:10,hi:5}])expect(rangeBar({...report().items[0],...patch})).toBeNull();});
 it('uses one elapsed budget through pauses and long scheduler gaps',()=>{const b=new ReadBudget(1000);expect(b.remaining(1100)).toBe(59900);b.pause(true,1300);expect(b.remaining(9000)).toBe(59700);b.pause(false,9000);expect(b.remaining(12000)).toBe(56700);expect(b.remaining(999999)).toBe(0);});
 it('keeps the reader inside short viewports and preserves scene-specific dimensions',()=>{expect(labGeometry('sum',1440,1080)).toEqual({width:372,height:200,radius:40});expect(labGeometry('read',1440,1080)).toEqual({width:400,height:580,radius:44});expect(labGeometry('done',1440,1080)).toEqual({width:210,height:36,radius:18});expect(labGeometry('read',400,300).height).toBe(284);expect(labGeometry('sum',1440,1080,2.25).height).toBeGreaterThan(200);});
});
describe('read-only lab source boundary',()=>{
 it('replies privately, excludes report rows from snapshots and rejects expired revisions and revoked roles',()=>{
  const broadcast:any[]=[],reply:any[]=[];const demo=createClinicalDemo((e:any)=>broadcast.push(e));const push=(e:any)=>demo.handle(e,(r:any)=>reply.push(r));
  push({type:'clinical:scenario',scenario:'S04',stage:0,labVariant:'baseline'});const a=demo.snapshot().activities[0];expect(a.labRef.abnormalCount).toBe(3);expect(JSON.stringify(demo.snapshot())).not.toContain('白细胞');
  const request={type:'clinical:lab-read',requestId:'one',identity:a.identity,version:a.version,reportId:a.labRef.id};const before=broadcast.length;push(request);expect(broadcast).toHaveLength(before);expect(reply.at(-1).report.items).toHaveLength(8);
  push({...request,version:0});expect(reply.at(-1)).toHaveProperty('error');push({type:'clinical:configure',settings:{role:'none'}});push(request);expect(reply.at(-1)).toHaveProperty('error');
  expect(()=>push({type:'clinical:lab-delete',identity:a.identity})).toThrow(/read-only/);
 });
 it('routes the complete report through exact source tickets without changing clinical state',()=>{const demo=createClinicalDemo(()=>{}),replies:any[]=[];const push=(e:any)=>demo.handle(e,(r:any)=>replies.push(r));push({type:'clinical:scenario',scenario:'S04',labVariant:'extended'});const a=demo.snapshot().activities[0];push({type:'clinical:open',requestId:'open',identity:a.identity,version:a.version,routeKind:'reports'});push({type:'clinical:source-read',ticket:replies.at(-1).ticket});expect(replies.at(-1).labReport.items).toHaveLength(12);expect(demo.snapshot().activities[0].sourceState).toBe('只读报告已发布');});
});
