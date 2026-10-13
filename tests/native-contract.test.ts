import {expect,it} from 'vitest';
import {parseMetrics,parsePlatform} from '../src/clinical/native-contract';
it('validates metrics before using native values in geometry',()=>{
 for(const value of [null,[],{available:100,height:100,scale:0},{available:NaN,height:100},{available:100,height:100,canvasWidth:-1},{available:100,height:100,topReserved:'yes'}])expect(parseMetrics(value)).toBeNull();
 expect(parseMetrics({available:1920,height:1080,scale:1.5,canvasWidth:1000,topReserved:false})).toEqual({available:1920,height:1080,scale:1.5,canvasWidth:1000,topReserved:false});
});
it('accepts only bounded native platform states and booleans',()=>{
 const value={notificationState:5,animationsEnabled:true,outsideClickAvailable:true,shortcutRegistered:false};expect(parsePlatform(value)).toEqual(value);
 expect(parsePlatform({...value,notificationState:99})).toBeNull();expect(parsePlatform({...value,animationsEnabled:1})).toBeNull();
});
