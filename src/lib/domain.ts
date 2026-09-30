export type Priority = 'critical' | 'urgent' | 'routine';
export type Source = 'LIS' | 'HIS' | 'PACS' | 'NURSING' | 'IT' | 'OA';
export type Receipt = 'unread' | 'read' | 'pending' | 'acknowledged' | 'failed';
export type Theme = 'ink' | 'cloud' | 'dusk';
export type Mode = 'compact' | 'peek' | 'expanded' | 'inbox' | 'thread' | 'success';
export interface Notice {
  id: string; revision: number; source: Source; priority: Priority;
  title: string; summary: string; patient?: string; context: string;
  createdAt: number; requiresAck: boolean; groupKey?: string; threadId?: string;
  status: Receipt; count: number;
}
export interface Settings {
  theme: Theme; engine: 'gsap' | 'css'; focus: boolean; privacy: boolean;
  reduced: boolean; top: number; shape: 'notch' | 'capsule';
}
export const defaultSettings: Settings = { theme: 'ink', engine: 'gsap', focus: false, privacy: true, reduced: false, top: 0, shape: 'notch' };
export interface Model { items: Notice[]; rejected: number; duplicates: number; overflow: number }
export const emptyModel = (): Model => ({ items: [], rejected: 0, duplicates: 0, overflow: 0 });
const priorities: Priority[] = ['critical', 'urgent', 'routine'];
const sources: Source[] = ['LIS', 'HIS', 'PACS', 'NURSING', 'IT', 'OA'];
const bounded = (v: unknown, max: number) => typeof v === 'string' && v.length > 0 && v.length <= max;
export function parseNotice(raw: unknown): Notice | null {
  if (!raw || typeof raw !== 'object') return null;
  const m = raw as Record<string, unknown>;
  if (!bounded(m.id, 120) || !bounded(m.title, 160) || !bounded(m.summary, 600) || !bounded(m.context, 120)) return null;
  if (!sources.includes(m.source as Source) || !priorities.includes(m.priority as Priority)) return null;
  if (!Number.isInteger(m.revision) || (m.revision as number) < 1 || !Number.isFinite(m.createdAt)) return null;
  if (m.patient !== undefined && !bounded(m.patient, 120)) return null;
  if (m.groupKey !== undefined && !bounded(m.groupKey, 120)) return null;
  if (m.threadId !== undefined && !bounded(m.threadId, 120)) return null;
  return {
    id: m.id as string, revision: m.revision as number, title: m.title as string,
    summary: m.summary as string, context: m.context as string, source: m.source as Source,
    priority: m.priority as Priority, createdAt: m.createdAt as number,
    requiresAck: m.priority !== 'routine' || m.requiresAck === true,
    patient: m.patient as string | undefined, groupKey: m.groupKey as string | undefined,
    threadId: m.threadId as string | undefined, status: 'unread', count: 1,
  };
}
const rank = { critical: 0, urgent: 1, routine: 2 };
export function sorted(items: Notice[]): Notice[] {
  return [...items].sort((a, b) => rank[a.priority] - rank[b.priority] || b.createdAt - a.createdAt);
}
export function ingest(model: Model, raw: unknown): Model {
  const n = parseNotice(raw);
  if (!n) return { ...model, rejected: model.rejected + 1 };
  const existing = model.items.find(x => x.id === n.id);
  if (existing && existing.revision >= n.revision) return { ...model, duplicates: model.duplicates + 1 };
  if (existing) return { ...model, items: model.items.map(x => x.id === n.id ? n : x) };
  // Only routine, non-acknowledgement updates may coalesce. Patient-critical events never merge.
  const group = !n.requiresAck && n.priority === 'routine' && n.groupKey
    ? model.items.find(x => x.groupKey === n.groupKey && x.source === n.source && !x.requiresAck && n.createdAt >= x.createdAt && n.createdAt - x.createdAt < 90_000)
    : undefined;
  if (group) return { ...model, items: model.items.map(x => x.id === group.id ? { ...n, count: group.count + 1 } : x) };
  let items = model.items;
  if (items.length >= 200) {
    const removable = items.findIndex(x => x.status === 'acknowledged' || (!x.requiresAck && x.status === 'read'));
    if (removable < 0) return { ...model, overflow: model.overflow + 1 };
    items = items.filter((_, i) => i !== removable);
  }
  return { ...model, items: [...items, n] };
}
export function updateStatus(model: Model, id: string, revision: number, status: Receipt): Model {
  return { ...model, items: model.items.map(x => x.id === id && x.revision === revision ? { ...x, status } : x) };
}
export function pending(items: Notice[]) { return sorted(items.filter(x => x.requiresAck && x.status !== 'acknowledged')); }
export function unread(items: Notice[]) { return items.filter(x => x.status === 'unread' || x.status === 'failed'); }
export function chooseArrivalMode(n: Notice, settings: Settings): Mode | null {
  if (n.priority === 'critical') return 'expanded';
  if (n.priority === 'urgent') return 'peek';
  return settings.focus ? null : 'peek';
}
export function sanitizeSettings(raw: unknown, old: Settings): Settings {
  if (!raw || typeof raw !== 'object') return old;
  const n = raw as Partial<Settings>;
  return {
    theme: ['ink', 'cloud', 'dusk'].includes(n.theme ?? '') ? n.theme! : old.theme,
    engine: n.engine === 'css' ? 'css' : n.engine === 'gsap' || String(n.engine) === 'mini' ? 'gsap' : old.engine,
    focus: typeof n.focus === 'boolean' ? n.focus : old.focus,
    privacy: typeof n.privacy === 'boolean' ? n.privacy : old.privacy,
    reduced: typeof n.reduced === 'boolean' ? n.reduced : old.reduced,
    shape: n.shape === 'notch' || n.shape === 'capsule' ? n.shape : old.shape ?? 'notch',
    top: 0, // Migrate all older top-gap preferences to the primary-screen edge.
  };
}
export const sourceNames: Record<Source, string> = { LIS: '检验系统', HIS: '临床医嘱', PACS: '影像系统', NURSING: '护理协作', IT: '信息服务', OA: '院内协作' };
export const priorityNames: Record<Priority, string> = { critical: '危急', urgent: '紧急', routine: '普通' };
export const statusNames: Record<Receipt, string> = { unread: '未读', read: '已读', pending: '等待回执', acknowledged: '服务端已确认', failed: '回执未送达' };
