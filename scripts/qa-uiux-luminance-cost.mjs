import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const b=await chromium.connectOverCDP('http://127.0.0.1:9223');
const p=b.contexts().flatMap(c=>c.pages()).find(p=>p.url().includes('tauri.localhost/clinical.html?view=island'));assert(p);
try{const rows=await p.evaluate(async()=>{const rows=[];for(let i=0;i<3;i++){const t=performance.now();const luminance=await window.__TAURI_INTERNALS__.invoke('clinical_background_luminance',{bodyHeight:32});rows.push({ms:performance.now()-t,luminance});}return rows;});await writeFile('evidence/uiux-final-20261006/luminance-cost.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows));}finally{await b.close();}
