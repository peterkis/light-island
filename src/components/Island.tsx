import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Check, CheckCheck, ChevronLeft, ChevronRight, EyeOff, Inbox, LoaderCircle, Network, X } from 'lucide-react';
import { useMorph } from '../hooks/useMorph';
import type { IslandController } from '../hooks/useIsland';
import type { Notice } from '../lib/domain';
import { priorityNames, sorted, sourceNames, statusNames } from '../lib/domain';
import { nativeIsland, openStudio } from '../lib/bridge';
import { SourceIcon, WaveMark } from './Icons';
import { NotchSurface } from './NotchSurface';

function contextLabel(n: Notice, masked: boolean) {
  return masked && n.patient ? '患者信息已遮罩' : `${n.context}${n.patient ? ` · ${n.patient}` : ''}`;
}
function Pager({ index, total, onChange }: { index: number; total: number; onChange: (index: number) => void }) {
  return <div className="rail-pager">
    <button className="icon-button" aria-label="上一条消息" disabled={index <= 0} onClick={() => onChange(index - 1)}><ChevronLeft size={16}/></button>
    <span aria-live="polite">{total ? index + 1 : 0}/{total}</span>
    <button className="icon-button" aria-label="下一条消息" disabled={index >= total - 1} onClick={() => onChange(index + 1)}><ChevronRight size={16}/></button>
  </div>;
}

