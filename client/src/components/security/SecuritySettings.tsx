import { useState } from 'react';
import { Alert, Card, Text, Stack, Group, Button, Modal, Space, PasswordInput, Tabs, Progress, Badge, Divider } from '@mantine/core';
import { IconShieldLock, IconLock, IconShield, IconFingerprint, IconKey, IconInfoCircle, IconCheck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useMediaQuery } from '@mantine/hooks';
import { useTranslation } from 'react-i18next';
import { userApi } from '../../api/client';
import PasskeySettings from './PasskeySettings';
import OtpSettings from './OtpSettings';
import PasswordAuthSettings from './PasswordAuthSettings';
import { useTelegramWebApp } from '../../hooks/useTelegramWebApp';
import { config } from '../../config';
import './SecuritySettings.css';

const otpEnabled = config.OTP_ENABLE === 'true';
const passkeyEnabled = config.PASSKEY_AUTH_DISABLED === 'false' && config.PASSKEY_ENABLE === 'true';

export default function SecuritySettings() {
  const { t } = useTranslation();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>('password');
  const { isInsideTelegramWebApp } = useTelegramWebApp();
  const isMobile = useMediaQuery('(max-width: 768px)');

  const handleChangePassword = async () => {
    if (newPassword.length < 6 || newPassword !== confirmPassword) {
      notifications.show({
        title: t('common.error'),
        message: newPassword.length < 6
          ? t('auth.passwordTooShort')
          : t('auth.passwordsMismatch'),
        color: 'red',
      });
      return;
    }
    try {
      setChangingPassword(true);
      await userApi.changePassword(newPassword, currentPassword);
      setPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notifications.show({
        title: t('common.success'),
        message: t('profile.passwordChanged'),
        color: 'green',
      });
    } catch {
      notifications.show({
        title: t('common.error'),
        message: t('profile.passwordChangeError'),
        color: 'red',
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const passwordScore = [newPassword.length >= 6, /[A-ZА-Я]/.test(newPassword), /\d/.test(newPassword), newPassword.length >= 10].filter(Boolean).length;
  const resetPasswordForm = () => { setPasswordModalOpen(false); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); };

  const hasTelegramWidget = !isInsideTelegramWebApp;


  return (
    <>
      <Card withBorder radius="md" p="lg">
        <Group gap="xs" mb="lg">
          <IconShieldLock size={24} />
          <Text fw={600} size="lg">{t('profile.security')}</Text>
        </Group>

        <Tabs defaultValue={'password'} variant="outline" value={activeTab} onChange={setActiveTab}>
          <Tabs.List grow={!isMobile} style={isMobile ? { flexWrap: 'nowrap' } : undefined}>
            <Tabs.Tab value="password" leftSection={<IconLock size={14} />} style={isMobile ? (activeTab === 'password' ? { flex: 1, minWidth: 0, overflow: 'hidden' } : { flexShrink: 0 }) : undefined}>
              {(!isMobile || activeTab === 'password') ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t('profile.changePassword')}</span> : undefined}
            </Tabs.Tab>
            {otpEnabled && (
              <Tabs.Tab value="otp" leftSection={<IconShield size={14} />} style={isMobile ? (activeTab === 'otp' ? { flex: 1, minWidth: 0, overflow: 'hidden' } : { flexShrink: 0 }) : undefined}>
                {(!isMobile || activeTab === 'otp') ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t('otp.title')}</span> : undefined}
              </Tabs.Tab>
            )}
            {passkeyEnabled && hasTelegramWidget && (
              <Tabs.Tab value="passkey" leftSection={<IconFingerprint size={14} />} style={isMobile ? (activeTab === 'passkey' ? { flex: 1, minWidth: 0, overflow: 'hidden' } : { flexShrink: 0 }) : undefined}>
                {(!isMobile || activeTab === 'passkey') ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t('passkey.title')}</span> : undefined}
              </Tabs.Tab>
            )}
            {hasTelegramWidget && (
              <Tabs.Tab value="passwordAuth" leftSection={<IconKey size={14} />} style={isMobile ? (activeTab === 'passwordAuth' ? { flex: 1, minWidth: 0, overflow: 'hidden' } : { flexShrink: 0 }) : undefined}>
                {(!isMobile || activeTab === 'passwordAuth') ? <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{t('passwordAuth.title')}</span> : undefined}
              </Tabs.Tab>
            )}
          </Tabs.List>

          <Space h="xl" />

          {otpEnabled && (
            <Tabs.Panel value="otp">
              <OtpSettings embedded isActive={activeTab === 'otp'} />
            </Tabs.Panel>
          )}

          {passkeyEnabled && hasTelegramWidget && (
            <Tabs.Panel value="passkey">
              <PasskeySettings embedded isActive={activeTab === 'passkey'} />
            </Tabs.Panel>
          )}

          {hasTelegramWidget && (
            <Tabs.Panel value="passwordAuth">
              <PasswordAuthSettings embedded isActive={activeTab === 'passwordAuth'} />
            </Tabs.Panel>
          )}

          <Tabs.Panel value="password">
            <Stack gap="xs">
              <Group gap="xs">
                <IconLock size={18} />
                <Text fw={500}>{t('profile.changePassword')}</Text>
              </Group>
              <Text size="sm" c="dimmed">{t('security.changePasswordDescription')}</Text>
              <Group gap="xs"><Badge size="sm" variant="light" color="teal">Пароль от 6 символов</Badge><Badge size="sm" variant="light" color="gray">Сессии будут завершены</Badge></Group>
              <Button
                variant="light"
                leftSection={<IconLock size={16} />}
                onClick={() => setPasswordModalOpen(true)}
                mt="xs"
              >
                {t('profile.changePassword')}
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>

      <Space h="md" />
      </Card>

      <Space h="xl" />

      <Modal
        opened={passwordModalOpen}
        onClose={resetPasswordForm}
        title={t('profile.changePassword')}
        size="sm"
        centered
        classNames={{ content: 'password-modal', header: 'password-modal__header', body: 'password-modal__body' }}
      >
        <Stack gap="sm">
          <Alert icon={<IconInfoCircle size={17} />} color="blue" variant="light" p="sm">
            Используйте текущий пароль для подтверждения. После сохранения потребуется войти заново.
          </Alert>
          <PasswordInput
            label={t('profile.currentPassword', { defaultValue: 'Текущий пароль' })}
            placeholder={t('profile.currentPasswordPlaceholder', { defaultValue: 'Введите текущий пароль' })}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <PasswordInput
            label={t('profile.newPassword')}
            placeholder={t('profile.newPasswordPlaceholder')}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            error={newPassword.length > 0 && newPassword.length < 6 ? t('auth.passwordTooShort') : undefined}
          />
          <PasswordInput
            label={t('profile.confirmNewPassword', { defaultValue: 'Повторите новый пароль' })}
            placeholder={t('profile.confirmNewPasswordPlaceholder', { defaultValue: 'Повторите новый пароль' })}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            error={confirmPassword.length > 0 && confirmPassword !== newPassword ? t('auth.passwordsMismatch') : undefined}
          />
          <Group justify="space-between" gap="xs" mt={-2}>
            <Text size="xs" c="dimmed">Надёжность пароля</Text>
            <Text size="xs" c={passwordScore >= 3 ? 'teal' : 'dimmed'}>{passwordScore >= 3 ? 'Хорошая' : 'Минимум 6 символов'}</Text>
          </Group>
          <Progress value={passwordScore * 25} color={passwordScore >= 3 ? 'teal' : 'blue'} size="sm" radius="xl" />
          <Group gap="xs" wrap="wrap">
            <Badge leftSection={newPassword.length >= 6 ? <IconCheck size={12} /> : undefined} color={newPassword.length >= 6 ? 'teal' : 'gray'} variant="light">6+ символов</Badge>
            <Badge leftSection={/[A-ZА-Я]/.test(newPassword) ? <IconCheck size={12} /> : undefined} color={/[A-ZА-Я]/.test(newPassword) ? 'teal' : 'gray'} variant="light">Заглавная буква</Badge>
            <Badge leftSection={/\d/.test(newPassword) ? <IconCheck size={12} /> : undefined} color={/\d/.test(newPassword) ? 'teal' : 'gray'} variant="light">Цифра</Badge>
          </Group>
          <Divider my="xs" />
          <Group justify="flex-end">
            <Button variant="default" onClick={resetPasswordForm} disabled={changingPassword}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleChangePassword} loading={changingPassword} disabled={currentPassword.length < 1 || newPassword.length < 6 || newPassword !== confirmPassword}>
              {t('common.save')}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
