import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import webpush from 'web-push';
import { validSubscription, equalSecret, notification } from './validation.mjs';

const env = process.env;
const enabled = env.WEB_PUSH_ENABLE === 'true';
const origin = env.PUSH_PUBLIC_ORIGIN || '';
if (enabled) {
  if (!/^https:\/\//.test(origin) || !env.PUSH_INTERNAL_TOKEN || env.PUSH_INTERNAL_TOKEN.length < 32) throw Error('Настройте PUSH_PUBLIC_ORIGIN и PUSH_INTERNAL_TOKEN');
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
}
const dataDir = env.PUSH_DATA_DIR || '/data';
mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(`${dataDir}/push.sqlite`);
db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS subscriptions (endpoint TEXT PRIMARY KEY,user_id INTEGER NOT NULL,subscription TEXT NOT NULL,updated_at INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS subscriptions_user ON subscriptions(user_id);');
const limits = new Map();
function rateLimit(key, interval) {
  const now = Date.now();
  if (limits.size > 10000) for (const [k, at] of limits) if (now - at > 60000) limits.delete(k);
  if (now - (limits.get(key) || 0) < interval) throw Object.assign(Error('Подождите перед повторной отправкой'), { status: 429 });
  limits.set(key, now);
}
async function readBody(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 8192) throw Object.assign(Error('Слишком большой запрос'), { status: 413 }); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString() || '{}'); } catch { throw Object.assign(Error('Некорректный JSON'), { status: 400 }); }
}
async function userId(req) {
  const session = req.headers.session_id || /(?:^|;\s*)session_id=([^;]+)/.exec(req.headers.cookie || '')?.[1];
  if (!session || !/^[A-Za-z0-9._~-]{10,512}$/.test(session)) throw Object.assign(Error('Войдите в кабинет'), { status: 401 });
  const headers = { cookie: `session_id=${session}`, 'user-agent': req.headers['user-agent'] || '' };
  if (req.headers['x-real-ip']) headers['x-forwarded-for'] = req.headers['x-real-ip'];
  const response = await fetch(`${env.SHM_URL || 'http://api'}/shm/v1/user`, { headers, signal: AbortSignal.timeout(8000), redirect: 'error' });
  const result = await response.json();
  const user = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!response.ok || result.error || !Number.isSafeInteger(Number(user?.user_id)) || Number(user.user_id) < 1) throw Object.assign(Error('Войдите в кабинет'), { status: 401 });
  return Number(user.user_id);
}
async function send(user, payload, endpoint) {
  const rows = endpoint ? db.prepare('SELECT * FROM subscriptions WHERE user_id=? AND endpoint=?').all(user, endpoint) : db.prepare('SELECT * FROM subscriptions WHERE user_id=?').all(user);
  let sent = 0, expired = 0, failed = 0;
  const errors = [];
  // Four concurrent deliveries bound both provider load and total response time.
  for (let start = 0; start < rows.length; start += 4) {
    await Promise.all(rows.slice(start, start + 4).map(async (row) => {
    try { await webpush.sendNotification(JSON.parse(row.subscription), JSON.stringify(payload), { TTL: 3600, timeout: 10000 }); sent++; }
    catch (error) {
      if ([404, 410].includes(error.statusCode)) { db.prepare('DELETE FROM subscriptions WHERE endpoint=?').run(row.endpoint); expired++; }
      else {
        failed++;
        const status = Number(error.statusCode) || 0;
        errors.push(status ? `HTTP ${status}` : 'ошибка соединения');
        console.error(`Push delivery failed (${status || 'network'})`);
      }
    }
    }));
  }
  return { sent, expired, failed, errors: [...new Set(errors)].slice(0, 5) };
}
export const server = createServer(async (req, res) => {
  const reply = (code, value) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  try {
    const path = new URL(req.url, 'http://push').pathname;
    if (path === '/health') return reply(200, { ok: true });
    if (path === '/push/config' && req.method === 'GET') return reply(200, { enabled, publicKey: enabled ? env.VAPID_PUBLIC_KEY : null });
    if (!enabled) return reply(503, { error: 'Push-уведомления пока не настроены' });
    if (path === '/internal/send' && req.method === 'POST') {
      if (!equalSecret(req.headers.authorization, `Bearer ${env.PUSH_INTERNAL_TOKEN}`)) return reply(403, { error: 'Доступ запрещён' });
      const body = await readBody(req), id = Number(body.user_id);
      if (!Number.isSafeInteger(id) || id < 1) return reply(400, { error: 'Неверный user_id' });
      rateLimit(`send:${id}`, 1000);
      return reply(200, await send(id, notification(body)));
    }
    if (!['/push/subscriptions', '/push/test'].includes(path)) return reply(404, { error: 'Не найдено' });
    if (req.method !== 'GET' && req.headers.origin !== origin) return reply(403, { error: 'Недопустимый источник запроса' });
    const id = await userId(req);
    if (path === '/push/subscriptions' && req.method === 'GET') {
      const endpoint = new URL(req.url, 'http://push').searchParams.get('endpoint');
      return reply(200, { subscribed: !!db.prepare('SELECT 1 FROM subscriptions WHERE user_id=? AND endpoint=?').get(id, endpoint || '') });
    }
    const body = await readBody(req);
    if (path === '/push/subscriptions' && req.method === 'POST') {
      if (!validSubscription(body)) return reply(400, { error: 'Неподдерживаемый адрес push-службы или ключи' });
      const exists = db.prepare('SELECT 1 FROM subscriptions WHERE user_id=? AND endpoint=?').get(id, body.endpoint);
      if (!exists && db.prepare('SELECT COUNT(*) AS count FROM subscriptions WHERE user_id=?').get(id).count >= 20) return reply(409, { error: 'Достигнут лимит 20 устройств' });
      const sub = { endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } };
      db.prepare('INSERT INTO subscriptions VALUES (?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET user_id=excluded.user_id,subscription=excluded.subscription,updated_at=excluded.updated_at').run(sub.endpoint, id, JSON.stringify(sub), Date.now());
      return reply(200, { subscribed: true });
    }
    if (path === '/push/subscriptions' && req.method === 'DELETE') {
      db.prepare('DELETE FROM subscriptions WHERE user_id=? AND endpoint=?').run(id, String(body.endpoint || ''));
      return reply(200, { subscribed: false });
    }
    if (path === '/push/test' && req.method === 'POST') {
      rateLimit(`test:${id}`, 30000);
      return reply(200, await send(id, notification({ title: 'Уведомления включены', body: 'Это тестовое сообщение vBios. Ваше устройство готово получать уведомления.', url: '/notifications' }), String(body.endpoint || '')));
    }
    return reply(405, { error: 'Метод не поддерживается' });
  } catch (error) { reply(error.status || 502, { error: error.status ? error.message : 'Не удалось выполнить запрос push-службы' }); }
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.listen(Number(env.PORT || 8090), '0.0.0.0', () => console.log('Push-служба запущена'));
