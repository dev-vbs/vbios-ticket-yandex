import React, { ReactNode } from 'react';
import JsonEditor from './JsonEditor';

export type FieldType =
  | 'text'
  | 'number'
  | 'email'
  | 'password'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'date'
  | 'datetime'
  | 'json'
  | 'readonly'
  | 'custom';

export interface SelectOption {
  value: string | number | null;
  label: string;
}

export interface FormFieldProps {
  name: string;
  label: string;
  type?: FieldType;
  value: any;
  onChange?: (name: string, value: any) => void;
  readonly?: boolean;
  required?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  className?: string;
  labelWidth?: string;
  render?: (value: any, onChange: (value: any) => void) => ReactNode;
  helpText?: string;
  error?: string;
}

export default function FormField({
  name,
  label,
  type = 'text',
  value,
  onChange,
  readonly = false,
  required = false,
  placeholder,
  options = [],
  min,
  max,
  step,
  rows = 3,
  className = '',
  labelWidth = 'w-40',
  render,
  helpText,
  error,
}: FormFieldProps) {
  const handleChange = (newValue: any) => {
    if (onChange && !readonly) {
      onChange(name, newValue);
    }
  };

  const inputStyles = {
    backgroundColor: readonly ? 'var(--theme-input-bg)' : 'var(--theme-input-bg)',
    borderColor: error ? '#ef4444' : 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
    opacity: readonly ? 0.7 : 1,
  };

  const renderInput = () => {
    switch (type) {
      case 'readonly':
        return (
          <input
            type="text"
            value={value ?? ''}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            readOnly={readonly}
            required={required}
            placeholder={placeholder}
            rows={rows}
            className="flex-1 px-3 py-2 text-sm rounded border resize-y"
            style={inputStyles}
          />
        );

      case 'select':
        return (
          <select
            value={value ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            disabled={readonly}
            required={required}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          >
            {options.map((opt, i) => (
              <option key={i} value={opt.value ?? ''}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={!!value}
              onChange={(e) => handleChange(e.target.checked ? 1 : 0)}
              disabled={readonly}
              className="w-4 h-4 rounded"
            />
            {value ? (
              <span className="text-green-500 text-sm font-medium">Включено</span>
            ) : (
              <span className="text-red-500 text-sm font-medium">Выключено</span>
            )}
          </div>
        );

      case 'json':
        return (
          <JsonEditor
            data={value ?? {}}
            onChange={readonly ? undefined : (newData) => handleChange(newData)}
            readonly={readonly}
            showInput={true}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            value={value ?? ''}
            onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : null)}
            readOnly={readonly}
            required={required}
            placeholder={placeholder}
            min={min}
            max={max}
            step={step ?? 1}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        );

      case 'date':
      case 'datetime':
        return (
          <input
            type={type === 'datetime' ? 'datetime-local' : 'date'}
            value={value ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            readOnly={readonly}
            required={required}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        );

      case 'custom':
        if (render) {
          return render(value, handleChange);
        }
        return null;

      default:
        return (
          <input
            type={type}
            value={value ?? ''}
            onChange={(e) => handleChange(e.target.value)}
            readOnly={readonly}
            required={required}
            placeholder={placeholder}
            className="flex-1 px-3 py-2 text-sm rounded border"
            style={inputStyles}
          />
        );
    }
  };

  return (
    <div className={`flex items-start gap-4 py-2 ${className}`}>
      <label
        className={`${labelWidth} shrink-0 text-sm font-medium pt-2`}
        style={{ color: 'var(--theme-content-text-muted)' }}
      >
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex-1 min-w-0">
        {renderInput()}
        {helpText && (
          <div className="mt-1 text-xs" style={{ color: 'var(--theme-content-text-muted)' }}>
            {helpText}
          </div>
        )}
        {error && (
          <div className="mt-1 text-xs text-red-500">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
