import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import JsonEditor from '../components/JsonEditor';
import { Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { shm_request } from '../lib/shm_request';
import UserSelect from '../components/UserSelect';
import TemplateSelect from '../components/TemplateSelect';
import ServerGroupSelect from '../components/ServerGroupSelect';
import { useSelectedUserStore } from '../store/selectedUserStore';

interface SpoolCreateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: Record<string, any>) => void | Promise<void>;
  defaultUserId?: number | null;
}

export default function SpoolCreateModal({
  open,
  onClose,
  onSave,
  defaultUserId,
}: SpoolCreateModalProps) {
  const { selectedUser } = useSelectedUserStore();

  const [formData, setFormData] = useState<Record<string, any>>({
    title: 'Пользовательская задача',
    mode: 'selected_user',
    prio: 1000,
    period: 0,
    server_gid: '',
    settings: {
      user_id: selectedUser?.user_id || '',
      template_id: '',
    },
  });
  const [saving, setSaving] = useState(false);
  const [serverGroups, setServerGroups] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      shm_request('shm/v1/admin/server/group?limit=1000')
        .then(res => {
          const groups = Array.isArray(res.data) ? res.data : res.data?.data || [];
          setServerGroups(groups);
        })
        .catch(() => setServerGroups([]));

      shm_request('shm/v1/admin/template?limit=1000')
        .then(res => {
          const temps = Array.isArray(res.data) ? res.data : res.data?.data || [];
          setTemplates(temps);
        })
        .catch(() => setTemplates([]));
    }
  }, [open]);

  useEffect(() => {
    if (selectedUser?.user_id) {
      setFormData(prev => ({
        user_id: defaultUserId || selectedUser?.user_id || null,
        ...prev,
        settings: {
          ...prev.settings,
          user_id: selectedUser.user_id,
        },
      }));
    }
  }, [selectedUser, defaultUserId]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      if (field === 'mode' && value !== 'selected_user') {
        const newSettings = { ...newData.settings };
        delete newSettings.user_id;
        newData.settings = newSettings;
      }

      return newData;
    });
  };

  const handleSettingsChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!formData.title?.trim()) {
      toast.error('Введите название задачи');
      return;
    }

    if (!formData.server_gid) {
      toast.error('Выберите группу серверов');
      return;
    }

    if (formData.mode === 'selected_user' && !formData.settings.user_id) {
      toast.error('Укажите пользователя');
      return;
    }

    setSaving(true);
    try {
      const args = {
        event: {
          name: 'TASK',
          kind: 'Jobs',
          method: 'job_users',
          title: formData.title,
          period: formData.period || 0,
          server_gid: formData.server_gid,
        },
        prio: formData.prio || 1000,
        settings: formData.settings,
      };

      await onSave(args);
      onClose();

      setFormData({
        title: 'Пользовательская задача',
        mode: 'selected_user',
        prio: 1000,
        period: 0,
        server_gid: '',
        settings: {
          user_id: selectedUser?.user_id || '',
          template_id: '',
        },
      });

      toast.success('Задача создана');
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
      title="Создание задачи"
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
            value={formData.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Название задачи"
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Выполнить для <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.mode || 'selected_user'}
            onChange={(e) => handleChange('mode', e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            <option value="selected_user">Указанного пользователя</option>
            <option value="all_users">Всех пользователей</option>
          </select>
        </div>

        {}
        {formData.mode === 'selected_user' && (
          <div className="flex items-center gap-3">
            <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
              Пользователь <span className="text-red-500">*</span>
            </label>
            <div className="flex-1">
                <UserSelect
                value={formData.user_id}
                onChange={(userId) => handleChange('user_id', userId)}
                readonly={!!defaultUserId}
                />
            </div>
          </div>
        )}

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Группа серверов <span className="text-red-500">*</span>
          </label>
          <ServerGroupSelect
            value={formData.server_gid || ''}
            onChange={(e) => handleChange('server_gid', e)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            showAddButton={true}
            />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Шаблон
          </label>
            <TemplateSelect
              value={formData.settings?.template_id}
              onChange={(id) => handleSettingsChange('template_id', id)}
              className="flex-1"
            />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Приоритет <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            max="10000"
            value={formData.prio || 1000}
            onChange={(e) => handleChange('prio', parseInt(e.target.value) || 0)}
            className="w-32 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
          <label className="w-40 text-sm font-medium text-center" style={labelStyles}>
            Периодичность (сек)
          </label>
          <input
            type="number"
            min="0"
            value={formData.period || 0}
            onChange={(e) => handleChange('period', parseInt(e.target.value) || 0)}
            className="w-32 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
          <span
            className="text-sm font-semibold"
            style={{ color: formData.period ? 'var(--accent-danger)' : 'var(--accent-success)' }}
          >
            {formData.period ? 'Да' : 'Нет'}
          </span>
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Settings
          </label>
          <div className="flex-1">
            <JsonEditor
              data={formData.settings}
              onChange={(value) => handleChange('settings', value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
