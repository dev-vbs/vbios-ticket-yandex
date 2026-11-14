import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import JsonEditor from '../components/JsonEditor';
import { shm_request } from '../lib/shm_request';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConfigCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function ConfigCreateModal({ open, onClose, onSave }: ConfigCreateModalProps) {
  const [formData, setFormData] = useState<any>({
    key: '',
    value: {},
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        key: '',
        value: {},
      });
      setError('');
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.key || !formData.key.trim()) {
      toast.error('Ключ обязателен');
      return;
    }

    if (formData.key.length > 32) {
      toast.error('Ключ не должен превышать 32 символа');
      return;
    }

    setError('');
    setSaving(true);

    try {
      await shm_request('shm/v1/admin/config', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      onSave();
      onClose();
      toast.success('Конфигурация создана');
    } catch (err: any) {
      setError(err.message || 'Ошибка при создании');
      toast.error('Ошибка при создании');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setError('');
    onClose();
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
    <div className="flex justify-end gap-2 w-full">
      <button
        onClick={handleCancel}
        disabled={saving}
        className="p-2 rounded flex items-center gap-2 disabled:opacity-50"
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
        onClick={handleSubmit}
        disabled={saving}
        className="p-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
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

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={handleCancel}
      title="Создание параметра"
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Ключ *
          </label>
          <input
            type="text"
            value={formData.key}
            onChange={(e) => setFormData({ ...formData, key: e.target.value })}
            maxLength={32}
            required
            placeholder="Введите ключ (макс. 32 символа)"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Значение
          </label>
          <div className="flex-1">
            <JsonEditor
              data={formData.value}
              onChange={(value) => setFormData({ ...formData, value })}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
