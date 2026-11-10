import DataLoadStatus from '../components/DataLoadStatus';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Group, Loader, Stack, Text, Title } from '@mantine/core';
import { userApi } from '../api/client';
import { IconArrowRight, IconCreditCard } from '@tabler/icons-react';
import PayModal from '../components/PayModal';
import PromoModal from '../components/PromoModal';
import PayHistoryModal from '../components/PayHistoryModal';
import WithdrawHistoryModal from '../components/WithdrawHistoryModal';
import { useStore } from '../store/useStore';
export function BalancePage() {
  const user = useStore(s => s.user);
  const [pay, setPay] = useState(false);
  const [promo, setPromo] = useState(false);
  return <Stack gap="xl" className="vpn-finance"><header><Title order={1}>Баланс и оплата</Title><Text c="dimmed" mt="sm">Пополните баланс для подключения и продления VPN.</Text></header><section className="vpn-finance-panel"><Text c="dimmed" size="sm">Доступно на балансе</Text><Text size="36px" fw={750} mt={6}>{new Intl.NumberFormat('ru-RU').format(Number(user?.balance || 0))} ₽</Text><Text c="dimmed" size="sm" mt={6}>Бонусы: {Number(user?.bonus || 0)} ₽</Text><Group mt="xl"><Button leftSection={<IconCreditCard size={18} />} size="md" onClick={() => setPay(true)}>Пополнить баланс</Button><Button variant="default" size="md" onClick={() => setPromo(true)}>Есть промокод</Button></Group><div className="vpn-guidance" style={{ marginTop: 24 }}>В форме оплаты выберите сумму и доступный способ пополнения. После зачисления вернитесь в «Мой VPN» и выберите тариф.</div></section><Button component={Link} to="/services?order=1" variant="light" rightSection={<IconArrowRight size={18} />} style={{ alignSelf: 'flex-start' }}>Выбрать тариф VPN</Button><PayModal opened={pay} onClose={() => setPay(false)} /><PromoModal opened={promo} onClose={() => setPromo(false)} /></Stack>;
}
export function OperationsPage() {
  const [payments, setPayments] = useState(false);
  const [withdrawals, setWithdrawals] = useState(false);
  return <Stack gap="xl"><header><Title order={1}>История операций</Title><Text c="dimmed" mt="sm">Пополнения и списания по вашему аккаунту.</Text></header><PaymentList /><section className="vpn-finance-panel"><Title order={2}>Подробная история</Title><Text c="dimmed" mt="sm">Посмотрите все пополнения или списания за подписки.</Text><Group mt="xl"><Button onClick={() => setPayments(true)}>Все пополнения</Button><Button variant="default" onClick={() => setWithdrawals(true)}>Списания за услуги</Button></Group></section><PayHistoryModal opened={payments} onClose={() => setPayments(false)} /><WithdrawHistoryModal opened={withdrawals} onClose={() => setWithdrawals(false)} /></Stack>;
}

type PaymentEntry = { id?: number; money: number | string; date?: string; created?: string; pay_system_id?: string };
function PaymentList() {
  const [items, setItems] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [retry, setRetry] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [loadedPage, setLoadedPage] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(false);
    void userApi.getPayments({ limit: 11, offset: page * 10, sort_field: 'date', sort_direction: 'desc', filter: { money: { '>': 0 } } }).then(response => {
      const data = response.data?.data;
      if (!Array.isArray(data)) throw new Error('Invalid payments response');
      if (!active) return;
      setHasMore(data.length > 10);
      setItems(data.slice(0, 10));
      setUpdatedAt(new Date()); setLoadedPage(page);
    }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page, retry]);
  const dateLabel = (value?: string) => {
    if (!value) return 'Дата не указана';
    const date = new Date(value.replace(' ', 'T'));
    return Number.isNaN(date.getTime()) ? 'Дата не указана' : date.toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  return <section className="vpn-finance-panel"><Group justify="space-between" mb="lg"><Title order={2}>Пополнения баланса</Title><Badge variant="light">Сначала новые</Badge></Group>
    <DataLoadStatus loading={loading} error={error && 'Не удалось загрузить пополнения'} updatedAt={updatedAt} onRetry={() => setRetry(value => value + 1)} />
    {loading && !updatedAt ? <Group justify="center" py="xl"><Loader size="sm" /><Text c="dimmed">Загружаем платежи…</Text></Group> : !items.length ? (!error && updatedAt ? <Text c="dimmed" py="xl">На этой странице пополнений нет.</Text> : null) : <Stack gap="sm">{items.map((item, index) => <Group key={item.id ?? `${item.date}-${index}`} gap="md" wrap="wrap" style={{ padding: 18, border: '1px solid var(--mantine-color-default-border)', borderRadius: 14 }}><IconCreditCard size={23} color="var(--mantine-color-green-6)" /><div style={{ flex: 1, minWidth: 150 }}><Text fw={600} size="sm">Пополнение баланса{item.id != null ? ` #${item.id}` : ''}</Text><Text c="dimmed" size="xs" mt={4}>{dateLabel(item.date || item.created)}</Text>{item.pay_system_id && <Text c="dimmed" size="xs" mt={3}>Способ оплаты: {item.pay_system_id}</Text>}</div><Text fw={700} c="green" style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>+{new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(Number(item.money) || 0)} ₽</Text></Group>)}</Stack>}
    <Group justify="space-between" mt="lg"><Button variant="default" disabled={loadedPage === 0 || loading} onClick={() => setPage(loadedPage - 1)}>Назад</Button><Text size="sm" c="dimmed">Страница {loadedPage + 1}</Text><Button variant="light" disabled={!hasMore || loading || error} onClick={() => setPage(loadedPage + 1)}>Далее</Button></Group>
  </section>;
}
