import DataLoadStatus from '../components/DataLoadStatus';
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Card, Timeline, Text, Stack, Group, Badge, Button, Divider, ActionIcon, Loader, Center, Paper, Title, Tabs, Code, Tooltip, Accordion, Box, Select, NumberInput, Pagination, Alert, TextInput, Skeleton } from '@mantine/core';
import { IconQrcode, IconCopy, IconCheck, IconDownload, IconRefresh, IconTrash, IconPlus, IconPlayerStop, IconExchange, IconCreditCard, IconWallet, IconDeviceMobileCog, IconArrowLeft, IconArrowRight, IconSearch, IconCalendarTime, IconWifi, IconWifiOff } from '@tabler/icons-react';
import { useDisclosure, useClipboard } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { api, servicesApi, storageApi, userApi } from '../api/client';
import { notifications } from '@mantine/notifications';
import QrModal from '../components/QrModal';
import AppDownloadBlock from '../components/AppDownloadBlock';
import OrderServiceModal from '../components/OrderServiceModal';
import ConfirmModal from '../components/ConfirmModal';
import { config } from '../config';
import { useStore } from '../store/useStore';
import { isTelegramWebApp } from '../constants/webapp';
import { readOfflineConnection, readOfflineServices, saveOfflineConnection, saveOfflineServices } from '../lib/offlineConnection';
import './Services.css';

interface ForecastItem {
  name: string;
  cost: number;
  real_cost?: number;
  total: number;
  status: string;
  user_service_id: string;
}

interface PaySystem {
  name: string;
  shm_url: string;
  internal?: number;
  recurring?: number;
  weight?: number;
}

interface ServiceInfo {
  category: string;
  cost: number;
  name: string;
}


interface UserService {
  user_service_id: number;
  service_id: number;
  name?: string;
  service: ServiceInfo;
  status: string;
  expire: string | null;
  next: number | null;
  created: string;
  parent: number | null;
  settings?: Record<string, unknown>;
  children?: UserService[];
}

const statusColors: Record<string, string> = {
  'ACTIVE': 'green',
  'NOT PAID': 'blue',
  'BLOCK': 'red',
  'PROGRESS': 'yellow',
  'ERROR': 'orange',
  'INIT': 'gray',
};

function normalizeCategory(category: string): string {
  const normalizedCategory = String(category ?? '').trim().toLowerCase();
  const parseCategories = (value: string | undefined) => new Set((value || '').split(',').map((item) => item.trim().toLowerCase()).filter(Boolean));
  const proxyCategories = parseCategories(config.PROXY_CATEGORY);
  const vpnCategories = parseCategories(config.VPN_CATEGORY);

  if (proxyCategories.has(normalizedCategory)) {
    return 'proxy';
  }
  if (vpnCategories.has(normalizedCategory)) {
    return 'vpn';
  }

  if (category.match(/remna|remnawave|marzban|marz|mz/i)) {
    return 'proxy';
  }
  if (category.match(/^(vpn|wg|awg)/i)) {
    return 'vpn';
  }
  if (['web_tariff', 'web', 'mysql', 'mail', 'hosting'].includes(category)) {
    return category;
  }
  return 'other';
}

interface ServiceDetailProps {
  service: UserService;
  onDelete?: () => void;
  onChangeTariff?: (service: UserService) => void;
}

type ConnectionStatus = 'loading' | 'ready' | 'missing' | 'error';
type StorageValue = string | number | boolean | null | StorageValue[] | { [key: string]: StorageValue };

const subscriptionFields = ['subscription_url', 'subscriptionurl', 'subscription', 'sub_url', 'suburl', 'link', 'url'];
const configFields = ['config', 'configuration', 'wg_config', 'wireguard_config', 'value', 'content'];

function parseStorageValue(value: unknown): StorageValue | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try { return parseStorageValue(JSON.parse(trimmed)); } catch { return trimmed; }
    }
    return trimmed;
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value as StorageValue[];
  if (typeof value === 'object' && value !== null) return value as { [key: string]: StorageValue };
  return undefined;
}

function findStorageString(value: StorageValue | undefined, fieldNames: string[], accept: (candidate: string) => boolean): string | null {
  if (typeof value === 'string') return accept(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) { const result = findStorageString(item, fieldNames, accept); if (result) return result; }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  for (const [key, candidate] of Object.entries(value)) {
    if (fieldNames.includes(key.toLowerCase()) && typeof candidate === 'string' && accept(candidate.trim())) return candidate.trim();
  }
  for (const candidate of Object.values(value)) { const result = findStorageString(candidate, fieldNames, accept); if (result) return result; }
  return null;
}

function extractSubscriptionUrl(payload: unknown): string | null {
  const value = parseStorageValue(payload);
  const storedLink = findStorageString(value, subscriptionFields, (candidate) => candidate.length > 0);
  if (storedLink) return storedLink;
  return findStorageString(value, [], (candidate) => /^[a-z][a-z\d+.-]*:\/\//i.test(candidate));
}

function extractConfiguration(payload: unknown): string | null {
  return findStorageString(parseStorageValue(payload), configFields, (candidate) => candidate.length > 0);
}

function getStorageKeys(category: string, userServiceId: number): string[] {
  const id = String(userServiceId);
  const prefixes = category === 'proxy'
    ? [config.PROXY_STORAGE_PREFIX || 'vpn_mrzb_', 'vpn_mrzb_', 'vpn_remna_', 'vpn_mz_']
    : [config.VPN_STORAGE_PREFIX || 'vpn', 'vpn'];
  return [...new Set(prefixes.map((prefix) => `${prefix}${id}`))];
}

function wasNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('response' in error)) return false;
  return (error as { response?: { status?: number } }).response?.status === 404;
}

