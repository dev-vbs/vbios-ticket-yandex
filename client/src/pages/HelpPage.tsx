import { Card, Group, SimpleGrid, Stack, Text, Title } from '@mantine/core';
import { IconBrandAndroid, IconBrandApple, IconBrandWindows, IconHelpCircle, IconRouter } from '@tabler/icons-react';
import './Pages.css';

const guides = [
  { title: 'Android', icon: IconBrandAndroid, steps: ['Установите WireGuard из Google Play.', 'Откройте «Мой VPN» и скачайте конфигурацию.', 'Импортируйте файл в WireGuard и включите профиль.'] },
  { title: 'iPhone и iPad', icon: IconBrandApple, steps: ['Установите WireGuard из App Store.', 'Скачайте конфигурацию или отсканируйте QR-код.', 'Разрешите добавление VPN-профиля и включите его.'] },
  { title: 'Windows', icon: IconBrandWindows, steps: ['Установите официальный WireGuard для Windows.', 'Импортируйте скачанный конфигурационный файл.', 'Нажмите Activate для подключения.'] },
  { title: 'macOS', icon: IconBrandApple, steps: ['Установите WireGuard из Mac App Store.', 'Импортируйте конфигурацию из раздела «Мой VPN».', 'Включите туннель в приложении.'] },
  { title: 'Роутер', icon: IconRouter, steps: ['Откройте настройки WireGuard на роутере.', 'Добавьте конфигурацию как новый peer.', 'Сохраните настройки и включите туннель.'] },
];

export default function HelpPage() {
  return <Stack gap="lg" className="help-page">
    <header className="page-header"><div><Title order={1}>Помощь</Title><Text c="dimmed" mt="xs">Инструкции по подключению VPN на ваших устройствах.</Text></div></header>
    <Card withBorder radius="lg" className="help-intro"><Group gap="md" align="flex-start"><IconHelpCircle size={26} color="var(--mantine-primary-color-filled)" /><div><Text fw={650}>Как подключить VPN</Text><Text size="sm" c="dimmed" mt={4}>Сначала откройте раздел «Мой VPN», выберите активную услугу и скачайте конфигурацию. Один профиль можно использовать на нескольких устройствах.</Text></div></Group></Card>
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">{guides.map(({ title, icon: Icon, steps }) => <Card key={title} withBorder radius="lg" className="help-guide"><Group gap="sm"><span className="help-guide__icon"><Icon size={20} /></span><Text fw={650}>{title}</Text></Group><ol>{steps.map((step) => <li key={step}>{step}</li>)}</ol></Card>)}</SimpleGrid>
  </Stack>;
}
