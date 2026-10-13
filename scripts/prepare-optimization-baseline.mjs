import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {dirname,resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
const ref='0aa4ea9e7eb43fbdfb07f89a0cc8e3e06d5d301b';
const root=resolve('evidence/backups/optimization-20261013/baseline-source');
const names=execFileSync('git',['ls-tree','-r','--name-only',ref,'src'],{encoding:'utf8'}).trim().split(/\r?\n/);
const manifest=[];
for(const name of names){
 const destination=resolve(root,name),part=relative(root,destination);
 if(part.startsWith('..')||isAbsolute(part))throw new Error('Baseline path escaped its output directory');
 const content=execFileSync('git',['show',`${ref}:${name}`]);mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,content);
 manifest.push({path:name,sha256:createHash('sha256').update(content).digest('hex')});
}
writeFileSync(resolve(root,'manifest.json'),JSON.stringify({ref,files:manifest},null,2));
console.log(`Prepared ${manifest.length} source files from ${ref}; set ISLAND_PROFILE_BASELINE=1 to include the comparison.`);
