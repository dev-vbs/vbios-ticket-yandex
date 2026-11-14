import './PromoModal.css';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Stack, Group, Button, TextInput, Text } from '@mantine/core';
import { IconTag, IconArrowRight } from '@tabler/icons-react';
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
      centered
      classNames={{ content: 'promo-modal', header: 'promo-modal__header', body: 'promo-modal__body' }}
    >
      <Stack gap="lg">
        <div className="promo-modal__intro">
          <span className="promo-modal__icon"><IconTag size={20} /></span>
          <div>
            <Text fw={600} size="sm">Скидка или бонус на баланс</Text>
            <Text c="dimmed" size="xs" mt={3}>Введите код, который вы получили от поддержки или по акции.</Text>
          </div>
        </div>
        <TextInput
          label={t('promo.promoCode')}
          placeholder={t('promo.placeholder')}
          value={promoCode}
          onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          leftSection={<IconTag size={17} />}
          size="md"
          autoFocus
        />
        <Group justify="flex-end" gap="sm" className="promo-modal__actions">
          <Button variant="light" onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleApply} loading={loading} disabled={!promoCode.trim()} rightSection={<IconArrowRight size={17} />}>
            {t('promo.apply')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
