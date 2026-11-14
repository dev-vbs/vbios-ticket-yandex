import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import JsonEditor from '../components/JsonEditor';
import UserSelect from '../components/UserSelect';
import ServiceSelect from '../components/ServiceSelect';
import { useSelectedUserStore } from '../store/selectedUserStore';

interface UserServiceCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  defaultUserId?: number | null;
}

export default function UserServiceCreateModal({
  open,
  onClose,
  onSave,
  defaultUserId,
}: UserServiceCreateModalProps) {
  const { selectedUser } = useSelectedUserStore();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setFormData({
        user_id: defaultUserId || selectedUser?.user_id || null,
        service_id: null,
        cost: '',
        period: '',
        settings: {},
      });
      setSelectedService(null);
    }
  }, [open, defaultUserId, selectedUser]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleServiceChange = (serviceId: number | null, service: any) => {
    setSelectedService(service);
    handleChange('service_id', serviceId);

    if (service) {
      setFormData(prev => ({
        ...prev,
        service_id: serviceId,
        cost: service.cost ?? prev.cost,
        period: service.period ?? prev.period,
        settings: {},
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.user_id) {
      toast.error('Выберите пользователя');
      return;
    }
    if (!formData.service_id) {
      toast.error('Выберите услугу');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      toast.success('Услуга создана');
    } catch (error) {
      toast.error('Ошибка создания');
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

  const renderFooter = () => (
    <div className="flex justify-between w-full">
      <div />
      <div className="flex gap-2">
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
          disabled={saving || !formData.user_id || !formData.service_id}
          className="p-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
          title="Создать"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">{saving ? 'Создание...' : 'Создать'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Новая услуга пользователя"
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
            Пользователь <span className="text-red-500">*</span>
          </label>
          <div className="flex-1">
            <UserSelect
              value={formData.user_id}
              onChange={(userId) => handleChange('user_id', userId)}
              readonly={!!defaultUserId}
            />
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
            Услуга <span className="text-red-500">*</span>
          </label>
          <div className="flex-1">
            <ServiceSelect
              value={formData.service_id}
              onChange={handleServiceChange}
            />
          </div>
        </div>

        {}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Стоимость
            </label>
            <input
              type="number"
              value={formData.cost ?? ''}
              onChange={(e) => handleChange('cost', e.target.value ? Number(e.target.value) : null)}
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="w-28 text-sm font-medium shrink-0" style={labelStyles}>
              Период (мес)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              max="120"
              value={formData.period ?? ''}
              onChange={(e) => handleChange('period', e.target.value ? Number(e.target.value) : null)}
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
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
    </Modal>
  );
}
