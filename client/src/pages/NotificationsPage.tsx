import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Loader, Stack, Text, Title, Switch } from '@mantine/core';
import { IconBell, IconMessageCircle } from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { userApi } from '../api/client';

type Service = { user_service_id: number; status: string; expire?: string; name?: string; service?: { name?: string; cost?: number } };
type Preferences = { expiry: boolean; balance: boolean; support: boolean };
export default function NotificationsPage() {
  const hasReply = useStore(s => s.hasNewTicketMessages);
  const user = useStore(s => s.user);
  const preferenceKey = `shm_notice_preferences_${user?.user_id ?? 'guest'}`;
  const [preferences, setPreferences] = useState<Preferences>({ expiry: true, balance: true, support: true });
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    try { const value = JSON.parse(localStorage.getItem(preferenceKey) || '{}'); setPreferences({ expiry: value.expiry !== false, balance: value.balance !== false, support: value.support !== false }); } catch { /* Defaults if browser storage is unavailable. */ }
  }, [preferenceKey]);
  const change = (key: keyof Preferences, enabled: boolean) => {
    const next = { ...preferences, [key]: enabled }; setPreferences(next);
    try { localStorage.setItem(preferenceKey, JSON.stringify(next)); } catch { /* Current session remains usable. */ }
  };
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const r = await userApi.getServices();
      if (!Array.isArray(r.data?.data)) throw new Error('Invalid response');
      setServices(r.data.data);
    } catch { setFailed(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); window.addEventListener('online', load); return () => window.removeEventListener('online', load); }, [load]);
  const relevant = services.filter(s => ['ACTIVE', 'NOT PAID', 'BLOCK'].includes(s.status));
  const notices = preferences.expiry ? relevant.filter(s => s.status === 'NOT PAID' || s.status === 'BLOCK' || (s.expire && Number.isFinite(Date.parse(s.expire)) && Date.parse(s.expire) - Date.now() < 3 * 86400000)) : [];
  const lowBalance = preferences.balance && relevant.some(s => Number(s.service?.cost) > Number(user?.balance ?? 0));
  const showReply = preferences.support && hasReply;
  return <Stack gap="xl"><header><Title order={1}>Уведомления</Title><Text c="dimmed" mt="sm">Сроки услуг, баланс и ответы поддержки.</Text></header>
    <section className="vpn-finance-panel"><Stack gap="md"><Title order={3}>Какие события показывать</Title><Text size="sm" c="dimmed">Настройки действуют в этом браузере для вашего аккаунта. Они не изменяют рассылки Telegram и email.</Text>{([['expiry', 'Окончание подписки и необходимость оплаты'], ['balance', 'Недостаточно средств для продления'], ['support', 'Ответы поддержки']] as const).map(([key, label]) => <Switch key={key} label={label} checked={preferences[key]} onChange={event => change(key, event.currentTarget.checked)} />)}</Stack></section>
    {failed && <Alert color="orange">Не удалось обновить события. Ранее загруженные данные сохранены.<Button display="block" mt="sm" size="xs" onClick={() => void load()}>Повторить</Button></Alert>}
    {loading && !services.length ? <Loader /> : <section className="vpn-finance-panel"><Stack gap="md">{showReply && <Link className="vpn-notice" to="/tickets"><IconMessageCircle /><div><strong>Новый ответ поддержки</strong><small>Прочитать сообщение →</small></div></Link>}{lowBalance && <Link className="vpn-notice" to="/balance"><IconBell /><div><strong>Проверьте баланс перед продлением</strong><small>Текущего баланса может не хватить на следующий период одной из услуг. Пополнить баланс →</small></div></Link>}{notices.map(s => <Link className="vpn-notice" key={s.user_service_id} to={`/services/${s.user_service_id}`}><IconBell /><div><strong>{s.service?.name || s.name || `Услуга #${s.user_service_id}`}</strong><small>{s.status === 'NOT PAID' ? 'Услуга ожидает оплаты. Оплатить →' : s.status === 'BLOCK' ? 'Услуга заблокирована. Проверить →' : 'Срок действия заканчивается или уже истёк. Продлить →'}</small></div></Link>)}{!failed && !showReply && !lowBalance && !notices.length && <Stack align="center" py={48}><IconBell size={36} /><Title order={3}>Всё спокойно</Title><Text c="dimmed" ta="center">Нет выбранных событий, требующих вашего внимания.</Text><Button component={Link} to="/services" variant="light">Мои услуги</Button></Stack>}</Stack></section>}</Stack>;
}
