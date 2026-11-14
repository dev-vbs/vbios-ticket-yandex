import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import TemplateSelect from '../components/TemplateSelect';

interface PromoCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

export default function PromoCreateModal({
  open,
  onClose,
  onSave,
}: PromoCreateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    expire: '',
    id: '',
    code: '',
    template_id: '',
    settings: {
      reusable: 0,
      status: 1,
      quantity: 1,
      count: 1,
      length: 10,
      prefix: 'PROMO_',
    },
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        expire: '',
        id: '',
        code: '',
        template_id: '',
        settings: {
          reusable: 0,
          status: 1,
          quantity: 1,
          count: 1,
          length: 10,
          prefix: 'PROMO_',
        },
      });
    }
  }, [open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: { ...prev.settings, [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!formData.template_id) {
      toast.error('Выберите шаблон');
      return;
    }

    if (formData.settings.reusable === 1) {
      if (!formData.code) {
        toast.error('Введите код промокода');
        return;
      }
      if (!formData.settings.quantity || formData.settings.quantity < 1 || formData.settings.quantity > 1000) {
        toast.error('Количество использований должно быть от 1 до 1000');
        return;
      }
    } else {
      if (!formData.settings.count || formData.settings.count < 1 || formData.settings.count > 1000) {
        toast.error('Количество кодов должно быть от 1 до 1000');
        return;
      }
      if (!formData.settings.length || formData.settings.length < 1 || formData.settings.length > 30) {
        toast.error('Длина кода должна быть от 1 до 30');
        return;
      }
    }

    setSaving(true);
    try {
      const dataToSave = { ...formData };
      if (!dataToSave.expire) {
        delete dataToSave.expire;
      }

      await onSave(dataToSave);
      onClose();
      toast.success('Промокод создан');
    } catch (error) {
      toast.error('Ошибка создания промокода');
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

  const isReusable = formData.settings?.reusable === 1;

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
        disabled={saving || !formData.template_id}
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
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создание промокода"
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Тип *
          </label>
          <select
            value={formData.settings?.reusable}
            onChange={(e) => handleSettingsChange('reusable', Number(e.target.value))}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <option value={0}>Одноразовый</option>
            <option value={1}>Многоразовый</option>
          </select>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Статус
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.settings?.status === 1}
              onChange={(e) => handleSettingsChange('status', e.target.checked ? 1 : 0)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: 'var(--theme-content-text)' }}>
              Активен
            </span>
          </label>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Срок действия
          </label>
          <input
            type="datetime-local"
            value={formData?.expire}
            onChange={(e) => handleChange('expire', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        {isReusable ? (
          <>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Код *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => handleChange('code', e.target.value)}
                placeholder="PROMO"
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Кол-во исп. *
              </label>
              <input
                type="number"
                value={formData.settings?.quantity}
                onChange={(e) => handleSettingsChange('quantity', Number(e.target.value))}
                min="1"
                max="1000"
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
          </>
        ) : (
          <>
            {}
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Кол-во кодов *
              </label>
              <input
                type="number"
                value={formData.settings?.count}
                onChange={(e) => handleSettingsChange('count', Number(e.target.value))}
                min="1"
                max="1000"
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Длина кода *
              </label>
              <input
                type="number"
                value={formData.settings?.length}
                onChange={(e) => handleSettingsChange('length', Number(e.target.value))}
                min="1"
                max="30"
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Префикс
              </label>
              <input
                type="text"
                value={formData.settings?.prefix}
                onChange={(e) => handleSettingsChange('prefix', e.target.value)}
                placeholder="PROMO_"
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
          </>
        )}

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Шаблон *
          </label>
          <TemplateSelect
            value={formData.template_id}
            onChange={(id, template) => handleChange('template_id', id)}
            onTemplateUpdated={() => {}}
            readonly={false}
            className="flex-1"
          />
        </div>
      </div>
    </Modal>
  );
}
