import { usePushNotifications } from '../hooks/usePushNotifications';
import { type ReactNode, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, Menu } from '@mantine/core';
import { IconHeadset, IconLogout, IconShieldLock, IconSettings, IconLayoutDashboard, IconWallet, IconReceipt, IconBell, IconChevronDown, IconUser, IconHelpCircle } from '@tabler/icons-react';
import { config } from '../config';
import { useStore } from '../store/useStore';
import { userApi } from '../api/client';
import { ThemeToggle } from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { LegalLinks } from './LegalLinks';
import '../pages/Dashboard.css';
import './VpnCabinet.css';

const desktopItems = [
  { path: '/', label: 'Главная', icon: IconLayoutDashboard },
  { path: '/services', label: 'Мой VPN', icon: IconShieldLock },
  { path: '/balance', label: 'Баланс', icon: IconWallet },
  { path: '/operations', label: 'Операции', icon: IconReceipt },
  { path: '/notifications', label: 'Уведомления', icon: IconBell },
  { path: '/tickets', label: 'Поддержка', icon: IconHeadset },
  { path: '/help', label: 'Помощь', icon: IconHelpCircle },
];
const mobileItems = [desktopItems[0], desktopItems[1], desktopItems[2], desktopItems[5], { path: '/profile', label: 'Профиль', icon: IconUser }];

export function CabinetLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, avatarUrl, telegramPhoto, setAvatarUrl, logout, hasNewTicketMessages } = useStore();
  const push = usePushNotifications();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
  // Keep the profile photo available in every cabinet view (including the
  // header and tickets) without requiring the user to open Profile first.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void userApi.getAvatar().then((response) => {
      if (cancelled) return;
      const raw = response.data?.data;
      const data = Array.isArray(raw) ? raw[0] : raw;
      const inline = data?.data && data?.mime_type ? `data:${data.mime_type};base64,${data.data}` : null;
      setAvatarUrl(inline || data?.url || null);
    }).catch(() => { /* Telegram photo/initial remains the fallback. */ });
    return () => { cancelled = true; };
  }, [user?.user_id, setAvatarUrl]);
  useEffect(() => {
    if (previousPath.current !== location.pathname) {
      previousPath.current = location.pathname;
      main.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0 });
    }
  }, [location.pathname]);
  const active = (path: string) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const nav = (items: typeof desktopItems) => items.map(({ path, label, icon: Icon }) => (
    <Link key={path} to={path} aria-current={active(path) ? 'page' : undefined} className={active(path) ? 'is-active' : ''}>
      <span className="vpn-nav-icon"><Icon size={19} />{path === '/tickets' && hasNewTicketMessages && <i className="vpn-unread" aria-label="Есть новые ответы" />}</span><span>{label}</span>
    </Link>
  ));
  return <div className="vpn-cabinet cabinet-shell">
    <a className="cabinet-skip-link" href="#cabinet-content">Перейти к содержимому</a>
    <header className="vpn-header"><div className="vpn-header__inner">
      <Link to="/" className="vpn-brand" aria-label={`${config.APP_NAME} — главная`}><span className="vpn-brand__symbol"><IconShieldLock size={21} /></span>{config.APP_NAME}</Link>
      <div className="vpn-header__actions"><span className="vpn-language"><LanguageSwitcher /></span><ThemeToggle />
        <Menu position="bottom-end" shadow="md" width={240}>
          <Menu.Target><button type="button" className="vpn-account-trigger" aria-label="Меню аккаунта"><Avatar className="vpn-avatar" size={34} radius="xl" color="blue" src={avatarUrl || telegramPhoto || undefined}>{(user?.full_name || user?.login || 'U').charAt(0).toUpperCase()}</Avatar><span className="vpn-account-name">{user?.full_name || user?.login || 'Мой аккаунт'}</span><IconChevronDown size={15} /></button></Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Аккаунт #{user?.user_id}</Menu.Label>
            <Menu.Item component={Link} to="/profile" leftSection={<IconSettings size={17} />}>Профиль и безопасность</Menu.Item>
            <Menu.Item component={Link} to="/operations" leftSection={<IconReceipt size={17} />}>История операций</Menu.Item>
            <Menu.Item component={Link} to="/notifications" leftSection={<IconBell size={17} />}>Уведомления</Menu.Item>
            {push.isSupported && <Menu.Item disabled={push.isLoading} leftSection={<IconBell size={17} />} onClick={() => void (push.isSubscribed ? push.unsubscribe() : push.subscribe())}>{push.isSubscribed ? 'Отключить push-уведомления' : 'Включить push-уведомления'}</Menu.Item>}
            <Menu.Divider />
            <Menu.Item color="red" onClick={logout} leftSection={<IconLogout size={17} />}>Выйти из аккаунта</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div></header>
    <div className="vpn-workspace">
      <aside className="vpn-sidebar" aria-label="Навигация кабинета">
        <div className="vpn-sidebar__caption">УПРАВЛЕНИЕ</div>
        <nav className="vpn-sidebar__nav">{nav(desktopItems)}</nav>
        <div className="vpn-sidebar__footer">Безопасный кабинет<br /><span>vBios</span></div>
      </aside>
      <div className="vpn-content">
        <main ref={main} id="cabinet-content" tabIndex={-1} className="cabinet-main cabinet-page-main">{children}<footer className="cabinet-legal"><LegalLinks /></footer></main>
      </div>
    </div>
    <nav className="vpn-bottom-nav" aria-label="Навигация кабинета">{nav(mobileItems)}</nav>
  </div>;
}
