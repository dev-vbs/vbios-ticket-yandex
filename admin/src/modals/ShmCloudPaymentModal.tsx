import React, { useState, useEffect } from 'react';
import { X, CreditCard, DollarSign } from 'lucide-react';
import { shm_request } from '../lib/shm_request';
import { toast } from 'react-hot-toast';

interface ShmCloudPaySystem {
  allow_deletion: number;
  amount: string;
  forecast: number;
  name: string;
  paysystem: string;
  recurring: number;
  shm_url: string;
  user_id: number;
  weight: number;
}

interface ShmCloudPaymentModalProps {
  open: boolean;
  onClose: () => void;
}

export const ShmCloudPaymentModal: React.FC<ShmCloudPaymentModalProps> = ({ open, onClose }) => {
  const [paySystems, setPaySystems] = useState<ShmCloudPaySystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState<string>('');
  const [selectedSystem, setSelectedSystem] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadPaySystems();
    }
  }, [open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  const loadPaySystems = async () => {
    setLoading(true);
    try {
      const res = await shm_request('shm/v1/admin/cloud/paysystems');
      const systems = Array.isArray(res.data) && Array.isArray(res.data[0])
        ? res.data[0]
        : (res.data || []);

      const sortedSystems = systems.sort((a: ShmCloudPaySystem, b: ShmCloudPaySystem) => b.weight - a.weight);

      setPaySystems(sortedSystems);
    } catch (error) {
      toast.error('Не удалось загрузить платежные системы');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePayment = async (paysystem: string, name: string, index: number) => {
    const confirmed = window.confirm('Отвязать сохраненный способ оплаты?');
    if (!confirmed) return;

    try {
      await shm_request(`shm/v1/admin/cloud/autopayment?pay_system=${paysystem}`, {
        method: 'DELETE',
      });

      setPaySystems(prev => prev.filter((_, i) => i !== index));

      const uniqueKey = `${paysystem}-${index}`;
      if (selectedSystem === uniqueKey) {
        setSelectedSystem('');
      }

      toast.success('Способ оплаты отвязан');
    } catch (error) {
      toast.error('Не удалось отвязать способ оплаты');
    }
  };

  const handlePayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Введите корректную сумму');
      return;
    }

    if (!selectedSystem) {
      toast.error('Выберите платежную систему');
      return;
    }

    try {
      const index = parseInt(selectedSystem.split('-').pop() || '0');
      const selectedPaySystem = paySystems[index];

      if (selectedPaySystem) {
        const paymentUrl = `${selectedPaySystem.shm_url}${amount}`;
        window.open(paymentUrl, '_blank');
        toast.success('Переход к оплате');
        onClose();
      }
    } catch (error) {
      toast.error('Ошибка создания платежа');
    }
  };

  if (!open) return null;

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-content-text)',
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="rounded-lg shadow-xl max-w-md w-full mx-4"
        style={cardStyles}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--theme-card-border)' }}>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Пополнение баланса
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--theme-content-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
              Сумма пополнения (₽)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4"
                          style={{ color: 'var(--theme-content-text-muted)' }} />
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded border"
                style={inputStyles}
                placeholder="Введите сумму"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
              Платежная система
            </label>
            {loading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 rounded animate-pulse"
                       style={{ backgroundColor: 'var(--theme-input-border)' }} />
                ))}
              </div>
            ) : paySystems.length === 0 ? (
              <p style={{ color: 'var(--theme-content-text-muted)' }}>
                Нет доступных платежных систем
              </p>
            ) : (
              <div className="space-y-2">
                {paySystems.map((ps, index) => {
                  const uniqueKey = `${ps.paysystem}-${index}`;
                  const isSelected = selectedSystem === uniqueKey;

                  return (
                    <div key={uniqueKey} className="relative">
                      <button
                        onClick={() => setSelectedSystem(uniqueKey)}
                        className="w-full p-3 rounded border text-left transition-colors"
                        style={{
                          ...inputStyles,
                          borderColor: isSelected
                            ? 'var(--theme-primary-color)'
                            : 'var(--theme-input-border)',
                          backgroundColor: isSelected
                            ? 'var(--accent-primary-transparent)'
                            : 'var(--theme-input-bg)',
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{ps.name}</span>
                        </div>
                      </button>
                      {ps.recurring === 1 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePayment(ps.paysystem, ps.name, index);
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-colors hover:opacity-70"
                          style={{
                            backgroundColor: 'var(--accent-danger)',
                            color: 'white',
                          }}
                          title="Отвязать способ оплаты"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-6 border-t" style={{ borderColor: 'var(--theme-card-border)' }}>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded border transition-colors"
            style={{
              ...inputStyles,
              borderColor: 'var(--theme-input-border)',
            }}
          >
            Отмена
          </button>
          <button
            onClick={handlePayment}
            disabled={!amount || !selectedSystem}
            className="flex-1 px-4 py-2 rounded transition-opacity disabled:opacity-50 btn-primary"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-text)',
            }}
          >
            Пополнить
          </button>
        </div>
      </div>
    </div>
  );
};
