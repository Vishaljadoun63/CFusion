import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Save, Terminal, Loader, Check, X, AlertTriangle, XCircle, Clock, Square, FastForward } from 'lucide-react';

/**
 * Clean status icon for test case pill badges (LeetCode style)
 */
function StatusIcon({ status }) {
  if (!status || status === 'idle') return null;

  if (status === 'running') {
    return (
      <Loader
        size={11}
        style={{ color: '#F59E0B', animation: 'cfusion-spin 1s linear infinite' }}
      />
    );
  }

  if (status === 'success' || status === 'passed') {
    return <Check size={11} style={{ color: '#22C55E', strokeWidth: 3 }} />;
  }

  if (status === 'failed') {
    return <X size={11} style={{ color: '#EF4444', strokeWidth: 3 }} />;
  }

  if (status === 'compilation_error') {
    return <AlertTriangle size={11} style={{ color: '#F59E0B' }} />;
  }

  if (status === 'runtime_error' || status === 'error') {
    return <XCircle size={11} style={{ color: '#EF4444' }} />;
  }

  if (status === 'time_limit') {
    return <Clock size={11} style={{ color: '#EF4444' }} />;
  }

  return null;
}

/**
 * Format status text and color
 */
function getStatusDisplay(status, statusDescription) {
  switch (status) {
    case 'success':
    case 'passed':
      return { text: 'Accepted', color: '#22C55E' };
    case 'failed':
      return { text: 'Wrong Answer', color: '#EF4444' };
    case 'compilation_error':
      return { text: 'Compilation Error', color: '#F59E0B' };
    case 'runtime_error':
      return { text: statusDescription || 'Runtime Error', color: '#EF4444' };
    case 'time_limit':
      return { text: 'Time Limit Exceeded', color: '#EF4444' };
    case 'executed':
      return { text: 'Finished', color: '#A1A1AA' };
    case 'skipped':
      return { text: 'Skipped', color: '#71717A' };
    default:
      return { text: statusDescription || status || 'Error', color: '#EF4444' };
  }
}

/**
 * Monospace Card block matching LeetCode's clean dark card surfaces
 */
function ResultCard({ label, content, subtitle = null, isMuted = false, color = '#E5E5E5' }) {
  return (
    <div style={{ marginTop: '10px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: '8px',
        marginBottom: '4px'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#A1A1AA'
        }}>
          {label}
        </div>
        {subtitle && (
          <div style={{
            fontSize: '10px',
            color: '#71717A',
            fontStyle: 'italic'
          }}>
            {subtitle}
          </div>
        )}
      </div>
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#111111',
        border: '1px solid #292929',
        borderRadius: '5px',
        fontFamily: "'JetBrains Mono', Consolas, monospace",
        fontSize: '12px',
        lineHeight: '1.5',
        color,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        maxHeight: '130px',
        overflowY: 'auto'
      }}>
        {isMuted ? (
          <span style={{ color: '#71717A', fontStyle: 'italic' }}>{content}</span>
        ) : content ? (
          content
        ) : (
          <span style={{ color: '#71717A', fontStyle: 'italic' }}>(empty)</span>
        )}
      </div>
    </div>
  );
}

