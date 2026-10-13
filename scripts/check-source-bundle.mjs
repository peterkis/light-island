import {readFileSync,readdirSync,mkdirSync,writeFileSync} from 'node:fs';
import {basename,join,resolve} from 'node:path';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
const directory=resolve('dist'),assets=join(directory,'assets');
const files=readdirSync(assets).filter(name=>name.endsWith('.js'));
const maps=new Map(files.map(name=>[name,JSON.parse(readFileSync(join(assets,name+'.map'),'utf8'))]));
const source=files.find(name=>maps.get(name).sources.some(/** @param {string} path */path=>path.endsWith('/SourcePage.tsx')));
assert(source,'Expected a separate SourcePage chunk');
const entry=readFileSync(join(directory,'clinical.html'),'utf8').match(/src="\/assets\/([^"]+\.js)"/)?.[1];assert(entry,'Clinical entry is missing');
/** @param {string} folder @param {string[]} roots */
function collect(folder,roots){
 const seen=new Set();
 /** @param {string} name */
 const walk=name=>{if(seen.has(name))return;seen.add(name);const code=readFileSync(join(folder,name),'utf8');for(const match of code.matchAll(/(?:from|import)\s*["'](\.\/[^"']+\.js)["']/g))walk(basename(match[1]));};
 roots.forEach(walk);return [...seen];
}
const chunks=collect(assets,[entry,source]);
const forbidden=chunks.flatMap(name=>maps.get(name).sources.filter(/** @param {string} path */path=>/\/(useClinicalLayout|useSurfaceInput|useButtonFeedback|useLabReader|controller|spring)\.(ts|tsx)$|node_modules\/gsap\//.test(path)));
assert.deepEqual(forbidden,[],'Source window must not statically import the island motion/reader runtime');
const bytes=chunks.reduce((sum,name)=>sum+readFileSync(join(assets,name)).byteLength,0);
const gzipBytes=chunks.reduce((sum,name)=>sum+gzipSync(readFileSync(join(assets,name))).byteLength,0);
const result={entry,source,chunks,bytes,gzipBytes,islandRuntimeAbsent:true,scope:'Clinical bootstrap plus selected source chunk and recursive static JS imports; excludes CSS, sourcemaps and unloaded dynamic imports'};
if(process.env.ISLAND_QA_OUTPUT){mkdirSync(process.env.ISLAND_QA_OUTPUT,{recursive:true});writeFileSync(join(process.env.ISLAND_QA_OUTPUT,'source-bundle.json'),JSON.stringify(result,null,2));}
console.log(JSON.stringify(result,null,2));
