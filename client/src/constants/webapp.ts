import { config } from '../config';
import { isInsideTelegramWebApp } from '../hooks/useTelegramWebApp';

const isWebApp = isInsideTelegramWebApp();
export const isTelegramWebApp = isWebApp;
export const hasTelegramWebAppAuth = isWebApp && config.TELEGRAM_WEBAPP_AUTH_ENABLE === 'true';
export const hasTelegramWebAppAutoAuth = hasTelegramWebAppAuth && config.TELEGRAM_WEBAPP_AUTO_AUTH_ENABLE === 'true';
// Existing deployments can retain the old enable flag; browser login uses OIDC.
export const hasTelegramOidcAuth = !isWebApp && (
  config.TELEGRAM_OIDC_AUTH_ENABLE === 'true' || config.TELEGRAM_BOT_AUTH_ENABLE === 'true'
);