export default function TestCasesPanel({
  activeTab = 'testcase',
  testCases = [],
  selectedTestCaseId,
  onSelectTestCase,
  onAddTestCase,
  onUpdateTestCase,
  onDeleteTestCase,
  onDraftChange,
  onRunAllTests,
  onStopRunAll,
  execState,
  isRunning = false,
  isRunAllRunning = false,
  runProgress = null,
  runSummary = null
}) {
  const currentCase = testCases.find(tc => tc.id === selectedTestCaseId) || testCases[0] || null;

  // Local draft inputs so typing doesn't stutter and unsaved work is preserved
  const [draftInput, setDraftInput] = useState('');
  const [draftExpected, setDraftExpected] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const confirmTimerRef = useRef(null);
  const saveTimerRef = useRef(null);

  // Sync draft states when selected test case changes
  useEffect(() => {
    if (currentCase) {
      const inp = currentCase.input || '';
      const exp = currentCase.expectedOutput || '';
      setDraftInput(inp);
      setDraftExpected(exp);
      setIsSaved(false);
      setErrorMsg('');
      setConfirmDeleteId(null);
      onDraftChange?.({
        testCaseId: currentCase.id,
        input: inp,
        expectedOutput: exp,
        isDirty: false
      });
    }
  }, [currentCase?.id]);

  const isDirty = currentCase && (
    draftInput !== (currentCase.input || '') ||
    draftExpected !== (currentCase.expectedOutput || '')
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setDraftInput(val);
    const dirty = currentCase && (val !== (currentCase.input || '') || draftExpected !== (currentCase.expectedOutput || ''));
    onDraftChange?.({
      testCaseId: currentCase?.id,
      input: val,
      expectedOutput: draftExpected,
      isDirty: dirty
    });
  };

  const handleExpectedChange = (e) => {
    const val = e.target.value;
    setDraftExpected(val);
    const dirty = currentCase && (draftInput !== (currentCase.input || '') || val !== (currentCase.expectedOutput || ''));
    onDraftChange?.({
      testCaseId: currentCase?.id,
      input: draftInput,
      expectedOutput: val,
      isDirty: dirty
    });
  };

  // Handle saving edits
  const handleSave = async () => {
    if (!currentCase) return;
    setErrorMsg('');

    const updated = {
      ...currentCase,
      input: draftInput,
      expectedOutput: draftExpected
    };

    const res = await onUpdateTestCase(updated);
    if (res && res.success === false) {
      setErrorMsg(res.error || 'Failed to save test case.');
    } else {
      setIsSaved(true);
      onDraftChange?.({
        testCaseId: currentCase.id,
        input: draftInput,
        expectedOutput: draftExpected,
        isDirty: false
      });
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => setIsSaved(false), 2000);
    }
  };

  // Handle deleting custom test case
  const handleDeleteClick = () => {
    if (!currentCase || currentCase.isSample || isRunning) return;
    if (confirmDeleteId === currentCase.id) {
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      setConfirmDeleteId(null);
      onDeleteTestCase(currentCase.id);
    } else {
      setConfirmDeleteId(currentCase.id);
      if (confirmTimerRef.current) clearTimeout(confirmTimerRef.current);
      confirmTimerRef.current = setTimeout(() => setConfirmDeleteId(null), 3000);
    }
  };

  // Determine active test result for Test Result tab
  const activeResult = currentCase?.result?.status && currentCase.result.status !== 'idle'
    ? currentCase.result
    : (execState?.status && execState.status !== 'idle' ? execState : null);

  const hasAnyExecution = Boolean(
    activeResult ||
    (runSummary && runSummary.executed > 0) ||
    testCases.some(tc => tc.result && tc.result.status && tc.result.status !== 'idle')
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      backgroundColor: '#0A0A0A',
      userSelect: 'none'
    }}>
      {/* ===================================================================
          TAB A: TESTCASE
          =================================================================== */}
      <div style={{
        display: activeTab === 'testcase' ? 'flex' : 'none',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Top Row: Case Pills + Plus Button on Left, Run All on Right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          paddingBottom: '8px',
          borderBottom: '1px solid #292929',
          flexShrink: 0
        }}>
          {/* Left: Case Selector Pills */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            overflowX: 'auto',
            flex: '1 1 0%'
          }}>
            {testCases.map((tc) => {
              const isSelected = currentCase?.id === tc.id;
              return (
                <button
                  key={tc.id}
                  onClick={() => onSelectTestCase(tc.id)}
                  className="cfusion-btn"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    fontSize: '11px',
                    fontWeight: isSelected ? 600 : 500,
                    borderRadius: '5px',
                    border: isSelected ? '1px solid #F59E0B' : '1px solid #292929',
                    backgroundColor: isSelected ? '#1C1C1C' : 'transparent',
                    color: isSelected ? '#E5E5E5' : '#A1A1AA',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    flexShrink: 0
                  }}
                  title={tc.isSample ? 'Official Codeforces Sample Case' : 'User Custom Test Case'}
                >
                  <StatusIcon status={tc.result?.status} />
                  <span>{tc.name}</span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    backgroundColor: '#151515',
                    border: '1px solid #292929',
                    color: tc.isSample ? '#F59E0B' : '#71717A',
                    marginLeft: '2px'
                  }}>
                    {tc.isSample ? 'SAMPLE' : 'CUSTOM'}
                  </span>
                </button>
              );
            })}

            {/* Compact Plus Button to add a new custom case */}
            <button
              onClick={onAddTestCase}
              disabled={isRunning}
              className="cfusion-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                padding: 0,
                borderRadius: '5px',
                border: '1px dashed #292929',
                backgroundColor: 'transparent',
                color: '#A1A1AA',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                opacity: isRunning ? 0.6 : 1,
                transition: 'all 0.15s ease',
                flexShrink: 0
              }}
              title="Add a new custom test case"
            >
              <Plus size={12} />
            </button>
          </div>

          {/* Right: Secondary Run All / Stop Action inside Testcase Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            {isRunAllRunning ? (
              <button
                onClick={onStopRunAll}
                className="cfusion-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '5px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  color: '#EF4444',
                  border: '1px solid #EF4444',
                  cursor: 'pointer'
                }}
                title="Stop remaining test cases from executing"
              >
                <Square size={10} fill="currentColor" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                onClick={onRunAllTests}
                disabled={isRunning || testCases.length === 0}
                className="cfusion-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  fontWeight: 500,
                  borderRadius: '5px',
                  backgroundColor: '#151515',
                  color: isRunning ? '#71717A' : '#A1A1AA',
                  border: '1px solid #292929',
                  cursor: isRunning || testCases.length === 0 ? 'not-allowed' : 'pointer'
                }}
                title="Execute all test cases sequentially"
              >
                <FastForward size={11} />
                <span>Run All</span>
              </button>
            )}
          </div>
        </div>

        {/* Dual Editor Section: Input (stdin) on Left, Expected Output on Right */}
        <div style={{
          display: 'flex',
          flex: '1 1 0%',
          gap: '8px',
          paddingTop: '8px',
          minHeight: 0,
          overflow: 'hidden'
        }}>
          {/* Left Column: Input (stdin) */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 0%',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#71717A',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '3px'
            }}>
              Input (stdin)
            </div>
            <textarea
              value={draftInput}
              onChange={handleInputChange}
              placeholder="Enter standard input..."
              style={{
                width: '100%',
                height: '100%',
                minHeight: '60px',
                backgroundColor: '#111111',
                border: '1px solid #292929',
                borderRadius: '5px',
                color: '#E5E5E5',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontSize: '12px',
                lineHeight: '1.5',
                padding: '6px 8px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                overflowY: 'auto'
              }}
              spellCheck={false}
            />
          </div>

          {/* Right Column: Expected Output */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 0%',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#71717A',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              marginBottom: '3px'
            }}>
              Expected Output
            </div>
            <textarea
              value={draftExpected}
              onChange={handleExpectedChange}
              placeholder={currentCase?.isSample ? "Expected output from Codeforces sample..." : "Enter expected output (optional for custom cases)..."}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '60px',
                backgroundColor: '#111111',
                border: '1px solid #292929',
                borderRadius: '5px',
                color: '#E5E5E5',
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontSize: '12px',
                lineHeight: '1.5',
                padding: '6px 8px',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
                overflowY: 'auto'
              }}
              spellCheck={false}
            />
          </div>
        </div>

        {/* Action Row: Save and Delete */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '6px',
          flexShrink: 0
        }}>
          {/* Status info */}
          <div style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {isDirty ? (
              <span style={{ color: '#F59E0B' }}>● Unsaved changes</span>
            ) : isSaved ? (
              <span style={{ color: '#22C55E' }}>✓ Changes saved</span>
            ) : errorMsg ? (
              <span style={{ color: '#EF4444' }}>{errorMsg}</span>
            ) : (
              <span style={{ color: '#71717A' }}>
                {currentCase?.isSample ? 'Sample case' : 'Custom case'}
              </span>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {/* Save Button (only when dirty - dark primary) */}
            {isDirty && (
              <button
                onClick={handleSave}
                className="cfusion-btn cfusion-btn-primary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 9px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '5px',
                  backgroundColor: '#1A1A1A',
                  color: '#FFFFFF',
                  border: '1px solid #333333',
                  cursor: 'pointer'
                }}
                title="Save changes to this test case"
              >
                <Save size={11} />
                <span>Save</span>
              </button>
            )}

            {/* Delete Button (only for custom test cases - restrained) */}
            {!currentCase?.isSample && (
              <button
                onClick={handleDeleteClick}
                disabled={isRunning}
                className="cfusion-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  borderRadius: '5px',
                  border: confirmDeleteId === currentCase?.id ? '1px solid #EF4444' : '1px solid #292929',
                  backgroundColor: confirmDeleteId === currentCase?.id ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
                  color: confirmDeleteId === currentCase?.id ? '#EF4444' : '#71717A',
                  cursor: isRunning ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title="Delete this custom testcase"
              >
                <Trash2 size={11} />
                <span>{confirmDeleteId === currentCase?.id ? 'Confirm?' : 'Delete'}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================
          TAB B: TEST RESULT (Exact LeetCode-Style Layout)
          =================================================================== */}
      <div style={{
        display: activeTab === 'testresult' ? 'flex' : 'none',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        overflowY: 'auto'
      }}>
        {/* If no code has been executed yet */}
        {!hasAnyExecution && !isRunning ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '120px',
            color: '#71717A',
            gap: '8px',
            userSelect: 'none'
          }}>
            <Terminal size={22} style={{ color: '#71717A' }} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>You must run your code first.</span>
          </div>
        ) : isRunning && (!activeResult || activeResult.status === 'running') ? (
          /* Execution in progress */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: '#F59E0B',
            padding: '16px 0',
            fontSize: '12px'
          }}>
            <Loader size={15} style={{ animation: 'cfusion-spin 1s linear infinite' }} />
            <span>{execState?.statusDescription || 'Executing code against test case…'}</span>
          </div>
        ) : (
          /* Executed Results */
          <div>
            {/* 1. Result Header: Bold status text + Runtime & Memory */}
            {activeResult && (
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '12px',
                marginBottom: '10px'
              }}>
                {(() => {
                  const statusInfo = getStatusDisplay(activeResult.status, activeResult.statusDescription);
                  return (
                    <span style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: statusInfo.color
                    }}>
                      {statusInfo.text}
                    </span>
                  );
                })()}

                {activeResult.time && (
                  <span style={{ fontSize: '12px', color: '#71717A' }}>
                    Runtime: {activeResult.time}
                  </span>
                )}
                {activeResult.memory && (
                  <span style={{ fontSize: '12px', color: '#71717A' }}>
                    Memory: {activeResult.memory}
                  </span>
                )}
              </div>
            )}

            {/* 2. Selectable Case Tabs: [✓ Case 1] [✓ Case 2] [✗ Case 3] */}
            {testCases.length > 0 && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                paddingBottom: '8px',
                borderBottom: '1px solid #292929',
                marginBottom: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flex: '1 1 0%' }}>
                  {testCases.map((tc) => {
                    const isSelected = currentCase?.id === tc.id;
                    return (
                      <button
                        key={tc.id}
                        onClick={() => onSelectTestCase(tc.id)}
                        className="cfusion-btn"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: isSelected ? 600 : 500,
                          borderRadius: '5px',
                          border: isSelected ? '1px solid #F59E0B' : '1px solid #292929',
                          backgroundColor: isSelected ? '#1C1C1C' : 'transparent',
                          color: isSelected ? '#E5E5E5' : '#A1A1AA',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          flexShrink: 0
                        }}
                      >
                        <StatusIcon status={tc.result?.status} />
                        <span>{tc.name}</span>
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 600,
                          letterSpacing: '0.04em',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          backgroundColor: '#151515',
                          border: '1px solid #292929',
                          color: tc.isSample ? '#F59E0B' : '#71717A',
                          marginLeft: '2px'
                        }}>
                          {tc.isSample ? 'SAMPLE' : 'CUSTOM'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Run All Summary Badge if available */}
                {runSummary && (
                  <div style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    color: runSummary.compilationErrors > 0
                      ? '#F59E0B'
                      : (runSummary.failed > 0 || runSummary.wasAborted)
                      ? '#EF4444'
                      : '#22C55E',
                    backgroundColor: '#151515',
                    border: '1px solid #292929',
                    borderRadius: '4px',
                    padding: '2px 8px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}>
                    {runSummary.wasAborted
                      ? `Stopped (${runSummary.executed}/${runSummary.total})`
                      : `${runSummary.accepted}/${runSummary.total} Accepted`}
                  </div>
                )}
              </div>
            )}

            {/* 3. Result Content (LeetCode order: Input, Output, Expected) */}
            {activeResult ? (
              <div>
                {/* A. If Compilation Error: show compiler output */}
                {activeResult.status === 'compilation_error' ? (
                  <ResultCard
                    label="Compiler Output"
                    content={activeResult.compile_output || activeResult.stderr || 'No diagnostic output available.'}
                    color="#F59E0B"
                  />
                ) : activeResult.status === 'runtime_error' ? (
                  /* B. If Runtime Error: show runtime stderr */
                  <ResultCard
                    label="Runtime Error"
                    content={activeResult.stderr || activeResult.compile_output || 'Runtime terminated unexpectedly.'}
                    color="#EF4444"
                  />
                ) : (
                  /* C. Normal Execution: Input, Output, Expected */
                  <div>
                    {/* INPUT */}
                    <ResultCard
                      label="Input"
                      content={
                        activeResult.inputSnapshot !== undefined
                          ? activeResult.inputSnapshot
                          : (currentCase?.input || '')
                      }
                      color="#E5E5E5"
                    />

                    {/* OUTPUT */}
                    <ResultCard
                      label="Output"
                      content={
                        activeResult.actualOutput !== undefined
                          ? activeResult.actualOutput
                          : (activeResult.stdout || '')
                      }
                      color="#E5E5E5"
                    />

                    {/* EXPECTED */}
                    {activeResult.expectedOutputSnapshot && activeResult.expectedOutputSnapshot.trim() ? (
                      <ResultCard
                        label="Expected"
                        content={activeResult.expectedOutputSnapshot}
                        color="#A1A1AA"
                      />
                    ) : currentCase?.expectedOutput && currentCase.expectedOutput.trim() ? (
                      <ResultCard
                        label="Expected"
                        content={currentCase.expectedOutput}
                        color="#A1A1AA"
                      />
                    ) : (
                      <ResultCard
                        label="Expected"
                        content="Not provided"
                        subtitle={!currentCase?.isSample ? "Custom test cases require expected output to be entered manually in the Testcase tab." : null}
                        isMuted={true}
                      />
                    )}

                    {/* Standard Error (if any stderr was logged during normal execution) */}
                    {activeResult.stderr && activeResult.stderr.trim() && (
                      <ResultCard
                        label="Standard Error"
                        content={activeResult.stderr}
                        color="#EF4444"
                      />
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: '#71717A', fontSize: '12px', fontStyle: 'italic', padding: '12px 0' }}>
                No execution result available for {currentCase?.name || 'this test case'}.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
