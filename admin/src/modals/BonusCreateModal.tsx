import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import UserSelect from '../components/UserSelect';
import { useSelectedUserStore } from '../store/selectedUserStore';

interface BonusCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
}

export default function BonusCreateModal({
  open,
  onClose,
  onSave,
}: BonusCreateModalProps) {
  const { selectedUser } = useSelectedUserStore();
  const [formData, setFormData] = useState<Record<string, any>>({
    user_id: null,
    bonus: '',
    comment: null,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFormData({
        user_id: selectedUser?.user_id || null,
        bonus: '',
        comment: null,
      });
    }
  }, [open, selectedUser]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.user_id) {
      toast.error('Выберите пользователя');
      return;
    }
    if (!formData.bonus || Number(formData.bonus) === 0) {
      toast.error('Введите сумму бонуса');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      toast.success('Бонус начислен');
    } catch (error) {
      toast.error('Ошибка начисления бонуса');
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
        title="Начислить"
      >
        <Plus className="w-4 h-4" />
        <span className="hidden sm:inline">{saving ? 'Начисление...' : 'Начислить'}</span>
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Начисление бонуса"
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Пользователь *
          </label>
          <div className="flex-1">
            <UserSelect
              value={formData.user_id}
              onChange={(value) => handleChange('user_id', value)}
            />
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Сумма бонуса *
          </label>
          <input
            type="number"
            value={formData.bonus}
            onChange={(e) => handleChange('bonus', e.target.value)}
            step="0.01"
            placeholder="0.00"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Комментарий
          </label>
          <textarea
            value={formData.comment?.text || ''}
            onChange={(e) => handleChange('comment', { text: e.target.value })}
            rows={4}
            placeholder="Комментарий к начислению"
            className="flex-1 px-3 py-2 text-sm rounded border resize-none"
            style={inputStyles}
          />
        </div>
      </div>
    </Modal>
  );
}
