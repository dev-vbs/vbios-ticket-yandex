import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Save, X, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { shm_request } from '../lib/shm_request';

interface ChangeServiceModalProps {
  open: boolean;
  onClose: () => void;
  userServiceData: Record<string, any> | null;
  onSuccess?: () => void;
}

export default function ChangeServiceModal({
  open,
  onClose,
  userServiceData,
  onSuccess,
}: ChangeServiceModalProps) {
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null | undefined>(null);
  const [finishActive, setFinishActive] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Устанавливаем значение по умолчанию на основе next
      if (userServiceData?.next === -1) {
        setSelectedServiceId(-1);
      } else if (userServiceData?.next === null || userServiceData?.next === undefined) {
        setSelectedServiceId(0);
      } else {
        setSelectedServiceId(userServiceData?.next);
      }

      setLoadingServices(true);
      shm_request('shm/v1/admin/service?limit=100')
        .then(res => {
          const items = res.data || res;
          setServices(Array.isArray(items) ? items : []);
        })
        .catch(() => {
          toast.error('Ошибка загрузки услуг');
        })
        .finally(() => setLoadingServices(false));
    } else {
      setSelectedServiceId(null);
      setFinishActive(0);
    }
  }, [open, userServiceData]);

  const handleSave = async () => {
    if (selectedServiceId === null || selectedServiceId === undefined || !userServiceData) {
      toast.error('Выберите услугу');
      return;
    }

    setSaving(true);
    try {
      await shm_request('shm/v1/admin/user/service/change', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userServiceData.user_id,
          user_service_id: userServiceData.user_service_id,
          service_id: selectedServiceId,
          finish_active: finishActive,
        }),
      });
      toast.success('Тариф успешно изменен');
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error('Ошибка смены тарифа');
    } finally {
      setSaving(false);
    }
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const labelStyles = {
    color: 'var(--theme-content-text-muted)',
  };

  const currentService = services.find(s => s.service_id === userServiceData?.service_id);
  const selectedService = services.find(s => s.service_id === selectedServiceId);

  const getNextServiceLabel = () => {
    if (!userServiceData?.next) return 'Не изменять';
    if (userServiceData.next === -1) return 'Удалить по истечению';
    const nextService = services.find(s => s.service_id === userServiceData.next);
    return nextService?.name || `ID: ${userServiceData.next}`;
  };

  const renderFooter = () => (
    <div className="flex justify-end gap-2 w-full">
      <button
        onClick={onClose}
        className="p-2 rounded flex items-center gap-2"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
        title="Отмена"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Отмена</span>
      </button>
      <button
        onClick={handleSave}
        disabled={saving || selectedServiceId === null || selectedServiceId === undefined}
        className="p-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
        title="Сменить тариф"
      >
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">{saving ? 'Сохранение...' : 'Сменить тариф'}</span>
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Смена тарифа услуги"
      footer={renderFooter()}
      size="lg"
    >
      {loadingServices ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <span className="ml-3 text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
            Загрузка услуг...
          </span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Текущая услуга */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={labelStyles}>
              Текущая услуга
            </label>
            <div
              className="px-4 py-3 rounded border"
              style={{
                backgroundColor: 'var(--theme-content-bg)',
                borderColor: 'var(--theme-input-border)',
                color: 'var(--theme-content-text)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{currentService?.name || 'Загрузка...'}</div>
                </div>
                <span
                  className="px-3 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: '#dbeafe',
                    color: '#2563eb',
                  }}
                >
                  Текущая
                </span>
              </div>
            </div>
          </div>

          {/* Следующая услуга (если есть) */}
          {userServiceData?.next && (
            <div>
              <label className="text-sm font-medium mb-2 block" style={labelStyles}>
                Запланированная следующая услуга
              </label>
              <div
                className="px-4 py-3 rounded border"
                style={{
                  backgroundColor: 'var(--theme-content-bg)',
                  borderColor: 'var(--theme-input-border)',
                  color: 'var(--theme-content-text)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{getNextServiceLabel()}</div>
                  </div>
                  <span
                    className="px-3 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: userServiceData.next === -1 ? '#fee2e2' : '#f3e8ff',
                      color: userServiceData.next === -1 ? '#dc2626' : '#9333ea',
                    }}
                  >
                    {userServiceData.next === -1 ? 'Удаление' : 'Следующая'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Разделитель */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-input-border)' }} />
            <ArrowRight className="w-5 h-5" style={{ color: 'var(--theme-content-text-muted)' }} />
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--theme-input-border)' }} />
          </div>

          {/* Новая услуга */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={labelStyles}>
              Новая услуга
            </label>
            <select
              value={selectedServiceId || ''}
              onChange={(e) => setSelectedServiceId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 text-sm rounded border"
              style={inputStyles}
            >
              <option value="null">Не изменять</option>
              <option value="-1">Удалить по истечению</option>
              {services.map(s => (
                <option key={s.service_id} value={s.service_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Опция времени смены */}
          <div>
            <label className="text-sm font-medium mb-2 block" style={labelStyles}>
              Тип смены тарифа
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={finishActive === 0}
                  onChange={() => setFinishActive(0)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--theme-content-text)' }}>
                    После окончания текущей услуги
                  </div>
                  <div className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                    Смена произойдет автоматически по истечению срока действия
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={finishActive === 1}
                  onChange={() => setFinishActive(1)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--theme-content-text)' }}>
                    Сменить немедленно
                  </div>
                  <div className="text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
                    Текущая услуга будет завершена сразу
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Предупреждение */}
          {selectedServiceId ? (
            <div
              className="px-4 py-3 rounded border-l-4"
              style={{
                backgroundColor: '#fef3c7',
                borderColor: '#f59e0b',
                color: '#92400e',
              }}
            >
              <div className="text-sm">
                <strong>Внимание:</strong> После смены тарифа на "
                {selectedService?.name || selectedServiceId}" текущая настройка "
                {userServiceData?.next ? (userServiceData.next === -1 ? 'Удалить по истечению' : 'Следующая услуга') : 'Не изменять'}
                " будет {finishActive === 1 ? 'применена немедленно' : 'заменена новым тарифом'}.
              </div>
            </div>
          ) : null}
        </div>
      )}
    </Modal>
  );
}
