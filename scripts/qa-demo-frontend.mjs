// An owned Node adapter, with HTTP-only checks against the generated bundles.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.env.ISLAND_QA_OUTPUT;
assert(/^evidence\/publication-20261014\/review-round-\d+\/demo-static$/.test(out??''));
await mkdir(out,{recursive:false});
const port=17327,base=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['server/demo-server.mjs'],{env:{...process.env,ISLAND_DEMO_PORT:String(port)},windowsHide:true,stdio:['ignore','pipe','pipe']});
const report={pass:false,pid:child.pid,port,pages:[],assets:[]};
try{
 await new Promise((resolve,reject)=>{
  let output='';const timer=setTimeout(()=>reject(new Error('Owned adapter did not start')),10000);
  const fail=error=>{clearTimeout(timer);reject(error);};child.once('error',fail);child.once('exit',code=>fail(new Error(`Owned adapter exited: ${code}`)));
  child.stdout.on('data',data=>{output+=data.toString();if(output.includes(`Samewave synthetic demo: ${base}`)){clearTimeout(timer);resolve();}});
 });
 const assets=new Set();
 for(const path of ['/','/workbench.html','/clinical.html']){
  const response=await fetch(base+path,{signal:AbortSignal.timeout(4000)});assert.equal(response.status,200);assert.match(response.headers.get('content-type')??'',/^text\/html/);
  const html=await response.text();assert.match(html,/<div id="root"/);report.pages.push({path,status:response.status});
  for(const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){const asset=new URL(match[1],base+path).pathname;if(asset.startsWith('/assets/'))assets.add(asset);}
 }
 assert(assets.size>=4);
 for(const path of assets){const response=await fetch(base+path,{signal:AbortSignal.timeout(4000)});assert.equal(response.status,200);assert((await response.arrayBuffer()).byteLength>0);report.assets.push({path,status:response.status});}
 report.pass=true;
}finally{
 child.kill();await writeFile(out+'/RESULTS.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}
