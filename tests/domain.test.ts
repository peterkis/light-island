import { describe, it, expect } from 'vitest';
import { chooseArrivalMode, defaultSettings, emptyModel, ingest, parseNotice, pending, sanitizeSettings, updateStatus } from '../src/lib/domain';
const raw = (extra: Record<string, unknown> = {}) => ({ id: 'one', revision: 1, source: 'LIS', priority: 'critical', title: '模拟事件', summary: '仅用于测试', context: '测试科室', createdAt: 1000, requiresAck: true, ...extra });
describe('event contract', () => {
  it('parses a bounded synthetic event', () => expect(parseNotice(raw())?.id).toBe('one'));
  it('rejects missing IDs', () => expect(parseNotice(raw({ id: '' }))).toBeNull());
  it('rejects unknown sources', () => expect(parseNotice(raw({ source: 'OTHER' }))).toBeNull());
  it('rejects unknown priorities', () => expect(parseNotice(raw({ priority: 'red' }))).toBeNull());
  it('rejects non-integer revisions', () => expect(parseNotice(raw({ revision: .3 }))).toBeNull());
  it('rejects unbounded text', () => expect(parseNotice(raw({ summary: 'x'.repeat(601) }))).toBeNull());
  it('requires explicit acknowledgement for critical events', () => expect(parseNotice(raw({ requiresAck: false }))?.requiresAck).toBe(true));
  it('does not acknowledge on receipt', () => expect(parseNotice(raw())?.status).toBe('unread'));
});
describe('queue and receipt boundaries', () => {
  it('deduplicates same id and revision', () => { const a = ingest(emptyModel(), raw()); const b = ingest(a, raw()); expect(b.items).toHaveLength(1); expect(b.duplicates).toBe(1); });
  it('rejects an old revision', () => { const a = ingest(emptyModel(), raw({ revision: 2 })); expect(ingest(a, raw()).items[0].revision).toBe(2); });
  it('a new critical revision requires acknowledgement again', () => { const a = updateStatus(ingest(emptyModel(), raw()), 'one', 1, 'acknowledged'); expect(ingest(a, raw({ revision: 2 })).items[0].status).toBe('unread'); });
  it('old acknowledgement cannot apply to newer revision', () => { const a = ingest(emptyModel(), raw({ revision: 2 })); expect(updateStatus(a, 'one', 1, 'acknowledged').items[0].status).toBe('unread'); });
  it('never merges distinct critical events', () => { const a = ingest(emptyModel(), raw({ groupKey: 'same' })); expect(ingest(a, raw({ id: 'two', groupKey: 'same' })).items).toHaveLength(2); });
  it('coalesces non-ack routine updates from the same source', () => { const r = raw({ priority: 'routine', requiresAck: false, source: 'IT', groupKey: 'ticket' }); const a = ingest(emptyModel(), r); const b = ingest(a, { ...r, id: 'two', createdAt: 2000 }); expect(b.items).toHaveLength(1); expect(b.items[0].count).toBe(2); });
  it('does not merge different sources', () => { const r = raw({ priority: 'routine', requiresAck: false, source: 'IT', groupKey: 'ticket' }); expect(ingest(ingest(emptyModel(), r), { ...r, id: 'two', source: 'OA' }).items).toHaveLength(2); });
  it('protects critical events at capacity and raises a gap', () => { let m = emptyModel(); for (let i = 0; i < 201; i++) m = ingest(m, raw({ id: String(i) })); expect(m.items).toHaveLength(200); expect(m.overflow).toBe(1); expect(m.items[0].id).toBe('0'); });
  it('evicts a completed event instead of pending critical', () => { let m = emptyModel(); for (let i = 0; i < 200; i++) m = ingest(m, raw({ id: String(i) })); m = updateStatus(m, '30', 1, 'acknowledged'); m = ingest(m, raw({ id: 'new' })); expect(m.items).toHaveLength(200); expect(m.overflow).toBe(0); expect(m.items.some(x => x.id === 'new')).toBe(true); });
  it('failed acknowledgements stay pending', () => { const m = updateStatus(ingest(emptyModel(), raw()), 'one', 1, 'failed'); expect(pending(m.items)).toHaveLength(1); });
});
describe('attention and preference rules', () => {
  it('critical opens even in focus mode', () => expect(chooseArrivalMode(parseNotice(raw())!, { ...defaultSettings, focus: true })).toBe('expanded'));
  it('routine stays quiet in focus mode', () => expect(chooseArrivalMode(parseNotice(raw({ priority: 'routine', requiresAck: false }))!, { ...defaultSettings, focus: true })).toBeNull());
  it('urgent events peek rather than disappearing', () => expect(chooseArrivalMode(parseNotice(raw({ priority: 'urgent' }))!, defaultSettings)).toBe('peek'));
  it('rejects unsafe preference values', () => expect(sanitizeSettings({ theme: '<script>', top: -999 }, defaultSettings)).toEqual({ ...defaultSettings, top: 0 }));
});
