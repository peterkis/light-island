// Physical SendInput and finite HWND sampling; only the dedicated prototype CDP port.
import { chromium, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { writeFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const before=process.argv.includes('--before');
const subset=JSON.parse(process.env.HOVER_QA_CASES || 'null');
const outputName=process.env.HOVER_QA_OUTPUT || (before ? 'before-native.json' : 'after-native.json');
const folder='evidence/hover-fix-20260930';await mkdir(folder,{recursive:true});
const probe=p=>JSON.parse(execFileSync('python',['scripts/hover-win32-probe.py',JSON.stringify(p)],{encoding:'utf8'}));
const original=probe({op:'snapshot'}).cursor;
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost')&&p.url().includes('view=island'));
assert(page,'Not the prototype WebView');
const pill=page.getByTestId('island');
const call=(cmd,args)=>page.evaluate(({cmd,args})=>window.__TAURI_INTERNALS__.invoke(cmd,args),{cmd,args});
assert((await call('hover_diagnostics',{clear:false})).enabled,'Start with --hover-diagnostics --qa-cdp');
const post=async data=>{ const r=await fetch('http://127.0.0.1:17321/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});assert(r.ok); };
const read=()=>page.evaluate(()=>({events:window.__HOVER_TRACE__?.()??[],epoch:document.querySelector('[data-testid=island]').dataset.motionEpoch,hovered:document.querySelector('[data-testid=island]').dataset.hovered,phase:document.querySelector('[data-testid=island]').dataset.motionPhase}));
const report={time:new Date().toISOString(),variant:before?'baseline+diagnostics':'final',input:'Win32 SendInput; no OS DPI changed',cases:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
try {
 const combos=before?[['gsap','notch',false]]:[['gsap','notch',false],['css','notch',false],['gsap','capsule',false],['css','capsule',false],['gsap','notch',true],['css','notch',true],['gsap','capsule',true],['css','capsule',true]];
 for(const [engine,shape,reduced] of combos) for(const side of ['left','right','bottom','center']) {
  if(subset && !subset.includes([engine,shape,reduced,side].join(':'))) continue;
  probe({op:'move',x:40,y:140});
  await post({type:'reset'});await post({type:'configure',settings:{engine,shape,reduced,focus:false,privacy:true,theme:'ink'}});
  await expect(pill).toHaveAttribute('data-shape',shape);await expect(pill).toHaveAttribute('data-motion-engine',engine);
  await expect(pill).toHaveAttribute('data-mode','compact');await expect(pill).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(200);
  const state=probe({op:'snapshot'}),dom=await pill.boundingBox(),s=state.dpi/96;
  const left=state.rect[0]+dom.x*s,top=state.rect[1]+dom.y*s,w=dom.width*s,h=dom.height*s;
  const ear=shape==='notch'?7*s:0;
  const x=Math.round(side==='left'?left+ear+1:side==='right'?left+w-ear-2:left+w/2);
  const y=Math.round(side==='bottom'?top+h-1:side==='center'?top+h/2:top+h*.45);
  const outside=side==='left'?[left-22,y]:side==='right'?[left+w+22,y]:[x,top+h+22];
  probe({op:'move',x:Math.round(outside[0]),y:Math.round(outside[1])});await page.waitForTimeout(150);
  const start=await read();const nativeStart=await call('hover_diagnostics',{clear:true});
  const entry=probe({op:'move',x,y,steps:40,delay:.02});
  const held=probe({op:'hold',seconds:6});
  const middle=await read();
  probe({op:'move',x:Math.round(left+w/2),y:Math.round(top+h+70),steps:18,delay:.015});
  await page.waitForTimeout(900);
  const end=await read(),native=await call('hover_diagnostics',{clear:true});
  const events=end.events.filter(r=>r.seq>(start.events.at(-1)?.seq??0));
  const still=held.filter(r=>r.at>=held[0].at+800);
  const stillEpochs=events.filter(r=>r.kind==='motion-start'&&r.at>=still[0].at&&r.at<=still.at(-1).at);
  const row={engine,shape,reduced,side,target:[x,y],before:state,entry,after:probe({op:'snapshot'}),hold:held,events,native,
   uniqueHoldCursors:[...new Set(held.map(r=>JSON.stringify(r.cursor)))],uniqueHoldRects:[...new Set(held.map(r=>JSON.stringify(r.rect)))],
   stillEpochChanges:stillEpochs.length,midHover:middle.hovered,endHover:end.hovered,
   windowMoves:native.events.filter(r=>r.kind==='set-window-pos-before').length};
  row.pass=row.uniqueHoldCursors.length===1&&row.uniqueHoldRects.length===1&&row.stillEpochChanges===0&&middle.hovered==='true'&&end.hovered==='false';
  if(!before) row.pass&&=row.windowMoves===0;
  report.cases.push(row);
  console.log(JSON.stringify({engine,shape,reduced,side,pass:row.pass,rects:row.uniqueHoldRects.length,stationaryEpochs:row.stillEpochChanges,midHover:row.midHover,moves:row.windowMoves}));
 }
} finally {
 await post({type:'reset'});probe({op:'move',x:original[0],y:original[1]});
 await writeFile(`${folder}/${outputName}`,JSON.stringify(report,null,2));
 await browser.close();
}
if(!before) assert(report.cases.every(r=>r.pass)&&report.errors.length===0,'Native hover regression failed; inspect evidence JSON');
