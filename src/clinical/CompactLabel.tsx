import {useLayoutEffect,useRef} from 'react';

/** One readable traversal per text/hover/focus session, then idle. */
export function CompactLabel({text,reduced,active}:{text:string;reduced:boolean;active:boolean}){
 const viewport=useRef<HTMLSpanElement>(null),line=useRef<HTMLSpanElement>(null);
 const seen=useRef('');
 useLayoutEffect(()=>{
  const box=viewport.current,el=line.current;if(!box||!el)return;
  // Mark completion, not setup: StrictMode's setup/cleanup/setup must not consume the traversal.
  const run=seen.current!==text||active;
  let animation:Animation|undefined;
  const measure=()=>{
   animation?.cancel();el.style.transform='none';
   const distance=Math.max(0,el.scrollWidth-box.clientWidth);
   box.dataset.overflow=String(distance>1);
   if(reduced||!run||distance<=1)return;
   const travel=distance/30*1000,total=2400+travel;
   animation=el.animate([{transform:'translateX(0)',offset:0},{transform:'translateX(0)',offset:1200/total},
    {transform:`translateX(${-distance}px)`,offset:(1200+travel)/total},{transform:`translateX(${-distance}px)`,offset:1}],
    {duration:total,easing:'linear',iterations:1});
   animation.onfinish=()=>{seen.current=text;animation?.cancel();el.style.transform='none';};
  };
  const observer=new ResizeObserver(measure);observer.observe(box);measure();
  return()=>{observer.disconnect();animation?.cancel();el.style.transform='none';};
 },[text,reduced,active]);
 return <span ref={viewport} className="ux-compact-label"><span ref={line} className="ux-marquee-text">{text}</span></span>;
}
