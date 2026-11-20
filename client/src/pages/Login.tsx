import LandingSections from '../components/LandingSections';
import NodeLatency from '../components/NodeLatency';
import './Login.css';
import { useAuthOptions } from '../hooks/useAuthOptions';
import { useEffect, useRef, useState } from 'react';
import { Card, Text, Stack, Button, ActionIcon, TextInput, PasswordInput, Divider, Title, Modal, Group, Loader, useMantineColorScheme, useComputedColorScheme, Checkbox, Tooltip } from '@mantine/core';

import { useForm, isEmail, hasLength } from '@mantine/form';
import { IconLogin, IconUserPlus, IconHeadset, IconFingerprint, IconShieldLock, IconBrandTelegram, IconMailForward, IconLock, IconMoon, IconSun, IconAt, IconKey } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { auth, monitorApi, passkeyApi, userApi, telegramSessionId } from '../api/client';
import { setCookie, getResetTokenCookie, removeResetTokenCookie, parseAndSaveResetToken } from '../api/cookie';
import { useStore } from '../store/useStore';

import { config } from '../config';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import LanguageSwitcher from '../components/LanguageSwitcher';
import DocumentModal from '../components/DocumentModal';
import { hasTelegramWebAppAutoAuth, hasTelegramWebAppAuth } from '../constants/webapp';

function isPdf(value: string) {
  return value.toLowerCase().endsWith('.pdf');
}

