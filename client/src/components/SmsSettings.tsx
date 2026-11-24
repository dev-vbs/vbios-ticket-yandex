import { useEffect, useState } from 'react';
import { Card, Stack, Switch, Text } from '@mantine/core';
import { api } from '../api/client';

type SmsPreference = { available: number; has_phone: number; enabled: number };

export default function SmsSettings() {
  const [settings, setSettings] = useState<SmsPreference>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    void api.get('/user/sms/settings', { signal: controller.signal })
      .then(({ data }) => setSettings(data.data?.[0]))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);

  const save = async (enabled: boolean) => {
    setSaving(true);
    setError(false);
    try {
      const { data } = await api.post('/user/sms/settings', { enabled });
      if (!data.data?.[0]) throw new Error('SMS preference missing');
      setSettings(data.data[0]);
    } catch { setError(true); }
    finally { setSaving(false); }
  };

  return <Card withBorder radius="lg" p="lg">
    <Stack gap="xs">
      <Text fw={650}>SMS на телефон</Text>
      <Text size="sm" c="dimmed">Короткие сообщения о поддержке, оплате и подписках.</Text>
      <Switch label="Получать SMS" checked={Boolean(settings?.enabled)}
        disabled={!settings || saving || (!settings.enabled && (!settings.available || !settings.has_phone))}
        onChange={event => void save(event.currentTarget.checked)} />
      {settings && !settings.available && <Text size="sm" c="dimmed">SMS пока не подключены сервисом.</Text>}
      {settings?.available === 1 && !settings.has_phone && <Text size="sm" c="dimmed">Для SMS нужен один номер в международном формате в профиле.</Text>}
      {error && <Text role="alert" size="sm" c="red">Не удалось обновить настройки SMS. Попробуйте ещё раз.</Text>}
    </Stack>
  </Card>;
}
