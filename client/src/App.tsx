import NotificationsPage from './pages/NotificationsPage';
import '@mantine/core/styles.css';
import { BalancePage, OperationsPage } from './pages/AccountSections';
import '@mantine/notifications/styles.css';
import { useEffect, useState } from 'react';
import { MantineProvider, Group, Text, Button, Modal, TextInput, Stack, DirectionProvider, Center, Loader, Box, localStorageColorSchemeManager } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { useHotkeys } from '@mantine/hooks';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import { useTranslation } from 'react-i18next';
import { useStore } from './store/useStore';
import { auth } from './api/client';
import { removeCookie, parseAndSavePartnerId, parseAndSaveSessionId } from './api/cookie';
import { config } from './config';
import { isTelegramWebApp } from './constants/webapp';
import { useEmailRequired } from './hooks/useEmailRequired';
import { useTicketPoller } from './hooks/useTicketPoller';
import { useNotificationFromUrl } from './hooks/useNotificationFromUrl';
import PayHistoryModal from './components/PayHistoryModal';
import PayModal from './components/PayModal';
import WithdrawHistoryModal from './components/WithdrawHistoryModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { LegalLinks } from './components/LegalLinks';
import { theme } from './theme';

const colorSchemeManager = localStorageColorSchemeManager({ key: 'vbios-color-scheme-v2' });

parseAndSaveSessionId();
parseAndSavePartnerId();

