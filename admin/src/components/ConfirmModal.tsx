import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { AlertTriangle, Trash2, Info, HelpCircle } from 'lucide-react';

type ConfirmVariant = 'danger' | 'warning' | 'info' | 'question';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
  loading?: boolean;
  confirmWord?: string;
  confirmWordHint?: string;
}

const variantConfig: Record<ConfirmVariant, { icon: React.ReactNode; color: string; bgColor: string }> = {
  danger: {
    icon: <Trash2 className="w-6 h-6" />,
    color: '#dc2626',
    bgColor: '#fee2e2',
  },
  warning: {
    icon: <AlertTriangle className="w-6 h-6" />,
    color: '#d97706',
    bgColor: '#fef3c7',
  },
  info: {
    icon: <Info className="w-6 h-6" />,
    color: '#2563eb',
    bgColor: '#dbeafe',
  },
  question: {
    icon: <HelpCircle className="w-6 h-6" />,
    color: '#7c3aed',
    bgColor: '#ede9fe',
  },
};

export default function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title = 'Подтверждение',
  message,
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  variant = 'question',
  loading = false,
  confirmWord,
  confirmWordHint,
}: ConfirmModalProps) {
  const config = variantConfig[variant];
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!open) {
      setInputValue('');
    }
  }, [open]);

  const isConfirmDisabled = loading || (confirmWord ? inputValue.toLowerCase() !== confirmWord.toLowerCase() : false);

  const handleConfirm = async () => {
    if (isConfirmDisabled) return;
    await onConfirm();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isConfirmDisabled) {
      handleConfirm();
    }
  };

  const footer = (
    <div className="flex justify-end gap-2 w-full">
      <button
        onClick={onClose}
        disabled={loading}
        className="px-4 py-2 rounded text-sm font-medium transition-colors"
        style={{
          backgroundColor: 'var(--theme-button-secondary-bg)',
          color: 'var(--theme-button-secondary-text)',
          border: '1px solid var(--theme-button-secondary-border)',
        }}
      >
        {cancelText}
      </button>
      <button
        onClick={handleConfirm}
        disabled={isConfirmDisabled}
        className="px-4 py-2 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: variant === 'danger' ? '#dc2626' : 'var(--accent-primary)',
          color: 'var(--button-primary-text)',
        }}
      >
        {loading ? 'Загрузка...' : confirmText}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={footer}
      size="sm"
    >
      <div className="flex gap-4 items-start">
        <div
          className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
          style={{ backgroundColor: config.bgColor, color: config.color }}
        >
          {config.icon}
        </div>
        <div className="flex-1 pt-2">
          {typeof message === 'string' ? (
            <p style={{ color: 'var(--theme-content-text)' }}>{message}</p>
          ) : (
            message
          )}
        </div>
      </div>

      {confirmWord && (
        <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--theme-content-border)' }}>
          <label className="block text-sm mb-2" style={{ color: 'var(--theme-content-text-muted)' }}>
            {confirmWordHint || `Введите "${confirmWord}" для подтверждения:`}
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={confirmWord}
            autoFocus
            className="w-full px-3 py-2 rounded text-sm border"
            style={{
              backgroundColor: 'var(--theme-input-bg)',
              color: 'var(--theme-input-text)',
              borderColor: inputValue && inputValue.toLowerCase() === confirmWord.toLowerCase()
                ? '#22c55e'
                : 'var(--theme-input-border)',
            }}
          />
        </div>
      )}
    </Modal>
  );
}

interface UseConfirmOptions {
  title?: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

interface UseConfirmState {
  isOpen: boolean;
  options: UseConfirmOptions | null;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = React.useState<UseConfirmState>({
    isOpen: false,
    options: null,
    resolve: null,
  });

  const confirm = React.useCallback((options: UseConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        resolve,
      });
    });
  }, []);

  const handleClose = React.useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, options: null, resolve: null });
  }, [state.resolve]);

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, options: null, resolve: null });
  }, [state.resolve]);

  const ConfirmDialog = React.useCallback(() => {
    if (!state.options) return null;

    return (
      <ConfirmModal
        open={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.options.title}
        message={state.options.message}
        confirmText={state.options.confirmText}
        cancelText={state.options.cancelText}
        variant={state.options.variant}
      />
    );
  }, [state.isOpen, state.options, handleClose, handleConfirm]);

  return { confirm, ConfirmDialog };
}
