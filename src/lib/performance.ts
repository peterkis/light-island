export interface FrameReport {frames:number;averageFps:number;medianMs:number;p95Ms:number;over25ms:number;durationMs:number;hidden:boolean;cancelled:boolean}
interface SampleOptions {signal?:AbortSignal;intervalMs?:number;onInterval?:()=>void}
/** Finite, cancellable rAF cadence sampling. This does not measure DWM presentation. */
export function measureFrames(durationMs=5000,options:SampleOptions={}):Promise<FrameReport>{
 return new Promise(resolve=>{
  const started=performance.now(),values:number[]=[];let last:number|undefined,raf=0,deadline=0,interval=0,done=false;
  const finish=(cancelled=false)=>{
   if(done)return;done=true;cancelAnimationFrame(raf);clearTimeout(deadline);clearInterval(interval);
   document.removeEventListener('visibilitychange',visibility);options.signal?.removeEventListener('abort',abort);
   const ordered=[...values].sort((a,b)=>a-b),elapsed=Math.max(0,performance.now()-started);
   resolve({frames:values.length,averageFps:elapsed?Number((values.length/elapsed*1000).toFixed(1)):0,medianMs:Number((ordered[Math.floor(ordered.length*.5)]??0).toFixed(2)),p95Ms:Number((ordered[Math.floor(ordered.length*.95)]??0).toFixed(2)),over25ms:values.filter(v=>v>25).length,durationMs:Math.round(elapsed),hidden:document.hidden,cancelled});
  };
  const abort=()=>finish(true),visibility=()=>{if(document.hidden)finish();};
  const tick=(now:number)=>{if(done)return;if(last!==undefined)values.push(Math.max(0,now-last));last=now;if(performance.now()-started>=durationMs){finish();return;}raf=requestAnimationFrame(tick);};
  document.addEventListener('visibilitychange',visibility);options.signal?.addEventListener('abort',abort,{once:true});
  if(options.signal?.aborted){finish(true);return;}if(document.hidden){finish();return;}
  deadline=window.setTimeout(()=>finish(),Math.max(0,durationMs));
  if(options.onInterval&&options.intervalMs){interval=window.setInterval(()=>{if(document.hidden){finish();return;}try{options.onInterval?.();}catch{finish(true);}},options.intervalMs);}
  raf=requestAnimationFrame(tick);
 });
}
