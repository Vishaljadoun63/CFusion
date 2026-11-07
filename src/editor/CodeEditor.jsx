import React, { useRef, useEffect } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Loader2 } from 'lucide-react';
import { LANGUAGE_METADATA } from './starterTemplates';
import { registerSynchronousLanguages } from './languages';

// Setup Monaco Worker configuration for Chrome Extension Content Scripts.
// This MUST remain at module level because @monaco-editor/react reads
// window.MonacoEnvironment before it even resolves the monaco instance.
if (typeof window !== 'undefined') {
  window.MonacoEnvironment = {
    getWorker: function (_moduleId, _label) {
      try {
        const extensionBaseUrl = typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.getURL('') : '';
        const workerScriptUrl = typeof chrome !== 'undefined' && chrome.runtime ? chrome.runtime.getURL('assets/editor.worker.js') : '';

        // Cross-origin worker bridge using data URI importing the packaged local worker
        const workerDataUri = `data:text/javascript;charset=utf-8,${encodeURIComponent(`
          self.MonacoEnvironment = {
            baseUrl: '${extensionBaseUrl}'
          };
          try {
            importScripts('${workerScriptUrl}');
          } catch (e) {
            self.onmessage = function () {};
          }
        `)}`;
        return new Worker(workerDataUri);
      } catch (err) {
        // Safe fallback to main-thread-compatible mock worker
        const blob = new Blob(['self.onmessage = function () {};'], { type: 'application/javascript' });
        return new Worker(URL.createObjectURL(blob));
      }
    }
  };
}

// Tell @monaco-editor/react to use our bundled monaco instance instead of
// loading from CDN. This is a one-time config call and is safe at module level
// because loader.config() only stores the reference.
loader.config({ monaco });

// Guard flag: language registration and theme definition must only run once,
// and only after Monaco's internal registries are confirmed ready (inside onMount).
let monacoPostInitDone = false;

function runMonacoPostInit(monacoInstance) {
  if (monacoPostInitDone) return;
  monacoPostInitDone = true;

  try {
    // Register C++, Python, and Java Monarch tokenizers.
    registerSynchronousLanguages(monacoInstance);
  } catch (e) {
    console.warn('[CFusion] Language registration failed:', e);
  }

  try {
    // Define CFusion dark theme.
    monacoInstance.editor.defineTheme('cfusion-dark', {
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
  } catch (e) {
    console.warn('[CFusion] Theme definition failed:', e);
  }
}

export default function CodeEditor({
  code,
  languageId,
  theme = 'dark',
  onChange,
  onMount
}) {
  const editorRef = useRef(null);
  const containerRef = useRef(null);
  const langMeta = LANGUAGE_METADATA[languageId] || LANGUAGE_METADATA.cpp17;

  const handleEditorDidMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Run one-time post initialization (tokenizers & theme)
    runMonacoPostInit(monacoInstance);

    // Apply the correct theme now that it is registered
    const resolvedTheme = theme === 'dark' ? 'cfusion-dark' : 'light';
    try {
      monacoInstance.editor.setTheme(resolvedTheme);
    } catch (e) {
      console.warn('[CFusion] setTheme failed:', e);
    }

    // Explicitly layout editor after mount to guarantee it fills available space
    setTimeout(() => {
      try {
        editor.layout();
      } catch (_) {}
    }, 50);

    setTimeout(() => {
      try {
        editor.layout();
      } catch (_) {}
    }, 250);

    if (onMount) onMount(editor, monacoInstance);
  };

  // Sync language model whenever language selection changes
  useEffect(() => {
    if (editorRef.current) {
      try {
        const model = editorRef.current.getModel();
        if (model && langMeta.monacoLang) {
          monaco.editor.setModelLanguage(model, langMeta.monacoLang);
        }
      } catch (err) {
        console.warn('[CFusion] Failed to set model language:', err);
      }
    }
  }, [langMeta.monacoLang]);

  // Sync theme whenever theme prop changes
  useEffect(() => {
    if (editorRef.current) {
      const resolvedTheme = theme === 'dark' ? (monacoPostInitDone ? 'cfusion-dark' : 'vs-dark') : 'light';
      try {
        monaco.editor.setTheme(resolvedTheme);
      } catch (_) {}
    }
  }, [theme]);

  // Auto-resize Monaco when container dimensions change (split divider drag, window resize, layout toggle)
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      if (editorRef.current) {
        try {
          editorRef.current.layout();
        } catch (_) {}
      }
    });

    resizeObserver.observe(containerRef.current);

    const handleWindowResize = () => {
      if (editorRef.current) {
        try {
          editorRef.current.layout();
        } catch (_) {}
      }
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  const monacoTheme = theme === 'dark' ? (monacoPostInitDone ? 'cfusion-dark' : 'vs-dark') : 'light';

  return (
    <div
      ref={containerRef}
      className="cfusion-monaco-mount"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0B1120'
      }}
    >
      <Editor
        height="100%"
        width="100%"
        language={langMeta.monacoLang}
        theme={monacoTheme}
        value={code}
        onChange={(value) => onChange && onChange(value || '')}
        onMount={handleEditorDidMount}
        loading={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '12px',
              backgroundColor: '#0B1120',
              color: '#94A3B8'
            }}
          >
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: '#6366F1', width: '24px', height: '24px' }} />
            <span style={{ fontSize: '12px', fontFamily: "'JetBrains Mono', Consolas, monospace" }}>
              Initializing Monaco Editor...
            </span>
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
