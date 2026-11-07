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
import { Play, Send, Terminal, CheckCircle2, Info } from 'lucide-react';

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

  // Submit button triggers the Codeforces sidebar submit form
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
    <div className="flex flex-col w-full h-full bg-[#111827] overflow-hidden">
      {/* 1. Editor Toolbar */}
      <EditorToolbar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onResetCode={handleResetCode}
        onCopyCode={handleCopyCode}
        isSaving={isSaving}
      />

      {/* 2. Monaco Editor Container */}
      <div className="flex-1 min-h-[200px] relative overflow-hidden">
        <CodeEditor
          code={code}
          languageId={currentLang}
          theme={theme}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
        />
      </div>

      {/* 3. Bottom Console Panel */}
      <div className="flex flex-col h-[210px] min-h-[160px] max-h-[45%] bg-[#111827] border-t border-[#273449]">
        {/* Console Tabs */}
        <div className="flex items-center justify-between h-[38px] min-h-[38px] bg-[#172033] border-b border-[#273449] px-3 select-none">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('stdin')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'stdin'
                  ? 'bg-[#111827] text-[#38BDF8]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Custom Input (stdin)
            </button>
            <button
              onClick={() => setActiveTab('stdout')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'stdout'
                  ? 'bg-[#111827] text-[#38BDF8]'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC]'
              }`}
            >
              Output (stdout)
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            <span>Monaco Ready</span>
          </div>
        </div>

        {/* Console Body */}
        <div className="flex-1 p-3 overflow-hidden bg-[#0B1120] font-mono text-xs">
          {activeTab === 'stdin' ? (
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Enter standard input (stdin)..."
              className="w-full h-full bg-transparent text-[#F8FAFC] border-none outline-none resize-none font-mono text-xs leading-relaxed"
              spellCheck={false}
            />
          ) : (
            <div className="h-full overflow-auto text-[#94A3B8] text-xs leading-relaxed">
              <div className="flex items-center gap-2 text-indigo-400 mb-2">
                <Info className="w-4 h-4" />
                <span className="font-semibold">Code Execution Notice</span>
              </div>
              <p>Remote code execution with Judge0 will be integrated in Phase 4.</p>
              <p className="mt-1 text-slate-400">
                Your code is automatically saved in Chrome Storage for problem{' '}
                <span className="text-[#38BDF8] font-semibold">
                  {context.contestId}
                  {context.problemIndex}
                </span>
                .
              </p>
            </div>
          )}
        </div>

        {/* Execution Action Bar */}
        <div className="flex items-center justify-between h-[44px] min-h-[44px] bg-[#111827] border-t border-[#273449] px-3">
          <div className="flex items-center gap-1 text-[11px] text-[#94A3B8]">
            <Terminal className="w-3.5 h-3.5 text-indigo-400" />
            <span>Phase 3: Monaco Connected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('stdout')}
              className="cfusion-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#6366F1] hover:bg-[#4F46E5] text-white transition-all cursor-pointer shadow-sm"
              title="Test code execution (Phase 4 integration)"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Run Code</span>
            </button>

            <button
              onClick={handleSubmit}
              className="cfusion-btn flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md bg-[#10B981] hover:bg-[#059669] text-white transition-all cursor-pointer shadow-sm"
              title="Submit code to Codeforces"
            >
              <Send className="w-3 h-3" />
              <span>Submit</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
