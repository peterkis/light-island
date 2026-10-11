import {useEffect,useRef,useState} from 'react';
import {Activity,ArrowRight,ArrowUpRight,Check,ChevronRight,EyeOff,Layers,LockKeyhole,Radio,RotateCcw,ShieldCheck,SlidersHorizontal,Timer,Wifi,Zap} from 'lucide-react';
import catalogue from './catalogue.json';
import {ClinicalIsland,scenarioIcons} from './ClinicalIsland';
import type {ClinicalController} from './controller';
import type {Settings} from './model';
import {send} from '../lib/bridge';
export function ClinicalStudio({c}:{c:ClinicalController}){
 const [scenario,setScenario]=useState('S03'),[stage,setStage]=useState(0),[extended,setExtended]=useState(false);
 const [sampling,setSampling]=useState(false),[performance,setPerformance]=useState<{fps:number;p95:number;frames:number;hidden:boolean}|null>(null);
 const def=catalogue.find(d=>d.id===scenario)!;
 const replayTimer=useRef(0);
 useEffect(()=>()=>clearTimeout(replayTimer.current),[]);
 const replayReport=(variant='baseline')=>{if(c.lab.stage==='burn')return;clearTimeout(replayTimer.current);c.lab.close();setScenario('S04');setStage(0);replayTimer.current=window.setTimeout(()=>void c.labDemo(variant),520);};
 const select=async(id:string,index=0)=>{setScenario(id);setStage(index);await c.demo(id,index);};
 const sample=async()=>{
  setSampling(true);let i=0;const timer=window.setInterval(()=>{if(i++%2)c.collapse();else c.expand();},800);
  const intervals:number[]=[];let previous=performanceNow();const start=previous;let hidden=false;
  await new Promise<void>(resolve=>{const tick=(now:number)=>{intervals.push(now-previous);previous=now;hidden ||= document.hidden;if(now-start<6000)requestAnimationFrame(tick);else resolve();};requestAnimationFrame(tick);});
  clearInterval(timer);c.collapse();const a=intervals.slice(2).sort((a,b)=>a-b);setPerformance({fps:1000/(a.reduce((s,x)=>s+x,0)/a.length),p95:a[Math.floor(a.length*.95)],frames:a.length,hidden});setSampling(false);
 };
 return <div className="cs-app">
  <header className="cs-top"><a className="cs-brand" href="/clinical.html"><span><Activity size={22}/></span><b>同频</b><i/>临床协作感知</a><span className="cs-version">原型验证 · 仅模拟数据</span><a className="cs-legacy" href="/index.html">旧版动效回归 <ArrowUpRight size={14}/></a></header>
  <main className="cs-main">
   <div className="cs-intro"><div><div className="cs-eyebrow">HOSPITAL COLLABORATION / CLINICAL ISLAND</div><h1>关键变化，抵达当前工作。</h1><p>辅助感知与只读快览。判断、接收与处置，始终留在权威源系统。</p></div><div className={`cs-connection ${c.connection==='online'?'online':''}`}><span/>{c.connection==='online'?'模拟消息源已连接':'正在等待模拟源'}</div></div>
   <div className="cs-grid">
    <aside className="cs-scenarios"><div className="cs-section-label"><Layers size={16}/>场景库<span>09 + 06</span></div>
     <button className={`cs-scenario ${scenario==='S01'?'active':''}`} onClick={()=>{setScenario('S01');void c.show('S01');}}><span className="cs-scenario-number">01</span><Timer size={18}/><span>个人番茄钟<small>个人工具 · 不改变临床优先级</small></span><ChevronRight size={15}/></button>
     {catalogue.filter(d=>!d.extension||extended).map(d=>{const Icon=scenarioIcons[d.id];return <button key={d.id} data-testid={`clinical-scenario-${d.id}`} className={`cs-scenario ${scenario===d.id?'active':''}`} onClick={()=>void select(d.id)}><span className="cs-scenario-number">{d.id.slice(1)}</span><Icon size={18}/><span>{d.name}<small>{d.id==='S14'||d.id==='S15'?'条件场景 · 文本状态原型':d.extension?'研究扩展 · 文本状态原型':'核心场景 · 来源流程镜像'}</small></span><ChevronRight size={15}/></button>;})}
     <button className="cs-extension" onClick={()=>setExtended(v=>!v)} aria-expanded={extended}>{extended?'收起研究扩展':'展开 6 个研究扩展'}<ChevronRight size={14}/></button>
     <div className="cs-note"><ShieldCheck size={18}/><p>不连接真实临床系统。<br/>不向源系统提交接收、处置或派单。</p></div>
    </aside>
    <section className="cs-center">
     <div className="cs-preview-title"><span>工作站中的灵动岛</span><small>点击展开 · 120ms 悬停微扩</small></div>
     <div className="cs-desktop" style={c.lab.stage!=='idle'?{height:660}:undefined}><div className="cs-desktop-bar"><span className="cs-work-logo"><Activity size={15}/></span>临床工作空间<span>—　□　×</span></div><div className="cs-workspace"><aside><Radio size={18}/><Layers size={18}/><ShieldCheck size={18}/></aside><section><div className="cs-breadcrumb">临床工作 / 当班工作台</div><h2>专注当前任务</h2><p>上方的变化，不打断正在进行的业务。</p><div className="cs-work-tabs">当前任务 <span>今日动态</span></div>{['核对当前工作记录','查看来源业务状态','整理交班关注事项','记录个人待办'].map((t,i)=><div className="cs-work-row" key={t}><span>{String(i+1).padStart(2,'0')}</span>{t}<small>演示工作项</small><i/></div>)}<button className="cs-background-target" data-testid="clinical-background" onClick={e=>{e.currentTarget.textContent='背景按钮已响应';}}>验证背景操作 <ArrowUpRight size={14}/></button></section></div><div className="cs-island-stage"><ClinicalIsland c={c}/></div><div className="cs-desktop-hint">来源事件 → 单一活动 → 授权快览 → 精确来源入口</div></div>
     <section className="cs-flow"><div className="cs-flow-head"><div><span className="cs-eyebrow">SOURCE STATE WALKTHROUGH</span><h2>{scenario==='S01'?'个人番茄钟':def.name}</h2></div><button className="cs-primary" onClick={()=>void c.show(scenario)}>在灵动岛展开 <ArrowUpRight size={15}/></button></div>
      {scenario==='S01'?<div className="cs-timer-demo"><p>默认 25 分钟；在岛内开始、暂停、继续与结束。模拟危急事件不会重置计时。</p><button onClick={()=>{c.personal('start',5000);void c.show('S01');}}>运行 5 秒到期演示</button><button onClick={()=>void c.demo('S03',0)}>计时中到达危急动态</button></div>:
       <><div className="cs-step-grid">{def.stages.map((s,i)=><button key={s.label} data-testid={`clinical-stage-${i}`} className={stage===i?'active':''} onClick={()=>void select(def.id,i)}><span>{i<stage?<Check size={12}/>:i+1}</span>{s.label}</button>)}</div><div className="cs-stage-note"><span>{String(stage+1).padStart(2,'0')}</span><div><strong>{def.stages[stage].title}</strong><p>{def.stages[stage].body}</p></div></div><div className="cs-flow-footer"><small>这些按钮只驱动模拟源，不是临床操作按钮。</small><button onClick={()=>void select(def.id,(stage+1)%def.stages.length)}>下一来源状态 <ArrowRight size={14}/></button></div></>}
     </section>
     <section className="cs-flow"><div className="cs-flow-head"><div><h2>检验报告阅读 · 阅后即焚</h2><p>模拟报告在岛内渐进展开，焚毁只清除本次快览</p></div><button className="cs-primary" disabled={c.lab.stage==='burn'} onClick={()=>replayReport()}>重播：收到检验报告</button></div><div className="cs-flow-footer"><button onClick={()=>replayReport('normal')} disabled={c.lab.stage==='burn'}>全部正常夹具</button><button onClick={()=>replayReport('extended')} disabled={c.lab.stage==='burn'}>定性与缺失值夹具</button></div></section>
     <section className="cs-stream"><header><h2>当前会话 · 安全事件日志</h2><span>{c.queue.items.length} / 20 项</span></header>{c.log.length?c.log.slice(0,5).map((text,i)=><p key={i}><span/>{text}</p>):<p className="cs-empty">选择一个场景，第一条来源动态将出现在这里。</p>}<footer><span>幂等去重 {c.queue.duplicates}</span><span>格式拒绝 {c.queue.rejected}</span><span>容量提示 {c.queue.overflow}</span></footer></section>
    </section>
    <aside className="cs-inspector"><div className="cs-section-label"><SlidersHorizontal size={16}/>验证控制台</div><section><h3>当前演示权限</h3><p>仅模拟岗位，不是医院真实身份认证。</p><label>查看岗位<select aria-label="演示岗位" value={c.settings.role} onChange={e=>c.configure({role:e.target.value as Settings['role']})}><option value="clinician">临床岗位</option><option value="finance">费用协同岗位</option><option value="logistics">取送 / 设备岗位</option><option value="none">未登录</option></select></label><Toggle title="隐私保护" icon={<EyeOff size={17}/>} value={c.settings.privacy} onChange={privacy=>c.configure({privacy})}/><Toggle title="模拟锁屏隐藏" icon={<LockKeyhole size={17}/>} value={c.settings.locked} onChange={locked=>c.configure({locked,...(locked?{role:'none'}:{})})}/><Toggle title="模拟全屏避让" icon={<Layers size={17}/>} value={c.settings.fullscreen} onChange={fullscreen=>c.configure({fullscreen})}/></section>
     <section><h3>来源与跳转异常</h3><label>来源状态<select aria-label="模拟来源状态" value={c.settings.connectivity} onChange={e=>c.configure({connectivity:e.target.value as Settings['connectivity']})}><option value="fresh">连接正常</option><option value="stale">同步过期</option><option value="offline">来源离线</option></select></label><label>来源入口<select aria-label="模拟入口结果" value={c.settings.routeFault} onChange={e=>c.configure({routeFault:e.target.value as Settings['routeFault']})}><option value="none">精确匹配对象</option><option value="failed">打开失败</option><option value="mismatch">对象 / 版本不匹配</option></select></label><button className="cs-outline" onClick={()=>void c.refresh()}><Wifi size={14}/>重新读取来源</button></section>
     <section><h3>可访问性与动效</h3><Toggle title="减少动态" icon={<Zap size={17}/>} value={c.settings.reduced} onChange={reduced=>c.configure({reduced})}/><Toggle title="安静接收普通动态" icon={<ShieldCheck size={17}/>} value={c.settings.quiet} onChange={quiet=>c.configure({quiet})}/><label>文本倍率<select aria-label="文本倍率" value={c.settings.textScale} onChange={e=>c.configure({textScale:Number(e.target.value)})}><option value="1">100%</option><option value="2">200%</option><option value="2.25">225%</option></select></label><p>数值弹簧保留速度，可中途反向。内容晚到早走，原生画布不移动；空闲停止动效循环。</p><div className="cs-metrics"><span><b>{performance?performance.fps.toFixed(1):'—'}</b>rAF / 秒</span><span><b>{performance?performance.p95.toFixed(1):'—'}</b>P95 ms</span></div><button className="cs-outline" disabled={sampling} onClick={()=>void sample()}>{sampling?'采样中…':'采样预览 6 秒'}<Activity size={14}/></button><small>{performance?`${performance.frames} 帧回调${performance.hidden?' · 页面曾隐藏，样本无效':''}`:'不是原生呈现帧率保证'}</small></section>
     <section><button className="cs-outline" onClick={()=>void c.reset()}><RotateCcw size={14}/>重置本地模拟场景</button><button className="cs-text" onClick={()=>void send({type:'clinical:scenario',scenario:scenario==='S01'?'S03':scenario,stage:0,separate:true})}>添加另一来源对象</button></section>
    </aside>
   </div><footer className="cs-bottom"><span>SAMEWAVE / 临床协作感知</span><span>原型 0.2 · 来源是事实，灵动岛是入口。</span></footer>
  </main>
 </div>;
}
function performanceNow(){return globalThis.performance.now();}
function Toggle({title,icon,value,onChange}:{title:string;icon:React.ReactNode;value:boolean;onChange:(v:boolean)=>void}){return <div className="cs-toggle-row">{icon}<span>{title}</span><button className={`cs-toggle ${value?'on':''}`} role="switch" aria-label={title} aria-checked={value} onClick={()=>onChange(!value)}><span/></button></div>;}
