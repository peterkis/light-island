// Exact owned QA surface. Synthetic lab flow; records finite CSS/DOM observations only.
import {chromium,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT;assert(out);
const v=JSON.parse(execFileSync('powershell',['-NoProfile','-File','scripts/optimization-qa.ps1','-Action','Verify','-Output',out],{encoding:'utf8',windowsHide:true}).replace(/^\uFEFF/,''));assert(v.verified);
const browser=await chromium.connectOverCDP('http://127.0.0.1:9223'),page=browser.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('clinical.html?view=island'));assert(page);
const el=page.getByTestId('clinical-island'),report={scope:'Full-mode native WebView2 / synthetic report / CSS progression and bounded screenshots, not DWM telemetry'};
const post=async data=>assert((await fetch('http://127.0.0.1:17322/api/push',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)})).ok);
const settle=async stage=>{await expect(el).toHaveAttribute('data-lab-state',stage);await expect(el).toHaveAttribute('data-motion-phase','settled',{timeout:12000});await page.waitForTimeout(400);};
try{
 await post({type:'clinical:reset'});await expect(page.locator('.ci-anchor')).toHaveAttribute('data-motion','full');
 await post({type:'clinical:scenario',scenario:'S04',stage:0,labVariant:'baseline'});await settle('alert');
 await el.getByRole('button',{name:'查看检验报告摘要'}).click();await settle('sum');await page.screenshot({path:join(out,'full-native-lab-summary.png'),omitBackground:true});
 await el.getByRole('button',{name:'阅读报告',exact:true}).click();await settle('read');await expect(el.locator('.lab-row')).toHaveCount(8);
 const before=(await(await fetch('http://127.0.0.1:17322/api/clinical-state')).json()).activities;
 await page.screenshot({path:join(out,'full-native-lab-read.png'),omitBackground:true});
 await el.getByRole('button',{name:'阅后即焚',exact:true}).click();await expect(el).toHaveAttribute('data-lab-state','burn');
 report.burn=await el.locator('.lab-burning').evaluate(e=>new Promise(resolve=>{const values=[],start=performance.now();const tick=t=>{const s=getComputedStyle(e);values.push({t:t-start,name:s.animationName,burnPosition:s.getPropertyValue('--lab-b')});if(t-start<380)requestAnimationFrame(tick);else resolve(values);};requestAnimationFrame(tick);}));
 assert(report.burn.some(r=>r.name.includes('lab-burn')));assert(new Set(report.burn.map(r=>r.burnPosition)).size>5,'Native burn must actually progress');
 await page.screenshot({path:join(out,'full-native-lab-burn.png'),omitBackground:true});await expect(el).toHaveAttribute('data-lab-state','done',{timeout:4000});await expect(el.locator('.lab-row')).toHaveCount(0);
 const after=(await(await fetch('http://127.0.0.1:17322/api/clinical-state')).json()).activities;assert.deepEqual(before,after);report.sourceUnchanged=true;report.reportRowsRemoved=true;
 await expect(el).toHaveAttribute('data-lab-state','idle',{timeout:4000});
 await post({type:'clinical:personal',command:'start',duration:20000});await post({type:'clinical:view',mode:'timer'});await expect(el).toHaveAttribute('data-motion-phase','settled');await page.waitForTimeout(400);
 report.digits=await el.locator('.ux-hero').evaluate(e=>new Promise(resolve=>{const rows=[],start=performance.now();const tick=t=>{rows.push({width:e.getBoundingClientRect().width,moving:e.querySelectorAll('[data-digit-moving=true]').length});if(t-start<1400)requestAnimationFrame(tick);else resolve(rows);};requestAnimationFrame(tick);}));
 assert(report.digits.some(r=>r.moving>0));assert(Math.max(...report.digits.map(r=>r.width))-Math.min(...report.digits.map(r=>r.width))<.1);
 report.status='PASS';
}catch(error){report.status='FAIL';report.failure=String(error);process.exitCode=1;}
finally{await post({type:'clinical:reset'});await writeFile(join(out,'motion-restored-reader.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,burn:report.burn?.length,digits:report.digits?.length},null,2));await browser.close();}
