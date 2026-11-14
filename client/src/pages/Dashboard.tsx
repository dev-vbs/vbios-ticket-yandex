import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { notifications } from '@mantine/notifications';
import { userApi } from '../api/client';
import { useStore } from '../store/useStore';
import { IconAlertCircle, IconArrowRight, IconCalendarEvent, IconCircleCheck, IconCreditCard, IconRefresh, IconServer, IconWallet, IconPlus, IconHeadset } from '@tabler/icons-react';
import PayModal from '../components/PayModal';
import './Dashboard.css';

type Payment = { amount?: number; sum?: number; cost?: number; money?: number; created?: string; date?: string };
type Service = { user_service_id: number; status?: string; service?: { name?: string }; name?: string; expire?: string | null };
type Forecast = { total?: number; dept?: number };
const rubles = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
const formatDate = (value?: string | null) => {
  const date = value ? new Date(value.replace(' ', 'T')) : null;
  return date && Number.isFinite(date.getTime()) ? date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }) : 'не указана';
};
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
  const [forecastError, setForecastError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [serviceError, setServiceError] = useState(false);
  const [paymentError, setPaymentError] = useState(false);
  const [servicesUpdated, setServicesUpdated] = useState<Date | null>(null);
  const [paymentsUpdated, setPaymentsUpdated] = useState<Date | null>(null);
  const [payModalOpen, setPayModalOpen] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [servicesResult, paymentsResult, forecastResult] = await Promise.allSettled([userApi.getServices(), userApi.getPayments({ limit: 5, sort_field: 'created', sort_direction: 'desc', filter: { money: { '>': 0 } } }), userApi.getForecast()]);
    if (servicesResult.status === 'fulfilled' && Array.isArray(servicesResult.value.data?.data)) { setServices(servicesResult.value.data.data); setServiceError(false); setServicesUpdated(new Date()); } else setServiceError(true);
    if (paymentsResult.status === 'fulfilled' && Array.isArray(paymentsResult.value.data?.data)) { setPayments(paymentsResult.value.data.data); setPaymentError(false); setPaymentsUpdated(new Date()); } else setPaymentError(true);
    if (forecastResult.status === 'fulfilled') { const data = forecastResult.value.data?.data; setForecast(Array.isArray(data) ? data[0] : data); setForecastError(false); } else setForecastError(true);
    if (servicesResult.status === 'rejected') notifications.show({ title: 'Не удалось обновить кабинет', message: 'Проверьте соединение с сервером и повторите попытку.', color: 'red' });
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const activeServices = useMemo(() => services.filter((service) => service.status === 'ACTIVE' || service.status === 'active'), [services]);
  const hasBalance = Number(user?.balance || 0) > 0;
  const { hasNewTicketMessages } = useStore();
  const expiringServices = activeServices.filter((service) => expiry(service.expire));
  const blockedServices = services.filter((service) => ['BLOCK', 'block'].includes(service.status || ''));
  return <div className="dashboard-overview">
    <header className="cabinet-header">
      <div><h1>Главная</h1><p>Здравствуйте, {user?.full_name || user?.login || 'пользователь'}. Всё важное по вашему аккаунту.</p></div>
      <button type="button" className="refresh-button" onClick={() => void load()} disabled={loading} aria-label="Обновить данные кабинета">
        <IconRefresh className={loading ? 'spin' : ''} size={17} /><span>Обновить</span>
      </button>
    </header>
    {(Number(forecast?.dept || 0) > 0 || expiringServices.length > 0 || hasNewTicketMessages) && <section className="dashboard-alerts" aria-label="Требует внимания">
      {Number(forecast?.dept || 0) > 0 && <Link to="/profile"><IconAlertCircle size={19} /><span>Задолженность <strong>{rubles(Number(forecast?.dept))} ₽</strong></span><IconArrowRight size={16} /></Link>}
      {expiringServices.slice(0, 2).map(service => <Link key={service.user_service_id} to={`/services/${service.user_service_id}`}><IconCalendarEvent size={19} /><span>{service.service?.name || service.name || `Услуга #${service.user_service_id}`} · {expiry(service.expire)}</span><IconArrowRight size={16} /></Link>)}
      {hasNewTicketMessages && <Link to="/tickets"><IconHeadset size={19} /><span>Новый ответ поддержки</span><IconArrowRight size={16} /></Link>}
    </section>}
    <section className="dashboard-stats" aria-label="Сводка по аккаунту">
      <Link to="/services" className="dashboard-stat"><span className="dashboard-stat__label">Активные услуги</span><strong>{loading ? '—' : activeServices.length}</strong><span className="dashboard-stat__hint">управление VPN</span></Link>
      <Link to="/services" className="dashboard-stat dashboard-stat--warning"><span className="dashboard-stat__label">Истекают скоро</span><strong>{loading ? '—' : expiringServices.length}</strong><span className="dashboard-stat__hint">требуют внимания</span></Link>
      <Link to="/services" className="dashboard-stat dashboard-stat--muted"><span className="dashboard-stat__label">Приостановлены</span><strong>{loading ? '—' : blockedServices.length}</strong><span className="dashboard-stat__hint">проверить услуги</span></Link>
    </section>
    <div className="dashboard-primary">
      <section className="dashboard-funds" aria-label="Баланс аккаунта">
        <div className="dashboard-section-label"><IconWallet size={18} />Ваш баланс</div>
        <div className="dashboard-amount">{rubles(Number(user?.balance || 0))}<span> ₽</span></div>
        <p>{hasBalance ? 'Для оплаты и продления услуг' : 'Пополните баланс перед оплатой услуги'}</p>
        <button type="button" className="dashboard-pay" onClick={() => setPayModalOpen(true)}><IconPlus size={18} />Пополнить баланс</button>
        <div className="dashboard-forecast"><div><span>К оплате за услуги</span><strong>{forecast ? `${rubles(Number(forecast.total || 0))} ₽` : '—'}</strong></div><Link to="/operations">Расчёт оплаты<IconArrowRight size={15} /></Link></div>
        {forecastError && <p role="status" className="dashboard-inline-error">Не удалось обновить расчёт. Повторите обновление.</p>}
      </section>
      <section className="cabinet-panel dashboard-connections" aria-labelledby="connections-heading">
        <div className="panel-title"><h2 id="connections-heading">Мои подключения{servicesUpdated && <span className="dashboard-count">{activeServices.length}</span>}</h2><Link className="dashboard-text-action" to="/services?order=1"><IconPlus size={16} />Купить VPN</Link></div>
        {serviceError && <div role="alert" className="dashboard-inline-error">Не удалось обновить услуги.{servicesUpdated ? ' Показаны ранее загруженные данные.' : ' Нажмите «Обновить» для повторной попытки.'}</div>}
        {loading && !servicesUpdated ? <div className="panel-placeholder" role="status">Загружаем подключения…</div> : !servicesUpdated ? null : activeServices.length === 0 ? <div className="dashboard-onboarding"><div className="dashboard-empty-icon"><IconServer size={26} /></div><h3>Подключите свой первый VPN</h3><p>Выберите тариф, пополните баланс и оформите услугу. Ссылка и инструкция появятся в разделе «Мой VPN».</p><ol><li>Выберите тариф</li><li>Оплатите услугу</li><li>Подключите устройство</li></ol></div> : <div className="connection-list">{activeServices.slice(0, 4).map(service => <Link className="connection-row" key={service.user_service_id} to={`/services/${service.user_service_id}`}><div className="connection-status"><IconCircleCheck size={19} /></div><div className="connection-name"><strong>{service.service?.name || service.name || `Услуга #${service.user_service_id}`}</strong><span>Действует до {formatDate(service.expire)}</span></div><span className="status-live">Активна</span><IconArrowRight size={17} /></Link>)}</div>}
        {servicesUpdated && activeServices.length > 0 && <Link className="dashboard-section-footer" to="/services">Все услуги и настройки подключения<IconArrowRight size={16} /></Link>}
      </section>
    </div>
    <section className="cabinet-panel dashboard-payments" aria-labelledby="payments-heading">
      <div className="panel-title"><h2 id="payments-heading">Последние пополнения</h2><Link className="dashboard-text-action" to="/operations">Все операции<IconArrowRight size={16} /></Link></div>
      {paymentError && <div role="alert" className="dashboard-inline-error">Не удалось обновить платежи.{paymentsUpdated ? ' Показаны ранее загруженные данные.' : ' Нажмите «Обновить» для повторной попытки.'}</div>}
      {loading && !paymentsUpdated ? <div className="panel-placeholder" role="status">Загружаем платежи…</div> : !paymentsUpdated ? null : payments.length === 0 ? <div className="panel-placeholder">Здесь появятся ваши пополнения баланса.</div> : <div className="payment-list">{payments.slice(0, 3).map((payment, index) => <div className="payment-row" key={`${payment.created || payment.date || index}-${index}`}><div className="payment-icon"><IconCreditCard size={18} /></div><div><strong>Пополнение баланса</strong><span>{formatDate(payment.created || payment.date)}</span></div><b>+{rubles(paymentAmount(payment))} ₽</b></div>)}</div>}
    </section>
    <div className="dashboard-bottomline"><span>Нужна помощь с подключением или оплатой?</span><Link to="/tickets">Написать в поддержку<IconArrowRight size={15} /></Link></div>
    <PayModal opened={payModalOpen} onClose={() => setPayModalOpen(false)} />
  </div>;
}
