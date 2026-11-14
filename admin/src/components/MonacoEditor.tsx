import React, { useRef, useEffect } from 'react';
import * as monaco from 'monaco-editor';

interface MonacoEditorProps {
  value: string;
  language?: string;
  onChange?: (value: string) => void;
}

function MonacoEditor({ value, language = 'json', onChange }: MonacoEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    if (editorRef.current && !monacoInstance.current) {
      monacoInstance.current = monaco.editor.create(editorRef.current, {
        value,
        language,
        theme: 'vs-dark',
        automaticLayout: true,
      });
      monacoInstance.current.onDidChangeModelContent(() => {
        onChange?.(monacoInstance.current!.getValue());
      });
    }
    return () => {
      monacoInstance.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (monacoInstance.current && value !== monacoInstance.current.getValue()) {
      monacoInstance.current.setValue(value);
    }
  }, [value]);

  return <div ref={editorRef} style={{ height: 300, width: '100%' }} />;
}

export default MonacoEditor;
