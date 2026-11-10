import { Modal, Stack, Text, Group, Button } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconAlertTriangle } from '@tabler/icons-react';

interface ConfirmModalProps {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  loading?: boolean;
}

export default function ConfirmModal({
  opened,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmColor = 'red',
  loading = false,
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal opened={opened} onClose={onClose} title={title || t('confirm.title')} centered size="sm">
      <Stack gap="md">
        <Group gap="sm" align="flex-start">
          <IconAlertTriangle size={24} color="var(--mantine-color-orange-6)" />
          <Text size="sm" style={{ flex: 1 }}>{message}</Text>
        </Group>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onClose} disabled={loading}>
            {cancelLabel || t('common.cancel')}
          </Button>
          <Button color={confirmColor} onClick={onConfirm} loading={loading}>
            {confirmLabel || t('common.confirm')}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
