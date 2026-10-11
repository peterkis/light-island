import {useEffect,useRef,useState} from 'react';
import {Activity as Pulse,HeartPulse,FlaskConical,FileHeart,Wallet,ClipboardList,PhoneForwarded,FileWarning,TestTubeDiagonal,Droplets,Pill,ScanLine,Truck,MessagesSquare,Stethoscope,Timer,ChevronDown,ChevronRight,ArrowUpRight,X,EyeOff,Pause,Play,Square,ArrowLeft,MoreHorizontal,Bookmark,BookmarkCheck,WifiOff} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import {useClinicalLayout} from './useClinicalLayout';
import {useSurfaceInput} from './useSurfaceInput';
import {usePlatform} from './usePlatform';
import {canView,identityKey,versionKey} from './model';
import type {ClinicalController} from './controller';
import type {Surface} from './geometry';
import {openStudio,nativeIsland} from '../lib/bridge';
import {sortActivities} from './attention';
import {CompactLabel} from './CompactLabel';
import {useButtonFeedback} from './useButtonFeedback';
import {LabScene} from './lab-reader/LabScene';
export const scenarioIcons:Record<string,LucideIcon>={S01:Timer,S02:HeartPulse,S03:FlaskConical,S04:FileHeart,S05:Wallet,S06:ClipboardList,S07:PhoneForwarded,S08:FileWarning,S09:TestTubeDiagonal,S10:Droplets,S11:Pill,S12:ScanLine,S13:Truck,S14:MessagesSquare,S15:Stethoscope};
export const timerText=(ms:number)=>{const s=Math.max(0,Math.ceil(ms/1000)),m=Math.floor(s/60);return `${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
const stamp=(n:number|null)=>n===null?'来源时间未提供':new Date(n).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false});
const excerpt=(s:string,n:number)=>{const a=Array.from(s.replace(/[。！!；;]+$/u,''));return a.length>n?a.slice(0,n).join('')+'…':a.join('');};
function Ring({value=0,size=44}:{value?:number;size?:number}){return <svg width={size} height={size} viewBox="0 0 44 44" className="ux-ring" aria-hidden="true"><circle cx="22" cy="22" r="18"/><circle cx="22" cy="22" r="18" strokeDasharray={2*Math.PI*18} strokeDashoffset={2*Math.PI*18*(1-Math.min(1,Math.max(0,value)))}/></svg>;}
export function ClinicalIsland({c}:{c:ClinicalController}){
 const [panel,setPanel]=useState<'none'|'details'|'activities'|'settings'>('none');
 const [systemReduced,setSystemReduced]=useState(matchMedia('(prefers-reduced-motion: reduce)').matches);
 const mainRef=useRef<HTMLDivElement>(null),keyboardOpen=useRef(false),trigger=useRef<HTMLButtonElement>(null),close=useRef<HTMLButtonElement>(null);
 const quietTimer=useRef(0),sourceButton=useRef<HTMLButtonElement>(null),primary=c.selectedActivity,timerSelected=c.selected==='timer'||!primary;
 const platform=usePlatform(mainRef,primary?versionKey(primary):'idle',c.settings.locked||c.settings.fullscreen);
 const platformPrivate=platform.status.notificationState===1||platform.status.notificationState===4;
 const blocked=c.settings.privacy||c.settings.role==='none'||platformPrivate,visible=canView(primary,c.settings);
 const hidden=c.settings.locked||c.settings.fullscreen||platformPrivate||(platform.suspended&&primary?.priority!=='important')||(c.settings.hideIdle&&c.view==='idle'&&!c.undo);
 const reduced=c.settings.reduced||systemReduced||!platform.status.animationsEnabled,unavailable=blocked||(!timerSelected&&!visible);
 const labActive=c.lab.stage!=='idle';
 useEffect(()=>c.lab.setReduced(reduced),[reduced,c.lab.setReduced]);
 const requestSurface:Surface=labActive?(c.lab.stage==='alert'?'alert':c.lab.stage==='sum'?'lab-sum':c.lab.stage==='done'?'lab-done':'lab-read'):c.view!=='expanded'?c.view:panel!=='none'?'stack':c.reason==='preview'?'alert':'rich';
 const collapse=()=>{setPanel('none');c.setHovered(false);c.collapse();};
 const expand=()=>{if(c.lab.protectedSession())return;setPanel('none');if(primary?.labRef)c.choose(identityKey(primary.identity));else c.expand();};
 const stack=()=>{c.promote();c.expand();setPanel('activities');};
 const cycle=(direction:number)=>{const ids=[...(c.timer.status!=='idle'?['timer']:[]),...sortActivities(c.queue.items).map(a=>identityKey(a.identity))];if(ids.length<2)return;const i=ids.indexOf(c.selected??'');c.choose(ids[(Math.max(0,i)+direction+ids.length)%ids.length]);setPanel('none');};
 const input=useSurfaceInput(mainRef,{expanded:c.view==='expanded',surface:requestSurface,hidden,reduced,peekable:labActive&&c.lab.stage==='alert',gesturesDisabled:labActive,hover:v=>{c.setHovered(v);if(labActive)c.lab.hover(v);},expand,collapse,stack,dismiss:()=>{setPanel('none');c.dismissPreview();},cycle,keyboardExpand:()=>{keyboardOpen.current=true;expand();}});
 const ordered=sortActivities(c.queue.items);
 const secondary=sortActivities(c.displayItems).find(a=>identityKey(a.identity)!==c.selected&&canView(a,c.settings));
 const timerSecondary=!timerSelected&&c.timer.status!=='idle';
 const showMinimal=!labActive&&c.view==='compact'&&!blocked&&Boolean(secondary||timerSecondary);
 const key=`${requestSurface}:${timerSelected?'timer':visible&&primary?versionKey(primary):'protected'}:${blocked}:${c.settings.role}:${c.view==='expanded'?panel:'none'}:${c.stale}:${labActive?c.lab.session:0}`;
 const layout=useClinicalLayout(c.view,key,c.settings.textScale,reduced,hidden,{surface:requestSurface,labStage:labActive?c.lab.stage:undefined,dock:c.settings.dock,peek:input.peek&&(!labActive||c.lab.stage==='alert'),pressed:!labActive&&input.pressed,satellite:showMinimal,shift:labActive?0:input.gesture.shift,dragging:!labActive&&input.gesture.dragging,dragVelocity:input.gesture.velocity,dismissing:!labActive&&input.gesture.dismissing,onSettled:()=>c.setReadable(true)});
 const {host,inner,svg,width,height,view,surface,error}=layout;
 const labStage=surface==='lab-sum'?'sum':surface==='lab-read'?(c.lab.stage==='burn'?'burn':'read'):surface==='lab-done'?'done':'alert';
 useEffect(()=>{if(labActive&&platformPrivate)c.lab.close();},[labActive,platformPrivate,c.lab.close]);
 const failFeedback=useButtonFeedback(host,reduced,key);
 useEffect(()=>{if(c.route==='requesting')failFeedback(null,'');if(['failed','mismatch','unauthorized'].includes(c.route))return failFeedback(sourceButton.current,`${key}:${c.route}`);},[c.route,key,reduced]);
 useEffect(()=>{mainRef.current=host.current;},[host]);
 useEffect(()=>{const media=matchMedia('(prefers-reduced-motion: reduce)');const f=()=>setSystemReduced(media.matches);media.addEventListener('change',f);return()=>{media.removeEventListener('change',f);clearTimeout(quietTimer.current);};},[]);
 useEffect(()=>{setPanel('none');},[c.settings.privacy,c.settings.role,c.selected]);
 useEffect(()=>{if(view==='expanded'&&keyboardOpen.current)close.current?.focus({preventScroll:true});if(view!=='expanded'&&keyboardOpen.current){trigger.current?.focus({preventScroll:true});keyboardOpen.current=false;}},[view,surface]);
 useEffect(()=>{if(['failed','mismatch','unauthorized'].includes(c.route))setPanel('details');},[c.route]);
 useEffect(()=>{if(surface==='alert'&&['requested','opened'].includes(c.route))c.collapseDisplay();},[c.route]);
 const Icon=timerSelected?Timer:scenarioIcons[primary?.scenario??'S03']??Pulse;
 const accent=unavailable?'var(--c-gray)':timerSelected?'var(--c-orange)':primary?.tone==='error'?'var(--c-red)':primary?.tone==='warning'?'var(--c-yellow)':primary?.tone==='success'?'var(--c-green)':'var(--c-blue)';
 const compactLabel=blocked?'新消息':timerSelected?`个人专注 ${timerText(c.remaining)}`:primary?.compact??'协作动态';
 const privacyMessage=c.settings.role==='none'?'请在工作空间登录':c.settings.privacy?'隐私保护已开启':'当前岗位没有查看权限';
 const routeText=({failed:'未能打开来源，请重试',mismatch:'对象或版本不匹配，已阻止打开',unauthorized:'授权已变化，请重新登录',requesting:'正在校验对象与版本',requested:'已请求打开来源，不代表已接收',opened:'已打开模拟来源，未提交临床确认'} as Record<string,string>)[c.route];
 const disabled=c.stale||c.route==='requesting';
 const sourceAction=<button ref={sourceButton} className="ci-primary ux-primary" disabled={disabled} onClick={()=>void c.openSource()}>{c.route==='requesting'?'正在校验':primary?.actionLabel}<ArrowUpRight size={16}/></button>;
 const quiet=(duration:number)=>{clearTimeout(quietTimer.current);c.configure({quiet:true});quietTimer.current=window.setTimeout(()=>c.configure({quiet:false}),duration);collapse();};
 return <div className="ci-anchor" style={{'--ci-text-scale':c.settings.textScale,'--ux-accent':accent} as React.CSSProperties}>
  <div ref={host} className={`ci-host ux-host ${reduced?'ci-reduced':''}`} data-testid="clinical-island" data-view={view} data-surface={surface} data-lab-state={c.lab.stage} data-native-fallback="false" data-native={String(nativeIsland)} data-enlarged={String(c.settings.textScale>1)} data-hidden={String(hidden)} data-rim={String(c.settings.backgroundDark||platform.dark)} data-peek={String(input.peek)} style={hidden?{visibility:'hidden'}:undefined}
   onMouseEnter={input.enter} onMouseLeave={input.leave} onPointerDown={input.down} onPointerMove={input.move} onPointerUp={input.up} onWheel={input.wheel}
   onClickCapture={e=>{if(input.consumeLong()){e.preventDefault();e.stopPropagation();}}}
   onClick={e=>{if((e.target as Element).matches('[data-shell="fill"]')&&!input.consumeLong())expand();}}
   onFocusCapture={()=>c.setFocusWithin(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))c.setFocusWithin(false);}}
   onContextMenu={e=>{e.preventDefault();if(labActive)return;c.expand();setPanel('settings');}}
   onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(e.key==='Escape'){e.preventDefault();if(labActive){if(c.lab.stage==='read')c.lab.burn(reduced);else if(!c.lab.protectedSession())c.lab.close();return;}if(panel!=='none')setPanel('none');else collapse();}if(e.key==='Enter'||e.key===' ')keyboardOpen.current=true;
    if(['ArrowLeft','ArrowRight'].includes(e.key)&&(e.target as Element).matches('.ci-compact-button,.ux-minimal,.ux-activity-list button')){e.preventDefault();cycle(e.key==='ArrowRight'?1:-1);}}}>
   <svg ref={svg} className="ci-shell" aria-hidden="true" width="144" height="32"><path className="ci-fill" data-shell="fill"/><path className="ci-rim" data-shell="rim"/><path className="ux-neck" data-neck="bridge"/></svg>
   <div className="ci-clip"><div ref={inner} id="clinical-content" className={`ci-content ci-${view} ux-${surface} ${labActive||surface.startsWith('lab-')?'lab-content':''}`} style={{width,height}}>
    {(labActive||surface.startsWith('lab-'))&&!unavailable&&(!labActive||(c.lab.activity?.version===primary?.version&&!primary?.withdrawn&&!c.stale))?<LabScene lab={c.lab} stage={labStage} reduced={reduced} openSource={()=>void c.openSource()} sourceDisabled={disabled} routeText={routeText}/>:
     surface==='idle'?c.undo&&!blocked?<button ref={trigger} className="ci-compact-button ux-idle-button ux-undo" aria-label="撤销忽略本次快览" onClick={()=>c.undoPreview()}>撤销</button>:<button ref={trigger} className="ci-compact-button ux-idle-button" aria-label="打开协作动态" aria-expanded="false" aria-controls="clinical-content" onClick={()=>{if(!input.consumeLong())expand();}}><span className="ux-idle-mark" aria-hidden="true"/></button>:
     surface==='compact'?<button ref={trigger} className={`ci-compact-button ux-compact-button ${c.settings.compactText?'has-label':''}`} aria-label="展开协作详情" aria-description={compactLabel} aria-expanded="false" aria-controls="clinical-content" onClick={()=>{if(!input.consumeLong())expand();}}>
      <span className="ux-leading">{timerSelected?<Ring size={24} value={c.remaining/c.timer.duration}/>:<Icon size={16} strokeWidth={1.75}/>}</span>
      <span className="ux-center">{c.settings.compactText&&<CompactLabel text={compactLabel} reduced={reduced} active={c.hovered||c.focusWithin}/>}</span>
      <span className="ux-trailing">{blocked?'•••':timerSelected?timerText(c.remaining):`${Math.max(1,c.queue.items.length)} 项`}</span>
     </button>:
     surface==='alert'?<div className="ux-alert-body">
      <button className="ux-alert-main" aria-label={unavailable?'打开受保护的协作详情':`打开来源 ${primary?.title??'协作动态'}`} onClick={()=>{if(!input.consumeLong()){if(unavailable)expand();else void c.openSource();}}}>
       <span className="ux-identity ux-identity-44" data-stagger><Icon size={24} strokeWidth={1.75}/></span>
       <span className="ux-alert-copy"><span className="ux-title" data-stagger>{unavailable?'新消息':excerpt(primary?.title??'协作动态',24)}</span><span className="ux-body" data-stagger>{unavailable?'点击查看授权入口':excerpt(primary?.body??'',60)}</span></span>
      </button><div className="ux-alert-right"><time className="ci-caption">{stamp(primary?.sourceAt??null)}</time><button className="ci-icon-button ux-close" aria-label="忽略本次快览" onClick={()=>c.dismissPreview()}><X size={12}/></button><button className="ux-more-alert" aria-label="展开完整摘要" onClick={expand}><ChevronDown size={12}/></button></div>
     </div>:
     surface==='rich'?<>
      <header className="ci-header ux-header" data-stagger><span className="ux-source-icon"><Icon size={20} strokeWidth={1.75}/></span><span className="ci-caption ux-source">{unavailable?'协作动态':timerSelected?'个人番茄钟':primary?.identity.source}</span><time className="ci-caption">{timerSelected?'个人工具':stamp(primary?.sourceAt??null)}</time><button ref={close} className="ci-icon-button ux-close" aria-label="收起协作详情" onClick={collapse}><X size={12}/></button></header>
      <div className="ux-rich-main" data-stagger>
       {timerSelected&&!unavailable?<><Ring size={52} value={c.remaining/c.timer.duration}/><div className="ux-main-copy"><strong className={`ux-hero ${c.timer.status==='running'&&c.remaining===0?'ux-timer-finished':''}`} aria-live="off">{timerText(c.remaining)}</strong><span className="ci-caption">{c.timer.status==='paused'?'已暂停':c.timer.status==='idle'?'准备开始':c.remaining===0?'本轮计时结束':'专注进行中'}</span></div></>:
        <><span className="ux-identity ux-identity-52"><Icon size={28} strokeWidth={1.75}/></span><div className="ux-main-copy"><h2 className="ux-title-large">{unavailable?'详情已保护':excerpt(primary?.title??'协作动态',24)}</h2><p className="ux-body">{unavailable?privacyMessage:c.stale?'状态暂未更新':primary?.sourceState}</p></div></>}
      </div>
      <footer className="ci-footer ux-footer" data-stagger><button className="ci-icon-button ux-utility" aria-label="活动与个人工具" onClick={stack}><MoreHorizontal size={20}/></button>
       {!timerSelected&&!unavailable&&<button className="ci-secondary" onClick={()=>setPanel('details')}>详情</button>}
       {unavailable?<button className="ci-secondary" onClick={()=>void openStudio()}>打开工作空间</button>:timerSelected?<div className="ux-timer-controls"><button className="ux-round" aria-label={c.timer.status==='running'&&c.remaining>0?'暂停计时':c.timer.status==='paused'?'继续专注':'开始 25 分钟'} onClick={()=>c.personal(c.timer.status==='paused'?'resume':c.timer.status==='running'&&c.remaining>0?'pause':'start')}>{c.timer.status==='running'&&c.remaining>0?<Pause size={20}/>:<Play size={20}/>}</button><button className="ux-round" aria-label="结束本次" disabled={c.timer.status==='idle'} onClick={()=>c.personal('end')}><Square size={18}/></button></div>:sourceAction}
      </footer>
     </>:
     <>
      <header className="ci-header ux-stack-header"><button className="ci-icon-button" aria-label="返回快览" onClick={()=>setPanel('none')}><ArrowLeft size={16}/></button><h2 className="ux-title">{panel==='settings'?'灵动岛设置':panel==='activities'?'活动托盘':unavailable?'详情已保护':'来源详情'}</h2><button ref={close} className="ci-icon-button ux-close" aria-label="收起协作详情" onClick={collapse}><X size={12}/></button></header>
      <div className="ci-scroll" tabIndex={0} role="region" aria-label={panel==='settings'?'设置滚动区域':panel==='activities'?'活动滚动区域':'来源详情滚动区域'}><div className="ci-scroll-content">
       {panel==='settings'?<div className="ux-settings">
        <button onClick={()=>c.configure({dock:c.settings.dock==='notch'?'floating':'notch'})}><span>停靠模式</span><span>{c.settings.dock==='notch'?'A · 贴顶':'B · 悬浮'}</span></button>
        <button onClick={()=>c.configure({compactText:!c.settings.compactText})}><span>紧凑中央区域</span><span>{c.settings.compactText?'单行文字':'留白 124'}</span></button>
        <button onClick={()=>c.configure({reduced:!c.settings.reduced})}><span>减弱动效</span><span>{c.settings.reduced?'开启':'关闭'}</span></button>
        <button onClick={()=>c.configure({backgroundDark:!c.settings.backgroundDark})}><span>深色背景描边</span><span>{c.settings.backgroundDark?'开启':'关闭'}</span></button>
        <button onClick={()=>c.configure({hideIdle:!c.settings.hideIdle})}><span>完全隐藏静默岛</span><span>{c.settings.hideIdle?'开启':'关闭'}</span></button>
        {primary&&!unavailable&&<button aria-pressed={c.mutedSources.includes(primary.identity.source)} onClick={()=>c.muteSource(primary.identity.source)}><span>{c.mutedSources.includes(primary.identity.source)?'取消静音此来源':'静音此来源'}</span><span>{primary.identity.source}</span></button>}
        <div className="ux-quiet-actions"><button onClick={()=>quiet(1800000)}>勿扰 30 分钟</button><button onClick={()=>quiet(3600000)}>勿扰 1 小时</button><button onClick={()=>quiet(Math.max(1000,new Date(new Date().setHours(24,0,0,0)).getTime()-Date.now()))}>到明天</button></div>
        <p className="ci-caption">只影响当前会话的普通预览；重要来源仍会提醒，不改变临床通知流程</p>
       </div>:unavailable?<div className="ci-protected"><EyeOff size={24}/><p>{privacyMessage}</p></div>:
        panel==='activities'?<div className="ci-switcher ux-activity-list" aria-label="切换活动"><button onClick={()=>{c.choose('timer');setPanel('none');}}><Timer size={20}/><span>个人番茄钟<small>{c.timer.status==='idle'?'个人工具':timerText(c.remaining)}</small></span><ChevronRight size={16}/></button>{ordered.map(a=>{const I=scenarioIcons[a.scenario];return <button key={identityKey(a.identity)} onClick={()=>{c.choose(identityKey(a.identity));setPanel('none');}}><I size={20}/><span>{excerpt(a.compact,24)}<small>{a.identity.source} · {stamp(a.sourceAt)}</small></span><ChevronRight size={16}/></button>;})}</div>:
        primary&&<>
         <div className="ci-patient"><span>{primary.patient}</span><span>{primary.identity.campus}</span></div><p className="ci-body ci-preview-body">{primary.body}</p>
         <div className="ci-source-state">{c.stale?'上次记录（非当前）':primary.sourceState}</div>
         <dl className="ci-fields">{primary.fields.map((f,i)=><div key={`${f.label}-${i}`}><dt>{f.label}</dt><dd>{f.value}<span className="ci-field-time">来源时间 {stamp(f.at)}</span></dd></div>)}</dl>
         <div className="ci-provenance"><span>来源事件 {stamp(primary.sourceAt)}</span><span>最近成功同步 {stamp(primary.syncedAt)}</span><span>就诊 {primary.identity.encounter} · 来源快照 r{primary.version}</span></div>
         {c.opened[versionKey(primary)]&&<p className="ci-local-note">本地已打开此版本 · 不代表临床确认</p>}
         <p className="ci-guard">{primary.guard}</p>
         {c.stale&&<div className="ci-warning"><WifiOff size={16}/><span>来源未重新核实</span><button onClick={()=>void c.refresh()}>重新读取</button></div>}
        </>}
       {routeText&&!unavailable&&<p className="ci-route-status" role="status">{routeText}</p>}
      </div></div>
      <footer className="ci-footer ux-stack-footer">{panel==='details'&&!unavailable&&primary?<><button className="ci-icon-button" aria-label={c.followed[identityKey(primary.identity)]===false?'关注此对象':'取消个人关注'} onClick={()=>c.follow(primary)}>{c.followed[identityKey(primary.identity)]===false?<Bookmark size={18}/>:<BookmarkCheck size={18}/>}</button>{sourceAction}</>:<><span className="ci-caption">{panel==='activities'?`${c.queue.items.length} 项来源动态`:'仅本地展示设置'}</span><button className="ci-secondary" onClick={()=>setPanel('none')}>完成</button></>}</footer>
     </>}
   </div></div>
   <button className="ux-minimal" aria-label={timerSecondary?'切换个人番茄钟':secondary?`切换 ${secondary.compact}`:'切换其他活动'} tabIndex={showMinimal?0:-1} aria-hidden={!showMinimal} onClick={()=>{if(timerSecondary)c.choose('timer');else if(secondary)c.choose(identityKey(secondary.identity));setPanel('none');}}>{timerSecondary?<Timer size={16}/>:c.queue.items.length>2?<span>{c.queue.items.length-1}</span>:<Pulse size={16}/>}</button>
   {c.queue.overflow>0&&view==='expanded'&&<span className="ux-overflow" role="status">超出容量 {c.queue.overflow} 项，请回工作空间查看</span>}
   {error&&<span className="ci-native-error" role="alert">原生几何同步失败</span>}
  </div>
  <span className="ci-sr" role="status" aria-live={primary?.priority==='important'?'assertive':'polite'} aria-atomic="true">{hidden?'协作浮层已隐藏':blocked||(!timerSelected&&!visible)?'新消息':c.stale?'来源状态暂未更新':c.undo?'本次快览已忽略，四秒内可撤销':primary?.compact??''}</span>
 </div>;
}
