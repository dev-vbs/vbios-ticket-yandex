import { useLocation, useNavigate } from 'react-router-dom';
import { Box, Group, Text, Indicator, useComputedColorScheme } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { NAV_ITEMS } from '../constants/navigation';
import { useStore } from '../store/useStore';

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const computedColorScheme = useComputedColorScheme('light');
  const { t } = useTranslation();
  const hasNewTicketMessages = useStore((s) => s.hasNewTicketMessages);

  const handleClick = (path: string) => navigate(path);


  return (
    <Box
      component="nav"
      aria-label="Навигация кабинета"
      style={{
        position: 'fixed',
        bottom: 10,
        left: 12,
        right: 12,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        zIndex: 100,
      }}
    >
      <Box
        style={{
          background: computedColorScheme === 'dark'
            ? 'rgba(40, 40, 45, 0.85)'
            : 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: 14,
          border: computedColorScheme === 'dark'
            ? '1px solid rgba(255, 255, 255, 0.1)'
            : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: computedColorScheme === 'dark'
            ? '0 8px 32px rgba(0, 0, 0, 0.4)'
            : '0 8px 32px rgba(0, 0, 0, 0.12)',
          padding: '7px 4px',
        }}
      >
        <Group justify="space-around" gap={0}>
          {NAV_ITEMS.map((item) => {
            const isActive = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
            const Icon = item.icon;
            const showDot = (item.path as string) === '/tickets' && hasNewTicketMessages;
            const isItemBlocked = false;
            return (
              <Box
                component="button"
                type="button"
                aria-current={isActive ? 'page' : undefined}
                key={item.path}
                onClick={() => handleClick(item.path)}
                style={{
                  display: 'flex',
                  border: 0,
                  font: 'inherit',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 4px',
                  minWidth: 58,
                  flex: 1,
                  borderRadius: 12,
                  cursor: isItemBlocked ? 'not-allowed' : 'pointer',
                  opacity: isItemBlocked ? 0.4 : 1,
                  background: isActive
                    ? (computedColorScheme === 'dark' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)')
                    : 'transparent',
                  color: isActive ? 'var(--mantine-color-blue-6)' : (computedColorScheme === 'dark' ? '#9ca3af' : '#6b7280'),
                  transition: 'all 0.2s ease',
                }}
              >
                <Indicator disabled={!showDot} color="blue" size={8} offset={2}>
                  <Icon size={20} />
                </Indicator>
                <Text size="xs" mt={4} fw={isActive ? 600 : 400}>{t(item.labelKey)}</Text>
              </Box>
            );
          })}
        </Group>
      </Box>
    </Box>
  );
}
