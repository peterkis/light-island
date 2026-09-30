// Connect only to the dedicated, temporary WebView2 debugging port of this prototype.
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const base = 'http://127.0.0.1:17321';
async function post(value) { const r=await fetch(`${base}/api/push`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});assert(r.ok); }
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223');
const pages=browser.contexts().flatMap(c=>c.pages());
console.log('APP_PAGES',pages.map(p=>p.url()));
const page=pages.find(p=>p.url().includes('view=island'));
assert(page,'Native island WebView was not discovered');
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await post({type:'reset'});await post({type:'configure',settings:{theme:'ink',privacy:true,focus:false,reduced:false}});
await page.waitForTimeout(800);
await post({type:'demo',scenario:'critical'});
await page.locator('[data-testid=island][data-mode=expanded]').waitFor();
await page.waitForTimeout(650);
await page.screenshot({path:'evidence/11-native-webview-expanded.png',omitBackground:true});
const before=await page.locator('[data-testid=island]').innerText();
await page.locator('.primary-action').click();
await page.locator('[data-testid=island][data-mode=success]').waitFor();
const state=await (await fetch(`${base}/api/state`)).json();assert.equal(state.receipts.length,1);
const report={platform:'Windows / Tauri release / WebView2',url:page.url(),receiptRoundtrip:true,criticalText:before,frames:[],errors};
await post({type:'reset'});await page.waitForTimeout(1000);
for (const engine of ['mini','css']) {
  await post({type:'configure',settings:{engine}});await page.waitForTimeout(500);
  let i=0;const timer=setInterval(()=>{void post({type:'view',mode:++i%2?'inbox':'compact'});},620);
  const sample=await page.evaluate(()=>new Promise(resolve=>{
    const values=[];const began=performance.now();let previous=began;
    const frame=now=>{values.push(now-previous);previous=now;if(now-began<6200){requestAnimationFrame(frame);return;}const a=values.slice(2).sort((x,y)=>x-y);resolve({visible:!document.hidden,frames:a.length,averageFps:1000/(a.reduce((s,n)=>s+n,0)/a.length),p95ms:a[Math.floor(a.length*.95)],over25ms:a.filter(x=>x>25).length});};requestAnimationFrame(frame);
  }));
  clearInterval(timer);report.frames.push({engine,...sample});await post({type:'view',mode:'compact'});await page.waitForTimeout(500);
}
await post({type:'configure',settings:{engine:'mini',theme:'ink',privacy:true}});await post({type:'reset'});
assert.equal(errors.length,0,'Unexpected WebView runtime errors');
await writeFile('evidence/native-webview-validation.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
await browser.close();
