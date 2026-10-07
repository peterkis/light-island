import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const post=async data=>{const r=await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!r.ok)throw Error(await r.text());};
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await post({type:'clinical:reset'});await page.goto('http://127.0.0.1:1420/clinical.html');await page.waitForTimeout(900);
 await page.screenshot({path:'evidence/clinical-20261004/01-studio.png',fullPage:true});
 await post({type:'clinical:scenario',scenario:'S03',stage:0});await page.waitForTimeout(600);
 await page.getByRole('button',{name:'展开协作详情',exact:true}).click();await page.waitForTimeout(700);
 await page.screenshot({path:'evidence/clinical-20261004/02-critical.png',fullPage:true});
 console.log('ISLAND',await page.getByTestId('clinical-island').innerText());
 console.log('ERRORS',errors);
 await writeFile('evidence/clinical-20261004/browser-first.json',JSON.stringify({errors},null,2));
}finally{await browser.close();}
