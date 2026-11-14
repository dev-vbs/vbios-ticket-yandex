import { X, AlertTriangle } from 'lucide-react';

interface IpResetConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userData: {
    login: string;
    password: string;
  };
}

export function IpResetConfirmationModal({ 
  open, 
  onClose, 
  onConfirm,
  userData 
}: IpResetConfirmationModalProps) {
  
  if (!open) return null;

  const cardStyles = {
    backgroundColor: 'var(--theme-card-bg)',
    borderColor: 'var(--theme-card-border)',
    color: 'var(--theme-content-text)',
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
      style={{ zIndex: 9999 }}
    >
      <div 
        className="rounded-lg border max-w-md w-full mx-4"
        style={cardStyles}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--theme-card-border)' }}
        >
          <h2 
            className="text-lg font-semibold flex items-center gap-2"
            style={{ color: 'var(--theme-content-text)' }}
          >
            <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-warning)' }} />
            Требуется сброс IP-адреса
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:opacity-70 transition-opacity"
            style={{ color: 'var(--theme-content-text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div 
            className="rounded-lg border p-4"
            style={{ 
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'var(--accent-warning)',
            }}
          >
            <p style={{ color: 'var(--theme-content-text)' }}>
              Вход с данного IP-адреса запрещен.
            </p>
          </div>

          <p style={{ color: 'var(--theme-content-text-muted)' }}>
            Для пользователя <strong style={{ color: 'var(--theme-content-text)' }}>{userData.login}</strong> разрешен вход только с определенного IP-адреса.
          </p>

          <p style={{ color: 'var(--theme-content-text-muted)' }}>
            Вы можете сбросить привязку к IP-адресу и разрешить вход с текущего адреса. После сброса система автоматически выполнит вход.
          </p>

          <p 
            className="text-sm"
            style={{ color: 'var(--accent-warning)' }}
          >
            ⚠️ Это действие изменит привязку IP-адреса в вашей учетной записи SHM Cloud.
          </p>
        </div>

        <div 
          className="flex gap-3 p-4 border-t"
          style={{ borderColor: 'var(--theme-card-border)' }}
        >
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
              border: '1px solid var(--theme-button-secondary-border)',
            }}
          >
            Отмена
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 px-4 py-2 rounded font-medium"
            style={{
              backgroundColor: 'var(--accent-warning)',
              color: 'white',
            }}
          >
            Сбросить IP и войти
          </button>
        </div>
      </div>
    </div>
  );
}
