import {describe,expect,it} from 'vitest';
import {createClinicalDemo} from '../server/clinical-demo.mjs';
import {parseActivity,parseTimerState,timerRemaining} from '../src/clinical/model';
import {parseClinicalEvent,parseEnvelope} from '../src/lib/protocol';

describe('untrusted clinical protocol',()=>{
 const demo=createClinicalDemo(()=>{},()=>1800000000000);
 demo.handle({type:'clinical:scenario',scenario:'S03'});
 const activity=demo.inspect().activities[0];
 it.each([[['S03']],[{toString:():string=> 'S03'}],['toString'],[null]])('rejects non-scenario keys %j',scenario=>{
  expect(parseActivity({...activity,scenario})).toBeNull();
 });
 it.each([false,0,'',null,[],{},undefined])('rejects a provided malformed lab reference %j',labRef=>{
  expect(parseActivity({...activity,labRef})).toBeNull();
 });
 it('copies only fields that passed validation',()=>{
  const parsed=parseActivity({...activity,callback:'run',href:'https://invalid.test'});
  expect(parsed).not.toBeNull();expect(parsed).not.toHaveProperty('callback');expect(parsed).not.toHaveProperty('href');
  expect(parseActivity({...activity,identity:[]})).toBeNull();
  expect(parseActivity({...activity,fields:[{label:'x',value:'y',at:'100'}]})).toBeNull();
 });
 it.each([null,{},[],{status:'running',duration:1000,remaining:1000,deadline:null},{status:'paused',duration:1000,remaining:1000,deadline:2000},{status:'idle',duration:'1000',remaining:1000,deadline:null},{status:'running',duration:1000,remaining:Infinity,deadline:2000}])('rejects malformed timer %j',timer=>{
  expect(parseTimerState(timer)).toBeNull();expect(parseClinicalEvent({type:'clinical:timer',timer})).toBeNull();
 });
 it('accepts expired running timers without extending their deadline',()=>{
  const timer=parseTimerState({status:'running',duration:1000,remaining:1000,deadline:500});
  expect(timer).not.toBeNull();if(!timer)throw new Error('Expected valid timer');expect(timerRemaining(timer,1000)).toBe(0);expect(timer.deadline).toBe(500);
 });
 it('rejects malformed snapshots instead of treating them as authoritative deletion',()=>{
  const snapshot=demo.snapshot();expect(parseClinicalEvent(snapshot)).not.toBeNull();
  expect(parseClinicalEvent({...snapshot,activities:'bad'})).toBeNull();
  expect(parseClinicalEvent({...snapshot,activities:[{...activity,scenario:['S03']}]})).toBeNull();
  expect(parseClinicalEvent({...snapshot,activities:[]})).toMatchObject({activities:[]});
 });
 it('validates envelope and settings types without coercion',()=>{
  expect(parseEnvelope(null)).toBeNull();expect(parseEnvelope([])).toBeNull();
  expect(parseClinicalEvent({type:'clinical:settings',settings:{role:['finance']}})).toBeNull();
  expect(parseClinicalEvent({type:'clinical:settings',settings:{privacy:'false'}})).toBeNull();
 });
});
