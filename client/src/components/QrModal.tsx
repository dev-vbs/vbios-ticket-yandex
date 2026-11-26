import { Modal, Stack, Center, Button, Group, Alert, Text, Divider, Badge } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconDownload, IconAlertCircle, IconQrcode, IconDeviceMobile } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { useMemo } from 'react';
import './QrModal.css';

const MAX_QR_DATA_LENGTH = 2900;

interface QrModalProps {
  opened: boolean;
  onClose: () => void;
  data: string;
  title?: string;
  filename?: string;
  onDownload?: () => void;
}

export default function QrModal({ opened, onClose, data, title, onDownload }: QrModalProps) {
  const { t } = useTranslation();

  const isDataTooLong = useMemo(() => {
    return new TextEncoder().encode(data).length > MAX_QR_DATA_LENGTH;
  }, [data]);

  if (!data) return null;

  return (
    <Modal opened={opened} onClose={onClose} title={title || t('services.qrCode')} size="lg" centered classNames={{ content: 'qr-modal', header: 'qr-modal__header', body: 'qr-modal__body' }}>
      <Text c="dimmed" size="sm" mb="lg">Отсканируйте код в HAPP или другом VPN-приложении, чтобы быстро добавить подписку.</Text>
      <div className="qr-layout">
      <Stack gap="md" align="center" className="qr-fields">
        {isDataTooLong ? (
          <Alert icon={<IconAlertCircle size={16} />} color="orange" title={t('services.qrTooLong')}>
            {t('services.qrTooLongDesc')}
          </Alert>
        ) : (
          <Center p="md" bg="white" className="qr-code-card">
            <QRCodeSVG
              id="qr-code-svg"
              value={data}
              size={256}
              level="L"
              includeMargin
            />
          </Center>
        )}

        <Group justify="center">
          {onDownload && (
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={onDownload}
            >
              {t('services.downloadConfig')}
            </Button>
          )}
        </Group>
      </Stack>
      <aside className="qr-summary"><div className="qr-summary__icon"><IconQrcode size={24} /></div><Text size="sm" c="dimmed" mt="md">Способ подключения</Text><Text className="qr-summary__title">QR-код подписки</Text><Divider my="md" /><Text size="xs" c="dimmed" lh={1.6}>Откройте HAPP, выберите добавление подписки и наведите камеру на код.</Text><Group gap="xs" mt="md"><Badge leftSection={<IconDeviceMobile size={13} />} color="blue" variant="light">Быстрое подключение</Badge></Group></aside>
      </div>
    </Modal>
  );
}
