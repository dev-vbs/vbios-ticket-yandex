import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import JsonEditor from '../components/JsonEditor';

interface ServerGroupModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
  onRefresh?: () => void;
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

export default function ServerGroupModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
  onRefresh,
}: ServerGroupModalProps) {
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
      if (onRefresh) onRefresh();
      toast.success('Группа серверов сохранена');
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
      toast.success('Группа серверов удалена');
    } catch (error) {
      toast.error('Ошибка удаления');
    } finally {
      setDeleting(false);
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
      <div>
        {onDelete && data?.group_id && (
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
      title={data?.group_id ? `Редактирование группы: ${data.name}` : 'Создание группы серверов'}
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        {data?.group_id && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              ID
            </label>
            <input
              type="text"
              value={formData.group_id || ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
          </div>
        )}

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

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление группы серверов"
        message={`Вы уверены, что хотите удалить группу "${formData.name}"? Это действие необратимо.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </Modal>
  );
}
