import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const paths=['docs/protype/灵动岛「检验报告阅读」开发文档（Agent 可读版）.md','docs/protype/灵动岛 · 检验报告阅读（阅后即焚）.html'];
const input=await Promise.all(paths.map(async path=>({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')})));
// Scenario-specific adapter: the approved written dimensions override only this reader.
const tokens={source:input,geometry:{idle:{width:124,height:32,radius:16},alert:{width:372,height:88,radius:36},sum:{width:372,height:200,radius:40},read:{width:400,minHeight:380,maxHeight:580,radius:44},done:{width:210,height:36,radius:18}},spring:{expand:{k:190,c:22},collapse:{k:260,c:28},morph:{k:320,c:26},height:{k:210,c:23}},timing:{readMs:60000,privacyMs:8000,alertMs:7000,alertLeaveMs:2500,burnMs:1100,doneMs:1700},watermark:false};
await writeFile('src/clinical/lab-reader/tokens.json',JSON.stringify(tokens,null,2)+'\n');
console.log('Lab reader adapter generated; immutable inputs hashed; watermark excluded');
