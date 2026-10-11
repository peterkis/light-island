import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
/** A fresh run must not overwrite frozen earlier acceptance artifacts. */
export function evidencePath(relative:string,directory=false){
 const path=(process.env.ISLAND_E2E_EVIDENCE_DIR??'evidence')+'/'+relative.replace(/^evidence\//,'');mkdirSync(directory?path:dirname(path),{recursive:true});return path;
}
