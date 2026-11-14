import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface UserChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
  userId: number | null;
  userLogin?: string;
  onSave: (userId: number, password: string) => void | Promise<void>;
}

export default function UserChangePasswordModal({
  open,
  onClose,
  userId,
  userLogin,
  onSave,
}: UserChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmPassword('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!password.trim()) {
      toast.error('Введите новый пароль');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Пароли не совпадают');
      return;
    }
    if (!userId) {
      toast.error('Пользователь не выбран');
      return;
    }

    setSaving(true);
    try {
      await onSave(userId, password);
      onClose();
      toast.success('Пароль успешно изменён');
    } catch (error) {
      toast.error('Ошибка смены пароля');
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
    <div className="flex justify-between w-full">
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
        title="Сменить пароль"
      >
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">{saving ? 'Сохранение...' : 'Сменить пароль'}</span>
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Смена пароля: ${userLogin || ''}`}
      footer={renderFooter()}
      size="md"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-4">
          <label className="w-40 text-sm font-medium shrink-0" style={labelStyles}>
            Новый пароль <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
            autoFocus
          />
        </div>

        {}
        <div className="flex items-center gap-4">
          <label className="w-40 text-sm font-medium shrink-0" style={labelStyles}>
            Подтвердите пароль <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        </div>
      </div>
    </Modal>
  );
}
