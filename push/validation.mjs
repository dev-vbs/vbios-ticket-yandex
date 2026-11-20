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
  return { title: String(body.title || 'vBios').slice(0, 80), body: String(body.body || '').slice(0, 300),
    url: safePath(body.url), tag: String(body.tag || 'vbios').slice(0, 80) };
}
