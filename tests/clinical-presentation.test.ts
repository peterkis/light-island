import {describe,it,expect} from 'vitest';
import {undoActivity,previewMuted,swipeDecision} from '../src/clinical/presentation';
import {defaults,versionKey} from '../src/clinical/model';
import {satelliteNeck,shapePolygons} from '../src/clinical/geometry';
import {createClinicalDemo} from '../server/clinical-demo.mjs';
const activity=()=>{const demo=createClinicalDemo(()=>{},()=>1800000000000);demo.handle({type:'clinical:scenario',scenario:'S04',stage:0});return demo.inspect().activities[0];};
describe('local presentation keeps clinical records intact',()=>{
 it('mute applies to routine previews, not important events',()=>{const a=activity();expect(previewMuted(a,[a.identity.source])).toBe(true);expect(previewMuted({...a,priority:'important'},[a.identity.source])).toBe(false);});
 it('undo requires current time, exact version, object and authorization',()=>{const a=activity(),u={key:versionKey(a),expires:5000};expect(undoActivity(u,[a],defaults,4999)).toBe(a);expect(undoActivity(u,[a],defaults,5000)).toBeUndefined();expect(undoActivity(u,[{...a,version:a.version+1}],defaults,4000)).toBeUndefined();expect(undoActivity(u,[{...a,identity:{...a.identity,object:'other'}}],defaults,4000)).toBeUndefined();for(const patch of [{privacy:true},{locked:true},{role:'none'}] as const)expect(undoActivity(u,[a],{...defaults,...patch},4000)).toBeUndefined();});
 it('swipes reject taps and scrolling and accept distance or velocity',()=>{expect(swipeDecision(7,0,5,372)).toBe('return');expect(swipeDecision(40,100,1,372)).toBe('return');expect(swipeDecision(39,0,2,372)).toBe('return');expect(swipeDecision(149,1,0,372)).toBe('dismiss');expect(swipeDecision(-50,1,-.7,372)).toBe('dismiss');expect(swipeDecision(50,0,.1,372)).toBe('return');});
});
describe('S2 vector bridge shares bounded SVG/native points',()=>{
 for(const progress of [0,.1,.3,.5,.8,1])it(`bridge ${progress} is bounded and absent at rest`,()=>{const g={width:268,height:36,ear:10,radius:18,satellite:progress,neck:true};const neck=satelliteNeck(g);expect(Boolean(neck.path)).toBe(progress>0&&progress<1);for(const [x,y]of neck.points){expect(x).toBeGreaterThan(0);expect(x).toBeLessThan(g.width+72);expect(y).toBeGreaterThanOrEqual(0);expect(y).toBeLessThanOrEqual(48);}expect(shapePolygons(g).length).toBeLessThanOrEqual(3);expect(satelliteNeck({...g,neck:false}).path).toBe('');});
});
