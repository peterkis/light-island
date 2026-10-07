/** Loopback-only synthetic message source. Never point this demo at clinical systems. */
import http from 'node:http';
import { createClinicalDemo } from './clinical-demo.mjs';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.ISLAND_DEMO_PORT || 17321);
const origins = new Set(['http://127.0.0.1:17322', 'http://localhost:17322','http://127.0.0.1:17321', 'http://localhost:17321', 'http://127.0.0.1:1420', 'http://localhost:1420', 'http://tauri.localhost', 'tauri://localhost', 'https://tauri.localhost']);
const notices = new Map(); const receipts = new Map(); const timers = new Set();
let settings = { theme: 'ink', engine: 'gsap', focus: false, privacy: true, reduced: false, top: 0, shape: 'notch' };
let sequence = 0; let epoch = 0;
const json = (res, code, body) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
const schedule = (callback, delay) => { const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay); timers.add(timer); };
const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !origins.has(origin)) return json(res, 403, { error: 'Origin not allowed in this loopback demo' });
  if (origin) { res.setHeader('Access-Control-Allow-Origin', origin); res.setHeader('Vary', 'Origin'); }
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url || '/', `http://127.0.0.1:${port}`);
  if (url.pathname === '/api/health') return json(res, 200, { name: 'samewave-synthetic-demo', version: '0.1.0', clients: wss.clients.size, notices: notices.size });
  if (url.pathname === '/api/clinical-state') return json(res, 200, clinical.snapshot());
  if (url.pathname === '/api/state') return json(res, 200, { settings, notices: [...notices.values()], receipts: [...receipts.values()] });
  if (url.pathname === '/api/push' && req.method === 'POST') {
    if (!req.headers['content-type']?.startsWith('application/json')) return json(res, 415, { error: 'JSON required' });
    let body = ''; let tooLarge = false;
    req.on('data', data => { if (tooLarge) return; body += data.toString(); if (body.length > 32768) { tooLarge = true; json(res, 413, { error: 'Payload too large' }); req.destroy(); } });
    req.on('end', () => { if (tooLarge) return; try { const payload = JSON.parse(body); handle(payload); json(res, 202, { accepted: true, prototypeOnly: true }); } catch { json(res, 400, { error: 'Invalid payload' }); } });
    return;
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  try {
    const path = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!path.startsWith(root + '/'.replace('/', process.platform === 'win32' ? '\\' : '/')) && path !== resolve(root, 'index.html')) return json(res, 403, { error: 'Invalid path' });
    const bytes = await readFile(path);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }); res.end(bytes);
  } catch { json(res, 404, { error: 'Build UI with npm run build, or use http://127.0.0.1:1420 in development.' }); }
});
const clinical = createClinicalDemo(broadcast);
const wss = new WebSocketServer({ noServer: true, maxPayload: 32768 });
server.on('upgrade', (req, socket, head) => {
  if ((req.headers.origin && !origins.has(req.headers.origin)) || req.url !== '/events') { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws, req));
});
function broadcast(event) {
  const data = JSON.stringify(event);
  for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) {
    // A lagging client is disconnected explicitly and will replay on reconnect.
    if (client.bufferedAmount > 262144) client.close(1013, 'Slow consumer; reconnect to replay'); else client.send(data);
  }
}
function notice(source, priority, title, summary, extra = {}) {
  const event = { id: `demo-${++sequence}-${randomUUID().slice(0, 8)}`, revision: 1, source, priority, title, summary, context: '院内协作', createdAt: Date.now(), requiresAck: priority !== 'routine', ...extra };
  notices.set(event.id, event);
  if (notices.size > 400) { const disposable = [...notices.values()].find(n => !n.requiresAck || receipts.has(n.id)); if (disposable) notices.delete(disposable.id); else { notices.delete(event.id); broadcast({ type: 'server-error', reason: 'Synthetic critical buffer full; event not delivered' }); return null; } }
  broadcast({ type: 'notice', notice: event }); return event;
}
function scenario(name) {
  if (name === 'report') return notice('PACS', 'routine', '影像报告已就绪', '新的影像报告已发布。可在原工作站查看，不必立即切换当前任务。', { patient: '李** · 12 床（模拟）', context: '心血管内科', threadId: 'patient-demo-012' });
  if (name === 'critical') return notice('LIS', 'critical', '检验危急值已发布', '有一项检验结果需要当班人员核对。请进入 LIS 查看原始报告，并按院内流程处理。', { patient: '王** · 06 床（模拟）', context: '心血管内科', threadId: 'patient-demo-006' });
  if (name === 'unstable') return notice('HIS', 'urgent', '新的病危医嘱已发布', '患者相关医嘱状态已更新，请相关岗位在源系统核对，并完成交接。此处仅记录收到回执。', { patient: '王** · 06 床（模拟）', context: '心血管内科', threadId: 'patient-demo-006' });
  if (name === 'service') return notice('IT', 'routine', '你报修的打印服务已恢复', '信息服务台已完成处理。原工作站可继续打印，处理过程已同步到工单。', { context: '门诊服务 · 工单 IT-2026-0421', groupKey: 'ticket-demo-0421', threadId: 'ticket-demo-0421' });
  if (name === 'consult') return notice('NURSING', 'urgent', '协作交接等待确认', '上一班次已补充交接内容，请当班同事在护理工作站核对。', { context: '心血管内科', patient: '王** · 06 床（模拟）', threadId: 'patient-demo-006' });
  if (name === 'burst') { for (let i = 0; i < 12; i++) schedule(() => notice('IT', 'routine', `打印服务进度已更新 · ${i + 1}/12`, '同一工单的连续更新被归为一组，避免十二次独立弹窗。', { context: '门诊服务 · 连续更新演示', groupKey: 'burst-demo', threadId: 'burst-demo' }), i * 160); return; }
  if (name === 'journey') {
    scenario('report'); schedule(() => scenario('critical'), 2300);
    schedule(() => notice('HIS', 'urgent', '临床团队已更新关注事项', '与检验提醒属于同一模拟患者上下文。源系统中的处理仍由相应岗位完成。', { context: '心血管内科', patient: '王** · 06 床（模拟）', threadId: 'patient-demo-006' }), 5200);
    schedule(() => notice('NURSING', 'routine', '护理交接信息已同步', '交接白板已接收到同一患者的上下文更新。可在协作脉络中查看关联事件。', { context: '心血管内科', patient: '王** · 06 床（模拟）', threadId: 'patient-demo-006' }), 8800);
    schedule(() => scenario('service'), 11000); return;
  }
  throw new Error('Unknown demo scenario');
}
function configure(patch) {
  if (!patch || typeof patch !== 'object') return;
  if (['ink', 'cloud', 'dusk'].includes(patch.theme)) settings.theme = patch.theme;
  if (['gsap', 'mini', 'css'].includes(patch.engine)) settings.engine = patch.engine === 'mini' ? 'gsap' : patch.engine;
  if (['notch', 'capsule'].includes(patch.shape)) settings.shape = patch.shape;
  for (const key of ['focus', 'privacy', 'reduced']) if (typeof patch[key] === 'boolean') settings[key] = patch[key];
  settings.top = 0; // Fixed top docking, including clients with older preferences.
  broadcast({ type: 'settings', settings });
}
function handle(data, client) {
  if (!data || typeof data !== 'object') return;
  if (clinical.handle(data, event => client?.send(JSON.stringify(event)))) return;
  if (data.type === 'sync') client?.send(JSON.stringify({ type: 'hello', settings, notices: [...notices.values()], receipts: [...receipts.values()] }));
  if (data.type === 'demo') scenario(data.scenario);
  if (data.type === 'configure') configure(data.settings);
  if (data.type === 'reset') { epoch++; timers.forEach(clearTimeout); timers.clear(); notices.clear(); receipts.clear(); broadcast({ type: 'reset' }); }
  if (data.type === 'view' && ['compact', 'inbox', 'expanded', 'thread'].includes(data.mode)) broadcast(data);
  if (data.type === 'ack') {
    const n = notices.get(data.id);
    if (!n || n.revision !== data.revision || typeof data.ackId !== 'string') return;
    const old = receipts.get(n.id); const nowEpoch = epoch;
    if (old) { client?.send(JSON.stringify({ type: 'receipt', ...old })); return; }
    schedule(() => { if (epoch !== nowEpoch) return; const r = { id: n.id, revision: n.revision, ackId: data.ackId, receivedAt: Date.now(), kind: 'received-not-treated' }; receipts.set(n.id, r); broadcast({ type: 'receipt', ...r }); }, 700);
  }
}
wss.on('connection', client => {
  client.send(JSON.stringify({ type: 'hello', settings, notices: [...notices.values()], receipts: [...receipts.values()] }));
  client.on('message', raw => { try { handle(JSON.parse(raw.toString()), client); } catch { client.send(JSON.stringify({ type: 'server-error', reason: 'Unsupported demo command' })); } });
  client.on('error', () => {});
});
server.listen(port, '127.0.0.1', () => console.log(`Samewave synthetic demo: http://127.0.0.1:${port}\nWebSocket: ws://127.0.0.1:${port}/events\nNo clinical systems connected. Memory-only synthetic events.`));
server.on('error', e => { console.error(e.message); process.exitCode = 1; });
process.on('SIGINT', () => { timers.forEach(clearTimeout); wss.clients.forEach(c => c.close()); wss.close(); server.close(); });
