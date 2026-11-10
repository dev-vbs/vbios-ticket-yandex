import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { IconHeadset, IconLogout, IconShieldLock, IconSettings, IconLayoutDashboard, IconWallet, IconReceipt, IconBell, IconArrowUpRight } from '@tabler/icons-react';
import { config } from '../config';
import { useStore } from '../store/useStore';
import { ThemeToggle } from './ThemeToggle';
import { LegalLinks } from './LegalLinks';
import '../pages/Dashboard.css';
import './VpnCabinet.css';
const items = [
  {path:'/',label:'Главная',icon:IconLayoutDashboard},
  {path:'/services',label:'Мой VPN',icon:IconShieldLock},
  {path:'/balance',label:'Баланс',icon:IconWallet},
  {path:'/operations',label:'Операции',icon:IconReceipt},
  {path:'/notifications',label:'Уведомления',icon:IconBell},
  {path:'/tickets',label:'Поддержка',icon:IconHeadset},
];
export function CabinetLayout({children}:{children:ReactNode}) {
  const location=useLocation();
  const {user,logout,hasNewTicketMessages}=useStore();
  return <div className="vpn-cabinet cabinet-shell">
    <header className="vpn-header"><div className="vpn-header__inner">
      <Link to="/" className="vpn-brand"><span className="vpn-brand__symbol"><IconShieldLock size={22}/></span>{config.APP_NAME}</Link>
      <div className="vpn-header__actions"><ThemeToggle/><Link to="/profile" className="vpn-profile-link"><IconSettings size={17}/>Профиль <IconArrowUpRight size={15}/></Link></div>
    </div></header>
    <div className="vpn-workspace">
      <div className="vpn-account-row"><span>Личный кабинет · VPN</span><div className="vpn-account"><Link to="/profile">{user?.full_name||user?.login||'Мой аккаунт'}</Link><Link to="/balance"><IconWallet size={16}/>{new Intl.NumberFormat('ru-RU').format(Number(user?.balance||0))} ₽</Link><button type="button" onClick={logout} aria-label="Выйти из аккаунта"><IconLogout size={17}/></button></div></div>
      <nav className="vpn-tabs" aria-label="Разделы кабинета">{items.map(({path,label,icon:Icon})=>{const active=path==='/'?location.pathname==='/':location.pathname.startsWith(path);return <Link key={path} to={path} aria-current={active?'page':undefined} className={active?'is-active':''}><Icon size={18}/><span>{label}</span>{path==='/tickets'&&hasNewTicketMessages&&<i className="vpn-unread"/>}</Link>;})}</nav>
      <main className="cabinet-main cabinet-page-main">{children}<LegalLinks/></main>
    </div>
  </div>;
}
