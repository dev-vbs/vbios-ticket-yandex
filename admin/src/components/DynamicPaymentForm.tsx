import React from 'react';
import toast from 'react-hot-toast';

export interface PaymentFieldSchema {
  name: string;
  type: 'text' | 'number' | 'checkbox' | 'select' | 'multiselect' | 'url' | 'email';
  label: string;
  required?: boolean;
  default?: any;
  min?: number;
  max?: number;
  placeholder?: string;
  helpText?: string;
  options?: Array<{ value: string; label: string }>;
}

export interface PaymentFormSchema {
  name: string;
  title: string;
  description?: string;
  infoMessage?: string;
  fields: PaymentFieldSchema[];
}

interface DynamicPaymentFormProps {
  schema: PaymentFormSchema;
  existingData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void;
  onCancel: () => void;
}

export const DynamicPaymentForm: React.FC<DynamicPaymentFormProps> = ({
  schema,
  existingData,
  onSubmit,
  onCancel,
}) => {
  const [formData, setFormData] = React.useState<Record<string, any>>({});

  const inputStyles = {
    backgroundColor: 'var(--theme-input-bg)',
    borderColor: 'var(--theme-input-border)',
    color: 'var(--theme-input-text)',
  };

  // Инициализация формы
  React.useEffect(() => {
    const initialData: Record<string, any> = {};
    schema.fields.forEach((field) => {
      if (existingData && existingData[field.name] !== undefined) {
        initialData[field.name] = existingData[field.name];
      } else if (field.default !== undefined) {
        initialData[field.name] = field.default;
      }
    });
    setFormData(initialData);
  }, [schema, existingData]);

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Валидация
    for (const field of schema.fields) {
      if (field.required && !formData[field.name]) {
        toast.error(`Поле "${field.label}" обязательно для заполнения`);
        return;
      }

      if (field.type === 'number' && formData[field.name]) {
        const value = Number(formData[field.name]);
        if (field.min !== undefined && value < field.min) {
          toast.error(`${field.label}: минимальное значение ${field.min}`);
          return;
        }
        if (field.max !== undefined && value > field.max) {
          toast.error(`${field.label}: максимальное значение ${field.max}`);
          return;
        }
      }
    }

    onSubmit(formData);
  };

  const renderField = (field: PaymentFieldSchema) => {
    const value = formData[field.name] ?? '';

    switch (field.type) {
      case 'checkbox':
        return (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => handleChange(field.name, e.target.checked)}
              style={{ accentColor: 'var(--accent-primary)' }}
            />
            <span style={{ color: 'var(--theme-content-text)' }}>{field.label}</span>
          </label>
        );

      case 'multiselect':
        return (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
              {field.label}
              {field.required && <span style={{ color: 'var(--accent-danger)' }}> *</span>}
            </label>
            <div className="space-y-2 p-3 rounded border" style={inputStyles}>
              {field.options?.map((option) => {
                const selectedValues = Array.isArray(value) ? value : (value ? [value] : []);
                const isChecked = selectedValues.includes(option.value);

                return (
                  <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        const currentValues = Array.isArray(value) ? [...value] : (value ? [value] : []);
                        if (e.target.checked) {
                          handleChange(field.name, [...currentValues, option.value]);
                        } else {
                          handleChange(field.name, currentValues.filter((v: string) => v !== option.value));
                        }
                      }}
                      style={{ accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ color: 'var(--theme-content-text)' }}>{option.label}</span>
                  </label>
                );
              })}
            </div>
            {field.helpText && (
              <div className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                {field.helpText}
              </div>
            )}
          </div>
        );

      case 'select':
        return (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
              {field.label}
              {field.required && <span style={{ color: 'var(--accent-danger)' }}> *</span>}
            </label>
            <select
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              required={field.required}
              className="w-full px-3 py-2 rounded border"
              style={inputStyles}
            >
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {field.helpText && (
              <div className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                {field.helpText}
              </div>
            )}
          </div>
        );

      case 'number':
        return (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
              {field.label}
              {field.required && <span style={{ color: 'var(--accent-danger)' }}> *</span>}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              min={field.min}
              max={field.max}
              className="w-full px-3 py-2 rounded border"
              style={inputStyles}
            />
            {field.helpText && (
              <div className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                {field.helpText}
              </div>
            )}
          </div>
        );

      default: // text, url, email
        return (
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--theme-content-text)' }}>
              {field.label}
              {field.required && <span style={{ color: 'var(--accent-danger)' }}> *</span>}
            </label>
            <input
              type={field.type}
              value={value}
              onChange={(e) => handleChange(field.name, e.target.value)}
              placeholder={field.placeholder}
              required={field.required}
              className="w-full px-3 py-2 rounded border"
              style={inputStyles}
            />
            {field.helpText && (
              <div className="text-xs mt-1" style={{ color: 'var(--theme-content-text-muted)' }}>
                {field.helpText}
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {schema.infoMessage && (
        <div
          className="p-3 rounded text-sm"
          style={{
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            color: 'var(--accent-primary)',
          }}
          dangerouslySetInnerHTML={{ __html: schema.infoMessage }}
        />
      )}
      {schema.infoMessage && (
        <style>
          {`
            .p-3.rounded.text-sm a {
              color: #498fd9;
              text-decoration: underline;
            }
            .p-3.rounded.text-sm a:hover {
              color: #3a7bc8;
            }
          `}
        </style>
      )}

      {schema.fields.map((field) => (
        <div key={field.name}>
          {renderField(field)}
        </div>
      ))}

      <div className="flex gap-3 pt-4">
        <button
          type="submit"
          className="flex-1 px-4 py-2 rounded font-medium btn-success"
          style={{
            backgroundColor: 'var(--accent-primary)',
            color: 'var(--accent-text)',
          }}
        >
          Сохранить
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded font-medium"
          style={{
            backgroundColor: 'var(--theme-button-secondary-bg)',
            color: 'var(--theme-button-secondary-text)',
            border: '1px solid var(--theme-button-secondary-border)',
          }}
        >
          Отмена
        </button>
      </div>
    </form>
  );
};

export default DynamicPaymentForm;
