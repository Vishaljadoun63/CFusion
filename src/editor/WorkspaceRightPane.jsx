import React, { useState, useEffect, useRef, useCallback } from 'react';
import EditorToolbar from './EditorToolbar';
import CodeEditor from './CodeEditor';
import { getStarterTemplate } from './starterTemplates';
import {
  saveProblemCode,
  loadProblemCode,
  savePreferredLanguage,
  loadPreferredLanguage
} from '../services/storageService';
import { runCode } from '../services/executionService';
import { Play, Send, Terminal, Loader, CheckCircle, XCircle, AlertTriangle, Clock, Info } from 'lucide-react';

// ---------------------------------------------------------------------------
// Execution state machine values
// ---------------------------------------------------------------------------
const EXEC_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  COMPILATION_ERROR: 'compilation_error',
  RUNTIME_ERROR: 'runtime_error',
  TIME_LIMIT: 'time_limit',
  ERROR: 'error'
};

const INITIAL_EXEC_STATE = {
  status: EXEC_STATUS.IDLE,
  stdout: '',
  stderr: '',
  compile_output: '',
  time: null,
  memory: null,
  statusDescription: ''
};

// ---------------------------------------------------------------------------
// Output panel sub-components (pure render, no hooks)
// ---------------------------------------------------------------------------

function StatusBadge({ status, statusDescription }) {
  const cfg = {
    [EXEC_STATUS.SUCCESS]:          { bg: '#10B981', label: 'Accepted' },
    [EXEC_STATUS.COMPILATION_ERROR]:{ bg: '#F59E0B', label: 'Compilation Error' },
    [EXEC_STATUS.RUNTIME_ERROR]:    { bg: '#EF4444', label: 'Runtime Error' },
    [EXEC_STATUS.TIME_LIMIT]:       { bg: '#8B5CF6', label: 'Time Limit Exceeded' },
    [EXEC_STATUS.ERROR]:            { bg: '#EF4444', label: statusDescription || 'Error' }
  }[status] || { bg: '#6B7280', label: statusDescription || status };

  return (
    <span style={{
      display: 'inline-block',
      backgroundColor: cfg.bg,
      color: '#fff',
      fontSize: '11px',
      fontWeight: 700,
      padding: '2px 8px',
      borderRadius: '4px',
      letterSpacing: '0.03em'
    }}>
      {cfg.label}
    </span>
  );
}

function OutputBlock({ label, content, color = '#F8FAFC' }) {
  if (!content || content.trim() === '') return null;
  return (
    <div style={{ marginTop: '8px' }}>
      {label && (
        <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
          {label}
        </div>
      )}
      <pre style={{
        margin: 0,
        padding: '8px 10px',
        backgroundColor: '#0B1120',
        border: '1px solid #273449',
        borderRadius: '4px',
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        fontSize: '12px',
        color,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        lineHeight: '1.6',
        overflowX: 'auto',
        maxHeight: '120px',
        overflowY: 'auto'
      }}>
        {content}
      </pre>
    </div>
  );
}

function IdlePanel() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748B', paddingTop: '4px' }}>
      <Info style={{ width: '15px', height: '15px', flexShrink: 0 }} />
      <span>Click <strong style={{ color: '#94A3B8' }}>Run Code</strong> to compile and execute your program.</span>
    </div>
  );
}

function RunningPanel({ statusDescription }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#94A3B8', paddingTop: '4px' }}>
      <Loader style={{ width: '15px', height: '15px', flexShrink: 0, animation: 'cfusion-spin 1s linear infinite' }} />
      <span>{statusDescription || 'Submitting code to execution engine…'}</span>
    </div>
  );
}

function SuccessPanel({ execState }) {
  const { stdout, time, memory } = execState;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <CheckCircle style={{ width: '14px', height: '14px', color: '#10B981', flexShrink: 0 }} />
        <StatusBadge status={EXEC_STATUS.SUCCESS} />
        {time  && <span style={{ fontSize: '11px', color: '#94A3B8' }}>⏱ {time}</span>}
        {memory && <span style={{ fontSize: '11px', color: '#94A3B8' }}>🗂 {memory}</span>}
      </div>
      {stdout && stdout.trim() ? (
        <OutputBlock content={stdout} color="#F8FAFC" />
      ) : (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
          Program finished with no output.
        </div>
      )}
    </div>
  );
}

