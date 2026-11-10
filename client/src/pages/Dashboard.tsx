import DataLoadStatus from '../components/DataLoadStatus';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { userApi } from '../api/client';
import { useStore } from '../store/useStore';
import { IconAlertCircle, IconArrowRight, IconCalendarEvent, IconCircleCheck, IconCreditCard, IconRefresh, IconServer, IconShieldCheck, IconWallet } from '@tabler/icons-react';
import PayModal from '../components/PayModal';
import './Dashboard.css';

type Payment = { amount?: number; sum?: number; cost?: number; money?: number; created?: string; date?: string };
type Service = { user_service_id: number; status?: string; service?: { name?: string }; name?: string; expire?: string | null };
type Forecast = { total?: number; dept?: number };
const rubles = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
const formatDate = (value?: string | null) => value ? new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'не указана';
const paymentAmount = (payment: Payment) => Number(payment.money ?? payment.amount ?? payment.sum ?? payment.cost ?? 0);
const expiry = (value?: string | null) => {
  if (!value || Number.isNaN(new Date(value).getTime())) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86_400_000);
  return days < 0 ? 'Срок действия закончился' : days === 0 ? 'Заканчивается сегодня' : days <= 3 ? `Осталось ${days} дн.` : null;
};

export default function Dashboard() {
  const { user } = useStore();
  const [services, setServices] = useState<Service[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [servicesUpdated, setServicesUpdated] = useState<Date | null>(null);
  const [paymentsUpdated, setPaymentsUpdated] = useState<Date | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [servicesResult, paymentsResult, forecastResult] = await Promise.allSettled([userApi.getServices(), userApi.getPayments({ limit: 5, sort_field: 'created', sort_direction: 'desc' }), userApi.getForecast()]);
    if (servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value.data?.data)) { setServices(servicesResult.value.data.data); setServiceError(false); setServicesUpdated(new Date()); } else setServiceError(true);
    if (paymentsResult.status === 'fulfilled' && Array.isArray(paymentsResult.value.data?.data)) { setPayments(paymentsResult.value.data.data); setPaymentError(false); setPaymentsUpdated(new Date()); } else setPaymentError(true);
    if (forecastResult.status === 'fulfilled') { const data = forecastResult.value.data?.data; setForecast(Array.isArray(data) ? data[0] : data); }
    if (servicesResult.status === 'rejected') notifications.show({ title: 'Не удалось обновить кабинет', message: 'Проверьте соединение с сервером и повторите попытку.', color: 'red' });
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const activeServices = useMemo(() => services.filter((service) => service.status === 'ACTIVE' || service.status === 'active'), [services]);
  const hasBalance = Number(user?.balance || 0) > 0;
  const { hasNewTicketMessages } = useStore();
  const expiringServices = activeServices.filter((service) => expiry(service.expire));
  return <><header className="cabinet-header"><div><span className="cabinet-breadcrumb">Личный кабинет</span><h1>Добрый день, {user?.full_name || user?.login || 'пользователь'}</h1></div><button type="button" className="refresh-button" onClick={() => void load()} disabled={loading}><IconRefresh className={loading ? 'spin' : ''} size={17} />Обновить</button></header>
      <section className="cabinet-hero"><div className="hero-copy"><div className="hero-icon"><IconShieldCheck size={26} /></div><div><h2>Ваше подключение под контролем</h2><p>{activeServices.length ? `Активных услуг: ${activeServices.length}. Откройте услугу, чтобы подключить устройства или изменить тариф.` : 'Выберите тариф, оплатите подписку и добавьте VPN в приложение. Инструкция появится в карточке услуги.'}</p></div></div><Link className="hero-action" to={activeServices.length ? '/services' : '/services?order=1'}>{activeServices.length ? 'Открыть подключения' : 'Подключить VPN'}<IconArrowRight size={18} /></Link></section>
{(Number(forecast?.dept || 0) > 0 || expiringServices.length > 0 || hasNewTicketMessages) && <section className="cabinet-panel cabinet-notifications"><div className="panel-title"><div><h2>Уведомления</h2><p>Важные события по аккаунту.</p></div></div><div className="notification-list">{Number(forecast?.dept || 0) > 0 && <Link to="/profile"><IconAlertCircle size={18} /><span><strong>Требуется оплата</strong><small>Есть задолженность {rubles(Number(forecast?.dept))} ₽.</small></span><IconArrowRight size={16} /></Link>}{expiringServices.slice(0, 2).map((service) => <Link key={service.user_service_id} to={`/services/${service.user_service_id}`}><IconCalendarEvent size={18} /><span><strong>{service.service?.name || service.name || `Услуга #${service.user_service_id}`}</strong><small>{expiry(service.expire)}</small></span><IconArrowRight size={16} /></Link>)}{hasNewTicketMessages && <Link to="/tickets"><IconAlertCircle size={18} /><span><strong>Новый ответ поддержки</strong><small>Откройте тикеты, чтобы прочитать сообщение.</small></span><IconArrowRight size={16} /></Link>}</div></section>}
      <section className="cabinet-summary"><article className="summary-card balance-summary"><span className="summary-label"><IconWallet size={17} />Баланс</span><strong>{rubles(Number(user?.balance || 0))} <small>₽</small></strong><p>{hasBalance ? 'Средства доступны для продления услуг.' : 'Пополните баланс для оплаты и продления услуг.'}</p><button type="button" onClick={() => setPayModalOpen(true)}>Пополнить баланс <IconArrowRight size={17} /></button></article><article className="summary-card"><span className="summary-label"><IconServer size={17} />Услуги</span><strong>{activeServices.length}</strong><p>{activeServices.length ? 'подключений активно сейчас' : 'активных подключений пока нет'}</p><Link to="/services">Управлять услугами <IconArrowRight size={17} /></Link></article><article className="summary-card"><span className="summary-label"><IconCalendarEvent size={17} />К оплате</span><strong>{rubles(Number(forecast?.total || 0))} <small>₽</small></strong><p>{forecast?.dept ? `Есть задолженность: ${rubles(Number(forecast.dept))} ₽` : 'Ближайшие продления и платежи'}</p><Link to="/profile">Посмотреть детали <IconArrowRight size={17} /></Link></article></section>
      <section className="cabinet-grid"><article className="cabinet-panel services-panel"><div className="panel-title"><div><h2>Мои подключения</h2><p>Статус услуг и быстрый доступ к настройке.</p></div><Link to="/services">Все услуги <IconArrowRight size={16} /></Link></div><DataLoadStatus loading={loading} error={serviceError && "Не удалось загрузить услуги"} updatedAt={servicesUpdated} onRetry={() => void load()} />{loading && !servicesUpdated ? <div className="panel-placeholder">Загружаем данные…</div> : serviceError && !servicesUpdated ? null : activeServices.length === 0 ? <div className="empty-state"><div className="empty-state-icon"><IconServer size={24} /></div><h3>Подключений пока нет</h3><p>Оформите услугу — ссылка на подключение и инструкции появятся здесь.</p><Link to="/services">Перейти к услугам <IconArrowRight size={17} /></Link></div> : <div className="connection-list">{activeServices.slice(0, 4).map((service) => <div className="connection-row" key={service.user_service_id}><div className="connection-status"><IconCircleCheck size={18} /></div><div className="connection-name"><strong>{service.service?.name || service.name || `Услуга #${service.user_service_id}`}</strong><span>Продление до {formatDate(service.expire)}</span></div><span className="status-live">Активна</span><Link aria-label="Открыть услугу" to={`/services/${service.user_service_id}`}><IconArrowRight size={18} /></Link></div>)}</div>}</article><article className="cabinet-panel help-panel"><div className="panel-title"><div><h2>С чего начать</h2><p>Подключение займёт несколько минут.</p></div></div><ol className="start-steps"><li><span>1</span><div><strong>Выберите тариф</strong><p>Нажмите «Подключить VPN» и выберите подписку.</p></div></li><li><span>2</span><div><strong>Оплатите подписку</strong><p>Пополните баланс доступным способом в разделе «Баланс».</p></div></li><li><span>3</span><div><strong>Подключите устройство</strong><p>Откройте «Мой VPN» и добавьте подписку в приложение по инструкции.</p></div></li></ol><Link className="help-link" to="/services">Инструкции по подключению <IconArrowRight size={17} /></Link></article></section>
      <section className="cabinet-panel payments-panel"><div className="panel-title"><div><h2>Последние платежи</h2><p>Операции по вашему аккаунту.</p></div><Link to="/operations">История платежей <IconArrowRight size={16} /></Link></div><DataLoadStatus loading={loading} error={paymentError && "Не удалось загрузить платежи"} updatedAt={paymentsUpdated} onRetry={() => void load()} />{!paymentsUpdated ? null : payments.length === 0 ? <div className="panel-placeholder">История платежей появится после первого пополнения.</div> : <div className="payment-list">{payments.map((payment, index) => <div className="payment-row" key={`${payment.created || payment.date || index}-${index}`}><div className="payment-icon"><IconCreditCard size={18} /></div><div><strong>Пополнение баланса</strong><span>{formatDate(payment.created || payment.date)}</span></div><b>+{rubles(paymentAmount(payment))} ₽</b></div>)}</div>}</section>
    <PayModal opened={payModalOpen} onClose={() => setPayModalOpen(false)} /></>;
}
import './Pages.css';
