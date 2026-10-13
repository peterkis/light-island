import type {Activity,ScenarioId,TimerState} from '../src/clinical/model';
import type {ClinicalIslandCommand,ClinicalSimulatorCommand} from '../src/lib/protocol';
declare function island(command:ClinicalIslandCommand):void;
declare function simulator(command:ClinicalSimulatorCommand):void;
declare function timer(value:TimerState):void;
declare function activity(value:Activity):void;
declare const fields:Omit<Activity,'scenario'|'routeKind'|'labRef'>;
island({type:'clinical:personal',command:'pause'});
simulator({type:'clinical:configure',settings:{role:'finance'}});
// @ts-expect-error Simulator authorization controls are not island preferences.
island({type:'clinical:configure',settings:{role:'finance'}});
// @ts-expect-error Clinical acknowledgements are not a supported island command.
island({type:'clinical:ack',id:'x'});
// @ts-expect-error Personal timer commands cannot acknowledge source state.
island({type:'clinical:personal',command:'acknowledge'});
// @ts-expect-error Duration must be a number.
island({type:'clinical:personal',command:'start',duration:'1000'});
// @ts-expect-error A running timer always has a deadline.
timer({status:'running',duration:1000,remaining:1000,deadline:null});
// @ts-expect-error Route and scenario must correspond.
activity({...fields,scenario:'S03',routeKind:'orders'});
// @ts-expect-error Only the report scenario can carry a lab reference.
activity({...fields,scenario:'S03',routeKind:'critical',labRef:{id:'r',abnormalCount:0}});
// @ts-expect-error Every scenario needs an icon entry.
const incompleteIcons:Record<'S01'|ScenarioId,unknown>={S01:null,S03:null};
void incompleteIcons;
