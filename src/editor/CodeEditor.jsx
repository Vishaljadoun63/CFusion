import React, { useRef } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Loader2 } from 'lucide-react';
import { LANGUAGE_METADATA } from './starterTemplates';
import { registerSynchronousLanguages } from './languages';

// Setup Mock Worker to satisfy Monaco environment in Chrome content script
if (typeof window !== 'undefined' && !window.MonacoEnvironment) {
  window.MonacoEnvironment = {
    getWorker: function () {
      const blob = new Blob(['self.onmessage = function () {};'], { type: 'text/javascript' });
      return new Worker(URL.createObjectURL(blob));
    }
  };
}

// Synchronously register C++, Python, and Java languages
registerSynchronousLanguages(monaco);

// Configure @monaco-editor/react to use local monaco instance
loader.config({ monaco });

// Define CFusion modern dark theme
monaco.editor.defineTheme('cfusion-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '64748B', fontStyle: 'italic' },
    { token: 'keyword', foreground: '818CF8', fontStyle: 'bold' },
    { token: 'string', foreground: '38BDF8' },
    { token: 'number', foreground: 'F472B6' },
    { token: 'type', foreground: '38BDF8' },
    { token: 'function', foreground: 'A78BFA' }
  ],
  colors: {
    'editor.background': '#0B1120',
    'editor.foreground': '#F8FAFC',
    'editor.lineHighlightBackground': '#111827',
    'editorLineNumber.foreground': '#475569',
    'editorLineNumber.activeForeground': '#818CF8',
    'editor.selectionBackground': '#273449',
    'editorCursor.foreground': '#38BDF8',
    'editorWhitespace.foreground': '#1E293B',
    'editorIndentGuide.background': '#1E293B',
    'editorIndentGuide.activeBackground': '#273449'
  }
});

export default function CodeEditor({
  code,
  languageId,
  theme = 'dark',
  onChange,
  onMount
}) {
  const editorRef = useRef(null);
  const langMeta = LANGUAGE_METADATA[languageId] || LANGUAGE_METADATA.cpp17;

  const handleEditorDidMount = (editor, monacoInstance) => {
    editorRef.current = editor;
    if (onMount) onMount(editor, monacoInstance);
  };

  const monacoTheme = theme === 'dark' ? 'cfusion-dark' : 'light';

  return (
    <div className="relative w-full h-full flex-1 overflow-hidden bg-[#0B1120]">
      <Editor
        height="100%"
        width="100%"
        language={langMeta.monacoLang}
        theme={monacoTheme}
        value={code}
        onChange={(value) => onChange && onChange(value || '')}
        onMount={handleEditorDidMount}
        loading={
          <div className="flex flex-col items-center justify-center h-full gap-3 bg-[#0B1120] text-[#94A3B8]">
            <Loader2 className="w-6 h-6 animate-spin text-[#6366F1]" />
            <span className="text-xs font-mono">Initializing Monaco Editor...</span>
          </div>
        }
        options={{
          selectOnLineNumbers: true,
          roundedSelection: true,
          readOnly: false,
          cursorStyle: 'line',
          automaticLayout: true,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          fontSize: 13,
          lineHeight: 20,
          tabSize: 4,
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          folding: true,
          lineNumbers: 'on',
          autoClosingBrackets: 'always',
          autoClosingQuotes: 'always',
          autoIndent: 'full',
          formatOnPaste: true,
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          padding: { top: 12, bottom: 12 }
        }}
      />
    </div>
  );
}
