import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { config } from '../config';
import { hasTelegramOidcAuth, isTelegramWebApp } from '../constants/webapp';

export interface AuthOptions {
  auth?: { enabled?: boolean };
  register?: { enabled?: boolean };
  captcha?: { enabled?: boolean };
  telegram?: { enabled?: boolean; profile?: string };
  oauth2?: { providers?: Record<string, { enabled?: boolean }> };
}

export function useAuthOptions() {
  const [options, setOptions] = useState<AuthOptions | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/system/auth', { signal: controller.signal }).then(({ data }) => {
      const raw = data?.data ?? data;
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (value && typeof value === 'object') setOptions(value);
    }).catch(() => { /* Older SHM versions use the cabinet configuration. */ });
    return () => controller.abort();
  }, []);
  return {
    loginEnabled: options?.auth?.enabled !== false,
    registerEnabled: options?.register?.enabled !== false,
    captchaEnabled: options?.captcha?.enabled ?? (config.CAPTCHA_ENABLED === 'true'),
    telegramEnabled: !isTelegramWebApp && (options?.telegram?.enabled ?? hasTelegramOidcAuth),
    telegramProfile: options?.telegram?.profile || config.TELEGRAM_BOT_AUTH_PROFILE,
    providers: Object.entries(options?.oauth2?.providers ?? {})
      .filter(([name, value]) => ['google', 'yandex', 'github'].includes(name) && value.enabled === true)
      .map(([name]) => name),
  };
}
