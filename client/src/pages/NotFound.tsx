import { Center, Text, Button, Box } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconArrowLeft } from '@tabler/icons-react';

function NotFound() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Center h="100vh">
      <Box ta="center" className="not-found-card">
        <Text size="64px" fw={700} mb="md">404</Text>
        <Text size="xl" mb="md">{t('common.notFound')}</Text>
        <Text size="sm" c="dimmed" mb="lg">{t('common.notFoundDesc')}</Text>
        <Button
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate('/')}
        >
          {t('common.backToHome')}
        </Button>
      </Box>
    </Center>
  );
}

export default NotFound;

import './Pages.css';
