import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Group, Loader, Paper, Stack, Text, Progress } from '@mantine/core';
import { IconDeviceMobile, IconRefresh, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api, userApi } from '../api/client';
import ConfirmModal from './ConfirmModal';
import './HwidDevices.css';

type Device = { hwid: string; deviceModel?: string; platform?: string; osVersion?: string; userAgent?: string; lastConnectedAt?: string; lastSeenAt?: string; createdAt?: string };
type Stats = { used_bytes?: number | null; lifetime_bytes?: number | null; limit_bytes?: number | null; online_at?: string | null; first_connected_at?: string | null; last_subscription_at?: string | null };
const when = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString() : 'Нет данных';
const bytes = (value?: number | null) => value != null && Number.isFinite(Number(value)) ? `${(Number(value) / 1073741824).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ГБ` : 'Нет данных';
function payload(body: unknown): Record<string, unknown> {
  let value: any = body;
  for (let i = 0; i < 5; i++) {
    if (Array.isArray(value)) value = value[0];
    if (!value || typeof value !== 'object') return {};
    if ('devices' in value || 'ok' in value || 'used_bytes' in value) return value;
    value = value.data ?? value.response;
  }
  return {};
}
export default function HwidDevices({ serviceId }: { serviceId: number }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revision, setRevision] = useState(0);
  const [limit, setLimit] = useState<number | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsError, setStatsError] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setStats(null); setStatsError(false); setStatsLoading(true);
    void api.get('/user/service/connection-stats', { params: { user_service_id: serviceId } }).then(response => {
      const data = payload(response.data);
      if (!('used_bytes' in data)) throw new Error('Invalid statistics');
      if (active) setStats(data as Stats);
    }).catch(() => { if (active) setStatsError(true); }).finally(() => { if (active) setStatsLoading(false); });
    return () => { active = false; };
  }, [serviceId, revision]);
  const load = useCallback(() => setRevision(v => v + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setDevices([]); setSelected(null);
    void userApi.getHwid(serviceId).then(response => {
      const data = payload(response.data);
      if (!Array.isArray(data.devices)) throw new Error('Не удалось получить список устройств');
      if (active) {
        setDevices(data.devices.filter((d: Device) => d && typeof d.hwid === 'string'));
        setLimit(typeof data.limit === 'number' ? data.limit : null);
      }
    }).catch(() => { if (active) setError('Не удалось загрузить устройства. Проверьте подключение или обратитесь в поддержку.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [serviceId, revision]);
  const remove = async () => {
    if (!selected || deleting) return;
    setDeleting(true);
    try {
      const response = await userApi.deleteHwid(serviceId, selected.hwid);
      if (!payload(response.data).ok) throw new Error('Удаление не подтверждено');
      setSelected(null); load();
      notifications.show({ color: 'green', message: 'Привязка устройства удалена. Оно может зарегистрироваться повторно при следующем подключении.' });
    } catch (error) {
      const body = (error as { response?: { data?: any } })?.response?.data;
      const detail = body?.error || body?.errors?.[0]?.message || body?.errors?.[0];
      const message = typeof detail === 'string' ? detail.replace(/ at \/app\/[^\n]+/g, '') : 'API не подтвердил удаление устройства. Обратитесь в поддержку.';
      notifications.show({ color: 'red', title: 'Не удалось сбросить HWID', message });
    }
    finally { setDeleting(false); }
  };
  return <Paper withBorder p="md" radius="md" className="hwid-panel">
    <Group className="hwid-panel-header" justify="space-between" wrap="wrap" gap="sm"><div><Group gap="xs"><IconDeviceMobile size={22} /><Text component="h2" className="hwid-panel-title" fw={650}>Центр устройств</Text></Group><Text size="sm" c="dimmed" mt={6}>Просматривайте подключённые устройства и расход трафика. Чтобы освободить место для нового устройства, сбросьте его HWID-привязку.</Text></div><Button size="xs" variant="light" loading={loading || statsLoading} disabled={deleting} onClick={load} leftSection={<IconRefresh size={15} />}>Обновить</Button></Group>
    {statsLoading ? <Text mt="sm" size="xs" c="dimmed">Загружаем статистику…</Text> : statsError ? <Alert mt="sm" color="orange">Статистика Remnawave недоступна. Список устройств загружается отдельно.</Alert> : stats && <>
      <div className="hwid-stats">
        <div><Text size="xs" c="dimmed">Трафик за текущий период</Text><Text fw={600}>{bytes(stats.used_bytes)}</Text></div>
        <div><Text size="xs" c="dimmed">Лимит трафика</Text><Text fw={600}>{stats.limit_bytes === 0 ? 'Без ограничений' : bytes(stats.limit_bytes)}</Text></div>
        <div><Text size="xs" c="dimmed">За всё время</Text><Text fw={600}>{bytes(stats.lifetime_bytes)}</Text></div>
        <div><Text size="xs" c="dimmed">Последнее подключение подписки</Text><Text size="sm">{when(stats.online_at)}</Text></div>
        <div><Text size="xs" c="dimmed">Первое подключение</Text><Text size="sm">{when(stats.first_connected_at)}</Text></div>
        <div><Text size="xs" c="dimmed">Обновление подписки в приложении</Text><Text size="sm">{when(stats.last_subscription_at)}</Text></div>
      </div>
      {stats.used_bytes != null && stats.limit_bytes != null && stats.limit_bytes > 0 && <Stack gap={5} mt="sm"><Text size="xs" c="dimmed">Использование трафика · {Math.round(Number(stats.used_bytes) / Number(stats.limit_bytes) * 100)}%</Text><Progress aria-label="Использование лимита трафика" value={Math.min(100, Math.max(0, Number(stats.used_bytes) / Number(stats.limit_bytes) * 100))} size="lg" radius="xl" /><Text size="xs" c="dimmed">Осталось: {bytes(Math.max(0, Number(stats.limit_bytes) - Number(stats.used_bytes)))}</Text></Stack>}
      <Text mt="sm" size="xs" c="dimmed">Трафик и время подключения относятся ко всей подписке. История по дням в этом разделе пока не собирается.</Text>
    </>}
    {!loading && !error && <Badge mt="sm" variant="light">Подключено: {devices.length}{limit !== null ? (limit > 0 ? ` · лимит ${limit}` : ' · без ограничений') : ''}</Badge>}
    <Stack mt="md" gap="sm">
      {loading ? <Group justify="center" py="md"><Loader size="sm" /><Text size="sm">Загружаем устройства…</Text></Group> : error ? <Alert color="orange">{error}</Alert> : !devices.length ? <Text size="sm" c="dimmed">Пока нет привязанных устройств. Они появятся после подключения через поддерживаемое приложение.</Text> : devices.map((device, index) => <div className="hwid-device" key={device.hwid}>
        <IconDeviceMobile className="hwid-device-icon" size={23} />
        <div className="hwid-device-copy"><Text fw={600} size="sm">{device.deviceModel || device.platform || `Устройство ${index + 1}`}</Text><Text size="xs" c="dimmed">{[device.platform, device.osVersion].filter(Boolean).join(' · ') || 'Платформа не указана'}</Text><Text size="xs" c="dimmed">Последнее подключение: {when(device.lastConnectedAt || device.lastSeenAt)}</Text><Text size="xs" c="dimmed">Добавлено: {when(device.createdAt)}</Text><Text size="xs" c="dimmed" className="hwid-identifier">HWID: {device.hwid}</Text></div>
        <Button className="hwid-device-remove" color="red" variant="light" size="xs" disabled={deleting} onClick={() => setSelected(device)} leftSection={<IconTrash size={15} />}>Сбросить HWID</Button>
      </div>)}
    </Stack>
    <ConfirmModal opened={!!selected} onClose={() => { if (!deleting) setSelected(null); }} onConfirm={remove} title="Сбросить привязку устройства?" message={`Устройство «${selected?.deviceModel || selected?.platform || 'Устройство'}» будет удалено из списка. Остальные устройства останутся. Это не блокировка: при новом подключении устройство может привязаться снова.`} confirmLabel="Сбросить HWID" confirmColor="red" loading={deleting} />
  </Paper>;
}
