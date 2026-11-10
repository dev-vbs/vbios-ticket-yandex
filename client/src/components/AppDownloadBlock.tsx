import { Group, Button, Menu, ActionIcon, Tooltip } from '@mantine/core';
import {
  IconBrandWindows,
  IconBrandApple,
  IconBrandAndroid,
  IconBrandUbuntu,
  IconDownload,
  IconChevronDown,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { config } from '../config';
import { isTelegramWebApp } from '../constants/webapp';

interface AppPlatform {
  key: string;
  name: string;
  url: string;
  icon: React.ReactNode;
  detect: () => boolean;
}

interface AppDownloadBlockProps {
  type?: 'vpn' | 'proxy';
}

function getIconColor(key: string) {
  const colors: Record<string, string> = {
    windows: '#0078d4',
    macos: '#555',
    ios: '#555',
    android: '#3ddc84',
    linux: '#f7941d',
    androidtv: '#3ddc84',
  };
  return colors[key] || 'gray';
}

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua) && /Mobile/i.test(ua)) return 'android';
  if (/Android/i.test(ua)) return 'androidtv';
  if (/Windows NT/i.test(ua)) return 'windows';
  if (/Linux/i.test(ua)) return 'linux';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos';
  return '';
}

export default function AppDownloadBlock({ type }: AppDownloadBlockProps) {
  const { t } = useTranslation();
  const downloadLabel = t('services.download');

  function resolveName(vpnName: string, proxyName: string): string {
    if (type === 'vpn') return vpnName || downloadLabel;
    if (type === 'proxy') return proxyName || downloadLabel;
    return downloadLabel;
  }

  function resolveUrl(vpnUrl: string, proxyUrl: string): string {
    if (type === 'vpn') return vpnUrl || '';
    if (type === 'proxy') return proxyUrl || '';
    return '';
  }

  const allPlatforms: AppPlatform[] = [
    {
      key: 'windows',
      name: resolveName(config.VPN_WINDOWS_APP_NAME, config.PROXY_WINDOWS_APP_NAME),
      url: resolveUrl(config.VPN_APP_WINDOWS_URL, config.PROXY_APP_WINDOWS_URL),
      icon: <IconBrandWindows size={20} color={getIconColor('windows')} />,
      detect: () => false,
    },
    {
      key: 'linux',
      name: resolveName(config.VPN_LINUX_APP_NAME, config.PROXY_LINUX_APP_NAME),
      url: resolveUrl(config.VPN_APP_LINUX_URL, config.PROXY_APP_LINUX_URL),
      icon: <IconBrandUbuntu size={20} color={getIconColor('linux')} />,
      detect: () => false,
    },
    {
      key: 'macos',
      name: resolveName(config.VPN_MAC_APP_NAME, config.PROXY_MAC_APP_NAME),
      url: resolveUrl(config.VPN_APP_MAC_URL, config.PROXY_APP_MAC_URL),
      icon: <IconBrandApple size={20} color={getIconColor('macos')} />,
      detect: () => false,
    },
    {
      key: 'ios',
      name: resolveName(config.VPN_IOS_APP_NAME, config.PROXY_IOS_APP_NAME),
      url: resolveUrl(config.VPN_APP_IOS_URL, config.PROXY_APP_IOS_URL),
      icon: <IconBrandApple size={20} color={getIconColor('ios')} />,
      detect: () => false,
    },
    {
      key: 'android',
      name: resolveName(config.VPN_ANDROID_APP_NAME, config.PROXY_ANDROID_APP_NAME),
      url: resolveUrl(config.VPN_APP_ANDROID_URL, config.PROXY_APP_ANDROID_URL),
      icon: <IconBrandAndroid size={20} color={getIconColor('android')} />,
      detect: () => false,
    },
  ].filter((p) => !!p.url);

  if (allPlatforms.length === 0) return null;

  const detectedKey = detectPlatform();
  const primary = allPlatforms.find((p) => p.key === detectedKey) || allPlatforms[0];
  const others = allPlatforms.filter((p) => p.key !== primary.key);

  const handleOpenLink = (url: string) => {
    const tgWebApp = window.Telegram?.WebApp;
    if (tgWebApp && isTelegramWebApp) {
      tgWebApp.openLink(url);
    } else {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
      <Group gap="xs">
        <Button
          onClick={() => handleOpenLink(primary.url)}
          leftSection={primary.icon}
          rightSection={<IconDownload size={16} />}
          variant="light"
        >
          {primary.name}
        </Button>

        {others.length > 0 && (
          <Menu shadow="md" width={220} position="bottom-end">
            <Menu.Target>
              <Tooltip label={t('apps.otherPlatforms')}>
                <ActionIcon variant="light" size="lg">
                  <IconChevronDown size={16} />
                </ActionIcon>
              </Tooltip>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>{t('apps.otherPlatforms')}</Menu.Label>
              {others.map((p) => (
                <Menu.Item
                  key={p.key}
                  leftSection={p.icon}
                  onClick={() => handleOpenLink(p.url)}
                >
                  {p.name}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        )}
      </Group>
  );
}
