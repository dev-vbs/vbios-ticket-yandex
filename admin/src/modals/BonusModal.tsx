import React, { useState, useEffect } from 'react';
import Modal from '../components/Modal';
import { X } from 'lucide-react';
import UserSelect from '../components/UserSelect';
import JsonEditor from '../components/JsonEditor';

interface BonusModalProps {
  open: boolean;
  onClose: () => void;
  data: Record<string, any> | null;
}

export default function BonusModal({
  open,
  onClose,
  data,
}: BonusModalProps) {
  const [viewData, setViewData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (data) {
      setViewData({ ...data });
    } else {
      setViewData({});
    }
  }, [data, open]);

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
        title="Закрыть"
      >
        <X className="w-4 h-4" />
        <span className="hidden sm:inline">Закрыть</span>
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Просмотр бонуса"
      footer={renderFooter()}
      size="lg"
    >
      <div className="space-y-4">
        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Пользователь
          </label>
          <div className="flex-1">
            <UserSelect
              value={viewData.user_id}
              onChange={() => {}}
              readonly
            />
          </div>
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Дата
          </label>
          <input
            type="text"
            value={viewData.date || ''}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-center gap-3">
          <label className="w-32 text-sm font-medium shrink-0" style={labelStyles}>
            Сумма
          </label>
          <input
            type="text"
            value={viewData.amount || viewData.bonus || ''}
            readOnly
            className="flex-1 px-3 py-2 text-sm rounded border opacity-60"
            style={inputStyles}
          />
        </div>

        {}
        <div className="flex items-start gap-3">
          <label className="w-32 text-sm font-medium shrink-0 pt-2" style={labelStyles}>
            Комментарий
          </label>
          <div className="flex-1 border rounded" style={{ borderColor: inputStyles.borderColor }}>
            <JsonEditor
              data={viewData.comment || {}}
              onChange={() => {}}
              readonly
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
