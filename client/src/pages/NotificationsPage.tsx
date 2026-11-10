import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, Loader, Stack, Text, Title } from '@mantine/core';
import { IconBell, IconMessageCircle } from '@tabler/icons-react';
import { useStore } from '../store/useStore';
import { userApi } from '../api/client';
type Service = { user_service_id: number; status: string; expire?: string; name?: string; service?: { name?: string } };
export default function NotificationsPage() {
  const hasReply = useStore(s => s.hasNewTicketMessages);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    void userApi.getServices().then(r => {
      if (!Array.isArray(r.data?.data)) throw new Error('Invalid response');
      if (active) setServices(r.data.data);
    }).catch(() => { if (active) setFailed(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const notices = services.filter(s => s.status === 'NOT PAID' || s.status === 'BLOCK' || (s.expire && Number.isFinite(Date.parse(s.expire)) && Date.parse(s.expire) - Date.now() < 3 * 86400000));
  return <Stack gap="xl"><header><Title order={1}>Уведомления</Title><Text c="dimmed" mt="sm">Текущее состояние услуг и непрочитанные ответы поддержки.</Text></header>{loading ? <Loader /> : failed ? <Alert color="red">Не удалось загрузить события. Обновите страницу.</Alert> : <section className="vpn-finance-panel"><Stack gap="md">{hasReply && <Link className="vpn-notice" to="/tickets"><IconMessageCircle /><div><strong>Новый ответ поддержки</strong><small>Откройте обращение, чтобы прочитать сообщение.</small></div></Link>}{notices.map(s => <Link className="vpn-notice" key={s.user_service_id} to={`/services/${s.user_service_id}`}><IconBell /><div><strong>{s.service?.name || s.name || `Услуга #${s.user_service_id}`}</strong><small>{s.status === 'NOT PAID' ? 'Услуга ожидает оплаты.' : s.status === 'BLOCK' ? 'Услуга заблокирована. Проверьте баланс и статус.' : 'Срок действия заканчивается или уже истёк.'}</small></div></Link>)}{!hasReply && !notices.length && <Stack align="center" py={48}><IconBell size={36} /><Title order={3}>Всё спокойно</Title><Text c="dimmed" ta="center">Сейчас нет событий, требующих вашего внимания.</Text><Button component={Link} to="/services" variant="light">Открыть мой VPN</Button></Stack>}</Stack></section>}</Stack>;
}
