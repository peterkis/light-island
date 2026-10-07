import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/clinical.html?view=island'));assert(page);
const post=async data=>assert((await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)})).ok);
try{
 await post({type:'clinical:reset'});await post({type:'clinical:view',mode:'timer'});await expect(page.getByTestId('clinical-island')).toHaveAttribute('data-motion-phase','settled',{timeout:12000});
 const report=await page.evaluate(async()=>{
  const el=document.querySelector('[data-testid=clinical-island]'),path=el.querySelector('.ci-fill'),length=path.getTotalLength(),points=Array.from({length:128},(_,i)=>{const p=path.getPointAtLength(length*i/128);return[p.x,p.y];});
  const rows=[];const epoch=Date.now();let sequence=0;
  for(const type of ['no-shadow','cached-shadow','changing-shadow'])for(let i=0;i<8;i++){
   const width=type==='changing-shadow'?372+i:372;const started=performance.now();
   await window.__TAURI_INTERNALS__.invoke('clinical_layout',{epoch,sequence:++sequence,phase:'frame',expanded:true,visible:true,bodyWidth:width,height:168,radius:40,ear:10,top:0,shadowAlpha:type==='no-shadow'?0:1,polygons:[points.map(([x,y])=>[x*width/372,y])]});
   rows.push({type,ms:performance.now()-started});
  }return rows;
 });
 await writeFile('evidence/uiux-final-20261006/native-cost.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await post({type:'clinical:reset'});await page.reload();await browser.close();}
