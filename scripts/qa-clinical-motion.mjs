// Only the dedicated clinical WebView and synthetic loopback source. Finite native acceptance.
import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out='evidence/clinical-motion-20261004';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/clinical.html?view=island'));assert(page);
const p=page.getByTestId('clinical-island'),report={transitions:[],errors:[]};page.on('pageerror',e=>report.errors.push(e.message));
const call=(command,args)=>page.evaluate(({command,args})=>window.__TAURI_INTERNALS__.invoke(command,args),{command,args});
const post=async data=>assert((await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)})).ok);
const probe=data=>JSON.parse(execFileSync('python',['scripts/hover-win32-probe.py',JSON.stringify(data)],{encoding:'utf8'}));
const original=probe({op:'snapshot'}).cursor;
const settle=async(view)=>{if(view)await expect(p).toHaveAttribute('data-view',view);await expect(p).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(80);};
async function click(button){const box=await button.boundingBox(),win=probe({op:'snapshot'}),d=win.dpi/96;assert(box);
 probe({op:'move',x:Math.round(win.rect[0]+(box.x+box.width/2)*d),y:Math.round(win.rect[1]+(box.y+box.height/2)*d),steps:12,delay:.01});
 assert.equal(probe({op:'snapshot'}).hitRoot,win.hwnd,'Only click the prototype');probe({op:'click'});
}
const sample=()=>page.evaluate(()=>new Promise(resolve=>{const start=performance.now(),a=[];let previous=start;
 function tick(now){const e=document.querySelector('[data-testid=clinical-island]'),r=e.getBoundingClientRect(),content=e.querySelector('.ci-content');
  a.push({t:now-start,dt:now-previous,w:r.width,h:r.height,x:r.x,y:r.y,c:r.x+r.width/2,phase:e.dataset.motionPhase,transform:getComputedStyle(content).transform,svgWidth:Number(e.querySelector('svg.ci-shell').getAttribute('width')),svgHeight:Number(e.querySelector('svg.ci-shell').getAttribute('height'))});previous=now;
  if(now-start<1250)requestAnimationFrame(tick);else resolve(a);
 }requestAnimationFrame(tick);
}));
try{
 probe({op:'move',x:40,y:550});await post({type:'clinical:reset'});await post({type:'clinical:configure',settings:{reduced:false,textScale:1,role:'clinician',privacy:false,locked:false,fullscreen:false,connectivity:'fresh'}});await settle('idle');
 const baseline=probe({op:'snapshot'});report.baseline=baseline;assert.equal((await p.boundingBox()).width,160);assert.equal((await p.boundingBox()).height,34);
 await page.screenshot({path:out+'/idle-u.png',omitBackground:true});
 for(let i=0;i<3;i++){
  if(i===0){await post({type:'clinical:scenario',scenario:'S03',stage:0});await settle('compact');}
  for(const action of ['open','close']){
   await call('hover_diagnostics',{clear:true});const frames=sample();
   await click(p.getByRole('button',{name:action==='open'?'展开协作详情':'收起协作详情',exact:true}));await settle(action==='open'?'expanded':'compact');
   const rows=await frames,diag=await call('hover_diagnostics',{clear:true});
   assert.equal(diag.events.filter(e=>e.kind==='clinical-window-change').length,0);assert.deepEqual(probe({op:'snapshot'}).rect,baseline.rect);
   assert(new Set(rows.map(r=>Math.round(r.w))).size>8,'No continuous width animation');assert(new Set(rows.map(r=>Math.round(r.h))).size>8,'No continuous height animation');
   assert(Math.max(...rows.map(r=>r.c))-Math.min(...rows.map(r=>r.c))<1);assert(rows.every(r=>r.y===0));assert(rows.every(r=>Math.abs(r.svgWidth-r.w)<.03&&Math.abs(r.svgHeight-r.h)<.03),'React must not resize the SVG viewport before the accepted shell frame');
   const intervals=rows.slice(2).map(r=>r.dt).sort((a,b)=>a-b);
   report.transitions.push({iteration:i,action,rows,regionUpdates:diag.events.filter(e=>e.kind==='clinical-layout').length,fps:1000/(intervals.reduce((a,b)=>a+b,0)/intervals.length),p95ms:intervals[Math.floor(intervals.length*.95)]});
  }
 }
 const epoch=Number(await p.getAttribute('data-layout-epoch')),shape={bodyWidth:280,height:40,radius:20,ear:7,visible:true};
 assert.equal(await call('clinical_layout',{epoch:epoch-1,sequence:9999,phase:'frame',...shape}),false);
 assert.equal(await call('clinical_layout',{epoch,sequence:9999,phase:'commit',...shape}),false);
 let rejected=false;try{await call('clinical_layout',{epoch:epoch+100000,sequence:1,phase:'frame',...shape,bodyWidth:10000});}catch{rejected=true;}assert(rejected);report.staleAndMalformedRejected=true;
 for(let i=0;i<10;i++){await post({type:'clinical:view',mode:'open',scenario:'S03'});await page.waitForTimeout(40);await post({type:'clinical:view',mode:'compact'});}
 await post({type:'clinical:view',mode:'open',scenario:'S03'});await settle('expanded');
 assert.equal(await p.locator('.ci-content').evaluate(e=>e.inert),false);await page.screenshot({path:out+'/expanded-critical.png',omitBackground:true});
 await post({type:'clinical:configure',settings:{reduced:true}});await settle('expanded');
 await click(p.getByRole('button',{name:'收起协作详情',exact:true}));await settle('compact');
 await post({type:'clinical:reset'});await settle('idle');
 report.idleMutations=await p.evaluate(e=>new Promise(resolve=>{let n=0;const ro=new MutationObserver(r=>n+=r.length);ro.observe(e,{attributes:true,childList:true,subtree:true});setTimeout(()=>{ro.disconnect();resolve(n);},800);}));assert.equal(report.idleMutations,0);
 await post({type:'clinical:configure',settings:{reduced:false}});await settle('idle');assert.deepEqual(report.errors,[]);report.pass=true;
}finally{await post({type:'clinical:reset'});probe({op:'move',x:original[0],y:original[1]});await writeFile(out+'/motion-native.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,transitions:report.transitions.map(({rows,...r})=>({...r,frames:rows.length}))},null,2));await browser.close();}
