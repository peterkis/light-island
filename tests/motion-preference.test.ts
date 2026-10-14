import {describe,it,expect,vi} from 'vitest';
vi.mock('../src/lib/bridge',()=>({native:false}));
import {parseMotionPreference,resolveMotion} from '../src/clinical/motionPreference';
describe('explicit motion policy does not silently contradict the system or app',()=>{
 it('defaults remain system-following; unknown persistent values are rejected',()=>{for(const input of [true,false,null,1,{},'force',''])expect(parseMotionPreference(input)).toBeNull();expect(parseMotionPreference('system')).toBe('system');});
 it('a native Windows disabled flag reduces motion even when the media query disagrees',()=>expect(resolveMotion('system',false,false,false)).toEqual({reduced:true,reason:'跟随 Windows：系统动画效果已关闭'}));
 it('a media reduce preference is respected by the system mode',()=>expect(resolveMotion('system',false,true,true).reduced).toBe(true));
 it('ordinary no-preference is full motion',()=>expect(resolveMotion('system',false,false,true).reduced).toBe(false));
 it('only an explicit full selection overrides both platform signals',()=>expect(resolveMotion('full',false,true,false).reduced).toBe(false));
 it('the pre-existing app reduce switch always wins, including full mode',()=>expect(resolveMotion('full',true,false,true).reduced).toBe(true));
 it('an explicit reduce selection works on any OS setting',()=>expect(resolveMotion('reduced',false,false,true).reduced).toBe(true));
});