function CompilationErrorPanel({ execState }) {
  const { compile_output, stderr } = execState;
  const diag = compile_output || stderr || 'No diagnostic output available.';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <AlertTriangle style={{ width: '14px', height: '14px', color: '#F59E0B', flexShrink: 0 }} />
        <StatusBadge status={EXEC_STATUS.COMPILATION_ERROR} />
      </div>
      <OutputBlock label="Compiler Output" content={diag} color="#FCD34D" />
    </div>
  );
}

function RuntimeErrorPanel({ execState }) {
  const { stderr, compile_output, statusDescription } = execState;
  const info = stderr || compile_output || statusDescription || 'Runtime terminated unexpectedly.';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <XCircle style={{ width: '14px', height: '14px', color: '#EF4444', flexShrink: 0 }} />
        <StatusBadge status={EXEC_STATUS.RUNTIME_ERROR} statusDescription={statusDescription} />
      </div>
      <OutputBlock label="Runtime Output" content={info} color="#FCA5A5" />
    </div>
  );
}

function TimeLimitPanel() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Clock style={{ width: '14px', height: '14px', color: '#8B5CF6', flexShrink: 0 }} />
      <StatusBadge status={EXEC_STATUS.TIME_LIMIT} />
      <span style={{ fontSize: '12px', color: '#94A3B8' }}>Your program exceeded the time limit.</span>
    </div>
  );
}

function GenericErrorPanel({ execState }) {
  const { stderr, statusDescription } = execState;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <XCircle style={{ width: '14px', height: '14px', color: '#EF4444', flexShrink: 0 }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#EF4444' }}>{statusDescription || 'Error'}</span>
      </div>
      {stderr && stderr.trim() && (
        <OutputBlock label="Details" content={stderr} color="#FCA5A5" />
      )}
    </div>
  );
}

function OutputPanel({ execState }) {
  switch (execState.status) {
    case EXEC_STATUS.IDLE:             return <IdlePanel />;
    case EXEC_STATUS.RUNNING:          return <RunningPanel statusDescription={execState.statusDescription} />;
    case EXEC_STATUS.SUCCESS:          return <SuccessPanel execState={execState} />;
    case EXEC_STATUS.COMPILATION_ERROR:return <CompilationErrorPanel execState={execState} />;
    case EXEC_STATUS.RUNTIME_ERROR:    return <RuntimeErrorPanel execState={execState} />;
    case EXEC_STATUS.TIME_LIMIT:       return <TimeLimitPanel />;
    default:                           return <GenericErrorPanel execState={execState} />;
  }
}

