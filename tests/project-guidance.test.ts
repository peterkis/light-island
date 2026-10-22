import {afterEach,expect,it} from 'vitest';
import {cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {basename,dirname,join,resolve,sep} from 'node:path';
import {checkProjectGuidance,IMMUTABLE_INPUTS,ROOT_GUIDANCE_BUDGET} from '../scripts/check-project-guidance.mjs';

const owned:string[]=[];
afterEach(()=>{
 for(const directory of owned.splice(0)){
  const target=resolve(directory);
  if(!target.startsWith(resolve(tmpdir())+sep)||!basename(target).startsWith('samewave-guidance-'))throw Error('Unsafe guidance fixture cleanup');
  rmSync(target,{recursive:true,force:true});
 }
});
function fixture(){
 const root=mkdtempSync(join(tmpdir(),'samewave-guidance-'));owned.push(root);
 for(const [path,content] of Object.entries({
  'AGENTS.md':'# Fixture\n[topic](docs/agents/architecture.md)\n',
  'CODING_STANDARDS.md':'# Review\n','docs/README.md':'# Index\n','scripts/README.md':'# Scripts\n',
  'docs/agents/architecture.md':'# Architecture\n','package.json':'{"scripts":{}}\n',
 })){
  mkdirSync(dirname(join(root,path)),{recursive:true});writeFileSync(join(root,path),content);
 }
 for(const path of IMMUTABLE_INPUTS.map(input=>input.path)){
  mkdirSync(dirname(join(root,path)),{recursive:true});cpSync(resolve(path),join(root,path),{recursive:true});
 }
 expect(checkProjectGuidance(root).ok).toBe(true);
 return root;
}
it('rejects a broken route, missing anchor, unknown command and repository escape',()=>{
 const root=fixture();
 writeFileSync(join(root,'docs/agents/negative.md'),'[topic](missing.md)\n[anchor](architecture.md#missing-id)\n[outside](../../../outside.md)\n`npm run missing-script`\n');
 const result=checkProjectGuidance(root);
 expect(result.issues).toEqual(expect.arrayContaining([
  expect.stringContaining('missing local link missing.md'),expect.stringContaining('missing anchor architecture.md#missing-id'),
  expect.stringContaining('link escapes repository'),expect.stringContaining('unknown npm script missing-script'),
 ]));
});
it('rejects root instruction growth beyond the project budget',()=>{
 const root=fixture();writeFileSync(join(root,'AGENTS.md'),'x'.repeat(ROOT_GUIDANCE_BUDGET+1));
 expect(checkProjectGuidance(root).issues).toContain(`AGENTS.md exceeds ${ROOT_GUIDANCE_BUDGET} bytes (${ROOT_GUIDANCE_BUDGET+1})`);
});
it('rejects changed design input bytes even if generated adapters were to be refreshed',()=>{
 const root=fixture(),input=IMMUTABLE_INPUTS[0];
 if(!input)throw Error('Missing pinned input');
 const path=join(root,input.path);writeFileSync(path,readFileSync(path,'utf8')+'\n');
 expect(checkProjectGuidance(root).issues).toContain(`Immutable input drift: ${input.path}`);
});
