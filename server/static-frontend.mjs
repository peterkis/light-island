import {readFile} from 'node:fs/promises';
import {resolve,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const builtRoots=['workbench','island'].map(app=>resolve(dirname(fileURLToPath(import.meta.url)),'../dist',app));
/** @param {string} pathname @param {string[]} [roots] */
export async function readFrontend(pathname,roots=builtRoots){
 const relative=decodeURIComponent(pathname==='/'?'/index.html':pathname);
 for(const directory of roots){
  const root=resolve(directory),path=resolve(root,'.'+relative);
  if(!path.startsWith(root+sep))throw new RangeError('Invalid path');
  try{return {path,bytes:await readFile(path)};}catch(error){
   if(!error||typeof error!=='object'||!('code' in error)||error.code!=='ENOENT')throw error;
  }
 }
 throw new Error('Frontend not found; build both applications with npm run build');
}