// ---------------------------------------------------------------------------
// Map backend response → EXEC_STATUS
// ---------------------------------------------------------------------------
function mapResponseToStatus(response) {
  if (!response || !response.success) {
    // Distinguish compilation errors from other failures
    if (response?.status === 'compilation_error') return EXEC_STATUS.COMPILATION_ERROR;
    if (response?.status === 'runtime_error')     return EXEC_STATUS.RUNTIME_ERROR;
    if (response?.status === 'time_limit')        return EXEC_STATUS.TIME_LIMIT;
    return EXEC_STATUS.ERROR;
  }
  if (response.status === 'success') return EXEC_STATUS.SUCCESS;
  if (response.status === 'compilation_error') return EXEC_STATUS.COMPILATION_ERROR;
  if (response.status === 'runtime_error')     return EXEC_STATUS.RUNTIME_ERROR;
  if (response.status === 'time_limit')        return EXEC_STATUS.TIME_LIMIT;
  return EXEC_STATUS.ERROR;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function WorkspaceRightPane({ context, meta, initialTheme = 'dark' }) {
  const [currentLang, setCurrentLang] = useState('cpp17');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('stdin');
  const [customInput, setCustomInput] = useState(meta?.sampleInput || '');
  const [theme, setTheme] = useState(initialTheme);
  const [execState, setExecState] = useState(INITIAL_EXEC_STATE);
  const [isRunning, setIsRunning] = useState(false);

  const editorInstanceRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  // Always holds the latest code value so handleRunCode closure sees fresh code
  const codeRef = useRef(code);
  useEffect(() => { codeRef.current = code; }, [code]);

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

  // Debounced auto-save (unchanged)
  const handleCodeChange = (newCode) => {
    setCode(newCode);
    setIsSaving(true);
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
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

  // Submit → open Codeforces sidebar drawer
  const handleSubmit = () => {
    const drawer = document.getElementById('cfusion-sidebar-drawer');
    const backdrop = document.getElementById('cfusion-sidebar-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      const submitForm = drawer.querySelector('.submit-form, form[action*="submit"]');
      if (submitForm) submitForm.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Run Code handler
  const handleRunCode = useCallback(async () => {
    if (isRunning) return; // Guard against double-click

    // Switch console to output tab
    setActiveTab('stdout');
    setIsRunning(true);
    setExecState({
      ...INITIAL_EXEC_STATE,
      status: EXEC_STATUS.RUNNING,
      statusDescription: 'Submitting code to execution engine…'
    });

    // Prefer live editor value over React state (avoids stale closure)
    const latestCode = editorInstanceRef.current
      ? editorInstanceRef.current.getValue()
      : codeRef.current;

    try {
      const result = await runCode(currentLang, latestCode, customInput);

      const resolvedStatus = mapResponseToStatus(result);
      setExecState({
        status:            resolvedStatus,
        stdout:            typeof result.stdout === 'string'         ? result.stdout         : '',
        stderr:            typeof result.stderr === 'string'         ? result.stderr         : '',
        compile_output:    typeof result.compile_output === 'string' ? result.compile_output : '',
        time:              result.time   || null,
        memory:            result.memory || null,
        statusDescription: result.statusDescription || result.status || ''
      });
    } catch (err) {
      // Should never reach here (runCode always resolves), but safety net
      console.error('[CFusion] Unexpected execution error:', err);
      setExecState({
        status:            EXEC_STATUS.ERROR,
        stdout:            '',
        stderr:            err.message || String(err),
        compile_output:    '',
        time:              null,
        memory:            null,
        statusDescription: 'Unexpected Error'
      });
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, currentLang, customInput]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  const isRunningStatus = execState.status === EXEC_STATUS.RUNNING;

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
      {/* Spinner keyframe injected once */}
      <style>{`@keyframes cfusion-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* 1. Professional Editor Toolbar */}
      <EditorToolbar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onResetCode={handleResetCode}
        onCopyCode={handleCopyCode}
        isSaving={isSaving}
      />

      {/* 2. Monaco Editor Container */}
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

          {/* Status indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94A3B8' }}>
            {isRunningStatus ? (
              <>
                <Loader style={{ width: '12px', height: '12px', color: '#6366F1', animation: 'cfusion-spin 1s linear infinite' }} />
                <span style={{ color: '#6366F1' }}>Executing…</span>
              </>
            ) : execState.status === EXEC_STATUS.SUCCESS ? (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                <span style={{ color: '#10B981' }}>Accepted</span>
              </>
            ) : execState.status !== EXEC_STATUS.IDLE ? (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }}></span>
                <span style={{ color: '#EF4444' }}>{execState.statusDescription || execState.status}</span>
              </>
            ) : (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
                <span>Monaco Ready</span>
              </>
            )}
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
            <div style={{ height: '100%', overflowY: 'auto', lineHeight: '1.6' }}>
              <OutputPanel execState={execState} />
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
            <span>Judge0 · {currentLang}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Run Code */}
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="cfusion-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: isRunning ? '#4F46E5' : '#6366F1',
                color: '#FFFFFF',
                border: `1px solid ${isRunning ? '#4F46E5' : '#6366F1'}`,
                cursor: isRunning ? 'not-allowed' : 'pointer',
                opacity: isRunning ? 0.75 : 1,
                transition: 'all 0.15s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}
              title={isRunning ? 'Execution in progress…' : 'Compile and run your code'}
            >
              {isRunning ? (
                <Loader style={{ width: '12px', height: '12px', animation: 'cfusion-spin 1s linear infinite' }} />
              ) : (
                <Play style={{ width: '12px', height: '12px', fill: 'currentColor' }} />
              )}
              <span>{isRunning ? 'Running…' : 'Run Code'}</span>
            </button>

            {/* Submit to Codeforces */}
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
