import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import JsonEditor from '../components/JsonEditor';
import ConfirmModal from '../components/ConfirmModal';
import { shm_request } from '../lib/shm_request';
import { Save, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface ConfigModalProps {
  open: boolean;
  onClose: () => void;
  data: any;
  onSave: () => void;
}

export default function ConfigModal({ open, onClose, data, onSave }: ConfigModalProps) {
  const [formData, setFormData] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    }
  }, [data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      await shm_request('shm/v1/admin/config', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      onSave();
      onClose();
      toast.success('Конфигурация обновлена');
    } catch (err: any) {
      setError(err.message || 'Ошибка при сохранении');
      toast.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setError('');
    setDeleting(true);

    try {
      await shm_request(`shm/v1/admin/config?key=${encodeURIComponent(formData.key)}`, {
        method: 'DELETE',
      });
      setConfirmDeleteOpen(false);
      onSave();
      onClose();
      toast.success('Конфигурация удалена');
    } catch (err: any) {
      setError(err.message || 'Ошибка при удалении');
      toast.error('Ошибка при удалении');
    } finally {
      setDeleting(false);
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
    <div className="flex justify-between w-full">
      <div>
        <button
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={saving || deleting}
          className="p-2 rounded flex items-center gap-2 btn-danger disabled:opacity-50"
          style={{
            backgroundColor: 'var(--theme-button-danger-bg)',
            color: 'var(--theme-button-danger-text)',
            border: '1px solid var(--theme-button-danger-border)',
          }}
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
          <span className="hidden sm:inline">Удалить</span>
        </button>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCancel}
          disabled={saving || deleting}
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
          disabled={saving || deleting}
          className="p-2 rounded flex items-center gap-2 disabled:opacity-50 btn-success"
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

  if (!open) return null;

  return (
    <>
      <Modal
        open={open}
        onClose={handleCancel}
        title="Редактирование конфигурации"
        footer={renderFooter()}
        size="lg"
      >
        <div className="space-y-4">
          {}
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Ключ
            </label>
            <input
              type="text"
              value={formData.key || ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60 cursor-not-allowed"
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

      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Удаление конфигурации"
        message={`Вы уверены, что хотите удалить конфигурацию "${formData.key}"?`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </>
  );
}
