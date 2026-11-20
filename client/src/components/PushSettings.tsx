import { Alert, Badge, Button, Group, Stack, Text, Title } from '@mantine/core';
import { IconBell, IconBellOff, IconSend } from '@tabler/icons-react';
import { usePushNotifications } from '../hooks/usePushNotifications';

export default function PushSettings() {
  const push = usePushNotifications();
  return <section className="vpn-finance-panel"><Stack gap="md">
    <Group justify="space-between"><Group gap="xs"><IconBell size={23} /><Title order={3}>Уведомления на устройство</Title></Group><Badge color={push.isSubscribed ? 'teal' : 'gray'} variant="light">{push.isSubscribed ? 'Включены' : 'Выключены'}</Badge></Group>
    <Text size="sm" c="dimmed">Получайте сообщения сервиса, даже когда кабинет закрыт. Разрешение действует только на этом устройстве.</Text>
    {!push.isEnabled ? <Alert color="gray">Администратор ещё не включил push-уведомления на сервере.</Alert> : !push.browserSupported ? <Alert color="blue">На iPhone и iPad с iOS 16.4 или новее: откройте кабинет в Safari → «Поделиться» → «На экран Домой». Запустите установленное приложение и включите уведомления здесь. На Android и компьютере используйте актуальный браузер и HTTPS.</Alert> : <Group>
      <Button leftSection={push.isSubscribed ? <IconBellOff size={17} /> : <IconBell size={17} />} variant={push.isSubscribed ? 'default' : 'filled'} loading={push.isLoading} onClick={() => void (push.isSubscribed ? push.unsubscribe() : push.subscribe())}>{push.isSubscribed ? 'Отключить на устройстве' : 'Включить уведомления'}</Button>
      {push.isSubscribed && <Button variant="light" leftSection={<IconSend size={17} />} disabled={push.isLoading} onClick={() => void push.test()}>Отправить тест</Button>}
    </Group>}
    {push.error && <Alert color="red" role="alert">{push.error}</Alert>}
    {push.message && <Alert color="teal" role="status">{push.message}</Alert>}
    <Text size="xs" c="dimmed">Не включайте уведомления на чужом устройстве. Доставка зависит от браузера, разрешений и системных настроек. События для отправки подключаются администратором в SHM.</Text>
  </Stack></section>;
}
