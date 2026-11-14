import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

export default function UserCreateModal({
  open,
  onClose,
  onSave,
}: UserCreateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({});
    }
  }, [open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.login?.trim()) {
      toast.error('Введите логин');
      return;
    }
    if (!formData.password?.trim()) {
      toast.error('Введите пароль');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      toast.error('Ошибка создания пользователя');
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
        className="p-2 rounded flex items-center gap-2 btn-success"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
        title="Создать"
      >
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">{saving ? 'Создание...' : 'Создать'}</span>
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создание пользователя"
      footer={renderFooter()}
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Полное имя
          </label>
          <input
            type="text"
            value={formData.full_name || ''}
            onChange={(e) => handleChange('full_name', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Логин <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.login || ''}
            onChange={(e) => handleChange('login', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
            autoFocus
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Пароль <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={formData.password || ''}
            onChange={(e) => handleChange('password', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>
      </div>
    </Modal>
  );
}
