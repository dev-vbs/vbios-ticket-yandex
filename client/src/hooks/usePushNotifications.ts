import { useEffect, useState } from 'react';
import { getCookie } from '../api/cookie';

type PushConfig = { enabled: boolean; publicKey?: string };
async function request(path: string, method = 'GET', body?: object) {
  const session = getCookie();
  const response = await fetch(`/push/${path}`, { method, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...(session ? { session_id: session } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Не удалось связаться со службой уведомлений');
  return data;
}
async function registration() {
  return Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Приложение ещё обновляется. Перезагрузите страницу и попробуйте снова.')), 10000))]);
}
function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const value = atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4));
  return Uint8Array.from(value, (c) => c.charCodeAt(0));
}
export function usePushNotifications() {
  const supported = typeof window !== 'undefined' && window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const [settings, setSettings] = useState<PushConfig>({ enabled: false });
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void request('config').then(async (data: PushConfig) => {
      if (!active) return;
      setSettings(data);
      if (!supported || !data.enabled) return;
      const reg = await registration(), sub = await reg.pushManager.getSubscription();
      if (sub) { const status = await request(`subscriptions?endpoint=${encodeURIComponent(sub.endpoint)}`); if (active) setIsSubscribed(status.subscribed); }
    }).catch(() => { /* Optional service: regular cabinet remains available. */ });
    return () => { active = false; };
  }, [supported]);
  const run = async (action: () => Promise<void>) => {
    setIsLoading(true); setError(null); setMessage(null);
    try { await action(); return true; } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось выполнить действие'); return false; }
    finally { setIsLoading(false); }
  };
  const subscribe = () => run(async () => {
    if (!supported || !settings.enabled || !settings.publicKey) throw Error('Уведомления недоступны на этом устройстве или не настроены на сервере.');
    // Permission must be requested in the user click handler, particularly on iOS.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw Error('Уведомления не разрешены. Измените разрешение в настройках браузера или приложения.');
    const reg = await registration();
    let sub = await reg.pushManager.getSubscription();
    const created = !sub;
    sub ||= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(settings.publicKey) });
    try { await request('subscriptions', 'POST', sub.toJSON()); }
    catch (e) { if (created) await sub.unsubscribe(); throw e; }
    setIsSubscribed(true); setMessage('Это устройство подписано на уведомления вашего аккаунта.');
  });
  const unsubscribe = () => run(async () => {
    const sub = await (await registration()).pushManager.getSubscription();
    if (sub) { await request('subscriptions', 'DELETE', { endpoint: sub.endpoint }); await sub.unsubscribe(); }
    setIsSubscribed(false); setMessage('Уведомления на этом устройстве отключены.');
  });
  const test = () => run(async () => {
    const sub = await (await registration()).pushManager.getSubscription();
    if (!sub) throw Error('Сначала включите уведомления.');
    const result = await request('test', 'POST', { endpoint: sub.endpoint });
    if (!result.sent) throw Error(result.expired ? 'Подписка устарела. Отключите уведомления и включите их заново.' : 'Push-служба не подтвердила отправку. Проверьте ключи VAPID на сервере.');
    setMessage('Тест передан push-службе. Проверьте уведомления устройства и режим «Не беспокоить».');
  });
  return { isEnabled: settings.enabled, isSupported: supported && settings.enabled, browserSupported: supported, isSubscribed, isLoading, error, message, subscribe, unsubscribe, test };
}
