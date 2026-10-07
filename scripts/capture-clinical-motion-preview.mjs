// Isolated browser preview, not a user's existing browser. Native evidence is recorded separately.
import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const out='evidence/clinical-motion-20261004';
const post=async data=>{const r=await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw new Error('Synthetic source rejected preview request');};
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await post({type:'clinical:reset'});await page.goto('http://127.0.0.1:1420/clinical.html');const island=page.getByTestId('clinical-island');await expect(island).toHaveAttribute('data-motion-phase','settled');await page.screenshot({path:out+'/studio-u.png',fullPage:true});
 await post({type:'clinical:scenario',scenario:'S03',stage:0});await post({type:'clinical:view',mode:'open',scenario:'S03'});await expect(island).toHaveAttribute('data-view','expanded');await expect(island).toHaveAttribute('data-motion-phase','settled');await page.screenshot({path:out+'/studio-expanded.png',fullPage:true});
 if(errors.length)throw new Error(errors.join('\n'));await writeFile(out+'/preview.json',JSON.stringify({pass:true,errors},null,2));
}finally{await post({type:'clinical:reset'});await browser.close();}
