import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import JsonEditor from '../components/JsonEditor';
import UserSelect from '../components/UserSelect';

interface ProfileCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  userId?: number;
}

export default function ProfileCreateModal({
  open,
  onClose,
  onSave,
  userId,
}: ProfileCreateModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    user_id: userId || null,
    data: {},
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        user_id: userId || null,
        data: {},
      });
    }
  }, [open, userId]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.user_id) {
      toast.error('Выберите пользователя');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      toast.success('Персональные данные созданы');
    } catch (error) {
      toast.error('Ошибка сохранения');
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
        disabled={saving || !formData.user_id}
        className="p-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
        style={{
          backgroundColor: 'var(--accent-primary)',
          color: 'var(--accent-text)',
        }}
        title="Создать"
      >
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">{saving ? 'Сохранение...' : 'Создать'}</span>
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создание персональных данных"
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
              onChange={(value) => handleChange('user_id', value)}
            />
          </div>
        </div>

        {}
        <div className="pt-2">
          <label className="text-sm font-medium" style={labelStyles}>
            Данные
          </label>
          <div className="mt-2">
            <JsonEditor
              data={formData.data ?? {}}
              onChange={(newData) => handleChange('data', newData)}
              showInput={true}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
