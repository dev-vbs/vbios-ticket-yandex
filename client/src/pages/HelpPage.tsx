import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Accordion, Alert, Anchor, Button, Group, Paper, Skeleton, Stack, Text, Title } from '@mantine/core';
import { IconArrowRight, IconBook2, IconCheck, IconDownload, IconHeadset, IconDevices, IconRefresh } from '@tabler/icons-react';
import { api } from '../api/client';
import './Pages.css';
import './HelpPage.css';

type Platform = { name: string; download_url?: string; steps: string[] };
type AppGuide = { name: string; description?: string; docs?: string; download_url?: string; platforms: Platform[] };
const defaultPlatforms = ['Android', 'iPhone и iPad', 'Windows', 'macOS'];
const fallback: AppGuide = {
  name: 'HAPP', description: 'Приложение для подключения к VPN на телефоне, планшете и компьютере. Добавьте подписку один раз — серверы будут обновляться из неё.',
  docs: 'https://docs.happ.info/main/ru', download_url: 'https://happ.info/download', platforms: [],
};
function safeLink(value?: string) {
  try { const url = new URL(value || ''); return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined; } catch { return undefined; }
}
function deviceName() {
  const ua = navigator.userAgent;
  return /Android/i.test(ua) ? 'Android' : /iPhone|iPad/i.test(ua) ? 'iPhone и iPad' : /Mac/i.test(ua) ? 'macOS' : 'Windows';
}
export default function HelpPage() {
  const [apps, setApps] = useState<AppGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState('');
  const [platformName, setPlatformName] = useState(deviceName);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setFailed(false);
    api.get('/apps', { signal: controller.signal }).then(({ data }) => {
      const raw = data?.data ?? data;
      const result = Array.isArray(raw) ? raw[0] : raw;
      if (!Array.isArray(result?.apps)) throw new Error('Invalid catalogue');
      const items = result.apps.filter((app: AppGuide) => app && typeof app.name === 'string');
      setApps(items);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [revision]);
  const catalogue = apps.length ? apps : [fallback];
  const app = catalogue.find(item => item.name === selected) || catalogue[0];
  const platforms: Platform[] = app.platforms?.length ? app.platforms : defaultPlatforms.map(name => ({ name, steps: [] }));
  const platform = platforms.find(item => item.name === platformName) || platforms[0];
  const steps = platform.steps?.length ? platform.steps : [
    `Скачайте и установите ${app.name} для ${platform.name} по кнопке ниже.`,
    `Откройте «Мои услуги», выберите активную подписку и нажмите «Добавить в приложение». Если приложение не открылось, скопируйте ссылку подписки и добавьте её вручную в ${app.name}.`,
    `Подтвердите добавление подписки в ${app.name}, выберите сервер и включите подключение. Разрешите создание VPN-подключения, если устройство запросит доступ.`,
  ];
  const download = safeLink(platform.download_url || app.download_url);
  const docs = safeLink(app.docs);
  return <Stack gap="lg" className="help-page help-centre">
    <header className="help-heading"><div><Title order={1}>Помощь с подключением</Title><Text c="dimmed" mt={8}>Выберите приложение и устройство. Подключим вас шаг за шагом.</Text></div><Button component={Link} to="/services" variant="default" rightSection={<IconArrowRight size={16} />}>Мои услуги</Button></header>
    {failed && <Alert color="orange" title="Не удалось обновить инструкции">Показана базовая инструкция HAPP.<Button size="xs" variant="subtle" onClick={() => setRevision(value => value + 1)} leftSection={<IconRefresh size={14} />}>Повторить</Button></Alert>}
    {loading ? <Stack aria-label="Загрузка инструкций"><Skeleton height={92} radius="lg" /><Skeleton height={320} radius="lg" /></Stack> : <>
      <Paper withBorder radius="lg" p="lg" className="help-selector"><Text fw={600} mb="sm">1. Выберите приложение</Text><Group gap="xs">{catalogue.map(item => <Button key={item.name} variant={item.name === app.name ? 'filled' : 'default'} aria-pressed={item.name === app.name} onClick={() => setSelected(item.name)} leftSection={item.name === app.name ? <IconCheck size={15} /> : undefined}>{item.name}</Button>)}</Group></Paper>
      <div className="help-workspace"><Paper withBorder radius="lg" className="help-instructions">
        <div className="help-app-intro"><span className="help-app-icon"><IconDevices size={28} /></span><div><Title order={2}>{app.name}</Title><Text c="dimmed" mt={6}>{app.description || `Настройте ${app.name} с помощью ссылки вашей подписки.`}</Text></div></div>
        <Text fw={600} mt="xl" mb="sm">2. На каком устройстве подключаемся?</Text><div className="help-platforms">{platforms.map(item => <button type="button" key={item.name} aria-pressed={item.name === platform.name} className={item.name === platform.name ? 'is-active' : ''} onClick={() => setPlatformName(item.name)}>{item.name}</button>)}</div>
        <ol className="help-steps">{steps.map((step, index) => <li key={`${platform.name}-${index}`}><span className="help-step-number">{index + 1}</span><div><Text fw={600}>{index === 0 ? 'Установите приложение' : index === 1 ? 'Добавьте подписку' : index === 2 ? 'Подключитесь' : `Шаг ${index + 1}`}</Text><Text size="sm" c="dimmed" mt={5}>{step}</Text>{index === 0 && download && <Button component="a" href={download} target="_blank" rel="noopener noreferrer" mt="sm" leftSection={<IconDownload size={16} />}>Скачать {app.name}</Button>}{index === 1 && <Anchor component={Link} to="/services" size="sm" mt={8} display="inline-block">Перейти к моей подписке →</Anchor>}</div></li>)}</ol>
        {docs && <Anchor href={docs} target="_blank" rel="noopener noreferrer" size="sm"><IconBook2 size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />Полная инструкция {app.name}</Anchor>}
      </Paper><aside className="help-aside"><Paper withBorder radius="lg" p="lg"><Title order={3}>Перед подключением</Title><ul className="help-checklist"><li><IconCheck size={17} />Подписка активна и оплачена</li><li><IconCheck size={17} />Приложение установлено</li><li><IconCheck size={17} />Другой VPN выключен</li></ul><Text size="sm" c="dimmed">Ссылка подписки находится в карточке услуги. Не передавайте её другим людям.</Text></Paper><Paper withBorder radius="lg" p="lg" className="help-contact"><IconHeadset size={25} /><Title order={3} mt="sm">Поможем разобраться</Title><Text size="sm" c="dimmed" mt={6}>Приложите скриншот ошибки и название устройства — так мы быстрее найдём решение.</Text><Button component={Link} to="/tickets" variant="default" fullWidth mt="md">Написать в поддержку</Button></Paper></aside></div>
    </>}
    <section><Title order={2} mb="md">Частые вопросы</Title><Accordion variant="separated" radius="md"><Accordion.Item value="servers"><Accordion.Control>В приложении нет серверов</Accordion.Control><Accordion.Panel>Проверьте, что услуга активна. Обновите подписку в приложении. Если список остаётся пустым, добавьте актуальную ссылку из карточки услуги заново.</Accordion.Panel></Accordion.Item><Accordion.Item value="import"><Accordion.Control>Кнопка не открывает приложение</Accordion.Control><Accordion.Panel>Сначала установите приложение. Затем скопируйте ссылку из «Моих услуг» и используйте добавление подписки по ссылке или из буфера обмена в выбранном приложении.</Accordion.Panel></Accordion.Item><Accordion.Item value="connect"><Accordion.Control>Подписка добавлена, но соединения нет</Accordion.Control><Accordion.Panel>Отключите другой VPN, проверьте доступ к интернету, обновите подписку и попробуйте другой сервер. Если не помогло, напишите в поддержку.</Accordion.Panel></Accordion.Item></Accordion></section>
  </Stack>;
}