import Services from './pages/Services';
import Profile from './pages/Profile';
import Tickets from './pages/Tickets.tsx';
import Login from './pages/Login';
import NotFound from './pages/NotFound';
import AddToHomeScreen from './pages/AddToHomeScreen';
import Dashboard from './pages/Dashboard';
import { CabinetLayout } from './components/CabinetLayout';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const hasAddToHomeScreen = searchParams.has('addToHomeScreen');
  const isPWA = window.matchMedia('(display-mode: standalone)').matches || !!(window.navigator as Navigator & { standalone?: boolean }).standalone;

  const { isAuthenticated, isLoading, setUser, setIsLoading, user } = useStore();
  const { t, i18n } = useTranslation();
  const {
    modalOpen: globalEmailModalOpen,
    setModalOpen: setGlobalEmailModalOpen,
    emailInput: globalEmailInput,
    setEmailInput: setGlobalEmailInput,
    saving: globalEmailSaving,
    handleSave: handleGlobalSaveEmail,
    isValidEmail,
    verifyModalOpen: globalVerifyModalOpen,
    setVerifyModalOpen: setGlobalVerifyModalOpen,
    verifyCode: globalVerifyCode,
    setVerifyCode: setGlobalVerifyCode,
    verifySending: globalVerifySending,
    verifyConfirming: globalVerifyConfirming,
    resendCooldown: globalResendCooldown,
    pendingEmail: globalPendingEmail,
    handleConfirmEmail: handleGlobalConfirmEmail,
    handleResendCode: handleGlobalResendCode,
  } = useEmailRequired();

  useNotificationFromUrl();
  useTicketPoller(isAuthenticated);

  const [payHistoryOpen, setPayHistoryOpen] = useState(false);
  const [withdrawHistoryOpen, setWithdrawHistoryOpen] = useState(false);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);


  useEffect(() => {
    const tgWebApp = window.Telegram?.WebApp;
    if (tgWebApp && isTelegramWebApp) {
      tgWebApp.ready();
      tgWebApp.expand();
      if (tgWebApp.setHeaderColor) tgWebApp.setHeaderColor('secondary_bg_color');
      if (tgWebApp.setBackgroundColor) tgWebApp.setBackgroundColor('secondary_bg_color');
    }
  }, [isTelegramWebApp]);

  useEffect(() => {
    const tgWebApp = window.Telegram?.WebApp;
    if (!tgWebApp || !isTelegramWebApp) return;
    const backButton = tgWebApp.BackButton;
    if (!backButton) return;
    const isMainPage = location.pathname === '/' || location.pathname === '';
    if (isMainPage) {
      backButton.hide();
    } else {
      backButton.show();
      backButton.onClick(() => { navigate('/'); });
    }
    return () => {
      backButton.hide();
      backButton.offClick(() => {});
    };
  }, [location.pathname, navigate, isTelegramWebApp]);

  useEffect(() => {
    if (hasAddToHomeScreen) { setIsLoading(false); return; }
    const checkAuth = async () => {
      try {
        const response = await auth.getCurrentUser();
        const responseData = response.data.data;
        const userData: any = Array.isArray(responseData) ? responseData[0] : responseData;
        setUser(userData);
      } catch {
        if (!navigator.onLine) {
          try {
            const cachedUser = JSON.parse(localStorage.getItem('shm_offline_user_v1') || 'null');
            if (cachedUser) setUser(cachedUser);
          } catch { /* offline cache is optional */ }
        } else {
          removeCookie();
        }
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, [setUser, setIsLoading, hasAddToHomeScreen]);

  useEffect(() => {
    if (!config.SUPPORT_WIDGET_URL || !user) return;
    const existing = document.getElementById('__support_widget__');
    if (existing) existing.remove();
    const script = document.createElement('script');
    script.id = '__support_widget__';
    script.src = config.SUPPORT_WIDGET_URL;
    script.async = true;
    script.dataset.api = config.SUPPORT_WIDGET_API || '';
    script.dataset.userId = String(user.user_id);
    script.dataset.colorPrimary = '#1971c2';
    script.dataset.lang = i18n.language === 'ru' ? 'ru' : 'en';
    document.body.appendChild(script);
    return () => { script.remove(); };
  }, [user?.user_id]);

  useHotkeys([['shift + V', () => setVersionOpen(true)]]);

  if (hasAddToHomeScreen) {
    if (isPWA) return <Navigate to="/" replace />;
    return <AddToHomeScreen />;
  }

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Box style={{ flex: 1 }}>
          <Login />
          <LegalLinks />
        </Box>
      </Box>
    );
  }

  const emailRequiredModal = (
    <Modal
      opened={globalEmailModalOpen}
      onClose={() => setGlobalEmailModalOpen(false)}
      title={t('profile.linkEmail')}
      closeOnClickOutside
      closeOnEscape
      withCloseButton
    >
      <Stack gap="md">
        <TextInput
          label={t('profile.emailAddress')}
          placeholder="example@email.com"
          withAsterisk
          error={globalEmailInput.length > 0 && !isValidEmail(globalEmailInput)}
          type="email"
          value={globalEmailInput}
          onChange={(e) => setGlobalEmailInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGlobalSaveEmail()}
        />
        <Text size="xs" c="dimmed">{t('profile.emailHint')}</Text>
        <Group justify="flex-end">
          <Button variant="light" onClick={() => setGlobalEmailModalOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={handleGlobalSaveEmail} loading={globalEmailSaving} disabled={!isValidEmail(globalEmailInput)}>{t('common.save')}</Button>
        </Group>
      </Stack>
    </Modal>
  );

  const verifyRequiredModal = (
    <Modal
      opened={globalVerifyModalOpen}
      onClose={() => setGlobalVerifyModalOpen(false)}
      title={t('profile.verifyEmail')}
    >
      <Stack gap="md">
        <Text size="sm">{t('profile.verifyEmailDescription', { email: globalPendingEmail })}</Text>
        <TextInput
          label={t('profile.verifyCode')}
          placeholder="123456"
          value={globalVerifyCode}
          onChange={(e) => setGlobalVerifyCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGlobalConfirmEmail()}
          maxLength={6}
        />
        <Group justify="space-between">
          <Button
            variant="subtle"
            size="xs"
            onClick={handleGlobalResendCode}
            loading={globalVerifySending}
            disabled={globalResendCooldown > 0}
          >
            {globalResendCooldown > 0 ? `${t('profile.resendCode')} (${globalResendCooldown}s)` : t('profile.resendCode')}
          </Button>
          <Group gap="xs">
            <Button variant="light" onClick={() => setGlobalVerifyModalOpen(false)}>{t('common.cancel')}</Button>
            <Button onClick={handleGlobalConfirmEmail} loading={globalVerifyConfirming} disabled={!globalVerifyCode.trim()}>
              {t('profile.confirmEmail')}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  );

  const versionModal = (
    <Modal opened={versionOpen} onClose={() => setVersionOpen(false)} title="Version" size="xs" centered>
      <Text size="sm" ff="monospace" ta="center" py="xs">{typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'}</Text>
    </Modal>
  );



  return (
    <>
      {emailRequiredModal}
      {verifyRequiredModal}
      {versionModal}
      <CabinetLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/services" element={<Services />} />
              <Route path="/services/:serviceId" element={<Services />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tickets" element={<Tickets />} /><Route path="/balance" element={<BalancePage />} /><Route path="/operations" element={<OperationsPage />} /><Route path="/notifications" element={<NotificationsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </CabinetLayout>
      <PayHistoryModal opened={payHistoryOpen} onClose={() => setPayHistoryOpen(false)} />
      <WithdrawHistoryModal opened={withdrawHistoryOpen} onClose={() => setWithdrawHistoryOpen(false)} />
      <PayModal opened={payModalOpen} onClose={() => setPayModalOpen(false)} />
      <PWAInstallBanner />
    </>
  );
}
function App() {
  const basePath = config.SHM_BASE_PATH && config.SHM_BASE_PATH !== '/' ? config.SHM_BASE_PATH : undefined;
  const { i18n } = useTranslation();

  useEffect(() => {
    if (config.BITRIX_WIDGET_SCRIPT_URL) {
      const script = document.createElement('script');
      script.async = true;
      script.src = config.BITRIX_WIDGET_SCRIPT_URL + '?' + (Date.now() / 60000 | 0);
      const firstScript = document.getElementsByTagName('script')[0];
      firstScript?.parentNode?.insertBefore(script, firstScript);
      return () => { script.remove(); };
    }
  }, []);

  const isRtl = i18n.language === 'ar';

  return (
    <DirectionProvider initialDirection={isRtl ? 'rtl' : 'ltr'}>
      <MantineProvider theme={theme} defaultColorScheme="dark" colorSchemeManager={colorSchemeManager}>
        <Notifications position="top-right" />
        <BrowserRouter basename={basePath}>
          <AppContent />
        </BrowserRouter>
      </MantineProvider>
    </DirectionProvider>
  );
}

export default App;
