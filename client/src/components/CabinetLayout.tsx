import { usePushNotifications } from '../hooks/usePushNotifications';
import { type ReactNode, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu } from '@mantine/core';
import { IconHeadset, IconLogout, IconShieldLock, IconSettings, IconLayoutDashboard, IconWallet, IconReceipt, IconBell, IconChevronDown, IconUser } from '@tabler/icons-react';
import { config } from '../config';
import { useStore } from '../store/useStore';
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
];
const mobileItems = [desktopItems[0], desktopItems[1], desktopItems[2], desktopItems[5], { path: '/profile', label: 'Профиль', icon: IconUser }];

export function CabinetLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { user, logout, hasNewTicketMessages } = useStore();
  const push = usePushNotifications();
  const main = useRef<HTMLElement>(null);
  const previousPath = useRef(location.pathname);
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
          <Menu.Target><button type="button" className="vpn-account-trigger" aria-label="Меню аккаунта"><span className="vpn-avatar">{(user?.full_name || user?.login || 'U').charAt(0).toUpperCase()}</span><span className="vpn-account-name">{user?.full_name || user?.login || 'Мой аккаунт'}</span><IconChevronDown size={15} /></button></Menu.Target>
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
      <nav className="vpn-tabs" aria-label="Разделы кабинета">{nav(desktopItems)}</nav>
      <main ref={main} id="cabinet-content" tabIndex={-1} className="cabinet-main cabinet-page-main">{children}<footer className="cabinet-legal"><LegalLinks /></footer></main>
    </div>
    <nav className="vpn-bottom-nav" aria-label="Навигация кабинета">{nav(mobileItems)}</nav>
  </div>;
}
