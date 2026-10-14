import {it,expect,vi,afterEach} from 'vitest';
import {createElement,useRef} from 'react';
import {renderToString} from 'react-dom/server';
const flags=vi.hoisted(()=>({island:false,workbench:false}));
vi.mock('../src/lib/bridge',()=>({get nativeIsland(){return flags.island;},get nativeWorkbench(){return flags.workbench;}}));
import {usePlatform} from '../src/clinical/usePlatform';
import {resolveMotion} from '../src/clinical/motionPreference';
afterEach(()=>{flags.island=false;flags.workbench=false;});
function Policy({preference='system'}:{preference?:'system'|'full'}){
 const platform=usePlatform(useRef<HTMLDivElement>(null),'startup',true);
 return createElement('span',{'data-motion':resolveMotion(preference,false,false,platform.status.animationsEnabled).reduced?'reduced':'full'});
}
it.each(['island','workbench'] as const)('native %s system mode stays reduced before platform status is known',kind=>{
 flags[kind]=true;expect(renderToString(createElement(Policy))).toContain('data-motion="reduced"');
});
it('an explicit full policy may override the pending native platform gate',()=>{
 flags.island=true;expect(renderToString(createElement(Policy,{preference:'full'}))).toContain('data-motion="full"');
});
it('the browser comparison path retains its ordinary full-motion default',()=>{
 expect(renderToString(createElement(Policy))).toContain('data-motion="full"');
});
