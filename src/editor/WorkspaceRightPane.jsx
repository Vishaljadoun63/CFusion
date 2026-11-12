import React, { useState, useEffect, useRef, useCallback } from 'react';
import EditorToolbar from './EditorToolbar';
import CodeEditor from './CodeEditor';
import { getStarterTemplate } from './starterTemplates';
import {
  saveProblemCode,
  loadProblemCode,
  savePreferredLanguage,
  loadPreferredLanguage,
  getTestCases,
  saveTestCases
} from '../services/storageService';
import { extractSampleTestCases, createTestCase } from '../services/testCaseParser';
import { runCode } from '../services/executionService';
import TestCasesPanel from './TestCasesPanel';
import SaveSolutionModal from './SaveSolutionModal';
import CodeLibraryPanel from './CodeLibraryPanel';
import { Play, Send, Terminal, Loader, CheckSquare } from 'lucide-react';

// ---------------------------------------------------------------------------
// Execution state machine values
// ---------------------------------------------------------------------------
const EXEC_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  FAILED: 'failed',
  EXECUTED: 'executed',
  COMPILATION_ERROR: 'compilation_error',
  RUNTIME_ERROR: 'runtime_error',
  TIME_LIMIT: 'time_limit',
  ERROR: 'error'
};

const INITIAL_EXEC_STATE = {
  testCaseId: null,
  inputSnapshot: '',
  expectedOutputSnapshot: '',
  actualOutput: '',
  stdout: '',
  status: EXEC_STATUS.IDLE,
  stderr: '',
  compile_output: '',
  time: null,
  memory: null,
  statusDescription: '',
  executedAt: null
};

// ---------------------------------------------------------------------------
// Resolve execution status with output comparison
// ---------------------------------------------------------------------------
function resolveExecutionStatus(res, expectedOutputSnapshot) {
  if (!res || !res.success) {
    if (res?.status === 'compilation_error') return EXEC_STATUS.COMPILATION_ERROR;
    if (res?.status === 'runtime_error')     return EXEC_STATUS.RUNTIME_ERROR;
    if (res?.status === 'time_limit')        return EXEC_STATUS.TIME_LIMIT;
    return EXEC_STATUS.ERROR;
  }

  // Program executed successfully
  if (expectedOutputSnapshot && expectedOutputSnapshot.trim()) {
    const actual = typeof res.stdout === 'string' ? res.stdout.trim() : '';
    const expected = expectedOutputSnapshot.trim();
    return actual === expected ? EXEC_STATUS.SUCCESS : EXEC_STATUS.FAILED;
  }

  // Executed with no expected output to compare against
  return EXEC_STATUS.EXECUTED;
}

