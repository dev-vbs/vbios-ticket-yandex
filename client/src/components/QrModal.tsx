import { Modal, Stack, Center, Button, Group, Alert } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconDownload, IconAlertCircle } from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { useMemo } from 'react';

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
    return data ? data.length > MAX_QR_DATA_LENGTH : false;
  }, [data]);

  if (!data) return null;

  return (
    <Modal opened={opened} onClose={onClose} title={title || t('services.qrCode')} size="md">
      <Stack gap="md" align="center">
        {isDataTooLong ? (
          <Alert icon={<IconAlertCircle size={16} />} color="orange" title={t('services.qrTooLong')}>
            {t('services.qrTooLongDesc')}
          </Alert>
        ) : (
          <Center p="md" bg="white" style={{ borderRadius: 8 }}>
            <QRCodeSVG
              id="qr-code-svg"
              value={data}
              size={256}
              level="L"
              includeMargin
            />
          </Center>
        )}

        <Group>
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
    </Modal>
  );
}
