import {memo,useLayoutEffect,useRef} from 'react';
import {springAt,retarget,stepSpring} from './spring';
import T from './tokens.json';
/** Only changed decimal slots move. Previous glyphs live in a pseudo-element,
 * never duplicate the accessible value or the selected/copied text. */
export const AnimatedDigits=memo(function AnimatedDigits({value,reduced}:{value:string;reduced:boolean}){
 const root=useRef<HTMLSpanElement>(null),previous=useRef(value);
 useLayoutEffect(()=>{
  const el=root.current;if(!el)return;
  const old=Array.from(previous.current),next=Array.from(value);previous.current=value;
  const active:Animation[]=[];const rolls=Array.from(el.querySelectorAll<HTMLElement>('[data-digit]'));
  for(const [i,roll] of rolls.entries()){
   roll.removeAttribute('data-previous');
   const before=old[i],after=next[i];
   if(reduced||!before||!after||before===after||!/\d/.test(before)||!/\d/.test(after))continue;
   roll.dataset.previous=before;roll.dataset.digitMoving='true';
   const a=roll.animate([{transform:'translateY(100%)'},{transform:'translateY(0)'}],{duration:T.motion.content.base,easing:T.css['ease-out'],iterations:1});
   const finish=()=>{roll.removeAttribute('data-previous');delete roll.dataset.digitMoving;a.cancel();};
   a.onfinish=finish;active.push(a);
  }
  return()=>{active.forEach(a=>a.cancel());rolls.forEach(roll=>{roll.removeAttribute('data-previous');delete roll.dataset.digitMoving;});};
 },[value,reduced]);
 return <span ref={root} className="ux-digits" aria-label={value}>{Array.from(value).map((char,i)=><span className={/\d/.test(char)?'ux-digit-slot':'ux-digit-colon'} key={i} aria-hidden="true"><span data-digit={i} className="ux-digit-roll">{char}</span></span>)}</span>;
});
/** Count appearance follows spring.press; no permanently running badge animation. */
export function CountBadge({count,reduced}:{count:number;reduced:boolean}){
 const ref=useRef<HTMLSpanElement>(null);
 useLayoutEffect(()=>{
  const e=ref.current;if(!e)return;let frame=0,last=performance.now();
  if(reduced){e.style.transform='none';return;}
  const s=springAt(0);retarget(s,1);e.style.transform='scale(0)';
  const tick=(now:number)=>{const done=stepSpring(s,T.motion.spring.press,(now-last)/1000);last=now;e.style.transform=`scale(${s.x})`;if(!done)frame=requestAnimationFrame(tick);else e.style.transform='none';};
  frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);e.style.transform='none';};
 },[reduced]);
 return <span ref={ref} className="ux-count-badge"><AnimatedDigits value={String(count)} reduced={reduced}/> 项</span>;
}
