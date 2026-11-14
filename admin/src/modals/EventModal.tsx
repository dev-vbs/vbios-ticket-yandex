import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import { Save, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import EventSelect from '../components/EventSelect';
import ServerGroupSelect from '../components/ServerGroupSelect';
import TemplateSelect from '../components/TemplateSelect';
import JsonEditor from '../components/JsonEditor';

interface EventModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: () => void | Promise<void>;
}

export default function EventModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
}: EventModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [mode, setMode] = useState<'default' | 'template' | 'cmd'>('default');
  const [serverTransport, setServerTransport] = useState<string>('');

  useEffect(() => {
    if (open && data) {
      setFormData(data);

      if (data.settings?.template_id) {
        setMode('template');
      } else if (data.settings?.cmd) {
        setMode('cmd');
      } else {
        setMode('default');
      }

      setServerTransport(data.server?.transport || '');
    } else if (open && !data) {
      setFormData({
        title: '',
        name: '',
        server_gid: 0,
        settings: {
          category: '%',
        },
      });
      setMode('default');
      setServerTransport('');
    }
  }, [open, data]);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      settings: { ...prev.settings, [field]: value },
    }));
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast.error('Введите название');
      return;
    }

    if (!formData.name) {
      toast.error('Выберите событие');
      return;
    }

    if (formData.server_gid === undefined || formData.server_gid === null) {
      toast.error('Выберите группу серверов');
      return;
    }

    if (
      formData.server_gid === 0 &&
      (formData.name === 'create' || formData.name === 'not_enough_money')
    ) {
      toast.error(
        `Недопустимо использовать группу <AUTO> для события ${formData.name}`
      );
      return;
    }

    if (mode === 'template' && !formData.settings?.template_id) {
      toast.error('Выберите шаблон');
      return;
    }

    if (mode === 'cmd' && !formData.settings?.cmd?.trim()) {
      toast.error('Введите команду');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = { ...formData };

      if (mode !== 'cmd') {
        delete dataToSave.settings?.cmd;
      }
      if (mode !== 'template') {
        delete dataToSave.settings?.template_id;
      }

      await onSave(dataToSave);
      onClose();
      toast.success(data ? 'Событие обновлено' : 'Событие создано');
    } catch (error) {
      toast.error('Ошибка сохранения события');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;

    try {
      await onDelete();
      setConfirmDeleteOpen(false);
      onClose();
      toast.success('Событие удалено');
    } catch (error) {
      toast.error('Ошибка удаления события');
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
        {data?.id && onDelete && (
          <button
            onClick={() => setConfirmDeleteOpen(true)}
            className="p-2 rounded flex items-center gap-2 btn-danger"
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data ? 'Редактирование события' : 'Создание события'}
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Название *
          </label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Название события"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Категория *
          </label>
          <input
            type="text"
            value={formData.settings?.category || ''}
            onChange={(e) => handleSettingsChange('category', e.target.value)}
            placeholder="%"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Событие *
          </label>
          <EventSelect
            value={formData.name || ''}
            onChange={(value) => handleChange('name', value)}
            className="flex-1"
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Группа серверов *
          </label>
          <ServerGroupSelect
            value={formData.server_gid}
            onChange={(groupId, group) => {
              handleChange('server_gid', groupId);
              if (group) {
                handleChange('server', group);
                setServerTransport((group as any).transport || '');
              }
            }}
            className="flex-1"
            showAddButton={true}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Использовать *
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'default' | 'template' | 'cmd')}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <option value="default">Настройки сервера</option>
            <option value="template">Шаблон</option>
            {serverTransport === 'ssh' && <option value="cmd">Команду</option>}
          </select>
        </div>

        {}
        {mode === 'template' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Шаблон *
            </label>
            <TemplateSelect
              value={formData.settings?.template_id}
              onChange={(id) => handleSettingsChange('template_id', id)}
              className="flex-1"
            />
          </div>
        )}

        {}
        {mode === 'cmd' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Команда *
            </label>
            <input
              type="text"
              value={formData.settings?.cmd || ''}
              onChange={(e) => handleSettingsChange('cmd', e.target.value)}
              placeholder="Введите команду"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        )}

        {}
        {serverTransport === 'mail' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Тема письма
            </label>
            <input
              type="text"
              value={formData.settings?.subject || ''}
              onChange={(e) => handleSettingsChange('subject', e.target.value)}
              placeholder="Тема письма"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        )}

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Настройки
          </label>
          <div className="flex-1 items-center gap-2">
            <JsonEditor
              data={formData.settings || {}}
              onChange={(newSettings) => handleChange('settings', newSettings)}
            />
          </div>
        </div>
      </div>

      {}
      <ConfirmModal
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Удаление события"
        message={`Вы уверены, что хотите удалить событие "${formData.title || ''}"?`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />
    </Modal>
  );
}
