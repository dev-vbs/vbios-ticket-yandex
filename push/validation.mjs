import { timingSafeEqual } from 'node:crypto';

export function validSubscription(sub) {
  try {
    const url = new URL(sub.endpoint);
    const host = url.hostname;
    const allowed = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'updates.push.services.mozilla.org', 'web.push.apple.com'].includes(host)
      || host.endsWith('.push.apple.com') || host.endsWith('.notify.windows.com');
    return allowed && url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443')
      && sub.endpoint.length < 2048 && /^[A-Za-z0-9_-]{87}$/.test(sub.keys?.p256dh || '')
      && /^[A-Za-z0-9_-]{22}$/.test(sub.keys?.auth || '');
  } catch { return false; }
}
export function safePath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !/[\\\r\n]/.test(value) ? value.slice(0, 500) : '/notifications';
}
export function equalSecret(value, expected) {
  if (!expected || expected.length < 32 || typeof value !== 'string') return false;
  const a = Buffer.from(value), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
export function notification(body) {
  const payload = { title: String(body.title || 'vBios').slice(0, 80), body: String(body.body || ''),
    url: safePath(body.url), tag: String(body.tag || 'vbios').slice(0, 80),
    ...(Number.isSafeInteger(body.media_id) && body.media_id > 0 ? { media_id: body.media_id } : {}) };
  // Leave room for Web Push encryption overhead within a 4096-byte record.
  const fits = () => Buffer.byteLength(JSON.stringify(payload), 'utf8') <= 3800;
  if (fits()) return payload;

  const characters = Array.from(payload.body);
  const suffix = '…\nПолное сообщение в кабинете.';
  let low = 0;
  let high = characters.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    payload.body = characters.slice(0, middle).join('') + suffix;
    if (fits()) low = middle;
    else high = middle - 1;
  }
  payload.body = characters.slice(0, low).join('') + suffix;
  return payload;
}