export function Island({ c: live }: { c: IslandController }) {
  const { ref, contentRef, presented: c, nativeError, reduced } = useMorph(live);
  const { mode, active: n, todo, unread, connection } = c;
  const settings = live.settings;
  const [filter, setFilter] = useState<'all' | 'unread' | 'pending'>('all');
  const [cursor, setCursor] = useState(0);
  const [threadCursor, setThreadCursor] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const hover = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const priority = todo[0]?.priority ?? n?.priority ?? 'routine';
  const count = unread.length;
  useEffect(() => { setRevealed(false); setThreadCursor(0); }, [n?.id, mode]);
  useEffect(() => { setCursor(0); }, [filter, mode]);
  useEffect(() => () => clearTimeout(hover.current), []);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { c.setMode('compact'); (event.target as HTMLElement)?.blur?.(); }
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'i') { event.preventDefault(); c.setMode('inbox'); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [c.setMode]);
  const close = () => { clearTimeout(hover.current); c.setMode('compact'); };
  const open = () => { clearTimeout(hover.current); c.open(n ?? undefined); };
  const enter = () => {
    live.setHovered(true);
    if (mode === 'compact' && (count || todo.length)) hover.current = setTimeout(() => c.setMode('peek'), 120);
  };
  const leave = () => { clearTimeout(hover.current); live.setHovered(false); };
  const list = sorted(c.items).filter(x => filter === 'all' || (filter === 'pending' ? x.requiresAck && x.status !== 'acknowledged' : x.status === 'unread'));
  const listIndex = Math.max(0, Math.min(cursor, list.length - 1));
  const selected = list[listIndex];
  const thread = n ? c.items.filter(x => x.threadId === n.threadId && n.threadId).sort((a, b) => a.createdAt - b.createdAt) : [];
  const linked = thread.length ? thread : n ? [n] : [];
  const linkIndex = Math.max(0, Math.min(threadCursor, linked.length - 1));
  const linkedNotice = linked[linkIndex];
  const offline = connection !== 'online';
  const masked = settings.privacy && !revealed;
  const title = n ? (masked && n.patient ? `${priorityNames[n.priority]}提醒需要你的关注` : n.title) : '此刻，没有需要打断你的事';
  const summary = n ? (masked && n.patient ? '查看脱敏详情后，请进入源系统核对。' : n.summary) : '消息抵达时，从两侧自然展开。';
  const closeButton = <button className="icon-button rail-close" onClick={close} aria-label="收起灵动岛"><X size={15}/></button>;

  return <div className={`island-anchor ${nativeIsland ? 'native-anchor' : ''}`}>
    <div ref={ref} data-testid="island" data-mode={mode} data-theme={settings.theme} data-shape={settings.shape}
      className={`island notch-island theme-${settings.theme} priority-${priority} ${reduced ? 'reduced' : ''}` }
      onMouseEnter={enter} onMouseLeave={leave}>
      <NotchSurface/>
      <div className="notch-content-clip"><div ref={contentRef} className="notch-content">
      {mode === 'compact' && <button className="compact-face" aria-label={`打开消息中心，${count}条未读，${todo.length}条待确认`} onClick={() => c.setMode('inbox')}>
        <span className={`mini-mark ${offline ? 'is-offline' : ''}`}><WaveMark/></span>
        <span className="compact-label">{offline ? '连接中断' : todo.length ? `${todo.length} 条待确认` : count ? `${count} 条新消息` : settings.focus ? '专注进行中' : '同频 · 在线'}</span>
        <span className={`status-light ${offline ? 'offline' : todo.length ? priority : ''}`}/>
      </button>}
      {mode === 'peek' && <div className="horizontal-face peek-rail" key={`peek-${n?.id}`}>
        <button className="rail-notice-button" onClick={open} aria-label="展开消息详情">
          <span className={`source-tile ${n?.priority ?? 'routine'}`}><SourceIcon source={n?.source} size={21}/></span>
          <span className="rail-copy">
            <strong>{n ? (settings.privacy && n.patient ? `${priorityNames[n.priority]}提醒 · 有新的患者相关消息` : n.title) : '此刻，没有需要打断你的事'}</strong>
            <span className="rail-meta">{n ? sourceNames[n.source] : '同频协作'}<i/>{n?.requiresAck ? '待确认 · 收起不代表已收到' : n ? `${n.context}${n.count > 1 ? ` · 已合并 ${n.count} 条更新` : ''}` : '消息将向左右舒展，不打断当前工作'}</span>
          </span>
        </button>
        {n?.requiresAck && <span className={`priority-badge ${n.priority}`}>{priorityNames[n.priority]}</span>}
        <button className="icon-button rail-aux" onClick={open} aria-label="查看消息"><ArrowUpRight size={16}/></button>
        {closeButton}
        <div className={`peek-timer ${c.hovered || n?.requiresAck ? 'paused' : ''}`}/>
      </div>}
      {mode === 'expanded' && <div className="horizontal-face detail-rail" key={`detail-${n?.id}`}>
        <span className={`source-tile ${n?.priority ?? 'routine'}`}><SourceIcon source={n?.source} size={21}/></span>
        <div className="rail-copy">
          <div className="rail-title-line"><h2 title={title}>{title}</h2>{n && <span className={`priority-badge ${n.priority}`}>{priorityNames[n.priority]}</span>}</div>
          <div className="rail-meta"><span className="rail-context" title={n ? contextLabel(n, masked) : ''}>{n ? `${sourceNames[n.source]} · ${contextLabel(n, masked)}` : '同频协作'}</span>
            {n?.patient && settings.privacy && <button className="reveal-button" onClick={() => setRevealed(!revealed)} aria-label="切换脱敏详情" aria-pressed={revealed} title={revealed ? '恢复遮罩' : '查看脱敏详情'}><EyeOff size={13}/></button>}
            <span className="rail-summary" title={summary}> · {summary}</span>
          </div>
        </div>
        <div className="rail-actions">
          {n?.requiresAck && <div className="ack-stack"><button className={`primary-action ${n.status === 'acknowledged' ? 'confirmed' : ''}`}
            onClick={() => void c.acknowledge(n)} disabled={n.status === 'pending' || n.status === 'acknowledged'}>
            {n.status === 'pending' ? <LoaderCircle className="spin" size={14}/> : n.status === 'acknowledged' ? <CheckCheck size={14}/> : <Check size={14}/>}
            {n.status === 'pending' ? '等待服务端回执' : n.status === 'acknowledged' ? '已确认收到' : n.status === 'failed' ? '重试确认收到' : '确认收到'}
          </button><small>{n.status === 'failed' ? '未收到回执，仍待确认' : '收到 ≠ 处置完成'}</small></div>}
          <button className="icon-button rail-aux" onClick={() => c.setMode('thread')} aria-label="查看协作脉络" title="查看协作脉络"><Network size={17}/></button>
          {closeButton}
        </div>
      </div>}
      {mode === 'inbox' && <div className="horizontal-face inbox-rail">
        <span className="source-tile rail-inbox-icon"><Inbox size={21}/></span>
        <div className="rail-heading"><h2>消息中心<span>{c.items.length}</span></h2><span className="rail-caption">{offline ? '通道断开' : '同频协作 · 在线'}</span></div>
        <div className="rail-filters" role="group" aria-label="消息筛选">{(['all', 'unread', 'pending'] as const).map(f => <button key={f} className={filter === f ? 'selected' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>{f === 'all' ? '全部' : f === 'unread' ? `未读 ${count}` : `待确认 ${todo.length}`}</button>)}</div>
        {selected ? <button className="rail-copy rail-inbox-item" onClick={() => c.open(selected)}>
          <strong>{settings.privacy && selected.patient ? `${sourceNames[selected.source]} · ${priorityNames[selected.priority]}患者相关提醒` : selected.title}</strong>
          <span className="rail-meta">{sourceNames[selected.source]} · {statusNames[selected.status]}{selected.count > 1 ? ` · ${selected.count} 条合并` : ''}</span>
        </button> : <div className="rail-copy rail-empty"><strong>此刻，安心专注。</strong><span className="rail-meta">需要你的消息，会在这里相遇。</span></div>}
        <Pager index={listIndex} total={list.length} onChange={setCursor}/>
        {nativeIsland && <button className="icon-button rail-aux" onClick={() => void openStudio()} aria-label="打开原型试验台" title="打开原型试验台"><ArrowUpRight size={16}/></button>}
        {closeButton}
      </div>}
      {mode === 'thread' && <div className="horizontal-face thread-rail">
        <button className="icon-button" onClick={() => c.setMode('expanded')} aria-label="返回消息"><ArrowLeft size={16}/></button>
        <div className="rail-heading"><h2>协作脉络</h2><span className="rail-caption">同一 threadId</span></div>
        <span className="rail-link" aria-hidden="true"/>
        {linkedNotice ? <div className="rail-copy"><strong>{masked && linkedNotice.patient ? `${priorityNames[linkedNotice.priority]}患者相关事件` : linkedNotice.title}</strong><span className="rail-meta">{sourceNames[linkedNotice.source]} · {statusNames[linkedNotice.status]} · {new Date(linkedNotice.createdAt).toLocaleTimeString('zh-CN', { hour12: false })}</span></div> : <div className="rail-copy"><strong>暂无关联事件</strong><span className="rail-meta">仅关联明确的上下文，不猜测患者关系。</span></div>}
        <Pager index={linkIndex} total={linked.length} onChange={setThreadCursor}/>
        {closeButton}
      </div>}
      {mode === 'success' && <div className="horizontal-face success-rail">
        <span className="success-ring"><Check size={21}/></span><div className="rail-copy"><strong>已确认收到</strong><span className="rail-meta">{c.feedback || '模拟服务端已返回回执'} · 不代表处置完成</span></div>{closeButton}
      </div>}
      </div></div>
      {(nativeError || live.model.overflow > 0) && <div className="rail-error" role="alert">{nativeError ? '原生窗口同步异常，请查看诊断记录' : `消息缓冲已满：${c.model.overflow} 条需补拉，未宣称送达`}</div>}
    </div>
    <div className="sr-only" role={n?.priority === 'critical' ? 'alert' : 'status'} aria-live={n?.priority === 'critical' ? 'assertive' : 'polite'} aria-atomic="true">{n && mode !== 'compact' ? `${sourceNames[n.source]}，${priorityNames[n.priority]}消息${n.requiresAck ? '，待确认' : ''}` : ''}</div>
  </div>;
}
