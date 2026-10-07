import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='evidence/uiux-final-20261006';await mkdir(out,{recursive:true});
const post=async data=>{const r=await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw Error(await r.text());};
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const e=page.getByTestId('clinical-island');
async function settled(surface){if(surface)await expect(e).toHaveAttribute('data-surface',surface);await expect(e).toHaveAttribute('data-motion-phase','settled',{timeout:8000});await page.waitForTimeout(400);}
const report=[];
try{
 await post({type:'clinical:reset'});await page.goto('http://127.0.0.1:1420/clinical.html');await settled('idle');
 async function snap(name){const r=await e.boundingBox();await page.screenshot({path:`${out}/preview-${name}.png`,clip:{x:r.x-48,y:Math.max(0,r.y-8),width:r.width+124,height:r.height+64}});report.push({name,box:await e.boundingBox(),text:await e.innerText()});}
 await snap('idle');await post({type:'clinical:scenario',scenario:'S04',stage:0});await settled('alert');await snap('alert');
 await e.getByRole('button',{name:'展开完整摘要'}).click();await settled('rich');await snap('rich');
 await e.getByRole('button',{name:'详情',exact:true}).click();await settled('stack');await snap('details');
 await e.getByRole('button',{name:'收起协作详情'}).click();await page.mouse.move(1,1000);await settled('compact');await snap('compact');
 await post({type:'clinical:scenario',scenario:'S02',stage:0});await post({type:'clinical:view',mode:'compact'});await settled('compact');await snap('two-events');
 await post({type:'clinical:view',mode:'timer'});await settled('rich');await snap('timer');
 await post({type:'clinical:configure',settings:{textScale:2}});await settled('rich');await snap('timer-text2');
 await page.screenshot({path:out+'/studio.png',fullPage:true});await writeFile(out+'/preview.json',JSON.stringify({errors,report},null,2));console.log(JSON.stringify({errors,report}));
}finally{await browser.close();}