function ServiceDetail({ service, onDelete, onChangeTariff }: ServiceDetailProps) {
  const [storageData, setStorageData] = useState<string | null>(null);
  const [subscriptionUrl, setSubscriptionUrl] = useState<string | null>(null);
  const [nextServiceInfo, setNextServiceInfo] = useState<{ name: string; cost: number } | null>(null);
  const [nextServiceLoading, setNextServiceLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('loading');
  const [connectionReload, setConnectionReload] = useState(0);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [lastConnectionUpdate, setLastConnectionUpdate] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('info');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const { t, i18n } = useTranslation();
  const clipboard = useClipboard({ timeout: 1000 });

  const [forecastTotal, setForecastTotal] = useState<number | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [paySystems, setPaySystems] = useState<PaySystem[]>([]);
  const [selectedPaySystem, setSelectedPaySystem] = useState<string | null>(null);
  const payAmount = forecastTotal ?? 0;
  const [paySystemsLoading, setPaySystemsLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  const downloadConfig = async () => {
    if (!storageData) return;
    setDownloading(true);
    try {
      const blob = new Blob([storageData], { type: 'application/octet-stream' });
      const prefix = config.VPN_STORAGE_PREFIX ? config.VPN_STORAGE_PREFIX : 'vpn';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${prefix}${service.user_service_id}.conf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const canDelete = config.ALLOW_SERVICE_DELETE === 'true' && ['BLOCK', 'NOT PAID', 'ERROR'].includes(service.status);
  const canStop = config.ALLOW_SERVICE_BLOCKED === 'true' && service.status === 'ACTIVE';
  const canChange = config.ALLOW_SERVICE_CHANGE === 'true' && ['BLOCK', 'ACTIVE'].includes(service.status);
  const isExpired = !!service.expire && new Date(service.expire).getTime() <= Date.now();
  const isNotPaid = service.status === 'NOT PAID';

  useEffect(() => {
    if (!isNotPaid) return;
    const fetchForecast = async () => {
      setForecastTotal(null);
      setForecastLoading(true);
      try {
        const response = await userApi.getForecast();
        const forecastData = response.data.data;
        if (Array.isArray(forecastData) && forecastData.length > 0) {
          const forecast = forecastData[0];
          const balance = forecast.balance || 0;
          const item = forecast.items?.find(
            (it: ForecastItem) => String(it.user_service_id) === String(service.user_service_id)
          );
          if (item && Number.isFinite(Number(item.total)) && Number.isFinite(Number(balance))) {
            setForecastTotal(Math.max(0, Math.ceil((Number(item.total) - Number(balance)) * 100) / 100));
          }
        }
      } catch {
      } finally {
        setForecastLoading(false);
      }
    };
    fetchForecast();
  }, [service.user_service_id, isNotPaid]);

  const loadPaySystems = async () => {
    if (paySystems.length > 0) return;
    setPaySystemsLoading(true);
    try {
      const response = await userApi.getPaySystems();
      const data: PaySystem[] = response.data.data || [];
      const sorted = data.sort((a, b) => (b.weight || 0) - (a.weight || 0));
      setPaySystems(sorted);
      if (sorted.length > 0) {
        setSelectedPaySystem(sorted[0].shm_url);
      }
    } catch {
    } finally {
      setPaySystemsLoading(false);
    }
  };

  useEffect(() => {
    if (isNotPaid && forecastTotal !== null && forecastTotal > 0) {
      loadPaySystems();
    }
  }, [isNotPaid, forecastTotal]);

  const handlePay = async () => {
    const paySystem = paySystems.find(ps => ps.shm_url === selectedPaySystem);
    if (!paySystem || payAmount <= 0) return;
    setPaying(true);
    try {
      if (paySystem.internal || paySystem.recurring) {
        const response = await fetch(paySystem.shm_url + payAmount, {
          method: 'GET',
          credentials: 'include',
        });
        if (response.status === 200 || response.status === 204) {
          notifications.show({ title: t('common.success'), message: t('payments.paymentSuccess'), color: 'green' });
          onDelete?.();
        } else {
          const data = await response.json().catch(() => ({}));
          notifications.show({ title: t('common.error'), message: data.msg_ru || data.msg || t('payments.paymentError'), color: 'red' });
        }
      } else {
        window.open(paySystem.shm_url + payAmount, '_blank');
      }
    } catch {
      notifications.show({ title: t('common.error'), message: t('payments.paymentError'), color: 'red' });
    } finally {
      setPaying(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/user/service?user_service_id=${service.user_service_id}`);
      notifications.show({
        title: t('common.success'),
        message: t('services.serviceDeleted'),
        color: 'green',
      });
      setConfirmDelete(false);
      onDelete?.();
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('services.serviceDeleteError'),
        color: 'red',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await userApi.stopService(service.user_service_id);
      notifications.show({
        title: t('common.success'),
        message: t('services.serviceStopped'),
        color: 'green',
      });
      setConfirmStop(false);
      onDelete?.();
    } catch (error) {
      notifications.show({
        title: t('common.error'),
        message: t('services.serviceStopError'),
        color: 'red',
      });
    } finally {
      setStopping(false);
    }
  };

  const handleConfigure = () => {
    const link = subscriptionUrl;
    if ( link ) {
      const tgWebApp = window.Telegram?.WebApp;
      if (tgWebApp && isTelegramWebApp) {
        tgWebApp.openLink(link);
      } else {
        window.open(link, '_blank');
      }
    }
  };


  function detectPlatform(): string {
    const ua = navigator.userAgent;
    if (/iPhone|iPad|iPod/i.test(ua)) return 'IOS';
    if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'ANDROID';
    if (/Windows NT/i.test(ua)) return 'WINDOWS';
    if (/Linux/i.test(ua)) return 'LINUX';
    if (/Macintosh|Mac OS X/i.test(ua)) return 'MAC';
    return '';
  }

  const handleOpenUrlSchema = async () => {
    const urlSchema = config[`${detectPlatform()}_PROXY_URL_SCHEMA` as keyof typeof config];
    let link = `${urlSchema}${subscriptionUrl}`;
    if ( config.SHOW_HAPP_CRYPTOLINK === 'true' && urlSchema === 'happ://add/' ) {
      try {
        const response = await fetch(`https://crypto.happ.su/api-v2.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: subscriptionUrl }),
        });
        const data = await response.json();
        if (data && data.encrypted_link) {
          link = data.encrypted_link;
        }
      } catch {
      }
    }
    if ( link ) {
      const tgWebApp = window.Telegram?.WebApp;
      if (tgWebApp && isTelegramWebApp) {
        tgWebApp.openLink(link);
      } else {
        window.open(link, '_blank');
      }
    }
  };

  const serviceCategory = service.service?.category || (service as UserService & { category?: string }).category || '';
  const category = normalizeCategory(serviceCategory);

  useEffect(() => {
    const updateNetwork = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateNetwork);
    window.addEventListener('offline', updateNetwork);
    return () => { window.removeEventListener('online', updateNetwork); window.removeEventListener('offline', updateNetwork); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadConnection = async () => {
      if (category !== 'proxy' && category !== 'vpn') return;
      setConnectionStatus('loading');
      setSubscriptionUrl(null);
      setStorageData(null);
      setActiveTab('config');
      const offlineConnection = readOfflineConnection(service.user_service_id, category);
      if (!navigator.onLine && offlineConnection) {
        if (category === 'proxy') setSubscriptionUrl(offlineConnection.value); else setStorageData(offlineConnection.value);
        setLastConnectionUpdate(offlineConnection.updatedAt);
        setConnectionStatus('ready');
        return;
      }
      let hadRequestError = false;
      for (const key of getStorageKeys(category, service.user_service_id)) {
        try {
          const response = await storageApi.get(key, { format: 'json' });
          const value = category === 'proxy' ? extractSubscriptionUrl(response.data) : extractConfiguration(response.data);
          if (!value) continue;
          if (cancelled) return;
          if (category === 'proxy') setSubscriptionUrl(value); else setStorageData(value);
          saveOfflineConnection(service.user_service_id, category, value);
          setLastConnectionUpdate(Date.now());
          setConnectionStatus('ready');
          return;
        } catch (error) {
          if (!wasNotFound(error)) hadRequestError = true;
        }
      }
      if (!cancelled) setConnectionStatus(hadRequestError ? 'error' : 'missing');
    };
    void loadConnection();
    return () => { cancelled = true; };
  }, [service.user_service_id, category, connectionReload]);

  useEffect(() => {
    const fetchNextService = async () => {
      if (!service.next) {
        setNextServiceInfo(null);
        return;
      }
      setNextServiceLoading(true);
      try {
        const response = await servicesApi.order_list({ service_id: String(service.next) });
        const data = response.data.data || [];
        const nextService = Array.isArray(data) ? data[0] : data;
        if (nextService?.name && typeof nextService.cost === 'number') {
          setNextServiceInfo({ name: nextService.name, cost: nextService.cost });
        } else {
          setNextServiceInfo(null);
        }
      } catch {
        setNextServiceInfo(null);
      } finally {
        setNextServiceLoading(false);
      }
    };

    fetchNextService();
  }, [service.next]);

  const isVpn = category === 'vpn';
  const isProxy = category === 'proxy';
  const isVpnOrProxy = isVpn || isProxy;
  const statusColor = statusColors[service.status] || 'gray';
  const statusLabel = t(`status.${service.status}`, service.status);
  const urlSchema = isProxy && config[`${detectPlatform()}_PROXY_URL_SCHEMA` as keyof typeof config];
  const showProxySubscription = config.SHOW_PROXY_SUB_LINK === 'true';
  const showProxyQr = config.SHOW_PROXY_QR === 'true';

  return (
    <Stack gap="md">
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md" styles={{ list: { gap: 8, padding: 6, background: 'var(--mantine-color-default-hover)', borderRadius: 14 }, tab: { flex: 1, minHeight: 44, fontWeight: 600 }, panel: { paddingTop: 24 } }}>
        <Tabs.List>
          <Tabs.Tab value="info">{t('services.info')}</Tabs.Tab>
          {isVpnOrProxy && service.status === 'ACTIVE' && <Tabs.Tab value="config">{t('services.connection')}</Tabs.Tab>}
        </Tabs.List>

        <Tabs.Panel value="info" pt="md">
          <Stack gap="xs">
            <Paper withBorder radius="lg" p="lg">
              <Stack gap="md">
                <Group justify="space-between" gap="md">
                  <Text size="sm" c="dimmed">{t('services.status')}</Text>
                  <Badge color={statusColor} variant="light" size="lg" radius="sm">{statusLabel}</Badge>
                </Group>
                <Divider />
                <Group justify="space-between" gap="md" align="center">
                  <Group gap="xs" c="dimmed"><IconWallet size={18} /><Text size="sm">{t('services.cost')}</Text></Group>
                  <Text fw={700} size="xl" style={{ fontVariantNumeric: 'tabular-nums' }}>{service.service.cost} <Text component="span" size="sm" fw={500} c="dimmed">{t('common.currency')}</Text></Text>
                </Group>
                {service.expire && (
                  <>
                    <Divider />
                    <Group justify="space-between" gap="md" align="center">
                      <Group gap="xs" c="dimmed"><IconCalendarTime size={18} /><Text size="sm">{t('services.validUntil')}</Text></Group>
                      <Text size="sm" fw={600} style={{ fontVariantNumeric: 'tabular-nums' }}>{new Date(service.expire as string).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}</Text>
                    </Group>
                  </>
                )}
              </Stack>
            </Paper>
            {service.next && (
              <Group justify="space-between">
                <Text size="sm" c="dimmed">{t('services.validUntilNext')}:</Text>
                {nextServiceLoading ? (
                  <Text size="sm">{t('common.loading')}</Text>
                ) : nextServiceInfo ? (
                  <Text size="sm">{nextServiceInfo.name} - {nextServiceInfo.cost} {t('common.currency')}</Text>
                ) : (
                  <Text size="sm">{service.next}</Text>
                )}
              </Group>
            )}
            {service.children && service.children.length > 0 && (
              <>
                <Text size="sm" c="dimmed" mt="md">{t('services.includedServices')}:</Text>
                {service.children.map((child) => {
                  const childStatusColor = statusColors[child.status] || 'gray';
                  const childStatusLabel = t(`status.${child.status}`, child.status);
                  return (
                    <Group key={child.user_service_id} justify="space-between" ml="md">
                      <Text size="sm">{child.service.name}</Text>
                      <Badge size="sm" color={childStatusColor} variant="light">{childStatusLabel}</Badge>
                    </Group>
                  );
                })}
              </>
            )}
          </Stack>
        </Tabs.Panel>

        { service.status === 'ACTIVE' && isVpnOrProxy && (
          <Tabs.Panel value="config" pt="md">
            <Paper withBorder p="lg" radius="md" className="service-connection-card">
              <Stack gap="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text fw={700} size="lg">{t('services.connectionTo', { service: service.service.name, defaultValue: `Подключение к ${service.service.name}` })}</Text>
                    <Text size="sm" c="dimmed">{isProxy ? t('services.subscriptionHint', { defaultValue: 'Ссылка подписки обновляет конфигурацию автоматически.' }) : t('services.vpnConfigHint', { defaultValue: 'Скачайте конфигурацию или отсканируйте QR-код.' })}</Text>
                  </div>
                  <Badge color="green" variant="light">{statusLabel}</Badge>
                </Group>

                <Paper withBorder p="sm" radius="sm" className="connection-diagnostics">
                  <Group justify="space-between" align="center" wrap="nowrap">
                    <Stack gap={3}>
                      <Group gap="xs"><Text size="sm" fw={600}>Диагностика подключения</Text><Badge color={isOnline ? 'green' : 'orange'} variant="light" leftSection={isOnline ? <IconWifi size={12} /> : <IconWifiOff size={12} />}>{isOnline ? 'Сеть доступна' : 'Нет сети'}</Badge></Group>
                      <Text size="xs" c="dimmed">{connectionStatus === 'ready' ? 'Данные подключения доступны.' : connectionStatus === 'loading' ? 'Проверяем хранилище…' : connectionStatus === 'missing' ? 'Данные подключения пока не найдены.' : 'Не удалось проверить хранилище.'}</Text>
                      {lastConnectionUpdate && <Text size="xs" c="dimmed">Последнее успешное обновление: {new Date(lastConnectionUpdate).toLocaleString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}</Text>}
                    </Stack>
                    <Button variant="light" size="xs" leftSection={<IconRefresh size={14} />} loading={connectionStatus === 'loading'} disabled={!isOnline} onClick={() => setConnectionReload((value) => value + 1)}>Проверить</Button>
                  </Group>
                </Paper>

                {isProxy && showProxySubscription && subscriptionUrl && (
                  <Paper withBorder p="sm" radius="sm" bg="var(--mantine-color-default-hover)">
                    <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>{t('services.subscriptionLink')}</Text>
                    <Group wrap="nowrap">
                      <Code style={{ flex: 1, wordBreak: 'break-all', whiteSpace: 'normal' }}>{subscriptionUrl}</Code>
                      <Tooltip label={clipboard.copied ? t('common.copied') : t('common.copy')}>
                        <ActionIcon color={clipboard.copied ? 'teal' : 'blue'} variant="light" onClick={() => clipboard.copy(subscriptionUrl)}>
                          {clipboard.copied ? <IconCheck size={17} /> : <IconCopy size={17} />}
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Paper>
                )}

                {connectionStatus === 'loading' && (
                  <Group gap="xs" className="connection-loading"><Loader size="sm" /><Text size="sm" c="dimmed">{t('common.loading')}</Text></Group>
                )}
                {connectionStatus !== 'loading' && isProxy && !subscriptionUrl && (
                  <Alert color={connectionStatus === 'error' ? 'red' : 'orange'} title={t('services.connectionUnavailableTitle', { defaultValue: 'Ссылка пока не готова' })}>
                    <Stack gap="sm"><Text size="sm">{t('services.connectionUnavailableDescription', { defaultValue: 'Данные подключения пока не появились в хранилище. Обновите данные или обратитесь в поддержку.' })}</Text><Button variant="light" size="xs" leftSection={<IconRefresh size={14} />} onClick={() => setConnectionReload((value) => value + 1)}>{t('common.refresh')}</Button></Stack>
                  </Alert>
                )}
                {connectionStatus !== 'loading' && isVpn && !storageData && (
                  <Alert color={connectionStatus === 'error' ? 'red' : 'orange'} title={t('services.configUnavailableTitle', { defaultValue: 'Конфигурация пока не готова' })}>
                    <Stack gap="sm"><Text size="sm">{t('services.configUnavailableDescription', { defaultValue: 'Файл конфигурации пока не появился в хранилище. Обновите данные или обратитесь в поддержку.' })}</Text><Button variant="light" size="xs" leftSection={<IconRefresh size={14} />} onClick={() => setConnectionReload((value) => value + 1)}>{t('common.refresh')}</Button></Stack>
                  </Alert>
                )}

                <Group grow align="stretch">
                  {(!isProxy || showProxyQr) && <Button leftSection={<IconQrcode size={17} />} variant="light" disabled={isProxy ? !subscriptionUrl : !storageData} onClick={() => setQrModalOpen(true)}>{t('services.qrCode')}</Button>}
                  {isProxy ? <Button leftSection={<IconDeviceMobileCog size={17} />} disabled={!subscriptionUrl} onClick={() => urlSchema ? handleOpenUrlSchema() : handleConfigure()}>{t('services.openInApp', { defaultValue: 'Открыть в приложении' })}</Button> : <Button leftSection={<IconDownload size={17} />} disabled={!storageData} onClick={downloadConfig} loading={downloading}>{t('services.downloadConfig')}</Button>}
                </Group>

                {isProxy && subscriptionUrl && (
                  <AppDownloadBlock type="proxy" />
                )}

                {isProxy && showProxySubscription && subscriptionUrl && (
                  <>
                    <Divider />
                    <Text fw={600}>{t('services.howToConnect', { defaultValue: 'Как подключиться' })}</Text>
                    <Timeline active={3} bulletSize={25} lineWidth={2}>
                      <Timeline.Item bullet={<IconDownload size={13} />} title="1. Установите приложение">
                        <Text size="sm" c="dimmed">HAPP, INCY или v2rayNG / v2rayN — выберите приложение для своего устройства.</Text>
                      </Timeline.Item>
                      <Timeline.Item bullet={<IconCopy size={13} />} title="2. Скопируйте ссылку подписки">
                        <Text size="sm" c="dimmed">Нажмите значок копирования рядом со ссылкой выше.</Text>
                      </Timeline.Item>
                      <Timeline.Item bullet={<IconDeviceMobileCog size={13} />} title="3. Добавьте подписку в приложение">
                        <Text size="sm" c="dimmed">В HAPP: «Добавить» → «По ссылке». В INCY: «Subscriptions» → «+» → вставьте ссылку. В v2rayNG/v2rayN: «Subscription group» → «Add» → вставьте ссылку.</Text>
                      </Timeline.Item>
                      <Timeline.Item bullet={<IconCheck size={13} />} title="4. Обновите подписку и подключитесь">
                        <Text size="sm" c="dimmed">Выберите сервер после обновления списка и включите подключение. QR-код можно использовать вместо копирования.</Text>
                      </Timeline.Item>
                    </Timeline>
                  </>
                )}
              </Stack>
            </Paper>
            <QrModal opened={qrModalOpen} onClose={() => setQrModalOpen(false)} data={isVpn ? (storageData || '') : (subscriptionUrl || '')} title={isVpn ? t('services.vpnQrTitle') : t('services.subscriptionQrTitle')} onDownload={isVpn ? downloadConfig : undefined} />
          </Tabs.Panel>
        )}
      </Tabs>
      {isNotPaid && (
        <Paper withBorder p="md" radius="md" mt="md">
          <Stack gap="sm">
            {forecastLoading ? (
              <Group justify="center" py="xs">
                <Loader size="sm" />
                <Text size="sm">{t('common.loading')}</Text>
              </Group>
            ) : forecastTotal !== null && forecastTotal > 0 ? (
              <>
                <Group justify="space-between">
                  <Group gap="xs">
                    <IconWallet size={18} />
                    <Text fw={500}>{t('services.amountToPay')}</Text>
                  </Group>
                  <Text fw={700} size="lg" c="red">{forecastTotal.toFixed(2)} {t('common.currency')}</Text>
                </Group>
                {paySystemsLoading ? (
                  <Group justify="center" py="xs">
                    <Loader size="sm" />
                  </Group>
                ) : paySystems.length > 0 ? (
                  <>
                    <Select
                      label={t('payments.paymentSystem')}
                      data={paySystems.map(ps => ({ value: ps.shm_url, label: ps.name }))}
                      value={selectedPaySystem}
                      onChange={setSelectedPaySystem}
                      size="sm"
                    />
                    <NumberInput
                      label={t('payments.amount')}
                      value={payAmount}
                      readOnly
                      hideControls
                      decimalScale={2}
                      suffix=" ₽"
                      size="sm"
                    />
                    <Button
                      fullWidth
                      leftSection={<IconCreditCard size={18} />}
                      onClick={handlePay}
                      loading={paying}
                      disabled={!selectedPaySystem}
                    >
                      {isExpired ? `Пополнить для продления на ${payAmount.toFixed(2)} ${t('common.currency')}` : t('services.payService', { amount: payAmount })}
                    </Button>
                  </>
                ) : null}
              </>
            ) : <Text size="sm" c="dimmed">{forecastTotal === 0 ? "Доплата по этой услуге не требуется." : "Не удалось получить сумму по этой услуге. Обновите страницу и попробуйте снова."}</Text>}
          </Stack>
        </Paper>
      )}

      {canChange && (
        <Button
          color="blue"
          variant="light"
          leftSection={<IconExchange size={16} />}
          onClick={() => onChangeTariff?.(service)}
          mt="md"
          fullWidth
        >
          {t('services.changeService')}
        </Button>
      )}

      {canStop && (
        <Button
          color="orange"
          variant="light"
          leftSection={<IconPlayerStop size={16} />}
          onClick={() => setConfirmStop(true)}
          mt="md"
          fullWidth
        >
          {t('services.stopService')}
        </Button>
      )}

      {canDelete && (
        <Button
          color="red"
          variant="light"
          leftSection={<IconTrash size={16} />}
          onClick={() => setConfirmDelete(true)}
          mt="md"
          fullWidth
        >
          {t('services.deleteService')}
        </Button>
      )}

      <ConfirmModal
        opened={confirmStop}
        onClose={() => setConfirmStop(false)}
        onConfirm={handleStop}
        title={t('services.stopServiceTitle')}
        message={t('services.stopServiceMessage')}
        confirmLabel={t('services.stop')}
        confirmColor="orange"
        loading={stopping}
      />

      <ConfirmModal
        opened={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title={t('services.deleteServiceTitle')}
        message={t('services.deleteServiceMessage')}
        confirmLabel={t('common.delete')}
        confirmColor="red"
        loading={deleting}
      />
    </Stack>
  );
}

function getExpiryState(expire: string | null): { label: string | null; tone: 'success' | 'warning' | 'danger' } {
  if (!expire) return { label: null, tone: 'success' };
  const date = new Date(expire);
  if (Number.isNaN(date.getTime())) return { label: null, tone: 'success' };
  const days = Math.ceil((date.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return { label: 'Срок действия закончился', tone: 'danger' };
  if (days === 0) return { label: 'Заканчивается сегодня', tone: 'danger' };
  if (days <= 3) return { label: `Осталось ${days} дн.`, tone: 'warning' };
  return { label: `Активна ещё ${days} дн.`, tone: 'success' };
}
function ServiceCard({ service, onClick, isChild = false, isLastChild = false }: { service: UserService; onClick: () => void; isChild?: boolean; isLastChild?: boolean }) {
  const { t, i18n } = useTranslation();
  const statusColor = statusColors[service.status] || 'gray';
  const statusLabel = t(`status.${service.status}`, service.status);
  const expiry = getExpiryState(service.expire);

  if (isChild) {
    return (
      <Group gap={0} wrap="nowrap" align="stretch">
        <Box
          style={{
            width: 24,
            position: 'relative',
            flexShrink: 0,
          }}
        >
          <Box
            style={{
              position: 'absolute',
              left: 10,
              top: 0,
              bottom: isLastChild ? '50%' : 0,
              width: 2,
              backgroundColor: 'var(--mantine-color-gray-4)',
            }}
          />
          <Box
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              width: 14,
              height: 2,
              backgroundColor: 'var(--mantine-color-gray-4)',
            }}
          />
        </Box>
        <Card
          withBorder
          radius="md"
          p="sm"
          className="service-overview-card service-overview-card--child" style={{ cursor: 'pointer', flex: 1 }}
          onClick={onClick}
        >
          <Group justify="space-between">
            <div>
              <Text fw={500} size="sm">#{service.user_service_id} - {service.service.name}</Text>
              {service.expire && (
                <Text size="xs" c="dimmed">
                  {new Date(service.expire as string).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US')}
                </Text>
              )}
            </div>
            <Group gap="sm">
              {service.service.cost > 0 && (
                <Text size="sm" c="dimmed">{service.service.cost} {t('common.currency')}</Text>
              )}
              <Badge color={statusColor} variant="light" size="sm">
                {statusLabel}
              </Badge>
            </Group>
          </Group>
        </Card>
      </Group>
    );
  }

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      className="service-overview-card" style={{ cursor: 'pointer', borderInlineStart: `3px solid var(--mantine-color-${statusColor}-6)`, borderRadius: 16, padding: 20 }}
      onClick={onClick}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start" gap="md">
          <div style={{ minWidth: 0 }}>
            <Text size="xs" c="dimmed" mb={4}>Услуга #{service.user_service_id}</Text>
            <Text size="sm" fw={600} style={{ overflowWrap: 'anywhere' }}>{service.service.name}</Text>
          </div>
          <Badge color={statusColor} variant="light" size="md" radius="sm">{statusLabel}</Badge>
        </Group>
        <Divider className="service-card__divider" />
        <Group justify="space-between" gap="md" align="center">
          <Stack gap={2}>
            <Text size="xs" c="dimmed">Стоимость продления</Text>
            <Text fw={700} size="lg" className="service-card__price">{service.service.cost > 0 ? `${service.service.cost} ${t('common.currency')}` : '—'}</Text>
          </Stack>
          <Stack gap={2} align="flex-end">
            <Text size="xs" c="dimmed">Действует до</Text>
            <Text size="sm" fw={600}>{service.expire ? new Date(service.expire as string).toLocaleDateString(i18n.language === 'ru' ? 'ru-RU' : 'en-US') : 'Не указан'}</Text>
          </Stack>
        </Group>
        {expiry.label && <Text size="xs" className={`service-card__expiry expiry-indicator--${expiry.tone}`}>{expiry.label}</Text>}
        <Button fullWidth variant="light" size="sm" rightSection={<IconArrowRight size={15} />} onClick={(event) => { event.stopPropagation(); onClick(); }}>Открыть услугу</Button>
      </Stack>
    </Card>
  );
}

export default function Services() {
  const { serviceId } = useParams();
  const [services, setServices] = useState<UserService[]>([]);
  const loadedRef = useRef(false);
  const [loadError, setLoadError] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderModalOpened, { open: openOrderModal, close: closeOrderModal }] = useDisclosure(false);
  useEffect(() => { if (new URLSearchParams(window.location.search).get('order') === '1') openOrderModal(); }, [openOrderModal]);
  const [changeModalOpened, { open: openChangeModal, close: closeChangeModal }] = useDisclosure(false);
  const [changeService, setChangeService] = useState<UserService | null>(null);
  const refreshAttemptsRef = useRef(0);
  const [categoryPages, setCategoryPages] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const perPage = 5;
  const { t } = useTranslation();
  const { userEmailVerified, setOpenVerifyModal, userEmail: storeEmail, isEmailLoaded, setOpenEmailModal } = useStore();
  const emailBlocked = config.EMAIL_REQUIRED === 'true' && isEmailLoaded && !storeEmail;
  const [confirmEmailNotVerified, setConfirmEmailNotVerified] = useState(false);
  const navigate = useNavigate();

  const handleEmailNotVerified = async () => {
    setOpenVerifyModal(true);
    navigate('/');
  };

  const fetchServices = async (background = false) => {
    if (!background && !loadedRef.current) setLoading(true);
    setRefreshing(true);
    try {
      const response = await api.get('/user/service', { params: { limit: 1000 } });
      const raw: UserService[] = response.data?.data;
      if (!Array.isArray(raw)) throw new Error('Invalid services response');
      const data: UserService[] = raw.filter((item) => item && typeof item === 'object' && item.user_service_id != null).map((item: UserService & { category?: string; cost?: string | number; name?: string }) => ({
        ...item,
        service: {
          category: String(item.service?.category ?? item.category ?? ''),
          cost: Number(item.service?.cost ?? item.cost ?? 0) || 0,
          name: String(item.service?.name ?? item.name ?? 'Услуга'),
        },
      }));

      const serviceMap = new Map<number, UserService>();
      data.forEach(s => serviceMap.set(s.user_service_id, { ...s, children: [] }));

      const rootServices: UserService[] = [];
      serviceMap.forEach(service => {
        if (service.parent && serviceMap.has(service.parent)) {
          const parent = serviceMap.get(service.parent)!;
          parent.children = parent.children || [];
          parent.children.push(service);
        } else if (!service.parent) {
          rootServices.push(service);
        }
      });

      setServices(rootServices);
      loadedRef.current = true; setLoadError(false); setUpdatedAt(new Date());
      try { saveOfflineServices(data); } catch { /* Storage may be unavailable in private browsing. */ }
      return rootServices;
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setLoadError(true);
      if (loadedRef.current) return services;
      const offline = (readOfflineServices() as UserService[]).filter((item) => item && typeof item === 'object' && item.user_service_id != null).map((item) => ({ ...item, service: { category: String(item.service?.category ?? ''), name: String(item.service?.name ?? item.name ?? 'Услуга'), cost: Number(item.service?.cost ?? 0) || 0 } }));
      const offlineMap = new Map<number, UserService>();
      offline.forEach((item) => offlineMap.set(item.user_service_id, { ...item, children: [] }));
      const roots: UserService[] = [];
      offlineMap.forEach((item) => { if (item.parent && offlineMap.has(item.parent)) offlineMap.get(item.parent)!.children!.push(item); else if (!item.parent) roots.push(item); });
      setServices(roots);
      return roots;
    } finally {
      setLoading(false); setRefreshing(false);
    }
  };

  const hasProgressServices = (serviceList: UserService[]): boolean => {
    for (const service of serviceList) {
      if (service.status === 'PROGRESS') return true;
      if (service.children && hasProgressServices(service.children)) return true;
    }
    return false;
  };

  const hasNotPaidServices = (serviceList: UserService[]): boolean => {
    for (const service of serviceList) {
      if (service.status === 'NOT PAID') return true;
      if (service.children && hasNotPaidServices(service.children)) return true;
    }
    return false;
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    if (!services.length || loading) return;

    const hasProgress = hasProgressServices(services);

    if (hasProgress && refreshAttemptsRef.current < 2) {
      const delay = refreshAttemptsRef.current === 0 ? 1000 : 3000;
      const timer = setTimeout(async () => {
        refreshAttemptsRef.current += 1;
        await fetchServices(true);
      }, delay);
      return () => clearTimeout(timer);
    }

    if (!hasProgress) {
      refreshAttemptsRef.current = 0;
    }
  }, [services, loading]);

  useEffect(() => {
    if (!services.length || loading) return;

    const hasNotPaid = hasNotPaidServices(services);
    if (!hasNotPaid) return;

    const interval = setInterval(() => {
      fetchServices(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [services, loading]);

  const handleServiceClick = (service: UserService) => {
    navigate(`/services/${service.user_service_id}`);
  };

  const handleChangeTariff = (service: UserService) => {
    setChangeService(service);
    if (serviceId) navigate('/services');
    openChangeModal();
  };

  const flatServices = services.flatMap((service) => [service, ...(service.children || [])]);
  const detailService = serviceId ? flatServices.find((service) => String(service.user_service_id) === serviceId) : undefined;
  const searchValue = search.trim().toLowerCase();
  const visibleServices = searchValue
    ? services.filter((service) =>
      `${service.service.name} ${service.user_service_id}`.toLowerCase().includes(searchValue)
      || (service.children || []).some((child) =>
        `${child.service.name} ${child.user_service_id}`.toLowerCase().includes(searchValue),
      ),
    )
    : services;

  const groupedServices = visibleServices.reduce((acc, service) => {
    const category = normalizeCategory(service.service.category);

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(service);
    return acc;
  }, {} as Record<string, UserService[]>);

  if (loadError && !services.length && !loading) return <Stack><DataLoadStatus loading={refreshing} error="Не удалось загрузить услуги" updatedAt={updatedAt} onRetry={() => void fetchServices()} /></Stack>;

  if (loading) {
    return <Stack gap="sm" className="services-overview services-skeletons"><Skeleton height={86} radius="lg" /><Skeleton height={66} radius="lg" /><Skeleton height={148} radius="lg" /><Skeleton height={148} radius="lg" /></Stack>;
  }

  if (serviceId) {
    if (!detailService) return <Stack className="service-detail-page" gap="md"><Button component={Link} to="/services" variant="subtle" leftSection={<IconArrowLeft size={16} />}>Все услуги</Button><Paper withBorder p="xl" radius="lg"><Title order={3}>Услуга не найдена</Title><Text c="dimmed" mt="xs">Обновите список услуг и попробуйте ещё раз.</Text><Button mt="md" onClick={() => void fetchServices()}>Обновить список</Button></Paper></Stack>;
    const statusLabel = t(`status.${detailService.status}`, detailService.status);
    const expiry = getExpiryState(detailService.expire);
    return <Stack gap="lg" className="service-detail-page"><Button component={Link} to="/services" variant="subtle" className="service-detail-page__back" leftSection={<IconArrowLeft size={16} />}>Все услуги</Button><Paper withBorder radius="lg" p="xl" className="service-detail-page__summary" style={{ borderRadius: 20, borderTop: '3px solid var(--mantine-primary-color-filled)', background: 'var(--mantine-color-body)' }}><Group justify="space-between" align="flex-start"><div><Text c="dimmed" size="xs">Услуга #{detailService.user_service_id}</Text><Title order={2} mt={6} style={{ fontSize: 'clamp(1rem, 2.5vw, 1.25rem)', lineHeight: 1.3, overflowWrap: 'anywhere' }}>{detailService.service.name}</Title><Text c="dimmed" size="sm" mt={6}>Подключение, срок действия и настройки подписки.</Text></div><Stack gap="xs" align="flex-end"><Badge color={statusColors[detailService.status] || 'gray'} size="lg" variant="light">{statusLabel}</Badge>{expiry.label && <Text className={`expiry-indicator expiry-indicator--${expiry.tone}`}><IconCalendarTime size={15} />{expiry.label}</Text>}</Stack></Group></Paper><ServiceDetail service={detailService} onDelete={() => { void fetchServices(); navigate('/services'); }} onChangeTariff={handleChangeTariff} /></Stack>;
  }

  return (
    <Stack gap="lg" className="services-overview">
      <DataLoadStatus showRefresh={false} loading={refreshing} error={loadError && "Не удалось обновить услуги"} updatedAt={updatedAt} onRetry={() => void fetchServices()} />
      <Group className="page-header services-overview__header" justify="space-between">
        <div style={{ minWidth: 0 }}><Title className="page-header__title" order={2}>{t('services.title')}</Title><Text c="dimmed" size="sm" mt={6}>Ваши подписки, подключение и управление тарифами.</Text></div>
        <Group>
          <Button
            leftSection={<IconPlus size={16} />}
            disabled={config.BLOCK_ORDER_IF_UNPAID === 'true' && hasNotPaidServices(services)}
            title={config.BLOCK_ORDER_IF_UNPAID === 'true' && hasNotPaidServices(services) ? t('order.blockedByUnpaid') : undefined}
            onClick={emailBlocked ? () => setOpenEmailModal(true) : (config.EMAIL_VERIFY_REQUIRED === "true" && !userEmailVerified ? () => setConfirmEmailNotVerified(true) : openOrderModal)}
          >
            {t('services.orderService')}
          </Button>
          <Button leftSection={<IconRefresh size={16} />} variant="light" color="cyan" onClick={() => fetchServices()}>
            {t('common.refresh')}
          </Button>
        </Group>
      </Group>

      <Group className="services-summary" gap="sm">
<Badge color="green" variant="light">Активны: {flatServices.filter((item) => item.status === 'ACTIVE').length}</Badge>
<Badge color="orange" variant="light">Ожидают оплаты: {flatServices.filter((item) => item.status === 'NOT PAID').length}</Badge>
<Text size="sm" c="dimmed">Всего: {flatServices.length}</Text>
</Group>

      <TextInput size="md" radius="md" className="services-search" value={search} onChange={(event) => setSearch(event.currentTarget.value)} placeholder="Поиск по названию или номеру услуги" leftSection={<IconSearch size={16} />} />

      {Object.keys(groupedServices).length === 0 ? (
        <Paper withBorder p="xl" radius="md">
          <Center>
            <Stack align="center" gap="md">
              <Text c="dimmed">{t('services.noServices')}</Text>
              <Button leftSection={<IconPlus size={16} />} onClick={emailBlocked ? () => setOpenEmailModal(true) : (config.EMAIL_VERIFY_REQUIRED === "true"  && !userEmailVerified ? () => setConfirmEmailNotVerified(true) : openOrderModal)}>
                {t('services.orderService')}
              </Button>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <Accordion variant="separated" radius="md" multiple defaultValue={Object.keys(groupedServices)}>
          {Object.entries(groupedServices).map(([category, categoryServices]) => {
            const page = categoryPages[category] || 1;
            const totalPages = Math.ceil(categoryServices.length / perPage);
            const paginatedServices = categoryServices.slice((page - 1) * perPage, page * perPage);
            let categoryTitle;
            if ( category === 'vpn' && config.VPN_CATEGORY_TITLE ) {
              categoryTitle = config.VPN_CATEGORY_TITLE
            } else if ( category === 'proxy' && config.PROXY_CATEGORY_TITLE ) {
              categoryTitle = config.PROXY_CATEGORY_TITLE
            } else {
              categoryTitle = t(`categories.${category}`, category);
            }
            return (
            <Accordion.Item key={category} value={category}>
              <Accordion.Control>
                <Group>
                  <Text size="sm" fw={600}>{ categoryTitle }</Text>
                  <Badge variant="light" size="xs">{categoryServices.length}</Badge>
                </Group>
              </Accordion.Control>
              <Accordion.Panel>
                <Stack gap="sm">
                  {paginatedServices.map((service) => (
                    <Box key={service.user_service_id}>
                      <ServiceCard
                        service={service}
                        onClick={() => handleServiceClick(service)}
                      />
                      {service.children && service.children.length > 0 && (
                        <Stack gap="xs" mt="xs" ml="md">
                          {service.children.map((child, index) => (
                            <ServiceCard
                              key={child.user_service_id}
                              service={child}
                              onClick={() => handleServiceClick(child)}
                              isChild
                              isLastChild={index === service.children!.length - 1}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  ))}
                  {totalPages > 1 && (
                    <Center mt="xs">
                      <Pagination
                        total={totalPages}
                        value={page}
                        onChange={(p) => setCategoryPages(prev => ({ ...prev, [category]: p }))}
                        size="sm"
                      />
                    </Center>
                  )}
                </Stack>
              </Accordion.Panel>
            </Accordion.Item>
            );
          })}
        </Accordion>
      )}

      <OrderServiceModal
        opened={orderModalOpened}
        onClose={closeOrderModal}
        onOrderSuccess={() => {
          refreshAttemptsRef.current = 0;
          fetchServices();
        }}
      />

      <OrderServiceModal
        opened={changeModalOpened}
        onClose={() => {
          setChangeService(null);
          closeChangeModal();
        }}
        mode="change"
        currentService={
          changeService
            ? {
                user_service_id: changeService.user_service_id,
                service_id: changeService.service_id,
                status: changeService.status,
                category: changeService.service.category,
                name: changeService.service.name,
              }
            : undefined
        }
        onChangeSuccess={() => {
          refreshAttemptsRef.current = 0;
          fetchServices();
        }}
      />

      <ConfirmModal
        opened={confirmEmailNotVerified}
        onClose={() => setConfirmEmailNotVerified(false)}
        onConfirm={handleEmailNotVerified}
        title={t('services.emailNotVerifiedtitle')}
        message={t('services.emailNotVerifiedDesc')}
        confirmLabel={t('services.emailNotVerifiedAction')}
        confirmColor="orange"
      />

    </Stack>
  );
}



import './Pages.css';
