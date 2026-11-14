import React, { useState } from 'react';
import Modal from '../components/Modal';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import JsonEditor from '../components/JsonEditor';

interface ServerGroupCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

const TRANSPORT_OPTIONS = [
  { value: 'local', label: 'local' },
  { value: 'http', label: 'http' },
  { value: 'ssh', label: 'ssh' },
  { value: 'mail', label: 'mail' },
  { value: 'telegram', label: 'telegram' },
];

const SERVER_TYPE_OPTIONS = [
  { value: 'random', label: 'Случайно' },
  { value: 'by-one', label: 'По одному (где больше услуг)' },
  { value: 'evenly', label: 'Равномерно (где меньше услуг)' },
];

export default function ServerGroupCreateModal({
  open,
  onClose,
  onSave,
}: ServerGroupCreateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    name: '',
    type: 'random',
    transport: '',
    settings: {},
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Введите название группы');
      return;
    }
    if (!formData.type?.trim()) {
      toast.error('Выберите тип');
      return;
    }
    if (!formData.transport?.trim()) {
      toast.error('Выберите транспорт');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      setFormData({
        name: '',
        type: 'random',
        transport: '',
        settings: {},
      });
      toast.success('Группа серверов создана');
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
        disabled={saving}
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
      title="Создание группы серверов"
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Название <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Название группы"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Тип <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.type || 'random'}
            onChange={(e) => handleChange('type', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            {SERVER_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Транспорт <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.transport || ''}
            onChange={(e) => handleChange('transport', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <option value="">Выберите транспорт</option>
            {TRANSPORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}
