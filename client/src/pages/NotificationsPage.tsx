import PushSettings from '../components/PushSettings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Loader, Stack, Text, Title, Switch, Group } from '@mantine/core';
import { IconBell, IconMessageCircle } from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { api, userApi } from '../api/client';
import { config } from '../config';
const proxyCategories = new Set((config.PROXY_CATEGORY || 'proxy').toLowerCase().split(/[,\s]+/));

type Service = { user_service_id: number; status: string; expire?: string; name?: string; service?: { name?: string; cost?: number; category?: string } };
type Preferences = { expiry: boolean; balance: boolean; support: boolean; traffic: boolean; devices: boolean };
type CabinetNotice = { id: string; title: string; body: string; url?: string; created?: string };
export default function NotificationsPage() {
  const hasReply = useStore(s => s.hasNewTicketMessages);
  const user = useStore(s => s.user);
  const preferenceKey = `shm_notice_preferences_${user?.user_id ?? 'guest'}`;
  const [preferences, setPreferences] = useState<Preferences>({ expiry: true, balance: true, support: true, traffic: true, devices: true });
  const [remnaNotices, setRemnaNotices] = useState<{serviceId: number; name: string; kind: string; text: string}[]>([]);
  const [remnaFailed, setRemnaFailed] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [cabinetNotices, setCabinetNotices] = useState<CabinetNotice[]>([]);
  const [broadcastsEnabled, setBroadcastsEnabled] = useState(true);
  const [broadcastsBusy, setBroadcastsBusy] = useState(false);
  const [broadcastsError, setBroadcastsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const loadId = useRef(0);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem(preferenceKey) || '{}'); setPreferences({ expiry: value.expiry !== false, balance: value.balance !== false, support: value.support !== false, traffic: value.traffic !== false, devices: value.devices !== false }); } catch { /* Defaults if browser storage is unavailable. */ }
  }, [preferenceKey]);
  const change = (key: keyof Preferences, enabled: boolean) => {
    const next = { ...preferences, [key]: enabled }; setPreferences(next);
    try { localStorage.setItem(preferenceKey, JSON.stringify(next)); } catch { /* Current session remains usable. */ }
  };
  const changeBroadcasts = async (enabled: boolean) => {
    setBroadcastsBusy(true);
    setBroadcastsError(false);
    try { await api.post('/user/notifications/settings', { enabled }); setBroadcastsEnabled(enabled); }
    catch { setBroadcastsError(true); }
    finally { setBroadcastsBusy(false); }
  };
  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true); setFailed(false);
    try {
      const [servicesResult, noticeResult] = await Promise.allSettled([userApi.getServices(), api.get('/user/notifications')]);
      if (id !== loadId.current) return;
      if (noticeResult.status === 'fulfilled') {
        const data = noticeResult.value.data?.data;
        const noticeData = Array.isArray(data) ? data[0] : data;
        if (noticeData && Array.isArray(noticeData.notifications)) {
          setCabinetNotices(noticeData.notifications);
          setBroadcastsEnabled(noticeData.broadcasts_enabled !== 0 && noticeData.broadcasts_enabled !== false);
          setBroadcastsError(false);
        } else setBroadcastsError(true);
      } else setBroadcastsError(true);
      if (servicesResult.status !== 'fulfilled' || !Array.isArray(servicesResult.value.data?.data)) throw new Error('Invalid services response');
      const r = servicesResult.value;
      setServices(r.data.data);
      setRemnaNotices([]); setRemnaFailed(false);
      const queue: Service[] = r.data.data.filter((s: Service) => s.status === 'ACTIVE' && (proxyCategories.has((s.service?.category || '').toLowerCase()) || /proxy|remna/i.test(s.service?.category || '')));
      const found: {serviceId: number; name: string; kind: string; text: string}[] = [];
      let cursor = 0;
      await Promise.all(Array.from({length: Math.min(2, queue.length)}, async () => {
        while (cursor < queue.length && id === loadId.current) {
          const service = queue[cursor++];
          try {
            const response = await api.get('/user/service/remnawave', {params: {user_service_id: service.user_service_id, section: 'diagnostics'}});
            const body = response.data?.data?.[0];
            if (!Array.isArray(body?.notices)) throw new Error('Invalid notices');
            for (const notice of body.notices) if (notice.kind === 'traffic' || notice.kind === 'device') found.push({serviceId: service.user_service_id, name: service.service?.name || service.name || 'Подписка', kind: notice.kind, text: notice.text});
          } catch { if (id === loadId.current) setRemnaFailed(true); }
        }
      }));
      if (id === loadId.current) setRemnaNotices(found);
    } catch { if (id === loadId.current) setFailed(true); } finally { if (id === loadId.current) setLoading(false); }
  }, []);
  useEffect(() => { void load(); window.addEventListener('online', load); return () => { loadId.current++; window.removeEventListener('online', load); }; }, [load]);
  const relevant = services.filter(s => ['ACTIVE', 'NOT PAID', 'BLOCK'].includes(s.status));
  const notices = preferences.expiry ? relevant.filter(s => s.status === 'NOT PAID' || s.status === 'BLOCK' || (s.expire && Number.isFinite(Date.parse(s.expire)) && Date.parse(s.expire) - Date.now() < 3 * 86400000)) : [];
  const lowBalance = preferences.balance && relevant.some(s => Number(s.service?.cost) > Number(user?.balance ?? 0));
  const visibleRemna = remnaNotices.filter(n => n.kind === 'traffic' ? preferences.traffic : preferences.devices);
  const showReply = preferences.support && hasReply;
  return <Stack gap="xl"><header><Title order={1}>Уведомления</Title><Text c="dimmed" mt="sm">Сроки услуг, новости из Telegram и ответы поддержки.</Text></header>
    <PushSettings />
    {broadcastsError && <Alert color="orange">Не удалось загрузить рассылки или сохранить настройку. Попробуйте ещё раз.<Button display="block" mt="sm" size="xs" onClick={() => void load()}>Повторить</Button></Alert>}
    <section className="vpn-finance-panel"><Group justify="space-between" align="flex-start"><div><Title order={3}>Рассылки в кабинете</Title><Text size="sm" c="dimmed" mt={5}>Новости из Telegram и spool будут видны в разделе уведомлений.</Text></div><Switch checked={broadcastsEnabled} disabled={broadcastsBusy} onChange={event => void changeBroadcasts(event.currentTarget.checked)} aria-label="Получать рассылки в личном кабинете" /></Group></section>
    <section className="vpn-finance-panel"><Stack gap="md"><Title order={3}>Какие события показывать</Title><Text size="sm" c="dimmed">Настройки действуют в этом браузере для вашего аккаунта. Они не изменяют рассылки Telegram и email.</Text>{([['expiry', 'Окончание подписки и необходимость оплаты'], ['balance', 'Недостаточно средств для продления'], ['support', 'Ответы поддержки'], ['traffic', 'Приближение к лимиту трафика'], ['devices', 'Новые устройства подписки']] as const).map(([key, label]) => <Switch key={key} label={label} checked={preferences[key]} onChange={event => change(key, event.currentTarget.checked)} />)}</Stack></section>
    <Text size="sm" c="dimmed">Данные подписки проверяются при открытии этой страницы. Новые устройства определяются относительно предыдущей проверки; при первом посещении создаётся исходный список.</Text>
    {loading && services.length > 0 && <Group gap="xs"><Loader size="xs"/><Text size="sm" c="dimmed">Проверяем подписки…</Text></Group>}
    {remnaFailed && <Alert color="orange">Не все подписки удалось проверить. Откройте нужную услугу для диагностики.</Alert>}
    {failed && <Alert color="orange">Не удалось обновить события. Ранее загруженные данные сохранены.<Button display="block" mt="sm" size="xs" onClick={() => void load()}>Повторить</Button></Alert>}
    {loading && !services.length ? <Loader /> : <section className="vpn-finance-panel"><Stack gap="md">{cabinetNotices.map(n => <Link className="vpn-notice" key={n.id} to={n.url || '/notifications'}><IconBell /><div><strong>{n.title}</strong><small>{n.body}</small></div></Link>)}{showReply && <Link className="vpn-notice" to="/tickets"><IconMessageCircle /><div><strong>Новый ответ поддержки</strong><small>Прочитать сообщение →</small></div></Link>}{lowBalance && <Link className="vpn-notice" to="/balance"><IconBell /><div><strong>Проверьте баланс перед продлением</strong><small>Текущего баланса может не хватить на следующий период одной из услуг. Пополнить баланс →</small></div></Link>}{visibleRemna.map((n, i) => <Link className="vpn-notice" key={`${n.serviceId}-${n.kind}-${i}`} to={`/services/${n.serviceId}`}><IconBell /><div><strong>{n.name}</strong><small>{n.text}</small></div></Link>)}{notices.map(s => <Link className="vpn-notice" key={s.user_service_id} to={`/services/${s.user_service_id}`}><IconBell /><div><strong>{s.service?.name || s.name || `Услуга #${s.user_service_id}`}</strong><small>{s.status === 'NOT PAID' ? 'Услуга ожидает оплаты. Оплатить →' : s.status === 'BLOCK' ? 'Услуга заблокирована. Проверить →' : 'Срок действия заканчивается или уже истёк. Продлить →'}</small></div></Link>)}{!loading && !failed && !showReply && !lowBalance && !notices.length && !visibleRemna.length && !remnaFailed && !cabinetNotices.length && <Stack align="center" py={48}><IconBell size={36} /><Title order={3}>Всё спокойно</Title><Text c="dimmed" ta="center">Нет выбранных событий, требующих вашего внимания.</Text><Button component={Link} to="/services" variant="light">Мои услуги</Button></Stack>}</Stack></section>}</Stack>;
}
