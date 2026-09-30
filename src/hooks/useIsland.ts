import { useCallback, useEffect, useRef, useState } from 'react';
import { connect, send } from '../lib/bridge';
import type { Connection, Wire } from '../lib/bridge';
import { chooseArrivalMode, defaultSettings, emptyModel, ingest, parseNotice, pending, sanitizeSettings, unread, updateStatus } from '../lib/domain';
import type { Mode, Model, Notice, Settings } from '../lib/domain';
function readSettings() { try { return sanitizeSettings(JSON.parse(localStorage.getItem('samewave-preferences') ?? '{}'), defaultSettings); } catch { return defaultSettings; } }
export function useIsland() {
  const [model, setModel] = useState<Model>(emptyModel);
  const [settings, setSettings] = useState<Settings>(readSettings);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [mode, setMode] = useState<Mode>('compact');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [logs, setLogs] = useState<{ id: number; text: string; at: string }[]>([]);
  const [hovered, setHovered] = useState(false);
  const latest = useRef({ model, settings, mode, activeId });
  latest.current = { model, settings, mode, activeId };
  const seen = useRef(new Map<string, number>());
  const ackTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const sequence = useRef(0);
  const addLog = useCallback((text: string) => {
    const row = { id: ++sequence.current, text, at: new Date().toLocaleTimeString('zh-CN', { hour12: false }) };
    setLogs(v => [row, ...v].slice(0, 80));
  }, []);
  const applyNotice = useCallback((raw: unknown, replay = false) => {
    const n = parseNotice(raw);
    if (!n) { setModel(v => ingest(v, raw)); addLog('拒绝了格式无效的消息'); return; }
    const oldRev = seen.current.get(n.id) ?? 0;
    if (oldRev >= n.revision) { setModel(v => ({ ...v, duplicates: v.duplicates + 1 })); return; }
    seen.current.set(n.id, n.revision);
    if (seen.current.size > 4000) seen.current.delete(seen.current.keys().next().value!);
    setModel(v => ingest(v, raw));
    if (replay) return;
    const current = latest.current;
    const active = current.model.items.find(x => x.id === current.activeId);
    const protectedView = current.mode === 'inbox' || current.mode === 'thread' || (active?.requiresAck && active.status !== 'acknowledged');
    const arrival = chooseArrivalMode(n, current.settings);
    if (arrival && (!protectedView || (n.priority === 'critical' && active?.priority !== 'critical'))) {
      setActiveId(n.id); setMode(arrival);
    }
    addLog(`${n.source} → ${n.priority === 'critical' ? '危急提醒' : n.priority === 'urgent' ? '紧急提醒' : '普通消息'} · ${n.title}`);
  }, [addLog]);
  useEffect(() => {
    let cleanup: (() => void) | undefined; let dead = false;
    const receive = (event: Wire) => {
      if (event.type === 'notice') applyNotice(event.notice);
      if (event.type === 'hello') {
        if (Array.isArray(event.notices)) event.notices.forEach(n => applyNotice(n, true));
        if (Array.isArray(event.receipts)) event.receipts.forEach(r => {
          if (r && typeof r.id === 'string' && Number.isInteger(r.revision)) setModel(v => updateStatus(v, r.id, r.revision, 'acknowledged'));
        });
        setSettings(v => sanitizeSettings(event.settings, v));
        addLog('演示消息通道已连接 · 增量记录同步完成');
      }
      if (event.type === 'server-error') { setModel(v => ({ ...v, overflow: v.overflow + 1 })); addLog(String(event.reason || 'Server rejected the event')); }
      if (event.type === 'receipt' && typeof event.id === 'string' && typeof event.revision === 'number') {
        const matching = latest.current.model.items.find(n => n.id === event.id && n.revision === event.revision);
        if (!matching) return;
        clearTimeout(ackTimers.current.get(event.id)); ackTimers.current.delete(event.id);
        setModel(v => updateStatus(v, event.id as string, event.revision as number, 'acknowledged'));
        if (latest.current.activeId === event.id) { setMode('success'); setFeedback('模拟服务端已确认收到'); }
        addLog(`服务端回执 ← ${event.id} · 仅确认收到，未标记临床处置`);
      }
      if (event.type === 'settings') setSettings(v => sanitizeSettings(event.settings, v));
      if (event.type === 'reset') { seen.current.clear(); setModel(emptyModel()); setActiveId(null); setMode('compact'); setLogs([]); ackTimers.current.forEach(clearTimeout); ackTimers.current.clear(); }
      if (event.type === 'view' && ['compact', 'inbox', 'expanded', 'thread'].includes(event.mode as string)) setMode(event.mode as Mode);
    };
    void connect(receive, s => { if (!dead) setConnection(s); }).then(off => { if (dead) off(); else cleanup = off; });
    const timers = ackTimers.current;
    return () => { dead = true; cleanup?.(); timers.forEach(clearTimeout); };
  }, [applyNotice, addLog]);
  useEffect(() => { localStorage.setItem('samewave-preferences', JSON.stringify(settings)); }, [settings]);
  // Auto-collapse is visual only. Critical/urgent events never become acknowledged by a timer.
  useEffect(() => {
    if (hovered || (mode !== 'peek' && mode !== 'success')) return;
    const delay = mode === 'success' ? 1900 : 6500;
    const timer = setTimeout(() => setMode('compact'), delay);
    return () => clearTimeout(timer);
  }, [mode, activeId, hovered]);
  const items = model.items;
  const todo = pending(items);
  const active = items.find(x => x.id === activeId) ?? todo[0] ?? items.at(-1) ?? null;
  const open = useCallback((notice?: Notice) => {
    const n = notice ?? latest.current.model.items.find(x => x.id === latest.current.activeId);
    if (n) {
      setActiveId(n.id);
      if (!n.requiresAck) setModel(v => updateStatus(v, n.id, n.revision, 'read'));
      setMode('expanded');
    } else setMode('inbox');
  }, []);
  const acknowledge = useCallback(async (n: Notice) => {
    if (n.status === 'pending' || n.status === 'acknowledged') return;
    setModel(v => updateStatus(v, n.id, n.revision, 'pending'));
    const ok = await send({ type: 'ack', id: n.id, revision: n.revision, ackId: crypto.randomUUID() });
    if (!ok) { setModel(v => updateStatus(v, n.id, n.revision, 'failed')); addLog('回执未发送：连接不可用，保留待确认状态'); return; }
    const timer = setTimeout(() => { setModel(v => {
      const item = v.items.find(x => x.id === n.id);
      return item?.status === 'pending' ? updateStatus(v, n.id, n.revision, 'failed') : v;
    }); ackTimers.current.delete(n.id); }, 5000);
    ackTimers.current.set(n.id, timer);
  }, [addLog]);
  const changeSettings = useCallback((patch: Partial<Settings>) => {
    setSettings(v => sanitizeSettings(patch, v)); void send({ type: 'configure', settings: patch });
  }, []);
  const scenario = useCallback(async (name: string) => {
    const ok = await send({ type: 'demo', scenario: name });
    if (!ok) addLog('模拟服务未连接。请运行 npm run demo:server；未伪造推送或回执。');
    return ok;
  }, [addLog]);
  return { model, settings, connection, mode, setMode, active, items, todo, unread: unread(items), logs, feedback, hovered, setHovered, open, acknowledge, changeSettings, scenario, addLog };
}
export type IslandController = ReturnType<typeof useIsland>;
