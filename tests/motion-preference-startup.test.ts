import {it,expect,vi,afterEach} from 'vitest';
import {createElement} from 'react';
import {renderToString} from 'react-dom/server';
vi.mock('../src/lib/bridge',()=>({native:true}));
import {useMotionPreference,resolveMotion} from '../src/clinical/motionPreference';
afterEach(()=>vi.unstubAllGlobals());
function FirstPaint(){
 const policy=useMotionPreference();
 return createElement('span',{'data-motion':resolveMotion(policy.preference,false,policy.mediaReduced,true).reduced?'reduced':'full'});
}
it('native first paint remains reduced before the persisted preference can be read',()=>{
 vi.stubGlobal('localStorage',{getItem:()=>null});vi.stubGlobal('matchMedia',()=>({matches:false}));
 expect(renderToString(createElement(FirstPaint))).toContain('data-motion="reduced"');
});
it('an old WebView full-motion value cannot bypass the native startup read',()=>{
 vi.stubGlobal('localStorage',{getItem:()=> 'full'});vi.stubGlobal('matchMedia',()=>({matches:false}));
 expect(renderToString(createElement(FirstPaint))).toContain('data-motion="reduced"');
});
