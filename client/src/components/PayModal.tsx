import './PayModal.css';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Stack, Group, Button, Text, NumberInput, Select, Loader, ActionIcon, Badge, Card, Alert, ScrollArea } from '@mantine/core';
import { IconX, IconArrowRight, IconWallet } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { userApi } from '../api/client';
import ConfirmModal from './ConfirmModal';

interface PaySystem {
  name: string;
  shm_url: string;
  paysystem: string;
  allow_deletion: number;
  recurring: number;
  internal?: number;
  weight?: number;
}

interface PayModalProps {
  opened: boolean;
  onClose: () => void;
  initialAmount?: number;
}

export default function PayModal({ opened, onClose, initialAmount }: PayModalProps) {
  const { t } = useTranslation();
  const [paySystems, setPaySystems] = useState<PaySystem[]>([]);
  const [selectedPaySystem, setSelectedPaySystem] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState<number | string>(initialAmount ?? 100);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [autopaymentToDelete, setAutopaymentToDelete] = useState<{ paysystem: string; name: string } | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (opened && initialAmount !== undefined) {
      setPayAmount(initialAmount);
    }
  }, [opened, initialAmount]);

  const loadPaySystems = async () => {
    setLoadError(false);
    setLoading(true);
    try {
      const response = await userApi.getPaySystems();
      const rawData = response.data.data;
      if (!Array.isArray(rawData)) throw new Error("Invalid payment systems response");
      const seen = new Set<string>();
      const data = rawData
        .filter((ps: PaySystem) => {
          if (!ps || !ps.shm_url || !ps.name || seen.has(ps.shm_url)) return false;
          seen.add(ps.shm_url);
          return true;
        })
        .sort((a: PaySystem, b: PaySystem) => (b.weight || 0) - (a.weight || 0));
      setPaySystems(data);
      setSelectedPaySystem(previous => data.some((ps: PaySystem) => ps.shm_url === previous) ? previous : data[0]?.shm_url ?? null);
    } catch {
      setLoadError(true);
      notifications.show({
        title: t('common.error'),
        message: t('payments.paymentSystemsError'),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (paysystem: string, name: string) => {
    setAutopaymentToDelete({ paysystem, name });
    setDeleteConfirmOpen(true);
  };

  const handleDeleteAutopayment = async () => {
    if (!autopaymentToDelete) return;
    setDeleting(autopaymentToDelete.paysystem);
    try {
      await userApi.deleteAutopayment(autopaymentToDelete.paysystem);
      notifications.show({
        title: t('common.success'),
        message: t('payments.autopaymentDeleted'),
        color: 'cyan',
      });
      setDeleteConfirmOpen(false);
      setAutopaymentToDelete(null);
      await loadPaySystems();
    } catch {
      notifications.show({
        title: t('common.error'),
        message: t('payments.autopaymentDeleteError'),
        color: 'red',
      });
    } finally {
      setDeleting(null);
    }
  };

  const amount = Number(payAmount);
  const validAmount = Number.isFinite(amount) && amount >= 1;
  const selectedMethod = paySystems.find(ps => ps.shm_url === selectedPaySystem);
  const money = (value: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value);
  const handlePay = async () => {
    if (!validAmount || processing || loading || loadError) return;
    const paySystem = paySystems.find(ps => ps.shm_url === selectedPaySystem);
    if (!paySystem) {
      notifications.show({
        title: t('common.error'),
        message: t('payments.selectPaymentSystem'),
        color: 'red',
      });
      return;
    }

    if (paySystem.internal || paySystem.recurring) {
      setProcessing(true);
      try {
        const response = await fetch(paySystem.shm_url + payAmount, {
          method: 'GET',
          credentials: 'include',
        });

        if (response.status === 200 || response.status === 204) {
          notifications.show({
            title: t('common.success'),
            message: t('payments.paymentSuccess'),
            color: 'cyan',
          });
          onClose();
        } else {
          const data = await response.json().catch(() => ({}));
          notifications.show({
            title: t('common.error'),
            message: data.msg_ru || data.msg || t('payments.paymentError'),
            color: 'red',
          });
        }
      } catch {
        notifications.show({
          title: t('common.error'),
          message: t('payments.paymentError'),
          color: 'red',
        });
      } finally {
        setProcessing(false);
      }
    } else {
      window.open(paySystem.shm_url + payAmount, '_blank');
      onClose();
    }
  };

  useEffect(() => {
    if (opened) void loadPaySystems();
  }, [opened]);

  return (
    <>
      <Modal opened={opened} onClose={onClose} title="Пополнить баланс" size="lg" centered scrollAreaComponent={ScrollArea.Autosize}
        closeOnClickOutside={!processing} closeOnEscape={!processing} withCloseButton={!processing}
        classNames={{ content: 'payment-modal', header: 'payment-modal__header', body: 'payment-modal__body' }}>
        <Text c="dimmed" size="sm" mb="lg">Укажите сумму и выберите способ оплаты. Деньги поступят на баланс личного кабинета.</Text>
        <div className="payment-layout">
          <Stack gap="lg" className="payment-fields">
            <section>
              <NumberInput label="Сумма пополнения" description="Введите свою сумму или выберите ниже" placeholder="Например, 250"
                value={payAmount} onChange={setPayAmount} min={1} step={50} decimalScale={2} suffix=" ₽" size="lg" hideControls disabled={processing}
                error={payAmount !== '' && !validAmount ? 'Укажите сумму от 1 ₽' : undefined} />
              <div className="payment-presets" aria-label="Быстрый выбор суммы">{[100,250,500,1000].map(value => <button type="button" key={value} disabled={processing} aria-pressed={amount === value} className={amount === value ? 'is-selected' : ''} onClick={() => setPayAmount(value)}>{money(value)} ₽</button>)}</div>
            </section>
            <section>
              {loading && !paySystems.length ? <Group py="md"><Loader size="sm"/><Text size="sm">Загружаем способы оплаты…</Text></Group> : <Select label="Способ оплаты" placeholder="Выберите способ оплаты" size="md" data={paySystems.map(ps => ({ value:ps.shm_url,label:ps.name }))} value={selectedPaySystem} onChange={setSelectedPaySystem} disabled={processing || loading} allowDeselect={false} />}
              {loadError && <Alert color="red" mt="sm" title="Не удалось получить способы оплаты"><Text size="sm">Проверьте соединение и попробуйте ещё раз.</Text><Button size="xs" variant="light" color="red" mt="sm" onClick={() => void loadPaySystems()} loading={loading}>Повторить</Button></Alert>}
              {!loading && !loadError && !paySystems.length && <Alert color="yellow" mt="sm" title="Способы оплаты пока недоступны">Попробуйте позже или обратитесь в поддержку.<Button display="block" size="xs" variant="light" mt="sm" onClick={() => void loadPaySystems()}>Обновить</Button></Alert>}
            </section>
            {paySystems.some(ps => ps.allow_deletion === 1) && <Card withBorder p="md" radius="md"><Text size="sm" fw={600} mb="sm">Сохранённые способы оплаты</Text><Stack gap="sm">{paySystems.filter(ps => ps.allow_deletion === 1).map(ps => <Group key={ps.shm_url} justify="space-between" wrap="nowrap"><div style={{minWidth:0}}><Text size="sm" style={{overflowWrap:'anywhere'}}>{ps.name}</Text><Badge size="xs" variant="light" mt={4}>Автоплатёж</Badge></div><ActionIcon size="lg" color="red" variant="subtle" aria-label={`Удалить способ оплаты ${ps.name}`} loading={deleting === ps.paysystem} disabled={processing} onClick={() => openDeleteConfirm(ps.paysystem, ps.name)}><IconX size={16}/></ActionIcon></Group>)}</Stack></Card>}
          </Stack>
          <aside className="payment-summary">
            <div className="payment-summary__icon"><IconWallet size={24}/></div>
            <Text size="sm" c="dimmed" mt="md">Сумма пополнения</Text>
            <Text className="payment-summary__amount">{validAmount ? `${money(amount)} ₽` : '—'}</Text>
            <div className="payment-summary__method"><Text size="xs" c="dimmed">Способ оплаты</Text><Text size="sm" fw={600} mt={4}>{selectedMethod?.name || 'Не выбран'}</Text></div>
            <Text size="xs" c="dimmed" lh={1.6}>{selectedMethod?.internal || selectedMethod?.recurring ? 'После подтверждения запрос будет отправлен в платёжную систему.' : 'Платёжная страница откроется в новой вкладке. После оплаты вернитесь в кабинет.'}</Text>
            <Text size="xs" c="dimmed" mt="sm">Если предусмотрена комиссия, её размер указан на странице оплаты.</Text>
          </aside>
        </div>
        <div className="payment-footer"><Button variant="default" onClick={onClose} disabled={processing}>Отмена</Button><Button size="md" rightSection={<IconArrowRight size={18}/>} onClick={handlePay} disabled={!validAmount || !selectedPaySystem || loading || loadError} loading={processing}>{validAmount ? `Пополнить на ${money(amount)} ₽` : 'Укажите сумму'}</Button></div>
      </Modal>

      <ConfirmModal
        opened={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteAutopayment}
        title={t('payments.deletePaymentMethod')}
        message={t('payments.deletePaymentMethodConfirm', { name: autopaymentToDelete?.name || '' })}
        confirmLabel={t('common.delete')}
        confirmColor="red"
        loading={deleting !== null}
      />
    </>
  );
}
