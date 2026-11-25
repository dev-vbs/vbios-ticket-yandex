import { type ReactNode, useRef, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, Drawer, Menu } from '@mantine/core';
import { IconHeadset, IconLogout, IconShieldLock, IconSettings, IconLayoutDashboard, IconWallet, IconReceipt, IconBell, IconChevronDown, IconUser, IconHelpCircle, IconMenu2, IconArrowUpRight } from '@tabler/icons-react';
import { config } from '../config';
import { DEFAULT_AVATAR_URL, useStore } from '../store/useStore';
import { userApi } from '../api/client';
import { ThemeToggle } from './ThemeToggle';
import LanguageSwitcher from './LanguageSwitcher';
import { LegalLinks } from './LegalLinks';
import '../pages/Dashboard.css';
import './VpnCabinet.css';
import './CabinetDesign.css';

const desktopItems = [
  { path: '/', label: 'Главная', icon: IconLayoutDashboard },
  { path: '/services', label: 'Мой VPN', icon: IconShieldLock },
  { path: '/balance', label: 'Баланс', icon: IconWallet },
  { path: '/operations', label: 'Операции', icon: IconReceipt },
  { path: '/notifications', label: 'Уведомления', icon: IconBell },
  { path: '/news', label: 'Новости', icon: IconBell },
  { path: '/tickets', label: 'Поддержка', icon: IconHeadset },
  { path: '/help', label: 'Помощь', icon: IconHelpCircle },
  { path: '/status', label: 'Состояние сети', icon: IconShieldLock },
];
const mobileItems = [desktopItems[0], desktopItems[1], desktopItems[2], desktopItems[5]];
const allItems = [...desktopItems, { path: '/profile', label: 'Профиль', icon: IconUser }];

export function CabinetLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [menuOpened, setMenuOpened] = useState(false);
  const { user, avatarUrl, telegramPhoto, setAvatarUrl, logout, hasNewTicketMessages } = useStore();
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
      const item = Array.isArray(raw) ? raw[0] : raw;
      const data = item?.data && typeof item.data === 'object' ? item.data : item;
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
    <Link key={path} to={path} onClick={() => setMenuOpened(false)} aria-current={active(path) ? 'page' : undefined} className={active(path) ? 'is-active' : ''}>
      <span className="vpn-nav-icon"><Icon size={19} />{path === '/tickets' && hasNewTicketMessages && <i className="vpn-unread" aria-label="Есть новые ответы" />}</span><span>{label}</span>
    </Link>
  ));
  return <div className="vpn-cabinet cabinet-shell">
    <a className="cabinet-skip-link" href="#cabinet-content">Перейти к содержимому</a>
    <header className="vpn-header"><div className="vpn-header__inner">
      <Link to="/" className="vpn-brand" aria-label={`${config.APP_NAME} — главная`}><img className="vpn-brand__symbol" src={config.LOGO_URL} alt="" />{config.APP_NAME}</Link>
      <div className="vpn-header__actions"><span className="vpn-language"><LanguageSwitcher /></span><ThemeToggle />
        <Menu position="bottom-end" shadow="md" width={240}>
          <Menu.Target><button type="button" className="vpn-account-trigger" aria-label="Меню аккаунта"><Avatar className="vpn-avatar" size={34} radius="xl" color="blue" src={avatarUrl || telegramPhoto || DEFAULT_AVATAR_URL}>{(user?.full_name || user?.login || 'U').charAt(0).toUpperCase()}</Avatar><span className="vpn-account-name">{user?.full_name || user?.login || 'Мой аккаунт'}</span><IconChevronDown size={15} /></button></Menu.Target>
          <Menu.Dropdown>
            <Menu.Label>Аккаунт #{user?.user_id}</Menu.Label>
            <Menu.Item component={Link} to="/profile" leftSection={<IconSettings size={17} />}>Профиль и безопасность</Menu.Item>
            <Menu.Item component={Link} to="/operations" leftSection={<IconReceipt size={17} />}>История операций</Menu.Item>
            <Menu.Item component={Link} to="/notifications" leftSection={<IconBell size={17} />}>Уведомления</Menu.Item>
            <Menu.Divider />
            <Menu.Item color="red" onClick={logout} leftSection={<IconLogout size={17} />}>Выйти из аккаунта</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </div>
    </div></header>
    <div className="vpn-workspace">
      <aside className="vpn-sidebar" aria-label="Навигация кабинета">
        <div className="vpn-sidebar__caption">Личный кабинет</div>
        <nav className="vpn-sidebar__nav">{nav(allItems)}</nav>
        <Link to="/help" className="cabinet-sidebar-help"><IconHelpCircle size={24} /><strong>Поможем подключиться</strong><span>Инструкции для ваших устройств</span><IconArrowUpRight size={18} /></Link>
      </aside>
      <div className="vpn-content">
        <main ref={main} id="cabinet-content" tabIndex={-1} className="cabinet-main cabinet-page-main">{children}<footer className="cabinet-legal"><LegalLinks /></footer></main>
      </div>
    </div>
    <nav className="vpn-bottom-nav" aria-label="Навигация кабинета">{nav(mobileItems)}<button type="button" aria-label="Все разделы кабинета" aria-expanded={menuOpened} onClick={() => setMenuOpened(true)} className={!mobileItems.some(item => active(item.path)) ? 'is-active' : ''}><IconMenu2 size={19} /><span>Ещё</span></button></nav>
    <Drawer opened={menuOpened} onClose={() => setMenuOpened(false)} position="bottom" size="min(460px, 85dvh)" title="Разделы кабинета" className="cabinet-mobile-menu"><nav className="cabinet-mobile-menu__links" aria-label="Все разделы">{nav(allItems)}</nav></Drawer>
  </div>;
}
