import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Console from '../components/Console';
import { Save, X, Trash2, Terminal, Play, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import ServerGroupSelect from '../components/ServerGroupSelect';
import TemplateSelect from '../components/TemplateSelect';
import IdentitiesSelect from '../components/IdentitiesSelect';
import JsonEditor from '../components/JsonEditor';
import { shm_request } from '../lib/shm_request';

interface ServerModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: (id: number) => void | Promise<void>;
}

export default function ServerModal({
  open,
  onClose,
  data,
  onSave,
  onDelete,
}: ServerModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmInitOpen, setConfirmInitOpen] = useState(false);
  const [mode, setMode] = useState<'template' | 'cmd'>('template');
  const [transport, setTransport] = useState<string>('');
  const [showConsole, setShowConsole] = useState(false);
  const [consolePipelineId, setConsolePipelineId] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (open && data) {
      setFormData(data);

      if (data.settings?.cmd) {
        setMode('cmd');
      } else {
        setMode('template');
      }

      setTransport(data.transport || data.server?.transport || '');
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
    if (!formData.name?.trim()) {
      toast.error('Введите имя сервера');
      return;
    }

    if (formData.server_gid === undefined || formData.server_gid === null) {
      toast.error('Выберите группу серверов');
      return;
    }

    if (transport !== 'local' && !formData.host?.trim()) {
      toast.error('Введите хост');
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
      toast.success(data ? 'Сервер обновлён' : 'Сервер создан');
    } catch (error) {
      toast.error('Ошибка сохранения сервера');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !formData.server_id) return;

    try {
      await onDelete(formData.server_id);
      setConfirmDeleteOpen(false);
      onClose();
      toast.success('Сервер удалён');
    } catch (error) {
      toast.error('Ошибка удаления сервера');
    }
  };

  const handleTestSSH = async () => {
    setTesting(true);
    try {
      const args = {
        ...formData.settings,
        host: formData.host,
      };

      const res = await shm_request('shm/v1/admin/transport/ssh/test', {
        method: 'PUT',
        body: JSON.stringify(args),
      });

      const pipelineId = Array.isArray(res.data) ? res.data[0]?.pipeline_id : res.data?.pipeline_id;
      if (pipelineId) {
        setConsolePipelineId(pipelineId);
        setShowConsole(true);
      }
    } catch (error) {
      toast.error('Ошибка тестирования SSH');
    } finally {
      setTesting(false);
    }
  };

  const handleTemplateInit = async () => {
    setConfirmInitOpen(true);
  };

  const handleConfirmInit = async () => {
    setConfirmInitOpen(false);
    setTesting(true);
    try {
      const args = {
        ...formData.settings,
        server_id: formData.server_id,
        host: formData.host,
      };

      const res = await shm_request('shm/v1/admin/transport/ssh/init', {
        method: 'PUT',
        body: JSON.stringify(args),
      });

      const pipelineId = Array.isArray(res.data) ? res.data[0]?.pipeline_id : res.data?.pipeline_id;
      if (pipelineId) {
        setConsolePipelineId(pipelineId);
        setShowConsole(true);
      }
    } catch (error) {
      toast.error('Ошибка инициализации шаблона');
    } finally {
      setTesting(false);
    }
  };

  const handleTestMail = async () => {
    setTesting(true);
    try {
      await shm_request('shm/admin/mail_test.cgi', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      toast.success('Письмо отправлено');
    } catch (error) {
      toast.error('Ошибка отправки письма');
    } finally {
      setTesting(false);
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
    <div className="flex flex-col sm:flex-row justify-between w-full gap-2">
      <div className="flex gap-2">
        {data?.server_id && onDelete && (
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
      <div className="flex gap-2 flex-wrap justify-end">
        {/* TEST SSH */}
        {transport === 'ssh' && (
          <button
            onClick={handleTestSSH}
            disabled={testing || !formData.host}
            className="p-2 rounded flex items-center gap-2 disabled:opacity-50 btn-primary"
            style={{
              backgroundColor: 'var(--accent-info)',
              color: 'white',
            }}
            title="TEST SSH"
          >
            <Terminal className="w-4 h-4" />
            <span className="hidden sm:inline">{testing ? 'Тестирование...' : 'TEST SSH'}</span>
          </button>
        )}

        {/* INIT */}
        {transport === 'ssh' && mode === 'template' && data?.server_id && (
          <button
            onClick={handleTemplateInit}
            disabled={testing || !formData.host}
            className="p-2 rounded flex items-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-success)',
              color: 'white',
            }}
            title="INIT"
          >
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">{testing ? 'Выполнение...' : 'INIT'}</span>
          </button>
        )}

        {/* TEST MAIL */}
        {transport === 'mail' && (
          <button
            onClick={handleTestMail}
            disabled={testing}
            className="p-2 rounded flex items-center gap-2 disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-info)',
              color: 'white',
            }}
            title="TEST MAIL"
          >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">{testing ? 'Отправка...' : 'TEST MAIL'}</span>
          </button>
        )}

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

  if (showConsole && consolePipelineId) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Просмотр логов"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => {
                setShowConsole(false);
                setConsolePipelineId(null);
              }}
              className="p-2 rounded flex items-center gap-2"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                color: 'var(--theme-button-secondary-text)',
                border: '1px solid var(--theme-button-secondary-border)',
              }}
              title="Назад"
            >
              <span className="hidden sm:inline">Назад</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded flex items-center gap-2"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                color: 'var(--theme-button-secondary-text)',
                border: '1px solid var(--theme-button-secondary-border)',
              }}
              title="Закрыть"
            >
              <X className="w-4 h-4" />
              <span className="hidden sm:inline">Закрыть</span>
            </button>
          </div>
        }
        size="xl"
      >
        <Console pipelineId={consolePipelineId} />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={data ? `Редактирование сервера: ${formData.name || formData.server_id}` : 'Создание сервера'}
      footer={renderFooter()}
      size="xl"
    >
      <div className="space-y-4">
        {}
        {data?.server_id && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              ID сервера
            </label>
            <input
              type="text"
              value={formData.server_id || ''}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>
        )}

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Имя сервера *
          </label>
          <input
            type="text"
            value={formData.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Имя сервера"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Статус
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.enabled === 1}
              onChange={(e) => handleChange('enabled', e.target.checked ? 1 : 0)}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm" style={{ color: formData.enabled ? '#22d3ee' : '#f87171' }}>
              {formData.enabled ? 'Включен' : 'Выключен'}
            </span>
          </label>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Кол-во услуг
            </label>
            <input
              type="number"
              value={formData.services_count || 0}
              readOnly
              className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
              style={inputStyles}
            />
          </div>

          {}
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Огр. кол-ва услуг
            </label>
            <input
              type="number"
              value={formData.settings?.max_services || 0}
              onChange={(e) => handleSettingsChange('max_services', Number(e.target.value))}
              min="0"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Группа *
          </label>
          <ServerGroupSelect
            value={formData.server_gid}
            onChange={(groupId, group) => {
              handleChange('server_gid', groupId);
              if (group) {
                handleChange('server', group);
                const newTransport = (group as any).transport || '';
                setTransport(newTransport);
                handleChange('transport', newTransport);
              }
            }}
            className="flex-1"
            showAddButton={true}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Транспорт
          </label>
          <input
            type="text"
            value={transport}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>

        {}
        {transport !== 'local' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Хост *
            </label>
            <input
              type="text"
              value={formData.host || ''}
              onChange={(e) => handleChange('host', e.target.value)}
              placeholder="example.com"
              className="flex-1 px-3 py-2 text-sm rounded border"
              style={inputStyles}
            />
          </div>
        )}

        {}
        {transport === 'mail' && (
          <>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Пользователь
              </label>
              <input
                type="text"
                value={formData.settings?.user || ''}
                onChange={(e) => handleSettingsChange('user', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Пароль
              </label>
              <input
                type="password"
                value={formData.settings?.password || ''}
                onChange={(e) => handleSettingsChange('password', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Отправитель (FROM)
              </label>
              <input
                type="email"
                value={formData.settings?.from || ''}
                onChange={(e) => handleSettingsChange('from', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
                Скрытая Копия (Bcc)
              </label>
              <input
                type="email"
                value={formData.settings?.bcc || ''}
                onChange={(e) => handleSettingsChange('bcc', e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded border"
                style={inputStyles}
              />
            </div>
          </>
        )}

        {}
        {transport === 'ssh' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Ключ
            </label>
            <IdentitiesSelect
              value={formData.settings?.key_id}
              onChange={(keyId) => handleSettingsChange('key_id', keyId)}
              className="flex-1"
              showAddButton={true}
            />
          </div>
        )}

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Использовать *
          </label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as 'template' | 'cmd')}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <option value="template">Шаблон</option>
            {transport === 'ssh' && <option value="cmd">Команду</option>}
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
              placeholder="shell command"
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
          <div className="flex-1">
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
        title="Удаление сервера"
        message={`Вы уверены, что хотите удалить сервер "${formData.name || formData.server_id}"?`}
        confirmText="Удалить"
        cancelText="Отмена"
        variant="danger"
      />

      {}
      <ConfirmModal
        open={confirmInitOpen}
        onClose={() => setConfirmInitOpen(false)}
        onConfirm={handleConfirmInit}
        title="Инициализация шаблона"
        message={`Выполнить шаблон на сервере "${formData.name || formData.server_id}"?`}
        confirmText="Выполнить"
        cancelText="Отмена"
        variant="warning"
      />
    </Modal>
  );
}
