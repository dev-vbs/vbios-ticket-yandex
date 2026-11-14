import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Save, Trash2, X, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

interface IdentityModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onRefresh?: () => void;
}

export default function IdentityModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
  onRefresh,
}: IdentityModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({});
    }
  }, [data, open]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      toast.error('Введите имя ключа');
      return;
    }

    setSaving(true);
    try {
      await onSave(formData);
      onClose();
      if (onRefresh) onRefresh();
      toast.success('Ключ сохранен');
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (!onDelete) return;

    setDeleting(true);
    setConfirmDelete(false);
    try {
      await onDelete();
      onClose();
      if (onRefresh) onRefresh();
      toast.success('Ключ удален');
    } catch (error) {
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyPublicKey = () => {
    if (!formData.public_key) {
      toast.error('Публичный ключ пуст');
      return;
    }

    navigator.clipboard.writeText(formData.public_key)
      .then(() => {
        toast.success('Публичный ключ скопирован');
      })
      .catch((err) => {
        toast.error('Ошибка копирования');
      });
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
      <div>
        {onDelete && data?.id && (
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
          disabled={saving}
          className="p-2 rounded flex items-center gap-2 btn-success"
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
      title={data?.id ? `Редактирование ключа: ${data.name}` : 'Редактирование ключа'}
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        {data?.id && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              ID ключа
            </label>
            <input
              type="text"
              value={formData.id || ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
          </div>
        )}

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Имя <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Имя ключа"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        {data?.id && formData.fingerprint && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Fingerprint
            </label>
            <input
              type="text"
              value={formData.fingerprint || ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
          </div>
        )}

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Публичный ключ
          </label>
          <div className="flex-1 flex flex-col gap-2">
            <textarea
              value={formData.public_key || ''}
              onChange={(e) => handleChange('public_key', e.target.value)}
              rows={6}
              disabled
              placeholder="Публичный ключ"
              className="px-3 py-2 text-sm rounded border resize-none font-mono disabled:opacity-50"
              style={inputStyles}
            />
            {formData.public_key && (
              <button
                onClick={handleCopyPublicKey}
                className="self-end px-3 py-1.5 rounded flex items-center gap-2 text-sm"
                style={{
                  backgroundColor: 'var(--theme-button-secondary-bg)',
                  color: 'var(--theme-button-secondary-text)',
                  border: '1px solid var(--theme-button-secondary-border)',
                }}
              >
                <Copy className="w-4 h-4" />
                Скопировать
              </button>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление ключа"
        message={`Вы уверены, что хотите удалить ключ "${formData.name}"? Это действие необратимо.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </Modal>
  );
}