// ---------------------------------------------------------------------------
// Reconcile stored test cases with DOM sample test cases
// ---------------------------------------------------------------------------
export function reconcileTestCases(existingCases = [], domSamples = [], meta = {}) {
  let changed = false;
  const existingList = Array.isArray(existingCases) ? [...existingCases] : [];

  // Build effective sample list from domSamples or meta fallback
  let effectiveSamples = Array.isArray(domSamples) && domSamples.length > 0 ? domSamples : [];
  if (effectiveSamples.length === 0 && (meta?.sampleInput || meta?.sampleOutput)) {
    effectiveSamples = [
      createTestCase({
        id: 'sample_1',
        name: 'Sample 1',
        input: meta?.sampleInput || '',
        expectedOutput: meta?.sampleOutput || '',
        isSample: true
      })
    ];
  }

  // If nothing existed previously in storage, return effective samples
  if (existingList.length === 0) {
    const finalSamples = effectiveSamples.length > 0
      ? effectiveSamples
      : [
          createTestCase({
            id: 'sample_1',
            name: 'Sample 1',
            input: meta?.sampleInput || '',
            expectedOutput: meta?.sampleOutput || '',
            isSample: true
          })
        ];
    return { reconciled: finalSamples, changed: true };
  }

  // Separate existing samples and existing custom cases
  const existingSampleCases = existingList.filter(tc => tc.isSample);
  const existingCustomCases = existingList.filter(tc => !tc.isSample);

  const reconciledSamples = [];

  // 1. Reconcile each effective sample against existing sample cases
  effectiveSamples.forEach((domSample, idx) => {
    const sampleName = `Sample ${idx + 1}`;
    const existingMatch = existingSampleCases.find(
      tc => tc.id === domSample.id || tc.name === domSample.name || tc.name === sampleName
    );

    if (existingMatch) {
      let sampleCopy = { ...existingMatch };
      let repaired = false;

      // Repair missing or empty input from DOM
      if ((!sampleCopy.input || !sampleCopy.input.trim()) && domSample.input && domSample.input.trim()) {
        sampleCopy.input = domSample.input;
        repaired = true;
      }

      // Repair missing or empty expectedOutput from DOM
      if ((!sampleCopy.expectedOutput || !sampleCopy.expectedOutput.trim()) && domSample.expectedOutput && domSample.expectedOutput.trim()) {
        sampleCopy.expectedOutput = domSample.expectedOutput;
        repaired = true;
      }

      // Repair snapshot in existing execution result if already executed
      if (
        sampleCopy.result &&
        sampleCopy.result.status &&
        sampleCopy.result.status !== 'idle' &&
        (!sampleCopy.result.expectedOutputSnapshot || !sampleCopy.result.expectedOutputSnapshot.trim()) &&
        sampleCopy.expectedOutput
      ) {
        sampleCopy.result = {
          ...sampleCopy.result,
          expectedOutputSnapshot: sampleCopy.expectedOutput
        };
        repaired = true;
      }

      if (repaired) changed = true;
      reconciledSamples.push(sampleCopy);
    } else {
      // New sample found from DOM: add it
      reconciledSamples.push(domSample);
      changed = true;
    }
  });

  // If no effective samples were found from DOM/meta, preserve any existing sample cases
  if (reconciledSamples.length === 0 && existingSampleCases.length > 0) {
    reconciledSamples.push(...existingSampleCases);
  }

  // If still no samples at all, guarantee at least Sample 1
  if (reconciledSamples.length === 0) {
    reconciledSamples.push(
      createTestCase({
        id: 'sample_1',
        name: 'Sample 1',
        input: meta?.sampleInput || '',
        expectedOutput: meta?.sampleOutput || '',
        isSample: true
      })
    );
    changed = true;
  }

  // Sample cases always appear first, followed by all preserved custom cases
  const reconciled = [...reconciledSamples, ...existingCustomCases];
  return { reconciled, changed };
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function WorkspaceRightPane({ context, meta, initialTheme = 'dark' }) {
  const [currentLang, setCurrentLang] = useState('cpp17');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('testcase'); // 'testcase' | 'testresult'
  const [testCases, setTestCases] = useState([]);
  const [selectedTestCaseId, setSelectedTestCaseId] = useState(null);
  const [theme, setTheme] = useState(initialTheme);
  const [execState, setExecState] = useState(INITIAL_EXEC_STATE);
  const [isRunning, setIsRunning] = useState(false);
  const [isRunAllRunning, setIsRunAllRunning] = useState(false);
  const [runProgress, setRunProgress] = useState(null);
  const [runSummary, setRunSummary] = useState(null);
  const [consoleHeight, setConsoleHeight] = useState(260);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  const editorInstanceRef = useRef(null);
  const saveTimeoutRef = useRef(null);
  const abortRef = useRef(false);
  const isRunningRef = useRef(false);
  const isResizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(260);
  const draftRef = useRef({});

  // Always holds the latest code value so execution closure sees fresh code
  const codeRef = useRef(code);
  useEffect(() => { codeRef.current = code; }, [code]);

  // Listen to Topbar "My Codes" toggle events
  useEffect(() => {
    const handleToggleLibrary = () => {
      setIsLibraryOpen(prev => !prev);
    };
    const handleOpenLibrary = () => {
      setIsLibraryOpen(true);
    };

    window.addEventListener('cfusion:toggle-library', handleToggleLibrary);
    window.addEventListener('cfusion:open-library', handleOpenLibrary);
    return () => {
      window.removeEventListener('cfusion:toggle-library', handleToggleLibrary);
      window.removeEventListener('cfusion:open-library', handleOpenLibrary);
    };
  }, []);

  // Sync active class with topbar button
  useEffect(() => {
    const btn = document.getElementById('cfusion-toggle-library');
    if (btn) {
      if (isLibraryOpen) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    }
  }, [isLibraryOpen]);

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

  // Initialize language and load problem-specific code and test cases
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

      // Initialize test-case foundation with automatic reconciliation
      try {
        const existingCases = await getTestCases(context.contestId, context.problemIndex);
        const parsedSamples = extractSampleTestCases();
        const { reconciled, changed } = reconcileTestCases(existingCases, parsedSamples, meta);

        setTestCases(reconciled);
        const firstId = reconciled[0]?.id || null;
        setSelectedTestCaseId(firstId);

        if (reconciled[0]?.result && reconciled[0].result.status && reconciled[0].result.status !== 'idle') {
          setExecState({
            ...INITIAL_EXEC_STATE,
            ...reconciled[0].result
          });
        }

        if (changed) {
          await saveTestCases(context.contestId, context.problemIndex, reconciled);
        }

        // Delayed check in case problem DOM loaded sample-test slightly after React mounted
        if (parsedSamples.length === 0) {
          setTimeout(async () => {
            const retrySamples = extractSampleTestCases();
            if (retrySamples && retrySamples.length > 0) {
              setTestCases(current => {
                const retryRes = reconcileTestCases(current, retrySamples, meta);
                if (retryRes.changed) {
                  saveTestCases(context.contestId, context.problemIndex, retryRes.reconciled);
                  return retryRes.reconciled;
                }
                return current;
              });
            }
          }, 350);
        }
      } catch (tcErr) {
        console.warn('[CFusion] Test-case initialization error:', tcErr);
      }
    }
    initEditor();
  }, [context.contestId, context.problemIndex]);

  // Handle selecting a test case
  const handleSelectTestCase = (id) => {
    setSelectedTestCaseId(id);
    const found = testCases.find(tc => tc.id === id);
    if (found && found.result && found.result.status && found.result.status !== 'idle') {
      setExecState({
        ...INITIAL_EXEC_STATE,
        ...found.result
      });
    }
  };

  // Track unsaved drafts from TestCasesPanel
  const handleDraftChange = ({ testCaseId, input, expectedOutput, isDirty }) => {
    if (!testCaseId) return;
    draftRef.current[testCaseId] = { input, expectedOutput, isDirty };
  };

  // Handle adding a new custom test case
  const handleAddTestCase = async () => {
    const customCount = testCases.filter(tc => !tc.isSample).length + 1;
    let nextName = `Custom ${customCount}`;
    let counter = customCount;
    while (testCases.some(tc => tc.name === nextName)) {
      counter++;
      nextName = `Custom ${counter}`;
    }

    const newCase = createTestCase({
      name: nextName,
      input: '',
      expectedOutput: '',
      isSample: false
    });

    const nextTestCases = [...testCases, newCase];
    setTestCases(nextTestCases);
    setSelectedTestCaseId(newCase.id);
    await saveTestCases(context.contestId, context.problemIndex, nextTestCases);
  };

  // Handle updating a test case
  const handleUpdateTestCase = async (updatedCase) => {
    const nextTestCases = testCases.map(tc => tc.id === updatedCase.id ? updatedCase : tc);
    const res = await saveTestCases(context.contestId, context.problemIndex, nextTestCases);
    if (res && res.success !== false) {
      setTestCases(nextTestCases);
      if (draftRef.current[updatedCase.id]) {
        draftRef.current[updatedCase.id].isDirty = false;
      }
      return { success: true };
    } else {
      return { success: false, error: res?.error || 'Validation error' };
    }
  };

  // Handle deleting a test case
  const handleDeleteTestCase = async (id) => {
    const nextTestCases = testCases.filter(tc => tc.id !== id);
    await saveTestCases(context.contestId, context.problemIndex, nextTestCases);
    setTestCases(nextTestCases);
    delete draftRef.current[id];

    if (selectedTestCaseId === id) {
      const nextSelected = nextTestCases[0] || null;
      setSelectedTestCaseId(nextSelected ? nextSelected.id : null);
      if (nextSelected && nextSelected.result && nextSelected.result.status !== 'idle') {
        setExecState({
          ...INITIAL_EXEC_STATE,
          ...nextSelected.result
        });
      }
    }
    return { success: true };
  };

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

  // Debounced auto-save
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

  // Open a saved solution from My Codes library into Monaco
  const handleOpenSolutionInEditor = async (sol) => {
    if (!sol || !sol.code) return;

    // 1. Switch language if necessary
    if (sol.language && sol.language !== currentLang) {
      setCurrentLang(sol.language);
      await savePreferredLanguage(sol.language);
    }

    // 2. Load code into Monaco editor and React state
    setCode(sol.code);
    if (editorInstanceRef.current) {
      editorInstanceRef.current.setValue(sol.code);
    }

    // 3. Immediately persist into current problem's auto-save storage
    const targetLang = sol.language || currentLang;
    await saveProblemCode(context.contestId, context.problemIndex, targetLang, sol.code);
    setIsSaving(false);
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

  // Vertical resizer mouse handlers
  const handleMouseDownResize = (e) => {
    e.preventDefault();
    isResizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = consoleHeight;

    const handleMouseMove = (moveEvent) => {
      if (!isResizingRef.current) return;
      const deltaY = startYRef.current - moveEvent.clientY;
      const maxHeight = Math.floor(window.innerHeight * 0.65);
      const newHeight = Math.min(Math.max(140, startHeightRef.current + deltaY), maxHeight);
      setConsoleHeight(newHeight);
    };

    const handleMouseUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleDoubleClickResize = () => {
    setConsoleHeight(260);
  };

  // -------------------------------------------------------------------------
  // RUN (Executes the selected test case with exact snapshots)
  // -------------------------------------------------------------------------
  const handleRun = useCallback(async () => {
    if (isRunningRef.current) return;

    let targetCase = testCases.find(tc => tc.id === selectedTestCaseId) || testCases[0];
    if (!targetCase) return;

    // Synchronize and auto-save any unsaved draft edits prior to execution
    const activeDraft = draftRef.current[targetCase.id];
    let workingCases = [...testCases];
    if (activeDraft && activeDraft.isDirty) {
      targetCase = {
        ...targetCase,
        input: activeDraft.input,
        expectedOutput: activeDraft.expectedOutput
      };
      workingCases = workingCases.map(tc => tc.id === targetCase.id ? targetCase : tc);
      setTestCases(workingCases);
      await saveTestCases(context.contestId, context.problemIndex, workingCases);
      activeDraft.isDirty = false;
    }

    // Capture exact immutable snapshots BEFORE execution begins
    const inputSnapshot = targetCase.input || '';
    const expectedOutputSnapshot = targetCase.expectedOutput || '';

    // Switch console to Test Result tab automatically
    setActiveTab('testresult');
    isRunningRef.current = true;
    setIsRunning(true);

    // Set running state on targeted test case
    setTestCases(prev => prev.map(tc => tc.id === targetCase.id ? {
      ...tc,
      result: { ...(tc.result || {}), status: 'running' }
    } : tc));

    setExecState({
      ...INITIAL_EXEC_STATE,
      testCaseId: targetCase.id,
      inputSnapshot,
      expectedOutputSnapshot,
      status: EXEC_STATUS.RUNNING,
      statusDescription: `Running ${targetCase.name}…`
    });

    const latestCode = editorInstanceRef.current
      ? editorInstanceRef.current.getValue()
      : codeRef.current;
    const targetLang = currentLang;

    try {
      const res = await runCode(targetLang, latestCode, inputSnapshot);
      const resolvedStatus = resolveExecutionStatus(res, expectedOutputSnapshot);

      const resultObj = {
        testCaseId: targetCase.id,
        inputSnapshot,
        expectedOutputSnapshot,
        actualOutput: typeof res.stdout === 'string' ? res.stdout : '',
        stdout: typeof res.stdout === 'string' ? res.stdout : '',
        status: resolvedStatus,
        stderr: typeof res.stderr === 'string' ? res.stderr : '',
        compile_output: typeof res.compile_output === 'string' ? res.compile_output : '',
        time: res.time || null,
        memory: res.memory || null,
        statusDescription: res.statusDescription || res.status || '',
        executedAt: Date.now()
      };

      setTestCases(prev => {
        const next = prev.map(tc => tc.id === targetCase.id ? { ...tc, result: resultObj } : tc);
        saveTestCases(context.contestId, context.problemIndex, next);
        return next;
      });

      setExecState(resultObj);
    } catch (err) {
      console.error('[CFusion] Test execution error:', err);
      const errorResult = {
        testCaseId: targetCase.id,
        inputSnapshot,
        expectedOutputSnapshot,
        actualOutput: '',
        stdout: '',
        status: EXEC_STATUS.ERROR,
        stderr: err.message || String(err),
        compile_output: '',
        time: null,
        memory: null,
        statusDescription: 'Server Error',
        executedAt: Date.now()
      };
      setTestCases(prev => {
        const next = prev.map(tc => tc.id === targetCase.id ? { ...tc, result: errorResult } : tc);
        saveTestCases(context.contestId, context.problemIndex, next);
        return next;
      });
      setExecState(errorResult);
    } finally {
      isRunningRef.current = false;
      setIsRunning(false);
    }
  }, [testCases, selectedTestCaseId, currentLang, context.contestId, context.problemIndex]);

  // -------------------------------------------------------------------------
  // RUN ALL (Sequential execution of all saved test cases)
  // -------------------------------------------------------------------------
  const handleRunAllTests = async () => {
    if (isRunningRef.current || testCases.length === 0) return;

    setActiveTab('testresult');
    isRunningRef.current = true;
    abortRef.current = false;
    setIsRunning(true);
    setIsRunAllRunning(true);
    setRunSummary(null);

    const langSnapshot = currentLang;
    const codeSnapshot = editorInstanceRef.current
      ? editorInstanceRef.current.getValue()
      : codeRef.current;

    // Apply any pending dirty drafts before starting Run All
    let currentList = testCases.map(tc => {
      const draft = draftRef.current[tc.id];
      if (draft && draft.isDirty) {
        draft.isDirty = false;
        return { ...tc, input: draft.input, expectedOutput: draft.expectedOutput };
      }
      return { ...tc };
    });
    setTestCases(currentList);
    await saveTestCases(context.contestId, context.problemIndex, currentList);

    let executed = 0;
    let accepted = 0;
    let failed = 0;
    let compilationErrors = 0;
    let runtimeErrors = 0;
    let timeLimit = 0;
    let skipped = 0;
    let wasAborted = false;

    try {
      for (let i = 0; i < currentList.length; i++) {
        // Check if Stop was clicked
        if (abortRef.current) {
          wasAborted = true;
          for (let j = i; j < currentList.length; j++) {
            currentList[j] = {
              ...currentList[j],
              result: {
                testCaseId: currentList[j].id,
                inputSnapshot: currentList[j].input || '',
                expectedOutputSnapshot: currentList[j].expectedOutput || '',
                actualOutput: '',
                stdout: '',
                status: 'skipped',
                statusDescription: 'Run stopped by user',
                stderr: '',
                compile_output: '',
                time: null,
                memory: null,
                executedAt: Date.now()
              }
            };
            skipped++;
          }
          setTestCases([...currentList]);
          await saveTestCases(context.contestId, context.problemIndex, currentList);
          break;
        }

        const tc = currentList[i];
        setRunProgress({ index: i, total: currentList.length, currentName: tc.name });

        // Capture immutable snapshot BEFORE execution
        const inputSnapshot = tc.input || '';
        const expectedOutputSnapshot = tc.expectedOutput || '';

        // Mark current test case as running
        currentList[i] = {
          ...tc,
          result: { ...(tc.result || {}), status: 'running' }
        };
        setTestCases([...currentList]);

        setExecState({
          ...INITIAL_EXEC_STATE,
          testCaseId: tc.id,
          inputSnapshot,
          expectedOutputSnapshot,
          status: EXEC_STATUS.RUNNING,
          statusDescription: `Running test ${i + 1}/${currentList.length}: ${tc.name}…`
        });

        const res = await runCode(langSnapshot, codeSnapshot, inputSnapshot);
        executed++;

        const resolvedStatus = resolveExecutionStatus(res, expectedOutputSnapshot);
        const resultObj = {
          testCaseId: tc.id,
          inputSnapshot,
          expectedOutputSnapshot,
          actualOutput: typeof res.stdout === 'string' ? res.stdout : '',
          stdout: typeof res.stdout === 'string' ? res.stdout : '',
          status: resolvedStatus,
          stderr: typeof res.stderr === 'string' ? res.stderr : '',
          compile_output: typeof res.compile_output === 'string' ? res.compile_output : '',
          time: res.time || null,
          memory: res.memory || null,
          statusDescription: res.statusDescription || res.status || '',
          executedAt: Date.now()
        };

        currentList[i] = { ...currentList[i], result: resultObj };
        setTestCases([...currentList]);
        // Persist immediately after each completed case
        await saveTestCases(context.contestId, context.problemIndex, currentList);

        if (selectedTestCaseId === tc.id || (!selectedTestCaseId && i === 0)) {
          setExecState(resultObj);
        }

        // Tally statistics
        if (resolvedStatus === 'success' || resolvedStatus === 'passed') {
          accepted++;
        } else if (resolvedStatus === 'failed') {
          failed++;
        } else if (resolvedStatus === 'compilation_error') {
          compilationErrors++;
        } else if (resolvedStatus === 'runtime_error') {
          runtimeErrors++;
        } else if (resolvedStatus === 'time_limit') {
          timeLimit++;
        }

        // Compilation Error halts remaining test cases
        if (resolvedStatus === 'compilation_error') {
          for (let j = i + 1; j < currentList.length; j++) {
            currentList[j] = {
              ...currentList[j],
              result: {
                testCaseId: currentList[j].id,
                inputSnapshot: currentList[j].input || '',
                expectedOutputSnapshot: currentList[j].expectedOutput || '',
                actualOutput: '',
                stdout: '',
                status: 'skipped',
                statusDescription: 'Skipped due to Compilation Error',
                stderr: '',
                compile_output: '',
                time: null,
                memory: null,
                executedAt: Date.now()
              }
            };
            skipped++;
          }
          setTestCases([...currentList]);
          await saveTestCases(context.contestId, context.problemIndex, currentList);
          setExecState(resultObj);
          break;
        }

        // Server offline error halts remaining test cases
        if (res.statusDescription === 'Server Unavailable' || (!res.success && res.status === 'error' && (res.stderr?.includes('Failed to reach') || res.stderr?.includes('timed out')))) {
          for (let j = i + 1; j < currentList.length; j++) {
            currentList[j] = {
              ...currentList[j],
              result: {
                testCaseId: currentList[j].id,
                inputSnapshot: currentList[j].input || '',
                expectedOutputSnapshot: currentList[j].expectedOutput || '',
                actualOutput: '',
                stdout: '',
                status: 'skipped',
                statusDescription: 'Skipped due to Server Unavailable',
                stderr: '',
                compile_output: '',
                time: null,
                memory: null,
                executedAt: Date.now()
              }
            };
            skipped++;
          }
          setTestCases([...currentList]);
          await saveTestCases(context.contestId, context.problemIndex, currentList);
          break;
        }

        // Sequential delay: 2100ms before next test case to respect 30 req/min rate limit
        if (i < currentList.length - 1 && !abortRef.current) {
          await new Promise(resolve => setTimeout(resolve, 2100));
        }
      }
    } catch (allErr) {
      console.error('[CFusion] Run all execution loop error:', allErr);
    } finally {
      setRunSummary({
        total: currentList.length,
        executed,
        accepted,
        failed,
        compilationErrors,
        runtimeErrors,
        timeLimit,
        skipped,
        wasAborted
      });
      isRunningRef.current = false;
      setIsRunning(false);
      setIsRunAllRunning(false);
      setRunProgress(null);
    }
  };

  // Stop running all test cases
  const handleStopRunAll = () => {
    abortRef.current = true;
  };

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
        backgroundColor: '#0A0A0A',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      {/* Keyframe animation for spinning loader */}
      <style>{`@keyframes cfusion-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* 1. Professional Editor Toolbar */}
      <EditorToolbar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onResetCode={handleResetCode}
        onCopyCode={handleCopyCode}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
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
          backgroundColor: '#0A0A0A'
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

      {/* 3. Horizontal Resizer Divider between Monaco and Testing Console */}
      <div
        className="cfusion-console-resizer"
        onMouseDown={handleMouseDownResize}
        onDoubleClick={handleDoubleClickResize}
        title="Drag to resize console (double-click to reset)"
      />

      {/* 4. Bottom Testing Console Panel */}
      <div
        className="cfusion-console-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          height: `${consoleHeight}px`,
          minHeight: '150px',
          maxHeight: '65%',
          backgroundColor: '#111111',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Console Tabs Header (Only TWO Primary Tabs: Testcase & Test Result) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '36px',
            minHeight: '36px',
            backgroundColor: '#111111',
            borderBottom: '1px solid #292929',
            padding: '0 12px',
            userSelect: 'none',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {/* Tab 1: Testcase */}
            <button
              onClick={() => setActiveTab('testcase')}
              className="cfusion-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '5px',
                border: 'none',
                backgroundColor: activeTab === 'testcase' ? '#1C1C1C' : 'transparent',
                color: activeTab === 'testcase' ? '#F59E0B' : '#A1A1AA',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <CheckSquare size={13} />
              <span>Testcase</span>
            </button>

            {/* Tab 2: Test Result */}
            <button
              onClick={() => setActiveTab('testresult')}
              className="cfusion-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '5px',
                border: 'none',
                backgroundColor: activeTab === 'testresult' ? '#1C1C1C' : 'transparent',
                color: activeTab === 'testresult' ? '#F59E0B' : '#A1A1AA',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Terminal size={13} />
              <span>Test Result</span>
            </button>
          </div>

          {/* Status indicator on right */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717A' }}>
            {isRunAllRunning ? (
              <>
                <Loader style={{ width: '12px', height: '12px', color: '#F59E0B', animation: 'cfusion-spin 1s linear infinite' }} />
                <span style={{ color: '#F59E0B' }}>
                  {runProgress ? `Running ${runProgress.index + 1}/${runProgress.total}…` : 'Running All…'}
                </span>
              </>
            ) : isRunningStatus ? (
              <>
                <Loader style={{ width: '12px', height: '12px', color: '#F59E0B', animation: 'cfusion-spin 1s linear infinite' }} />
                <span style={{ color: '#F59E0B' }}>Executing…</span>
              </>
            ) : execState.status === EXEC_STATUS.SUCCESS ? (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }}></span>
                <span style={{ color: '#22C55E' }}>Accepted</span>
              </>
            ) : execState.status === EXEC_STATUS.FAILED ? (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }}></span>
                <span style={{ color: '#EF4444' }}>Wrong Answer</span>
              </>
            ) : execState.status !== EXEC_STATUS.IDLE ? (
              <>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444', display: 'inline-block' }}></span>
                <span style={{ color: '#EF4444' }}>{execState.statusDescription || execState.status}</span>
              </>
            ) : (
              <>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }}></span>
                <span>Ready</span>
              </>
            )}
          </div>
        </div>

        {/* Console Body: Renders TestCasesPanel with activeTab */}
        <div
          style={{
            flex: '1 1 0%',
            padding: '10px 12px',
            overflow: 'hidden',
            backgroundColor: '#0A0A0A',
            fontSize: '12px',
            minHeight: 0
          }}
        >
          <TestCasesPanel
            activeTab={activeTab}
            testCases={testCases}
            selectedTestCaseId={selectedTestCaseId}
            onSelectTestCase={handleSelectTestCase}
            onAddTestCase={handleAddTestCase}
            onUpdateTestCase={handleUpdateTestCase}
            onDeleteTestCase={handleDeleteTestCase}
            onDraftChange={handleDraftChange}
            onRunAllTests={handleRunAllTests}
            onStopRunAll={handleStopRunAll}
            execState={execState}
            isRunning={isRunning}
            isRunAllRunning={isRunAllRunning}
            runProgress={runProgress}
            runSummary={runSummary}
          />
        </div>

        {/* 5. LeetCode-Style Action Bar: Judge0 info on Left, [ Run ] [ Submit ] on Right */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '42px',
            minHeight: '42px',
            backgroundColor: '#111111',
            borderTop: '1px solid #292929',
            padding: '0 12px',
            flexShrink: 0,
            userSelect: 'none'
          }}
        >
          {/* Left: Backend status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#71717A' }}>
            <Terminal style={{ width: '13px', height: '13px', color: '#A1A1AA' }} />
            <span>Judge0 · {currentLang}</span>
            {isRunAllRunning && runProgress && (
              <span style={{ color: '#F59E0B', marginLeft: '4px' }}>
                ({runProgress.index + 1}/{runProgress.total})
              </span>
            )}
          </div>

          {/* Right: Only TWO primary execution actions: [ Run ] [ Submit ] */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Run Button (Primary Action) */}
            <button
              onClick={handleRun}
              disabled={isRunning || testCases.length === 0}
              className="cfusion-btn cfusion-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '5px',
                backgroundColor: isRunning ? '#151515' : '#1A1A1A',
                color: isRunning ? '#71717A' : '#FFFFFF',
                border: `1px solid ${isRunning ? '#292929' : '#333333'}`,
                cursor: isRunning || testCases.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Execute the selected test case"
            >
              {isRunning && !isRunAllRunning ? (
                <Loader size={12} style={{ animation: 'cfusion-spin 1s linear infinite' }} />
              ) : (
                <Play size={12} fill="currentColor" />
              )}
              <span>{isRunning && !isRunAllRunning ? 'Running…' : 'Run'}</span>
            </button>

            {/* Submit Button (Primary Action) */}
            <button
              onClick={handleSubmit}
              className="cfusion-btn cfusion-btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '5px',
                backgroundColor: '#1A1A1A',
                color: '#FFFFFF',
                border: '1px solid #333333',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Submit code to Codeforces"
            >
              <Send size={12} />
              <span>Submit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6. Save Solution to Personal Library Modal */}
      <SaveSolutionModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSaveSuccess={(newSol) => {
          console.log('[CFusion] Saved solution to library:', newSol.name);
        }}
        code={editorInstanceRef.current ? editorInstanceRef.current.getValue() : codeRef.current}
        currentLang={currentLang}
        meta={meta}
        context={context}
      />

      {/* 7. My Codes Personal Library Overlay Panel */}
      <CodeLibraryPanel
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onOpenInEditor={handleOpenSolutionInEditor}
        onOpenSaveModal={() => setIsSaveModalOpen(true)}
        currentEditorCode={editorInstanceRef.current ? editorInstanceRef.current.getValue() : codeRef.current}
        currentLang={currentLang}
      />
    </div>
  );
}
