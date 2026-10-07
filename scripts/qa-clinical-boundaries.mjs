// State-matched native alpha/geometry checks and large-text controls on the dedicated QA WebView.
import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT||'evidence/clinical-20261004';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('clinical.html?view=island'));
assert(page,'Dedicated clinical WebView required');const p=page.getByTestId('clinical-island'),report={alpha:[],largeText:[]};
const post=async data=>assert((await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)})).ok);
try{
 execFileSync('python',['scripts/hover-win32-probe.py',JSON.stringify({op:'move',x:40,y:550})]);
 await post({type:'clinical:reset'});
 for(const view of ['idle','compact','expanded']){
  if(view==='compact')await post({type:'clinical:scenario',scenario:'S03',stage:0});
  if(view==='expanded')await post({type:'clinical:view',mode:'open',scenario:'S03'});
  await expect(p).toHaveAttribute('data-view',view);await expect(p).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(350);
  const path=`${out}/native-alpha-${view}.png`;await page.screenshot({path,omitBackground:true,scale:'device'});
  const alpha=JSON.parse(execFileSync('python',['scripts/probe-horizontal-region.py',path],{encoding:'utf8'}));
  assert.equal(alpha.clippedAntialiasPixels,0);report.alpha.push({view,...alpha});
 }
 for(const textScale of [2,2.25]){
  await post({type:'clinical:configure',settings:{textScale}});await page.waitForTimeout(500);await expect(p).toHaveAttribute('data-motion-phase','settled');
  const font=await p.locator('h2').evaluate(e=>parseFloat(getComputedStyle(e).fontSize));assert.equal(font,15*textScale);
  const box=await p.boundingBox(),cta=await p.getByRole('button',{name:'打开危急值流程'}).boundingBox();
  assert(cta.y+cta.height<=box.y+box.height+1);assert(await p.locator('.ci-scroll').evaluate(e=>e.clientHeight)>15);
  await page.screenshot({path:`${out}/native-text-${textScale}.png`,omitBackground:true});report.largeText.push({textScale,font,box,cta});
 }
 report.pass=true;
}finally{await post({type:'clinical:reset'});await writeFile(out+'/native-boundaries.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));await browser.close();}
