import {it,expect,afterEach} from 'vitest';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,sep} from 'node:path';
import {readFrontend} from '../server/static-frontend.mjs';
const owned:Array<string>=[];
afterEach(async()=>{for(const directory of owned.splice(0)){if(!directory.startsWith(resolve(tmpdir())+sep)||!directory.includes('samewave-frontend-'))throw new Error('Unsafe test fixture');await rm(directory,{recursive:true,force:true});}});
async function fixture(){
 const directory=await mkdtemp(join(tmpdir(),'samewave-frontend-'));owned.push(directory);
 const roots=['workbench','island'].map(app=>join(directory,app));
 for(const root of roots)await mkdir(join(root,'assets'),{recursive:true});
 await writeFile(join(roots[0],'index.html'),'workbench index');await writeFile(join(roots[0],'workbench.html'),'workbench');await writeFile(join(roots[1],'clinical.html'),'island');
 await writeFile(join(roots[0],'assets','workbench-hash.js'),'workbench script');await writeFile(join(roots[1],'assets','island-hash.js'),'island script');
 return {roots,directory};
}
it('serves the default workbench and island entries without a top-level dist index',async()=>{
 const {roots}=await fixture();expect((await readFrontend('/',roots)).bytes.toString()).toBe('workbench index');expect((await readFrontend('/workbench.html',roots)).bytes.toString()).toBe('workbench');expect((await readFrontend('/clinical.html',roots)).bytes.toString()).toBe('island');
});
it('resolves each independent entry asset from its generated directory',async()=>{
 const {roots}=await fixture();expect((await readFrontend('/assets/workbench-hash.js',roots)).bytes.toString()).toBe('workbench script');expect((await readFrontend('/assets/island-hash.js',roots)).bytes.toString()).toBe('island script');await expect(readFrontend('/assets/missing.js',roots)).rejects.toThrow('Frontend not found');
});
it('keeps encoded traversal outside both frontend roots inaccessible',async()=>{
 const {roots,directory}=await fixture();await writeFile(join(directory,'outside.txt'),'private');await expect(readFrontend('/%2e%2e/outside.txt',roots)).rejects.toThrow('Invalid path');
});
