import React from 'react';

interface EventSelectProps {
  value?: string | null;
  onChange?: (value: string) => void;
  className?: string;
  disabled?: boolean;
}

export default function EventSelect({
  value,
  onChange,
  className = '',
  disabled = false,
}: EventSelectProps) {
  const events = [
    { value: 'create', label: 'CREATE (создание новой услуги)' },
    { value: 'not_enough_money', label: 'NOT_ENOUGH_MONEY (не хватает денег для создания новой услуги)' },
    { value: 'prolongate', label: 'PROLONGATE (продление существующей услуги)' },
    { value: 'block', label: 'BLOCK (блокировка услуги)' },
    { value: 'activate', label: 'ACTIVATE (активация услуги после блокировки)' },
    { value: 'remove', label: 'REMOVE (удаление услуги)' },
    { value: 'changed', label: 'CHANGED (статус услуги изменен)' },
    { value: 'changed_tariff', label: 'CHANGED TARIFF (тариф изменен)' },
    { value: 'forecast', label: 'FORECAST (прогноз оплаты)' },
    { value: 'payment', label: 'PAYMENT (поступил платеж)' },
    { value: 'bonus', label: 'BONUS (начислены бонусы)' },
    { value: 'registered', label: 'USER_REGISTERED (новый пользователь создан)' },
    { value: 'user_password_reset', label: 'USER_PASSWORD_RESET (смена пароля пользователя)' },
  ];

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      disabled={disabled}
      className={`px-3 py-2 text-sm rounded border ${className}`}
      style={inputStyles}
    >
      <option value="">Выберите событие</option>
      {events.map((event) => (
        <option key={event.value} value={event.value}>
          {event.label}
        </option>
      ))}
    </select>
  );
}
