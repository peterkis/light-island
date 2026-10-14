import {spawn} from 'node:child_process';
import {mkdirSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
const [action='build',target='all',...extra]=process.argv.slice(2);
if(!['build','dev'].includes(action)||!['all','island','workbench'].includes(target))throw new Error('Expected build|dev island|workbench|all');
const apps=target==='all'?['island','workbench']:[target];
for(const app of apps){
 const cwd=resolve(app==='island'?'src-tauri':'workbench/src-tauri');
 const cli=resolve('node_modules/@tauri-apps/cli/tauri.js');
 const code=await new Promise((done,reject)=>{const child=spawn(process.execPath,[cli,action,...(action==='build'?['--no-bundle']:[]),...extra],{cwd,stdio:'inherit',env:{...process.env,CARGO_BUILD_JOBS:process.env.CARGO_BUILD_JOBS??'2'}});child.on('error',reject);child.on('exit',done);});
 if(code!==0){process.exitCode=code??1;break;}
 if(action==='build'){mkdirSync('dist/desktop',{recursive:true});copyFileSync(resolve(cwd,`target/release/samewave-${app}.exe`),resolve(`dist/desktop/samewave-${app}.exe`));}
}
