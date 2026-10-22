// @ts-check
import {createHash} from 'node:crypto';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import {dirname,isAbsolute,relative,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT_GUIDANCE_BUDGET=4096;
// Pinned before this retrospective. Do not regenerate these from changed inputs.
export const IMMUTABLE_INPUTS=[
 {path:'docs/Windows 灵动岛 UI UX 设计规范 v1.0.md',sha256:'a9f37ea76becf4b74c4388a2172e4d46dbc7a4600558cee3b71f445f3e67b1fa'},
 {path:'docs/protype/灵动岛 · 检验报告阅读（阅后即焚）.html',sha256:'625664a43eea9ceb14763ef27e650a1f8d8766ded933e8d6704a451416146dad'},
 {path:'docs/protype/灵动岛「检验报告阅读」开发文档（Agent 可读版）.md',sha256:'beca7ca59cce18f7898f97caf497a9f63e8e30b55a91fd74e1cb2bb2d74c9aff'},
];

/** @param {string} directory @returns {string[]} */
function markdownFiles(directory){
 if(!existsSync(directory))return [];
 return readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const path=resolve(directory,entry.name);
  return entry.isDirectory()?markdownFiles(path):entry.isFile()&&entry.name.endsWith('.md')?[path]:[];
 });
}
/** @param {string} source */
function withoutFences(source){return source.replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm,'');}
/** @param {string} source */
function anchors(source){
 const ids=new Set([...source.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)].map(match=>match[1]));
 const used=new Map();
 for(const match of withoutFences(source).matchAll(/^#{1,6}\s+(.+)$/gm)){
  const slug=match[1].trim().toLowerCase().replace(/[^\p{L}\p{N}_\-\s]/gu,'').replace(/\s/g,'-');
  const count=used.get(slug)??0;used.set(slug,count+1);ids.add(count?`${slug}-${count}`:slug);
 }
 return ids;
}

/** Read-only repository checks; no network or generated-file writes.
 * @param {string} directory
 */
export function checkProjectGuidance(directory){
 const root=resolve(directory);
 /** @type {string[]} */ const issues=[];
 const required=['AGENTS.md','CODING_STANDARDS.md','docs/README.md','scripts/README.md'];
 const files=[...required.map(path=>resolve(root,path)),...markdownFiles(resolve(root,'docs/agents')),...markdownFiles(resolve(root,'docs/retrospectives'))];
 const packagePath=resolve(root,'package.json');
 const scripts=existsSync(packagePath)?JSON.parse(readFileSync(packagePath,'utf8')).scripts??{}:{};
 const rootPath=resolve(root,'AGENTS.md'),rootBytes=existsSync(rootPath)?statSync(rootPath).size:0;
 if(rootBytes>ROOT_GUIDANCE_BUDGET)issues.push(`AGENTS.md exceeds ${ROOT_GUIDANCE_BUDGET} bytes (${rootBytes})`);
 let linksChecked=0;
 for(const file of files){
  const label=relative(root,file).replaceAll('\\','/');
  if(!existsSync(file)){issues.push(`Missing guidance file: ${label}`);continue;}
  const source=readFileSync(file,'utf8');
  if(!source.trim())issues.push(`Empty guidance file: ${label}`);
  for(const match of source.matchAll(/\bnpm run ([a-zA-Z0-9:_-]+)/g)){
   if(!Object.hasOwn(scripts,match[1]))issues.push(`${label}: unknown npm script ${match[1]}`);
  }
  for(const match of withoutFences(source).matchAll(/\]\((?:<([^>\n]+)>|([^\s)]+))(?:\s+"[^"]*")?\)/g)){
   const link=match[1]??match[2];
   if(/^[a-z][a-z0-9+.-]*:/i.test(link))continue;
   linksChecked++;
   try{
    const [path,fragment]=link.split('#',2);
    const target=path?resolve(dirname(file),decodeURIComponent(path)):file;
    const fromRoot=relative(root,target);
    if(isAbsolute(fromRoot)||fromRoot==='..'||fromRoot.startsWith('..\\')||fromRoot.startsWith('../')){
     issues.push(`${label}: link escapes repository: ${link}`);continue;
    }
    if(!existsSync(target)){issues.push(`${label}: missing local link ${link}`);continue;}
    if(fragment&&target.endsWith('.md')&&!anchors(readFileSync(target,'utf8')).has(decodeURIComponent(fragment))){
     issues.push(`${label}: missing anchor ${link}`);
    }
   }catch(error){issues.push(`${label}: invalid local link ${link}: ${String(error)}`);}
  }
 }
 for(const input of IMMUTABLE_INPUTS){
  const path=resolve(root,input.path);
  if(!existsSync(path)){issues.push(`Missing immutable input: ${input.path}`);continue;}
  if(createHash('sha256').update(readFileSync(path)).digest('hex')!==input.sha256)issues.push(`Immutable input drift: ${input.path}`);
 }
 return {ok:issues.length===0,issues,filesChecked:files.length,linksChecked,rootBytes,rootBudget:ROOT_GUIDANCE_BUDGET,immutableInputs:IMMUTABLE_INPUTS.length};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=checkProjectGuidance(process.cwd());
 console.log(JSON.stringify(result,null,2));
 if(!result.ok)process.exitCode=1;
}
