import React, { useState, useEffect, useRef } from 'react';
import EditorToolbar from './EditorToolbar';
import CodeEditor from './CodeEditor';
import { getStarterTemplate } from './starterTemplates';
import {
  saveProblemCode,
  loadProblemCode,
  savePreferredLanguage,
  loadPreferredLanguage
} from '../services/storageService';
import { Play, Send, Terminal, Info } from 'lucide-react';

export default function WorkspaceRightPane({ context, meta, initialTheme = 'dark' }) {
  const [currentLang, setCurrentLang] = useState('cpp17');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('stdin');
  const [customInput, setCustomInput] = useState(meta?.sampleInput || '8');
  const [theme, setTheme] = useState(initialTheme);
  const editorInstanceRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Sync theme with CFusion root
  useEffect(() => {
    const handleStorageChange = (changes, area) => {
      if (area === 'local' && changes.theme) {
        setTheme(changes.theme.newValue);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }
  }, []);

  // Initialize language and load problem-specific code
  useEffect(() => {
    async function initEditor() {
      const prefLang = await loadPreferredLanguage();
      setCurrentLang(prefLang);

      const savedCode = await loadProblemCode(context.contestId, context.problemIndex, prefLang);
      if (savedCode !== null && savedCode !== undefined && savedCode.trim() !== '') {
        setCode(savedCode);
      } else {
        setCode(getStarterTemplate(prefLang, meta?.title));
      }
    }

    initEditor();
  }, [context.contestId, context.problemIndex]);

  // Handle language switch
  const handleLanguageChange = async (newLang) => {
    setCurrentLang(newLang);
    await savePreferredLanguage(newLang);

    const savedCode = await loadProblemCode(context.contestId, context.problemIndex, newLang);
    if (savedCode !== null && savedCode !== undefined && savedCode.trim() !== '') {
      setCode(savedCode);
    } else {
      const template = getStarterTemplate(newLang, meta?.title);
      setCode(template);
      await saveProblemCode(context.contestId, context.problemIndex, newLang, template);
    }
  };

  // Debounced auto-save to Chrome Storage
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setIsSaving(true);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await saveProblemCode(context.contestId, context.problemIndex, currentLang, newCode);
      setIsSaving(false);
    }, 500);
  };

  // Reset code to starter template
  const handleResetCode = async () => {
    const template = getStarterTemplate(currentLang, meta?.title);
    setCode(template);
    await saveProblemCode(context.contestId, context.problemIndex, currentLang, template);
    setIsSaving(false);
  };

  // Copy code to clipboard
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      return true;
    } catch (err) {
      console.error('[CFusion] Clipboard error:', err);
      return false;
    }
  };

  const handleEditorMount = (editor) => {
    editorInstanceRef.current = editor;
  };

  // Submit button triggers the Codeforces sidebar submit form in drawer
  const handleSubmit = () => {
    const drawer = document.getElementById('cfusion-sidebar-drawer');
    const backdrop = document.getElementById('cfusion-sidebar-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      const submitForm = drawer.querySelector('.submit-form, form[action*="submit"]');
      if (submitForm) {
        submitForm.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div
      className="cfusion-workspace-right-pane"
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        minHeight: 0,
        flex: '1 1 0%',
        backgroundColor: '#111827',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* 1. Professional Editor Toolbar */}
      <EditorToolbar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onResetCode={handleResetCode}
        onCopyCode={handleCopyCode}
        isSaving={isSaving}
      />

      {/* 2. Monaco Editor Container (Flex-1, guaranteed non-zero dimensions) */}
      <div
        className="cfusion-monaco-wrapper"
        style={{
          display: 'flex',
          flex: '1 1 0%',
          minHeight: '180px',
          width: '100%',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#0B1120'
        }}
      >
        <CodeEditor
          code={code}
          languageId={currentLang}
          theme={theme}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
        />
      </div>

      {/* 3. Bottom Console Panel */}
      <div
        className="cfusion-console-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: '220px',
          minHeight: '160px',
          maxHeight: '45%',
          backgroundColor: '#111827',
          borderTop: '1px solid #273449',
          flexShrink: 0
        }}
      >
        {/* Console Tabs Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '38px',
            minHeight: '38px',
            backgroundColor: '#172033',
            borderBottom: '1px solid #273449',
            padding: '0 12px',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setActiveTab('stdin')}
              className="cfusion-btn"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'stdin' ? '#111827' : 'transparent',
                color: activeTab === 'stdin' ? '#38BDF8' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Custom Input (stdin)
            </button>
            <button
              onClick={() => setActiveTab('stdout')}
              className="cfusion-btn"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: activeTab === 'stdout' ? '#111827' : 'transparent',
                color: activeTab === 'stdout' ? '#38BDF8' : '#94A3B8',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Output (stdout)
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
            <span>Monaco Ready</span>
          </div>
        </div>

        {/* Console Body */}
        <div
          style={{
            flex: '1 1 0%',
            padding: '12px',
            overflow: 'hidden',
            backgroundColor: '#0B1120',
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            fontSize: '12px'
          }}
        >
          {activeTab === 'stdin' ? (
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter standard input (stdin)..."
              style={{
                width: '100%',
                height: '100%',
                backgroundColor: 'transparent',
                color: '#F8FAFC',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: '13px',
                lineHeight: '1.6'
              }}
              spellCheck={false}
            />
          ) : (
            <div style={{ height: '100%', overflowY: 'auto', color: '#94A3B8', fontSize: '12px', lineHeight: '1.6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#818CF8', marginBottom: '8px' }}>
                <Info style={{ width: '16px', height: '16px' }} />
                <span style={{ fontWeight: 600 }}>Code Execution Engine Notice</span>
              </div>
              <p>Remote code compilation and execution with Judge0 will be integrated in Phase 4.</p>
              <p style={{ marginTop: '4px', color: '#64748B' }}>
                Your code is automatically saved problem-wise in Chrome Storage for{' '}
                <span style={{ color: '#38BDF8', fontWeight: 600 }}>
                  Problem {context.contestId}{context.problemIndex}
                </span>
                .
              </p>
            </div>
          )}
        </div>

        {/* Action Bar (Run & Submit) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '44px',
            minHeight: '44px',
            backgroundColor: '#111827',
            borderTop: '1px solid #273449',
            padding: '0 12px',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
            <Terminal style={{ width: '14px', height: '14px', color: '#818CF8' }} />
            <span>Phase 3: Monaco Connected</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('stdout')}
              className="cfusion-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#6366F1',
                color: '#FFFFFF',
                border: '1px solid #6366F1',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}
              title="Test code execution (Phase 4 integration)"
            >
              <Play style={{ width: '12px', height: '12px', fill: 'currentColor' }} />
              <span>Run Code</span>
            </button>

            <button
              onClick={handleSubmit}
              className="cfusion-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: '1px solid #10B981',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}
              title="Submit code to Codeforces"
            >
              <Send style={{ width: '12px', height: '12px' }} />
              <span>Submit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
