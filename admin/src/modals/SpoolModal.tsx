import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import ConfirmModal from '../components/ConfirmModal';
import Console from '../components/Console';
import JsonEditor from '../components/JsonEditor';
import { Save, Trash2, X, Pause, Play, RotateCw, CheckCircle, Terminal } from 'lucide-react';
import toast from 'react-hot-toast';
import { shm_request } from '../lib/shm_request';

interface SpoolModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
  onRefresh?: () => void;
}

export default function SpoolModal({
  open,
  onClose,
  data,
  onRefresh,
}: SpoolModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConsole, setShowConsole] = useState(false);

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

  const canEdit = formData.status === 'STUCK' || formData.status === 'PAUSED';
  const canPause = ['FAIL', 'NEW', 'DELAYED', 'SUCCESS'].includes(formData.status);
  const canResume = formData.status === 'PAUSED';
  const canRetry = formData.status === 'STUCK' || formData.status === 'FAIL';
  const canForceSuccess = ['STUCK', 'FAIL', 'PAUSED'].includes(formData.status);
  const canDelete = formData.event?.name === 'TASK' && formData.event?.period;

  const handleSave = async () => {
    if (!canEdit) {
      toast.error('Редактирование доступно только для STUCK и PAUSED');
      return;
    }

    setSaving(true);
    try {
      const res = await shm_request('shm/v1/admin/spool', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const updated = Array.isArray(res.data) ? res.data[0] : res.data;
      setFormData(updated);
      if (onRefresh) onRefresh();
      toast.success('Задача сохранена');
    } catch (error) {
      toast.error('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handlePause = async () => {
    setActionLoading(true);
    try {
      const res = await shm_request('shm/v1/admin/spool/pause', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const updated = Array.isArray(res.data) ? res.data[0] : res.data;
      setFormData(updated);
      if (onRefresh) onRefresh();
      toast.success('Задача приостановлена');
    } catch (error) {
      toast.error('Ошибка приостановки');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResume = async () => {
    setActionLoading(true);
    try {
      const res = await shm_request('shm/v1/admin/spool/resume', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const updated = Array.isArray(res.data) ? res.data[0] : res.data;
      setFormData(updated);
      if (onRefresh) onRefresh();
      toast.success('Задача запущена');
    } catch (error) {
      toast.error('Ошибка запуска');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetry = async () => {
    setActionLoading(true);
    try {
      const res = await shm_request('shm/v1/admin/spool/retry', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const updated = Array.isArray(res.data) ? res.data[0] : res.data;
      setFormData(updated);
      if (onRefresh) onRefresh();
      toast.success('Задача повторяется');
    } catch (error) {
      toast.error('Ошибка повтора');
    } finally {
      setActionLoading(false);
    }
  };

  const handleForceSuccess = async () => {
    setActionLoading(true);
    try {
      const res = await shm_request('shm/v1/admin/spool/success', {
        method: 'POST',
        body: JSON.stringify(formData),
      });
      const updated = Array.isArray(res.data) ? res.data[0] : res.data;
      setFormData(updated);
      if (onRefresh) onRefresh();
      toast.success('Задача считается успешной');
    } catch (error) {
      toast.error('Ошибка');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    setConfirmDelete(false);
    try {
      await shm_request(`shm/v1/admin/spool?id=${formData.id}`, {
        method: 'DELETE',
      });
      onClose();
      if (onRefresh) onRefresh();
      toast.success('Задача удалена');
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
      <div className="flex gap-2">
        {canDelete && (
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
          title="Закрыть"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Закрыть</span>
        </button>
        {canEdit && (
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
        )}
      </div>
    </div>
  );

  if (showConsole && formData.response?.pipeline_id) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Просмотр логов"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <button
              onClick={() => setShowConsole(false)}
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
        <Console pipelineId={formData.response.pipeline_id} />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Задача #${data?.id || ''}`}
      footer={renderFooter()}
      size="xl"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Событие
          </label>
          <input
            type="text"
            value={formData.event?.title || ''}
            disabled
            className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Статус
          </label>
          <input
            type="text"
            value={formData.status || ''}
            disabled
            className="w-40 px-3 py-2 text-sm rounded border disabled:opacity-50"
            style={inputStyles}
          />
          <div className="flex gap-2">
            {canPause && (
              <button
                onClick={handlePause}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded flex items-center gap-2 text-sm disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-warning)',
                  color: 'white',
                }}
              >
                <Pause className="w-4 h-4" />
                Пауза
              </button>
            )}
            {canResume && (
              <button
                onClick={handleResume}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded flex items-center gap-2 text-sm disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-warning)',
                  color: 'white',
                }}
              >
                <Play className="w-4 h-4" />
                Запустить
              </button>
            )}
            {canRetry && (
              <button
                onClick={handleRetry}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded flex items-center gap-2 text-sm disabled:opacity-50 bg-red-600 text-white hover:bg-red-700"
              >
                <RotateCw className="w-4 h-4" />
                Повторить
              </button>
            )}
            {canForceSuccess && (
              <button
                onClick={handleForceSuccess}
                disabled={actionLoading}
                className="px-3 py-1.5 rounded flex items-center gap-2 text-sm disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--accent-success)',
                  color: 'white',
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Считать успешным
              </button>
            )}
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Пользователь
          </label>
          <input
            type="text"
            value={formData.user_id || ''}
            disabled
            className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
            style={inputStyles}
          />
        </div>

        {}
        {formData.settings?.user_service_id && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Услуга
            </label>
            <input
              type="text"
              value={formData.settings.user_service_id || ''}
              disabled
              className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
              style={inputStyles}
            />
          </div>
        )}

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Создана
          </label>
          <input
            type="text"
            value={formData.created || ''}
            disabled
            className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
            style={inputStyles}
          />
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Выполнена
          </label>
          <input
            type="text"
            value={formData.executed || ''}
            disabled
            className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Отложена
          </label>
          <input
            type="text"
            value={formData.delayed || ''}
            onChange={(e) => handleChange('delayed', e.target.value)}
            disabled={!canEdit}
            className="flex-1 px-3 py-2 text-sm rounded border disabled:opacity-50"
            style={inputStyles}
          />
        </div>

        {}
        {formData.response?.pipeline_id && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Console
            </label>
            <button
              onClick={() => setShowConsole(true)}
              className="p-2 rounded flex items-center gap-2"
              style={{
                backgroundColor: 'var(--accent-success)',
                color: 'white',
              }}
              title="Показать логи"
            >
              <Terminal className="w-4 h-4" />
              <span className="hidden sm:inline">Показать логи</span>
            </button>
          </div>
        )}

        {}
        {formData.response && (
          <div className="flex items-start gap-3">
            <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
              Response
            </label>
            <div className="flex-1">
              <JsonEditor
                data={formData.response}
                onChange={(value) => handleChange('response', value)}
                inline
                readonly={!canEdit}
              />
            </div>
          </div>
        )}

        {}
        {formData.event && (
          <div className="flex items-start gap-3">
            <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
              Event
            </label>
            <div className="flex-1">
              <JsonEditor
                data={formData.event}
                onChange={(value) => handleChange('event', value)}
                inline
                readonly={!canEdit}
              />
            </div>
          </div>
        )}

        {}
          <div className="flex items-start gap-3">
            <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
              Settings
            </label>
            <div className="flex-1">
              <JsonEditor
                data={formData.settings}
                onChange={(value) => handleChange('settings', value)}
                readonly={!canEdit}
              />
            </div>
          </div>
      </div>

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление задачи"
        message={`Вы уверены, что хотите удалить задачу #${formData.id}? Это действие необратимо.`}
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </Modal>
  );
}