function base64UrlToArrayBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');

  return (
    <ActionIcon
      onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
      variant="default"
      size="lg"
      aria-label={computedColorScheme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
    >
      {computedColorScheme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
    </ActionIcon>
  );
}

export default function Login() {
  const { loginEnabled, registerEnabled, captchaEnabled, telegramEnabled, telegramProfile, providers } = useAuthOptions();
  const colorScheme = useComputedColorScheme('dark');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  useEffect(() => { if (!registerEnabled) setMode('login'); }, [registerEnabled]);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('register') && registerEnabled) {
      setMode('register');
    }
  }, [registerEnabled]);
  const [authOpen, setAuthOpen] = useState(() => new URLSearchParams(location.search).has('register'));
  const [main, setMain] = useState<Record<string, any>>({});
  useEffect(() => { void fetch('/shm/v1/system/main').then(response => response.ok ? response.json() : null).then(body => { const value = body?.data ?? body; if (value && typeof value === 'object') setMain(Array.isArray(value) ? value[0] || {} : value); }).catch(() => undefined); }, []);
  const [monitor, setMonitor] = useState<{ enabled?: boolean; state?: string; nodes?: Array<{ name: string; country?: string; ping_url?: string; latency_ms?: number | null; status: string }> }>({});
  useEffect(() => {
    let cancelled = false;
    let pending = false;
    const load = () => {
      if (pending || document.hidden) return;
      pending = true;
      void monitorApi.get().then(response => {
        if (cancelled) return;
        const value = response.data?.data ?? response.data;
        setMonitor(Array.isArray(value) ? value[0] || {} : value || {});
      }).catch(() => { if (!cancelled) setMonitor(previous => ({ enabled: previous.enabled, state: 'unknown', nodes: [] })); }).finally(() => { pending = false; });
    };
    const handleVisibility = () => { if (document.visibilityState === 'visible') load(); };
    load();
    const timer = window.setInterval(load, 60000);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => { cancelled = true; window.clearInterval(timer); document.removeEventListener('visibilitychange', handleVisibility); };
  }, []);
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const [loading, setLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [loginOrEmail, setLoginOrEmail] = useState('');
  const requireEmailRegister = config.EMAIL_REQUIRED === 'true';
  const [captcha, setCaptcha] = useState<{ image?: string; question?: string; token: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPasswordData, setNewPasswordData] = useState({ password: '', confirmPassword: '' });
  const [acceptedLegal, setAcceptedLegal] = useState(false);
  const [verifyingToken, setVerifyingToken] = useState(false);
  const [docModalUrl, setDocModalUrl] = useState('');
  const [docModalTitle, setDocModalTitle] = useState('');
  const { setUser, setTelegramPhoto } = useStore();
  const { t } = useTranslation();

  const modeRef = useRef(mode);
  modeRef.current = mode;
  const form = useForm({
    mode: 'controlled',
    validateInputOnBlur: true,
    initialValues: { login: '', password: '', confirmPassword: '' },
    validate: {
      login: (value) => {
        if (modeRef.current === 'register') {
          if (requireEmailRegister) {
            return isEmail(t('auth.invalidEmail'))(value);
          }
          return hasLength({ min: 6 }, t('auth.loginTooShort'))(value);
        }
        return null;
      },
      password: (value) => {
        if (modeRef.current !== 'register') return null;
        return hasLength({ min: 6 }, t('auth.passwordTooShort'))(value);
      },
      confirmPassword: (value, values) => {
        if (modeRef.current !== 'register') return null;
        return value === values.password ? null : t('auth.passwordsMismatch');
      },
    },
  });
  const isWebAuthnSupported = !!window.PublicKeyCredential;
  const { telegramWebApp } = useTelegramWebApp();
  const autoAuthTriggeredRef = useRef(false);
  const autoAuthAttemptKey = 'tg_webapp_auto_auth_attempted';
  const autoAuthCooldownMs = 60 * 1000;
  const legalLinks = [
    { href: config.PRIVACY_POLICY_URL, label: t('common.privacyPolicy') },
    { href: config.TERMS_OF_USE_URL, label: t('common.termsOfUse') },
    { href: config.PUBLIC_OFFER_URL, label: t('common.publicOffer') },
    { href: config.USER_AGREEMENT_URL, label: t('common.userAgreement') },
  ].filter((link) => Boolean(link.href));
  const hasLegalLinks = legalLinks.length > 0;

  const fetchCaptcha = async () => {
    try {
      const res = await auth.getCaptcha();
      const raw = res.data?.data;
      setCaptcha(Array.isArray(raw) ? raw[0] : raw);
      setCaptchaAnswer('');
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (mode === 'register' && captchaEnabled) {
      void fetchCaptcha();
    } else {
      setCaptcha(null);
      setCaptchaAnswer('');
    }
  }, [mode, captchaEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (mode !== 'register') {
      setAcceptedLegal(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!hasTelegramWebAppAutoAuth || autoAuthTriggeredRef.current || !telegramWebApp?.initData) {
      return;
    }

    const lastAttempt = Number(sessionStorage.getItem(autoAuthAttemptKey) || 0);
    if (lastAttempt && Date.now() - lastAttempt < autoAuthCooldownMs) {
      return;
    }

    autoAuthTriggeredRef.current = true;
    sessionStorage.setItem(autoAuthAttemptKey, String(Date.now()));
    setShowLoginForm(false);
    void handleTelegramWebAppAuth();
  }, [hasTelegramWebAppAutoAuth, telegramWebApp?.initData]);

  useEffect(() => {
    const checkResetToken = async () => {
      const urlToken = parseAndSaveResetToken();
      const token = urlToken || getResetTokenCookie();

      if (!token) return;

      setVerifyingToken(true);
      setResetToken(token);

      try {
        const response = await userApi.verifyResetToken(token);
        const msg = response.data?.data?.[0]?.msg || response.data?.data?.msg;

        if (msg === 'Successful') {
          setShowNewPasswordForm(true);
        } else {
          notifications.show({ title: t('common.error'), message: t('auth.invalidResetToken'), color: 'red' });
          removeResetTokenCookie();
          setResetToken(null);
        }
      } catch {
        notifications.show({ title: t('common.error'), message: t('auth.invalidResetToken'), color: 'red' });
        removeResetTokenCookie();
        setResetToken(null);
      } finally {
        setVerifyingToken(false);
      }
    };

    checkResetToken();
  }, []);

  const handleNewPasswordSubmit = async () => {
    if (!newPasswordData.password || !newPasswordData.confirmPassword) {
      notifications.show({ title: t('common.error'), message: t('auth.fillAllFields'), color: 'red' });
      return;
    }

    if (newPasswordData.password !== newPasswordData.confirmPassword) {
      notifications.show({ title: t('common.error'), message: t('auth.passwordsMismatch'), color: 'red' });
      return;
    }

    if (!resetToken) {
      notifications.show({ title: t('common.error'), message: t('auth.invalidResetToken'), color: 'red' });
      return;
    }

    setResetLoading(true);
    try {
      const response = await userApi.resetPasswordWithToken(resetToken, newPasswordData.password);
      const msg = response.data?.data?.[0]?.msg || response.data?.data?.msg;

      if (msg === 'Password reset successful') {
        notifications.show({ title: t('common.success'), message: t('auth.passwordResetSuccess'), color: 'green' });
      } else {
        notifications.show({ title: t('common.error'), message: t('auth.invalidResetToken'), color: 'red' });
      }
    } catch {
      notifications.show({ title: t('common.error'), message: t('auth.invalidResetToken'), color: 'red' });
    } finally {
      removeResetTokenCookie();
      setResetToken(null);
      setShowNewPasswordForm(false);
      setNewPasswordData({ password: '', confirmPassword: '' });
      setResetLoading(false);
    }
  };

  const handleLogin = async (otpTokenParam?: string) => {
    if (!form.values.login || !form.values.password) {
      notifications.show({ title: t('common.error'), message: t('auth.fillAllFields'), color: 'red' });
      return;
    }

    setLoading(true);
    try {
      const result = await auth.login(form.values.login, form.values.password, otpTokenParam);

      if (result.otpRequired) {
        setShowOtp(true);
        setLoading(false);
        return;
      }

      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);
      setShowOtp(false);
      setOtpToken('');
      notifications.show({ title: t('common.success'), message: t('auth.loginSuccess'), color: 'green' });
    } catch (error: unknown) {
      const axiosError = error as { response?: { status?: number; data?: { error?: string } } };
      if (axiosError.response?.status === 429) {
        notifications.show({ title: t('common.error'), message: t('auth.tooManyRequests'), color: 'red' });
      } else if (axiosError.response?.status === 403 && axiosError.response?.data?.error?.includes('Password authentication is disabled')) {
        notifications.show({ title: t('common.error'), message: t('auth.passwordAuthDisabled'), color: 'red' });
      } else {
        notifications.show({ title: t('common.error'), message: t('auth.loginError'), color: 'red' });
      }
      setOtpToken('');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otpToken) {
      notifications.show({ title: t('common.error'), message: t('otp.enterValidCode'), color: 'red' });
      return;
    }
    await handleLogin(otpToken);
  };

  const handleRegister = async () => {
    const { hasErrors } = form.validate();
    if (hasErrors) return;

    if (hasLegalLinks && !acceptedLegal) {
      notifications.show({ title: t('common.error'), message: t('auth.acceptDocumentsRequired'), color: 'red' });
      return;
    }

    const { login, password } = form.values;
    if (!login || !password) {
      notifications.show({ title: t('common.error'), message: t('auth.fillAllFields'), color: 'red' });
      return;
    }

    if (captchaEnabled && (!captcha || !captchaAnswer.trim())) {
      notifications.show({ title: t('common.error'), message: t('auth.captchaRequired'), color: 'red' });
      return;
    }

    setLoading(true);
    try {
      await auth.register(login, password, captcha?.token, captchaAnswer || undefined);
      notifications.show({ title: t('common.success'), message: t('auth.registerSuccess'), color: 'green' });
      setMode('login');
      form.setValues({ confirmPassword: '' });
      setCaptchaAnswer('');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { error?: string } } };
      const errMsg = axiosError.response?.data?.error || '';
      const axiosStatus = (error as { response?: { status?: number } }).response?.status;
      if (axiosStatus === 429) {
        notifications.show({ title: t('common.error'), message: t('auth.tooManyRequests'), color: 'red' });
      } else if (errMsg === 'Invalid captcha') {
        notifications.show({ title: t('common.error'), message: t('auth.captchaInvalid'), color: 'red' });
      } else if (errMsg === 'Captcha required') {
        notifications.show({ title: t('common.error'), message: t('auth.captchaRequired'), color: 'red' });
      } else if (errMsg === 'Login already in use' || errMsg === 'Email already in use') {
        notifications.show({ title: t('common.error'), message: t('auth.loginAlreadyInUse'), color: 'red' });
      } else {
        notifications.show({ title: t('common.error'), message: t('auth.registerError'), color: 'red' });
      }
      if (captchaEnabled) void fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'login') {
      await handleLogin();
    } else {
      await handleRegister();
    }
  };

  const handleTelegramOidcAuth = async () => {
    setLoading(true);
    try {
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      const response = await auth.telegramOidcInit({
        profile: telegramProfile,
        register_if_not_exists: registerEnabled ? 1 : 0,
        return_url: returnUrl,
      });
      const raw = response.data?.data ?? response.data;
      const payload = Array.isArray(raw) ? raw[0] : raw;
      const problem = response.data?.error || payload?.error;
      if (problem || !payload?.auth_url) throw new Error(typeof problem === 'string' ? problem : 'Telegram OIDC: сервер не вернул адрес входа. Проверьте настройки профиля бота.');
      const destination = new URL(payload.auth_url);
      if (destination.origin !== 'https://oauth.telegram.org') throw new Error('Telegram OIDC: недопустимый адрес авторизации.');
      window.location.assign(destination.href);
    } catch (error) {
      const detail = (error as { response?: { data?: { error?: unknown } } }).response?.data?.error;
      const message = typeof detail === 'string' ? detail : error instanceof Error ? error.message : t('auth.telegramAuthError');
      notifications.show({ title: t('common.error'), message, color: 'red', autoClose: 10000 });
      setLoading(false);
    }
  };

  const handleTelegramWebAppAuth = async () => {
    if (!telegramWebApp?.initData) {
      notifications.show({ title: t('common.error'), message: t('auth.telegramAuthError'), color: 'red' });
      setShowLoginForm(true);
      return;
    }

    setLoading(true);
    try {
      const profile = config.TELEGRAM_WEBAPP_PROFILE || '';
      const authResponse = await auth.telegramWebAppAuth(telegramWebApp.initData, profile);
      const sessionId = telegramSessionId(authResponse.data);
      if (!sessionId) {
        notifications.show({ title: t('common.error'), message: t('auth.telegramAuthError'), color: 'red' });
        setShowLoginForm(true);
        return;
      }

      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);

      if (telegramWebApp.initDataUnsafe?.user?.photo_url) {
        setTelegramPhoto(telegramWebApp.initDataUnsafe.user.photo_url);
      }

      notifications.show({ title: t('common.success'), message: t('auth.telegramAuth'), color: 'green' });
    } catch {
      notifications.show({ title: t('common.error'), message: t('auth.telegramAuthError'), color: 'red' });
      setShowLoginForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!loginOrEmail) {
      notifications.show({ title: t('common.error'), message: t('auth.resetEnterLogin'), color: 'red' });
      return;
    }

    setResetLoading(true);
    try {
      const loginResponse = await userApi.resetPassword({ login: loginOrEmail });
      const loginMsg = loginResponse.data?.data?.[0]?.msg || loginResponse.data?.data?.msg;
      if (loginMsg === 'Successful') {
        notifications.show({ title: t('common.success'), message: t('auth.resetSuccess'), color: 'green' });
        setShowResetPassword(false);
        setResetLoading(false);
        return;
      }

      const emailResponse = await userApi.resetPassword({ email: loginOrEmail });
      const emailMsg = emailResponse.data?.data?.[0]?.msg || emailResponse.data?.data?.msg;
      if (emailMsg === 'Successful') {
        notifications.show({ title: t('common.success'), message: t('auth.resetSuccess'), color: 'green' });
        setShowResetPassword(false);
        setResetLoading(false);
        return;
      }

      notifications.show({ title: t('common.error'), message: t('auth.resetNotFound'), color: 'red' });
    } catch {
      notifications.show({ title: t('common.error'), message: t('auth.resetNotFound'), color: 'red' });
    }
    setResetLoading(false);
  };

  const handlePasskeyAuth = async () => {
    if (!isWebAuthnSupported) {
      notifications.show({ title: t('common.error'), message: t('passkey.notSupported'), color: 'red' });
      return;
    }

    setPasskeyLoading(true);
    try {
      const optionsResponse = await passkeyApi.authOptionsPublic();
      const optionsData = optionsResponse.data.data;
      const options = Array.isArray(optionsData) ? optionsData[0] : optionsData;
      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: base64UrlToArrayBuffer(options.challenge),
        timeout: options.timeout,
        rpId: options.rpId,
        userVerification: options.userVerification as UserVerificationRequirement,
      };
      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      const response = credential.response as AuthenticatorAssertionResponse;
      const authResponse = await passkeyApi.authPublic({
        credential_id: arrayBufferToBase64Url(credential.rawId),
        rawId: arrayBufferToBase64Url(credential.rawId),
        response: {
          clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
          authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
          signature: arrayBufferToBase64Url(response.signature),
          userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : undefined,
        },
      });
      const authData = authResponse.data.data;
      const sessionData = Array.isArray(authData) ? authData[0] : authData;
      if (sessionData?.id) {
        setCookie(sessionData.id);
      }

      const userResponse = await auth.getCurrentUser();
      const responseData = userResponse.data.data;
      const userData = Array.isArray(responseData) ? responseData[0] : responseData;
      setUser(userData);

      notifications.show({ title: t('common.success'), message: t('auth.loginSuccess'), color: 'green' });
    } catch {
      notifications.show({ title: t('common.error'), message: t('passkey.authError'), color: 'red' });
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSupportLink = () => {
    if (config.SUPPORT_LINK) {
      window.open(config.SUPPORT_LINK, '_blank', 'noopener,noreferrer');
    }
  };

  return (
        <div className="welcome-page" data-theme={colorScheme}>
      <a className="welcome-skip" href="#welcome-main">К содержанию</a>
      <header className="welcome-header welcome-wrap">
        <a className="welcome-brand" href="#welcome-main">{config.LOGO_URL && <img src={config.LOGO_URL} alt="" />}<span>{main.name || config.APP_NAME}</span></a>
        <nav aria-label="Основное меню"><a href="#welcome-benefits">{main.nav_benefits || 'Возможности'}</a><a href="#welcome-connection">{main.nav_connection || 'Как начать'}</a><a href="#welcome-questions">{main.nav_questions || 'Вопросы'}</a></nav>
        <Group gap="xs"><ThemeToggle /><LanguageSwitcher /><Button onClick={() => { setMode('login'); setAuthOpen(true); }}>{main.secondary_button || 'Войти'}</Button></Group>
      </header>
      <main id="welcome-main" className="welcome-wrap">
        <section className="welcome-hero">
          <div className="welcome-copy"><p className="welcome-intro">{main.intro || 'Простой доступ к вашим услугам'}</p><h1>{main.title || 'Всё важное'}<br /><span>{main.accent_title || 'в одном кабинете.'}</span></h1><p className="welcome-description">{main.description || config.APP_DESCRIPTION || 'Личный кабинет, в котором всё уже готово: услуги, оплата, устройства и помощь.'}</p><div className="welcome-actions"><Button size="lg" onClick={() => { setMode(registerEnabled ? 'register' : 'login'); setAuthOpen(true); }}>{main.primary_button || (registerEnabled ? 'Начать сейчас' : 'Войти в кабинет')}</Button><Button size="lg" variant="default" onClick={() => { setMode('login'); setAuthOpen(true); }}>{main.login_button || 'У меня уже есть аккаунт'}</Button></div><p className="welcome-compatibility">{main.compatibility || 'iPhone · Android · Windows · macOS'}</p></div>
          <div className="welcome-hero-side">        {monitor.enabled && <section className="welcome-monitor" aria-label="Доступность серверов"><div className="welcome-monitor__head"><span>СЕТЬ</span><b className={monitor.state === 'unknown' ? 'is-unknown' : ''}><i />{monitor.state === 'ready' && monitor.nodes?.length && monitor.nodes.every(node => node.status === 'online') ? 'РАБОТАЕТ' : monitor.state === 'unknown' ? 'НЕТ СВЕЖИХ ДАННЫХ' : 'ЕСТЬ ОГРАНИЧЕНИЯ'}</b></div>{(monitor.nodes || []).map((node) => <div className="welcome-monitor__row" key={node.name}><i className={`welcome-monitor__dot welcome-monitor__dot--${node.status}`} /><div><strong>{node.name}</strong><small>{node.country || 'Сервер Remnawave'}</small></div><b><NodeLatency url={node.ping_url} serverLatency={node.latency_ms} />{node.status === 'online' ? 'РАБОТАЕТ' : node.status === 'maintenance' ? 'ТЕХРАБОТЫ' : node.status === 'offline' ? 'НЕДОСТУПЕН' : 'ПРОВЕРКА'}</b></div>)}</section>}</div>
        </section>

        <LandingSections main={main} nodes={monitor.nodes || []} onStart={() => { setMode(registerEnabled ? 'register' : 'login'); setAuthOpen(true); }} />
        <section id="welcome-benefits" className="welcome-benefits"><div><h2>{main.benefits_title || 'Всё нужное. Под рукой.'}</h2><p>{main.benefits_description || 'Управляйте услугами без лишних действий.'}</p></div>{(main.benefits || [{title:'Ваши подписки',description:'Срок действия и продление в карточке услуги.'},{title:'Ваши устройства',description:'Просматривайте привязки устройств в кабинете.'},{title:'Помощь рядом',description:'Инструкции и поддержка в одном месте.'}]).map((item: {title: string; description: string}, i: number) => <article key={i}><IconKey size={26}/><h3>{item.title}</h3><p>{item.description}</p></article>)}</section>
        <section id="welcome-connection" className="welcome-connection"><h2>{main.connection_title || 'Начать проще, чем кажется.'}</h2><ol>{(main.steps || [{title:'Создайте аккаунт',description:'Войдите удобным способом.'},{title:'Выберите услугу',description:'Доступные предложения находятся в кабинете.'},{title:'Активируйте сервис',description:'Следуйте инструкции выбранной услуги.'}]).map((item: {title: string; description: string}, i: number) => <li key={i}><b>{i+1}</b><h3>{item.title}</h3><p>{item.description}</p></li>)}</ol></section>
        <section id="welcome-questions" className="welcome-faq"><div><h2>{main.faq_title || 'Остались вопросы?'}</h2><p>{main.faq_description || 'Самое нужное перед первым входом.'}</p></div><div>{(main.faq || [{title:'Как войти в кабинет?',description:'Нажмите «Войти» и используйте доступный способ авторизации.'},{title:'Где посмотреть услуги?',description:'После входа откройте «Мои услуги».'},{title:'Забыл пароль — что делать?',description:'В форме входа нажмите «Забыли пароль?».'}]).map((item: {title: string; description: string}, i: number) => <details key={i}><summary>{item.title}</summary><p>{item.description}</p></details>)}</div></section><section className="welcome-final"><h2>{main.cta_title || 'Всё готово. Осталось начать.'}</h2><p>{main.cta_description || 'Выберите услугу и управляйте ею в одном личном кабинете.'}</p><Button size="lg" onClick={() => { setMode(registerEnabled ? 'register' : 'login'); setAuthOpen(true); }}>{main.primary_button || 'Начать сейчас'}</Button></section></main>
      <footer className="welcome-footer welcome-wrap"><strong>{main.name || config.APP_NAME}</strong><div>{config.SUPPORT_LINK && <button type="button" onClick={handleSupportLink}>Поддержка</button>}{legalLinks.map(link => <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">{link.label}</a>)}</div></footer>
      <Modal opened={authOpen} onClose={() => setAuthOpen(false)} centered size={460} padding={0} withCloseButton title={mode === 'login' ? 'Личный кабинет' : 'Создать аккаунт'} className={`welcome-auth-modal welcome-auth-modal-${colorScheme}`}>
      <Card className="auth-card" withBorder radius="md" p="xl" w={400}>
        <Stack gap="lg">
          <Group className="auth-topline" justify="space-between" align="center" wrap="nowrap">
            <Group className="auth-brand" gap="xs" wrap="nowrap">
              {config.LOGO_URL && <img src={config.LOGO_URL} alt="" width={32} height={32} />}
              <Text fw={700}>{main.name || config.APP_NAME}</Text>
            </Group>
            <Group className="auth-toolbar" gap="xs" wrap="nowrap">
              <ThemeToggle />
              <LanguageSwitcher />
            </Group>
          </Group>
          {config.APP_DESCRIPTION && (
            <Text size="sm" c="dimmed" ta="center" style={{ flex: 'auto' }}>{config.APP_DESCRIPTION}</Text>
          )}
          <Title order={3} className="auth-heading" ta="center">
              {mode === 'login' ? t('auth.loginTitle') : t('auth.registerTitle')}
          </Title>

          {!loginEnabled && <Text ta="center" c="dimmed">Вход временно отключён администратором.</Text>}

          {loginEnabled && hasTelegramWebAppAuth && !showLoginForm && (
            <>
              <Button
                color="blue"
                leftSection={<IconBrandTelegram size={18} />}
                onClick={handleTelegramWebAppAuth}
                fullWidth
                loading={loading}
              >
                {t('auth.loginWithTelegram')}
              </Button>

              <Divider label={t('common.or')} labelPosition="center" />

              <Button
                variant="light"
                onClick={() => setShowLoginForm(true)}
                fullWidth
              >
                {t('auth.useLoginPassword')}
              </Button>
            </>
          )}

          {loginEnabled && telegramEnabled && (
            <>
              <div className="auth-social-section">
              {telegramEnabled && (
                <Button
                  color="blue"
                  leftSection={<IconBrandTelegram size={18} />}
                  onClick={handleTelegramOidcAuth}
                  fullWidth
                  loading={loading}
                >
                  {t('auth.loginWithTelegram')}
                </Button>
              )}



              <Divider label={t('common.or')} labelPosition="center" />
              </div>
            </>
          )}

          {loginEnabled && providers.map((provider) => (
            <Button key={provider} className="auth-provider-button" variant="light" component="a"
              href={`/shm/v1/oauth2/start/${provider}?${new URLSearchParams({ return_url: `${window.location.origin}${window.location.pathname}` })}`}>
              {t('auth.login')} · {({ google: 'Google', yandex: 'Яндекс', vk: 'VK', github: 'GitHub' })[provider] || provider}
            </Button>
          ))}

          {loginEnabled && (!hasTelegramWebAppAuth || showLoginForm) && (
            <>
              <div className="auth-form-section">
              <div className="auth-section-label"><IconShieldLock size={15} /> {mode === 'login' ? t('auth.login') : t('auth.register')}</div>
              <form onSubmit={handleSubmit} aria-busy={loading}>
                <fieldset className="auth-fieldset" disabled={loading}>
                <Stack gap="sm">
                  {mode === 'register' && requireEmailRegister ? (
                    <TextInput
                      label={t('auth.emailLabel')}
                      placeholder={t('auth.emailPlaceholder')}
                      autoComplete="email"
                      name="email"
                      type="email"
                      leftSection={<IconAt size={16} />}
                      {...form.getInputProps('login')}
                    />
                  ) : (
                    <TextInput
                      label={t('auth.loginLabel')}
                      placeholder={t('auth.loginPlaceholder')}
                      autoComplete="username"
                      name="username"
                      leftSection={<IconAt size={16} />}
                      {...form.getInputProps('login')}
                    />
                  )}
                  <PasswordInput
                    label={t('auth.passwordLabel')}
                    placeholder={t('auth.passwordPlaceholder')}
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    name="password"
                    leftSection={<IconKey size={16} />}
                    {...form.getInputProps('password')}
                  />
                  {mode === 'register' && (
                    <PasswordInput
                      label={t('auth.confirmPasswordLabel')}
                      placeholder={t('auth.confirmPasswordPlaceholder')}
                      autoComplete="new-password"
                      name="confirm-password"
                      leftSection={<IconKey size={16} />}
                      {...form.getInputProps('confirmPassword')}
                    />
                  )}
                  {mode === 'register' && captchaEnabled && (
                    <Group gap="xs" align="center">
                      {captcha?.image ? (
                        <img
                          src={`data:image/svg+xml;base64,${captcha.image}`}
                          alt="captcha"
                          width={150}
                          style={{ borderRadius: 4, border: '1px solid #ddd' }}
                        />
                      ) : captcha?.question ? (
                        <Text size="lg" fw={500}>{captcha.question} =</Text>
                      ) : null}
                      <Button variant="subtle" size="compact-sm" px={8} onClick={fetchCaptcha} title={t('auth.captchaRefresh')}>
                        ↻
                      </Button>
                      <TextInput
                        style={{ width: 130 }}
                        placeholder={t('auth.captchaPlaceholder')}
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value.replace(/\D/g, '').slice(0, 2))}
                        maxLength={2}
                        disabled={!captcha}
                      />
                    </Group>
                  )}
                  {mode === 'register' && hasLegalLinks && (
                    <>
                      <DocumentModal
                        opened={!!docModalUrl}
                        onClose={() => setDocModalUrl('')}
                        url={docModalUrl}
                        title={docModalTitle}
                      />
                      <Checkbox
                        checked={acceptedLegal}
                        onChange={(e) => setAcceptedLegal(e.currentTarget.checked)}
                        label={
                          <Text size="sm">
                            {t('auth.acceptLegal')}{' '}
                            {legalLinks.map((link, index) => (
                              <Text
                                key={link.href}
                                component="span"
                                size="sm"
                              >
                                {index > 0 ? ', ' : ''}
                                {isPdf(link.href) ? (
                                  <Text
                                    component="a"
                                    href={link.href}
                                    c="blue"
                                    td="underline"
                                    size="sm"
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDocModalTitle(link.label);
                                      setDocModalUrl(link.href);
                                    }}
                                  >
                                    {link.label}
                                  </Text>
                                ) : (
                                  <Text
                                    component="a"
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    c="blue"
                                    td="underline"
                                    size="sm"
                                  >
                                    {link.label}
                                  </Text>
                                )}
                              </Text>
                            ))}
                          </Text>
                        }
                      />
                    </>
                  )}
                  <Button
                    type="submit"
                    leftSection={mode === 'login' ? <IconLogin size={18} /> : <IconUserPlus size={18} />}
                    loading={loading}
                    disabled={mode === 'register' && hasLegalLinks && !acceptedLegal}
                  >
                    {mode === 'login' ? t('auth.login') : t('auth.register')}
                  </Button>
                  {mode === 'login' && isWebAuthnSupported && config.PASSKEY_AUTH_DISABLED === 'false' && (
                    <Button
                      variant="light"
                      leftSection={<IconFingerprint size={18} />}
                      loading={passkeyLoading}
                      onClick={handlePasskeyAuth}
                    >
                      {t('passkey.loginWithPasskey')}
                    </Button>
                  )}
                </Stack>
                </fieldset>
              </form>
              </div>

              {registerEnabled && <Text size="sm" ta="center">
                {mode === 'login' ? (
                  <>
                    {t('auth.noAccount')}{' '}
                    <Text component="button" type="button" className="auth-text-button" c="blue" disabled={loading} onClick={() => { setMode('register'); form.clearErrors(); }}>
                      {t('auth.register')}
                    </Text>
                  </>
                ) : (
                  <>
                    {t('auth.hasAccount')}{' '}
                    <Text component="button" type="button" className="auth-text-button" c="blue" disabled={loading} onClick={() => { setMode('login'); form.clearErrors(); }}>
                      {t('auth.login')}
                    </Text>
                  </>
                )}
              </Text>}

              {mode === 'login' && (
                <Text size="sm" ta="center">
                  <Text component="button" type="button" className="auth-text-button" c="blue" disabled={loading} onClick={() => setShowResetPassword(true)}>
                    {t('auth.forgotPassword')}
                  </Text>
                </Text>
              )}

              {hasTelegramWebAppAuth && showLoginForm && (
                <>
                  <Divider label={t('common.or')} labelPosition="center" />
                  <Button
                    variant="outline"
                    color="blue"
                    leftSection={<IconBrandTelegram size={18} />}
                    onClick={handleTelegramWebAppAuth}
                    fullWidth
                    loading={loading}
                  >
                    {t('auth.loginWithTelegram')}
                  </Button>
                </>
              )}
            </>
          )}
        </Stack>
      </Card>
      </Modal>

      <Modal
        opened={showOtp}
        onClose={() => {
          setShowOtp(false);
          setOtpToken('');
        }}
        title={
          <Group gap="xs">
            <IconShieldLock size={20} />
            <Text fw={500}>{t('otp.title')}</Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t('otp.verifyDescription')}</Text>
          <TextInput
            label={t('otp.enterCode')}
            placeholder="000000"
            value={otpToken}
            onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, '').slice(0, 8))}
            maxLength={8}
            autoFocus
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => {
              setShowOtp(false);
              setOtpToken('');
            }}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleOtpSubmit}
              loading={loading}
              disabled={!otpToken}
            >
              {t('otp.verify')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showResetPassword}
        onClose={() => {
          setShowResetPassword(false);
          setResetLoading(false);
        }}
        title={t('auth.resetPasswordTitle')}
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t('auth.resetPasswordDescription')}</Text>
          <TextInput
            label={t('auth.loginOrEmail')}
            placeholder={t('auth.loginOrEmailPlaceholder')}
            value={loginOrEmail}
            onChange={(e) => setLoginOrEmail(e.target.value)}
            autoFocus
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => {
              setShowResetPassword(false);
              setResetLoading(false);
            }}>
              {t('common.cancel')}
            </Button>
            <Button
              leftSection={<IconMailForward size={16} />}
              onClick={handleResetPassword}
              loading={resetLoading}
              disabled={!loginOrEmail}
            >
              {t('auth.resetPasswordSend')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={showNewPasswordForm}
        onClose={() => {
          setShowNewPasswordForm(false);
          removeResetTokenCookie();
          setResetToken(null);
          setNewPasswordData({ password: '', confirmPassword: '' });
        }}
        title={
          <Group gap="xs">
            <IconLock size={20} />
            <Text fw={500}>{t('auth.newPasswordTitle')}</Text>
          </Group>
        }
        centered
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">{t('auth.newPasswordDescription')}</Text>
          <PasswordInput
            label={t('auth.newPasswordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            value={newPasswordData.password}
            onChange={(e) => setNewPasswordData({ ...newPasswordData, password: e.target.value })}
            autoFocus
          />
          <PasswordInput
            label={t('auth.confirmNewPasswordLabel')}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            value={newPasswordData.confirmPassword}
            onChange={(e) => setNewPasswordData({ ...newPasswordData, confirmPassword: e.target.value })}
          />
          <Group justify="flex-end" gap="sm">
            <Button variant="default" onClick={() => {
              setShowNewPasswordForm(false);
              removeResetTokenCookie();
              setResetToken(null);
              setNewPasswordData({ password: '', confirmPassword: '' });
            }}>
              {t('common.cancel')}
            </Button>
            <Button
              leftSection={<IconLock size={16} />}
              onClick={handleNewPasswordSubmit}
              loading={resetLoading}
              disabled={!newPasswordData.password || !newPasswordData.confirmPassword}
            >
              {t('auth.resetPasswordButton')}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {verifyingToken && (
        <Modal opened={true} onClose={() => {}} withCloseButton={false} centered>
          <Stack align="center" gap="md">
            <Loader />
            <Text>{t('auth.verifyingToken')}</Text>
          </Stack>
        </Modal>
      )}

      {config.SUPPORT_LINK && (
        isMobile ? (
          <Tooltip label={t('common.support')} position="left" withArrow>
            <ActionIcon
              onClick={handleSupportLink}
              style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200 }}
              radius="xl"
              size="xl"
              variant="filled"
            >
              <IconHeadset size={22} />
            </ActionIcon>
          </Tooltip>
        ) : (
          <Button
            onClick={handleSupportLink}
            style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 200 }}
            leftSection={<IconHeadset size={20} />}
            radius="xl"
            size="md"
          >
            {t('common.support')}
          </Button>
        )
      )}
    </div>
  );
}
