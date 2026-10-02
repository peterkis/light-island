// Native rendering capture; DOM activation only, no OS pointer injection.
import {chromium,expect} from '@playwright/test';
import {spawn} from 'node:child_process';
import {access,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const engine=process.argv[3]||'gsap';
const variant=process.argv[2]||'working',dir=`evidence/click-fix-20260930/${variant}-render`;await mkdir(dir,{recursive:true});
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost')&&p.url().includes('view=island'));assert(page);
const call=(cmd,args)=>page.evaluate(({cmd,args})=>window.__TAURI_INTERNALS__.invoke(cmd,args),{cmd,args});
const post=async data=>assert((await fetch('http://127.0.0.1:17321/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)})).ok);
const island=page.getByTestId('island');
await post({type:'reset'});await post({type:'configure',settings:{shape:'notch',engine,theme:'ink',reduced:false}});
await expect(island).toHaveAttribute('data-mode','compact');await expect(island).toHaveAttribute('data-motion-phase','settled');
const child=spawn('python',['scripts/capture-click-surface.py',dir],{stdio:['ignore','pipe','pipe']});
let output='';child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
const done=new Promise(resolve=>child.on('exit',code=>resolve(code)));
try{
 for(let i=0;i<60;i++){try{await access(`${dir}/ready.json`);break;}catch{await page.waitForTimeout(100);}}
 await access(`${dir}/ready.json`);await call('hover_diagnostics',{clear:true});
 const first=await page.evaluate(()=>window.__HOVER_TRACE__().at(-1)?.seq??0);
 const samples=page.evaluate(()=>new Promise(resolve=>{const a=[],start=performance.now();function tick(){const e=document.querySelector('[data-testid=island]'),b=e.getBoundingClientRect(),s=getComputedStyle(e.querySelector('.notch-content'));a.push({at:performance.timeOrigin+performance.now(),x:b.x,w:b.width,h:b.height,viewport:innerWidth,phase:e.dataset.motionPhase,mode:e.dataset.mode,opacity:+s.opacity,epoch:e.dataset.motionEpoch});if(performance.now()-start<7200)requestAnimationFrame(tick);else resolve(a);}requestAnimationFrame(tick);}));
 await page.waitForTimeout(500);await page.locator('.compact-face').evaluate(e=>e.click());
 await expect(island).toHaveAttribute('data-mode','inbox');await expect(island).toHaveAttribute('data-motion-phase','settled');
 await page.waitForTimeout(1000);await page.locator('.rail-close').evaluate(e=>e.click());
 await expect(island).toHaveAttribute('data-mode','compact');await expect(island).toHaveAttribute('data-motion-phase','settled');
 const report={engine,input:'DOM activation of native WebView buttons; not physical mouse',samples:await samples,events:await page.evaluate(s=>window.__HOVER_TRACE__().filter(r=>r.seq>s),first),native:await call('hover_diagnostics',{clear:true})};
 await expect(page.locator('.rail-error')).toHaveCount(0);await writeFile(`${dir}/trace.json`,JSON.stringify(report,null,2));console.log('CAPTURE',await done,output);
}finally{console.log('CAPTURE PROCESS',await done,output);await browser.close();}
