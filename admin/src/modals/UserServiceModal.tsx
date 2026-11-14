import React, { useState, useEffect, useRef } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import WithdrawModal from './WithdrawModal';
import ChangeServiceModal from './ChangeServiceModal';
import { Save, Trash2, X, Loader2, ChevronDown, RussianRuble } from 'lucide-react';
import toast from 'react-hot-toast';
import JsonEditor from '../components/JsonEditor';
import UserSelect from '../components/UserSelect';
import ServiceSelect from '../components/ServiceSelect';
import { shm_request } from '../lib/shm_request';

interface UserServiceModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onRefresh?: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  'ACTIVE': { label: 'Активен', color: '#16a34a', bgColor: '#dcfce7' },
  'BLOCK': { label: 'Заблокирован', color: '#dc2626', bgColor: '#fee2e2' },
  'NOT PAID': { label: 'Не оплачена', color: '#2563eb', bgColor: '#dbeafe' },
  'INIT': { label: 'Инициализация', color: '#6b7280', bgColor: '#f3f4f6' },
  'PROGRESS': { label: 'Обработка', color: '#9333ea', bgColor: '#f3e8ff' },
  'ERROR': { label: 'Ошибка', color: '#ea580c', bgColor: '#ffedd5' },
};

export default function UserServiceModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
  onRefresh,
}: UserServiceModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [services, setServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
  const [withdrawData, setWithdrawData] = useState<Record<string, any> | null>(null);
  const [changeServiceModalOpen, setChangeServiceModalOpen] = useState(false);

  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && data) {
      setFormData({ ...data });
    } else if (!open) {
      setFormData({});
      setContentReady(false);
    }
  }, [data, open]);

  useEffect(() => {
    if (open && services.length === 0) {
      setLoadingServices(true);
      shm_request('shm/v1/admin/service?limit=100')
        .then(res => {
          const items = res.data || res;
          setServices(Array.isArray(items) ? items : []);
        })
        .catch(() => {})
        .finally(() => setLoadingServices(false));
    }
  }, [open]);

  useEffect(() => {
    if (open && data && !loadingServices && !loadingUser) {
      setContentReady(true);
    } else if (!open) {
      setContentReady(false);
      setStatusMenuOpen(false);
    }
  }, [open, data, loadingServices, loadingUser]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setStatusMenuOpen(false);
      }
    };

    if (statusMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [statusMenuOpen]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      toast.success('Услуга сохранена');
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    const canDelete = formData.status === 'BLOCK' || formData.status === 'NOT PAID';
    if (!canDelete) {
      toast.error('Можно удалить только заблокированные или неоплаченные услуги');
      return;
    }

    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;

    setDeleting(true);
    setConfirmDelete(false);
    try {
      await onDelete();
      onClose();
      toast.success('Услуга удалена');
    } catch (error) {
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleBlock = async () => {
    try {
      await shm_request('shm/v1/admin/user/service/stop', {
        method: 'POST',
        body: JSON.stringify({
          user_id: formData.user_id,
          user_service_id: formData.user_service_id,
          auto_bill: 0,
        }),
      });
      toast.success('Услуга заблокирована');
      onRefresh?.();
      setFormData(prev => ({ ...prev, status: 'BLOCK', auto_bill: 0 }));
    } catch (error) {
      toast.error('Ошибка блокировки');
    }
  };

  const handleActivate = async () => {
    try {
      await shm_request('shm/v1/admin/user/service/activate', {
        method: 'POST',
        body: JSON.stringify({
          user_id: formData.user_id,
          user_service_id: formData.user_service_id,
          auto_bill: 1,
        }),
      });
      toast.success('Услуга активирована');
      onRefresh?.();
      setFormData(prev => ({ ...prev, status: 'ACTIVE', auto_bill: 1 }));
    } catch (error) {
      toast.error('Ошибка активации');
    }
  };

  const handleSetStatus = async (status: string) => {
    try {
      await shm_request('shm/v1/admin/user/service/status', {
        method: 'POST',
        body: JSON.stringify({
          user_id: formData.user_id,
          user_service_id: formData.user_service_id,
          status,
        }),
      });
      toast.success('Статус изменен');
      onRefresh?.();
      setFormData(prev => ({ ...prev, status }));
    } catch (error) {
      toast.error('Ошибка изменения статуса');
    }
  };

  const handleOpenWithdrawModal = async () => {
    if (!formData.user_service_id) return;

    try {
      const res = await shm_request(
        `shm/v1/admin/user/service/withdraw?user_service_id=${formData.user_service_id}&limit=1&sort_field=withdraw_date&sort_direction=desc`
      );
      const data = res.data || res;
      const withdraws = Array.isArray(data) ? data : [];

      if (withdraws.length > 0) {
        setWithdrawData(withdraws[0]);
        setWithdrawModalOpen(true);
      } else {
        toast.error('Списания не найдены');
      }
    } catch (error) {
      toast.error('Ошибка загрузки списания');
    }
  };

  const handleSaveWithdraw = async (withdrawData: Record<string, any>) => {
    await shm_request('shm/v1/admin/user/service/withdraw', {
      method: 'POST',
      body: JSON.stringify(withdrawData),
    });
    toast.success('Списание обновлено');
    onRefresh?.();
  };

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  const labelStyles = {
    color: 'var(--theme-content-text-muted)',
  };

  const canDelete = formData.status === 'BLOCK' || formData.status === 'NOT PAID';
  const statusConfig = STATUS_CONFIG[formData.status] || { label: formData.status, color: '#6b7280', bgColor: '#f3f4f6' };

  const renderFooter = () => (
    <div className="flex flex-col sm:flex-row justify-between w-full gap-2">
      <div>
        {onDelete && canDelete && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 rounded flex items-center gap-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            title="Удалить"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{deleting ? 'Удаление...' : 'Удалить'}</span>
          </button>
        )}
      </div>
      <div className="flex gap-2 flex-wrap justify-end">
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
          disabled={saving}
          className="p-2 rounded flex items-center gap-2 btn-success disabled:opacity-50"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
          title="Сохранить"
        >
          <Save className="w-4 h-4" />
          <span className="hidden sm:inline">{saving ? 'Сохранение...' : 'Сохранить'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Услуга #${data?.user_service_id || ''}: ${data?.name || ''}`}
      footer={contentReady ? renderFooter() : undefined}
      size="xl"
    >
      {!contentReady ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent-primary)' }} />
          <span className="ml-3 text-sm" style={{ color: 'var(--theme-content-text-muted)' }}>
            Загрузка...
          </span>
        </div>
      ) : (
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Пользователь
          </label>
          <div className="flex-1">
            <UserSelect
              value={formData.user_id}
              readonly
              onLoadingChange={setLoadingUser}
            />
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Услуга:
          </label>
          <div className="flex-1">
            <ServiceSelect
              value={formData.service_id}
              readonly
              onServiceUpdated={onRefresh}
            />
          </div>
        </div>

        {/* Статус, Биллинг, Смена тарифа */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Статус
            </label>
            <div className="relative" ref={statusMenuRef}>
              {}
              <button
                onClick={() => setStatusMenuOpen(!statusMenuOpen)}
                className="flex items-center gap-1 px-3 py-1 rounded text-sm font-medium cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
              >
                {statusConfig.label}
                <ChevronDown className={`w-4 h-4 transition-transform ${statusMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {}
              {statusMenuOpen && (
                <div
                  className="absolute top-full left-0 mt-1 py-1 rounded shadow-lg border z-50 min-w-[140px]"
                  style={{
                    backgroundColor: 'var(--theme-content-bg)',
                    borderColor: 'var(--theme-input-border)',
                  }}
                >
                  {formData.status === 'ACTIVE' && (
                    <button
                      onClick={() => { handleBlock(); setStatusMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      Заблокировать
                    </button>
                  )}
                  {formData.status === 'BLOCK' && (
                    <button
                      onClick={() => { handleActivate(); setStatusMenuOpen(false); }}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 text-green-600 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      Активировать
                    </button>
                  )}
                  {(formData.status === 'ERROR' || formData.status === 'NOT PAID' || formData.status === 'INIT' || formData.status === 'PROGRESS') && (
                    <>
                      <button
                        onClick={() => { handleActivate(); setStatusMenuOpen(false); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-green-50 text-green-600 flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-green-500"></span>
                        Активировать
                      </button>
                      <button
                        onClick={() => { handleBlock(); setStatusMenuOpen(false); }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-red-500"></span>
                        Заблокировать
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Биллинг:
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!!formData.auto_bill}
                onChange={(e) => handleChange('auto_bill', e.target.checked ? 1 : 0)}
                className="w-4 h-4 rounded"
              />
              {formData.auto_bill ? (
                <span className="text-green-500 text-sm font-medium">Включен</span>
              ) : (
                <span className="text-red-500 text-sm font-medium">Выключен</span>
              )}
            </label>
          </div>

          <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Смена тарифа:
            </label>
            <button
              type="button"
              onClick={() => setChangeServiceModalOpen(true)}
              className="px-3 py-1.5 rounded flex items-center gap-2 text-sm font-medium btn-primary"
              style={{
                backgroundColor: 'var(--accent-primary)',
                borderColor: 'var(--accent-primary)',
                color: 'var(--accent-text)',
              }}
              title="Сменить тариф"
            >
              Сменить
            </button>
            </div>
        </div>

        {/* Стоимость и Действует до */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Стоимость
            </label>
            <input
              type="text"
              value={formData.withdraws?.total ?? ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Действует до
            </label>
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={formData.expire || ''}
                disabled
                className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
                style={inputStyles}
              />
              {formData.expire && (
                <button
                  type="button"
                  onClick={handleOpenWithdrawModal}
                  className="p-2 rounded border hover:opacity-80 transition-opacity shrink-0"
                  style={{
                    backgroundColor: 'var(--theme-button-secondary-bg)',
                    borderColor: 'var(--theme-button-secondary-border)',
                    color: 'var(--theme-button-secondary-text)',
                  }}
                  title="Списания"
                >
                  <RussianRuble className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            След. услуга
          </label>
          <select
            value={formData.next ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              handleChange('next', val === '' ? null : val === '-1' ? -1 : Number(val));
            }}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <option value="">Не изменять</option>
            <option value="-1">Удалить по истечению</option>
            {services.map(s => (
              <option key={s.service_id} value={s.service_id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {}
        <div className="pt-2">
          <label className="text-sm font-medium" style={labelStyles}>
            Settings
          </label>
          <div className="mt-2">
            <JsonEditor
              data={formData.settings ?? {}}
              onChange={(newData) => handleChange('settings', newData)}
              showInput={true}
            />
          </div>
        </div>
      </div>
      )}

      {}
      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление услуги"
        message={`Вы уверены, что хотите удалить услугу #${formData.user_service_id}?`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
        loading={deleting}
      />

      {}
      <WithdrawModal
        open={withdrawModalOpen}
        onClose={() => setWithdrawModalOpen(false)}
        data={withdrawData}
        onSave={handleSaveWithdraw}
      />

      {}
      <ChangeServiceModal
        open={changeServiceModalOpen}
        onClose={() => setChangeServiceModalOpen(false)}
        userServiceData={formData}
        onSuccess={() => {
          onRefresh?.();
          onClose();
        }}
      />
    </Modal>
  );
}
