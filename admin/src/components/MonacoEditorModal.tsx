import React, { useState } from 'react';
import Editor from '@monaco-editor/react';

interface MonacoEditorModalProps {
  value: string;
  language?: string;
  onSave: (value: string) => void;
  onClose: () => void;
}

function MonacoEditorModal({ value, language = 'json', onSave, onClose }: MonacoEditorModalProps) {
  const [code, setCode] = useState(value);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-4 w-[90vw] max-w-4xl">
        <div className="flex justify-between items-center mb-2">
          <span className="font-bold">Редактирование</span>
          <div className="flex gap-2">
            <button className="bg-blue-500 text-white px-3 py-1 rounded" onClick={() => onSave(code)}>Сохранить</button>
            <button className="bg-gray-300 px-3 py-1 rounded" onClick={onClose}>Отмена</button>
          </div>
        </div>
        <Editor
          height="60vh"
          language={language}
          value={code}
          onChange={v => setCode(v || '')}
          theme="vs-dark"
        />
      </div>
    </div>
  );
}

export default MonacoEditorModal;
