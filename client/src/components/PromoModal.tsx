import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Stack, Group, Button, TextInput } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { promoApi } from '../api/client';

interface PromoModalProps {
  opened: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function PromoModal({ opened, onClose, onSuccess }: PromoModalProps) {
  const { t } = useTranslation();
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!promoCode.trim()) {
      notifications.show({
        title: t('common.error'),
        message: t('promo.enterCode'),
        color: 'red',
      });
      return;
    }

    setLoading(true);
    try {
      await promoApi.apply(promoCode.trim());
      notifications.show({
        title: t('common.success'),
        message: t('promo.applied'),
        color: 'green',
      });
      setPromoCode('');
      onClose();
      onSuccess?.();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || t('promo.applyError');
      notifications.show({
        title: t('common.error'),
        message: errorMessage,
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPromoCode('');
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={t('promo.title')}
    >
      <Stack gap="md">
        <TextInput
          label={t('promo.promoCode')}
          placeholder={t('promo.placeholder')}
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
        />
        <Group justify="flex-end">
          <Button variant="light" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleApply} loading={loading}>
            {t('promo.apply')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
