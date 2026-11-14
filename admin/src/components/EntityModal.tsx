import React, { useState, useEffect, ReactNode } from 'react';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
import FormField, { FieldType, SelectOption } from './FormField';
import { Copy, ExternalLink, Save, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import JsonEditor from './JsonEditor';

export interface FieldConfig {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'datetime' | 'json' | 'link' | 'badge' | 'boolean';
  render?: (value: any, row: any) => ReactNode;
  copyable?: boolean;
  linkTo?: string;
}

export interface EditFieldConfig {
  key: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  readonly?: boolean;
  placeholder?: string;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  rows?: number;
  helpText?: string;
  visible?: boolean | ((data: any) => boolean);
  render?: (value: any, onChange: (value: any) => void, data: any) => ReactNode;
}

type ModalMode = 'view' | 'edit' | 'create';

interface EntityModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  data: Record<string, any> | null;
  mode?: ModalMode;
  fields?: FieldConfig[];
  editFields?: EditFieldConfig[];
  onEdit?: () => void;
  onSave?: (data: Record<string, any>) => void | Promise<void>;
  onDelete?: (data: Record<string, any>) => void | Promise<void>;
  onDuplicate?: (data: Record<string, any>) => void;
  leftActions?: ReactNode;
  showDelete?: boolean;
  showDuplicate?: boolean;
  validate?: (data: Record<string, any>) => Record<string, string> | null;
  customFooter?: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

function formatViewValue(value: any, type?: string): ReactNode {
  if (value === null || value === undefined) {
    return <span style={{ color: 'var(--theme-content-text-muted)' }}>—</span>;
  }

  switch (type) {
    case 'date':
      try {
        return new Date(value).toLocaleDateString('ru-RU');
      } catch {
        return value;
      }
    case 'datetime':
      try {
        return new Date(value).toLocaleString('ru-RU');
      } catch {
        return value;
      }
    case 'boolean':
      return value ? (
        <span className="text-green-500 font-medium">Да</span>
      ) : (
        <span className="text-red-500 font-medium">Нет</span>
      );
    case 'badge':
      return (
        <span
          className="px-2 py-0.5 rounded text-xs font-medium"
          style={{
            backgroundColor: 'var(--theme-primary-color)',
            color: 'white',
          }}
        >
          {value}
        </span>
      );
    default:
      if (typeof value === 'object') {
        return JSON.stringify(value);
      }
      return String(value);
  }
}

export default function EntityModal({
  open,
  onClose,
  title,
  data,
  mode = 'view',
  fields,
  editFields,
  onEdit,
  onSave,
  onDelete,
  onDuplicate,
  leftActions,
  showDelete = false,
  showDuplicate = false,
  validate,
  customFooter,
  size = 'lg',
}: EntityModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (data) {
      setFormData({ ...data });
    } else {
      setFormData({});
    }
    setErrors({});
  }, [data, open]);

  const handleFieldChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleCopy = (value: any) => {
    const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
    navigator.clipboard.writeText(text);
    toast.success('Скопировано');
  };

  const handleSave = async () => {
    if (validate) {
      const validationErrors = validate(formData);
      if (validationErrors) {
        setErrors(validationErrors);
        toast.error('Исправьте ошибки в форме');
        return;
      }
    }

    if (onSave) {
      setSaving(true);
      try {
        await onSave(formData);
        onClose();
      } catch (e) {
        toast.error('Ошибка сохранения');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleDelete = async () => {
    setConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    if (onDelete) {
      setDeleting(true);
      setConfirmDelete(false);
      try {
        await onDelete(formData);
        onClose();
      } catch (e) {
        toast.error('Ошибка удаления');
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(formData);
    }
  };

  const renderViewMode = () => {
    if (!data) return null;

    const displayFields: FieldConfig[] = fields || Object.keys(data).map(key => ({
      key,
      label: key,
      type: typeof data[key] === 'object' ? 'json' : 'text',
    }));

    return (
      <div className="space-y-1">
        {displayFields.map(field => {
          const value = data[field.key];

          if (field.type === 'json' && typeof value === 'object' && value !== null) {
            return (
              <div
                key={field.key}
                className="flex items-start gap-4 py-2"
                style={{ borderBottom: '1px solid var(--theme-card-border)' }}
              >
                <div className="w-40 shrink-0 text-sm font-medium pt-2" style={{ color: 'var(--theme-content-text-muted)' }}>
                  {field.label}
                </div>
                <div className="flex-1 text-sm min-w-0">
                  <JsonEditor data={value} readonly showInput={true} />
                </div>
              </div>
            );
          }

          const renderedValue = field.render
            ? field.render(value, data)
            : formatViewValue(value, field.type);

          return (
            <div
              key={field.key}
              className="flex items-start gap-4 py-2"
              style={{ borderBottom: '1px solid var(--theme-card-border)' }}
            >
              <div className="w-40 shrink-0 text-sm font-medium pt-0.5" style={{ color: 'var(--theme-content-text-muted)' }}>
                {field.label}
              </div>
              <div className="flex-1 text-sm min-w-0">
                <div className="flex items-center gap-2">
                  <span className="break-all">{renderedValue}</span>
                  {field.copyable && value !== null && value !== undefined && (
                    <button
                      onClick={() => handleCopy(value)}
                      className="p-1 rounded hover:bg-slate-500/20 shrink-0"
                      title="Копировать"
                    >
                      <Copy className="w-3.5 h-3.5" style={{ color: 'var(--theme-content-text-muted)' }} />
                    </button>
                  )}
                  {field.linkTo && value !== null && value !== undefined && (
                    <a
                      href={`${field.linkTo}?id=${value}`}
                      className="p-1 rounded hover:bg-slate-500/20 shrink-0"
                      title="Перейти"
                      onClick={e => e.stopPropagation()}
                    >
                      <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary-color)' }} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderEditMode = () => {
    if (!editFields) return null;

    const visibleFields = editFields.filter(field => {
      if (field.visible !== undefined) {
        return typeof field.visible === 'function'
          ? field.visible(formData)
          : field.visible;
      }
      return true;
    });

    const wideTypes = ['json', 'textarea'];
    
    return (
      <div className="grid grid-cols-2 gap-x-6 gap-y-1">
        {visibleFields.map(field => {
          const isWide = wideTypes.includes(field.type || '');
          
          return (
            <div key={field.key} className={isWide ? 'col-span-2' : ''}>
              <FormField
                name={field.key}
                label={field.label}
                type={field.type}
                value={formData[field.key]}
                onChange={handleFieldChange}
                readonly={field.readonly}
                required={field.required}
                placeholder={field.placeholder}
                options={field.options}
                min={field.min}
                max={field.max}
                step={field.step}
                rows={field.rows}
                helpText={field.helpText}
                error={errors[field.key]}
                labelWidth="w-28"
                render={field.render ? (value, onChange) => field.render!(value, onChange, formData) : undefined}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const renderFooter = () => {
    if (customFooter !== undefined) return customFooter;

    if (mode === 'view') {
      return (
        <div className="flex justify-between w-full">
          <div>{leftActions}</div>
          <div className="flex gap-2">
            {onEdit && editFields && (
              <button
                onClick={onEdit}
                className="px-4 py-2 rounded flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-text)',
                }}
              >
                Редактировать
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded flex items-center gap-2"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                color: 'var(--theme-button-secondary-text)',
                border: '1px solid var(--theme-button-secondary-border)',
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-between w-full">
        <div className="flex gap-2">
          {leftActions}
          {showDelete && mode === 'edit' && onDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded flex items-center gap-2 text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Удаление...' : 'Удалить'}
            </button>
          )}
          {showDuplicate && mode === 'edit' && onDuplicate && (
            <button
              onClick={handleDuplicate}
              className="px-4 py-2 rounded flex items-center gap-2"
              style={{
                backgroundColor: 'var(--theme-button-secondary-bg)',
                color: 'var(--theme-button-secondary-text)',
                border: '1px solid var(--theme-button-secondary-border)',
              }}
            >
              Дублировать
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded flex items-center gap-2"
            style={{
              backgroundColor: 'var(--theme-button-secondary-bg)',
              color: 'var(--theme-button-secondary-text)',
              border: '1px solid var(--theme-button-secondary-border)',
            }}
          >
            <X className="w-4 h-4" />
            Отмена
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded flex items-center gap-2 text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-primary-color)' }}
            >
              <Save className="w-4 h-4" />
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          )}
        </div>
      </div>
    );
  };

  if (!data && mode !== 'create') return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size={size}
      footer={renderFooter()}
    >
      {mode === 'view' ? renderViewMode() : renderEditMode()}

      <ConfirmModal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleConfirmDelete}
        title="Удаление"
        message="Вы уверены, что хотите удалить эту запись?"
        confirmText="Удалить"
        variant="danger"
        loading={deleting}
      />
    </Modal>
  );
}
