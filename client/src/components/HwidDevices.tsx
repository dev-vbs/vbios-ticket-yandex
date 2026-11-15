import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Group, Loader, Paper, Stack, Text } from '@mantine/core';
import { IconDeviceMobile, IconRefresh, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { userApi } from '../api/client';
import ConfirmModal from './ConfirmModal';
import './HwidDevices.css';

type Device = { hwid: string; deviceModel?: string; platform?: string; osVersion?: string; userAgent?: string };
function payload(body: unknown): Record<string, unknown> {
  let value: any = body;
  for (let i = 0; i < 5; i++) {
    if (Array.isArray(value)) value = value[0];
    if (!value || typeof value !== 'object') return {};
    if ('devices' in value || 'ok' in value) return value;
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
    <Group justify="space-between" wrap="wrap" gap="sm"><div><Text fw={600}>Устройства</Text><Text size="xs" c="dimmed">Управление привязками этой подписки</Text></div><Button size="xs" variant="subtle" loading={loading} disabled={deleting} onClick={load} leftSection={<IconRefresh size={15} />}>Обновить</Button></Group>
    {!loading && !error && <Badge mt="sm" variant="light">Подключено: {devices.length}{limit !== null && limit > 0 ? ` · лимит ${limit}` : ''}</Badge>}
    <Stack mt="md" gap="sm">
      {loading ? <Group justify="center" py="md"><Loader size="sm" /><Text size="sm">Загружаем устройства…</Text></Group> : error ? <Alert color="orange">{error}</Alert> : !devices.length ? <Text size="sm" c="dimmed">Пока нет привязанных устройств. Они появятся после подключения через поддерживаемое приложение.</Text> : devices.map((device, index) => <div className="hwid-device" key={device.hwid}>
        <IconDeviceMobile className="hwid-device-icon" size={23} />
        <div className="hwid-device-copy"><Text fw={600} size="sm">{device.deviceModel || device.platform || `Устройство ${index + 1}`}</Text><Text size="xs" c="dimmed">{[device.platform, device.osVersion].filter(Boolean).join(' · ') || 'Платформа не указана'}</Text><Text size="xs" c="dimmed" className="hwid-identifier">HWID: {device.hwid}</Text></div>
        <Button className="hwid-device-remove" color="red" variant="light" size="xs" disabled={deleting} onClick={() => setSelected(device)} leftSection={<IconTrash size={15} />}>Сбросить HWID</Button>
      </div>)}
    </Stack>
    <ConfirmModal opened={!!selected} onClose={() => { if (!deleting) setSelected(null); }} onConfirm={remove} title="Сбросить привязку устройства?" message={`Устройство «${selected?.deviceModel || selected?.platform || 'Устройство'}» будет удалено из списка. Остальные устройства останутся. Это не блокировка: при новом подключении устройство может привязаться снова.`} confirmLabel="Сбросить HWID" confirmColor="red" loading={deleting} />
  </Paper>;
}
