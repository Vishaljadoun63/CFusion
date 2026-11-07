import React, { useState } from 'react';
import { RotateCcw, Copy, Check, FileCode } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { LANGUAGE_METADATA } from './starterTemplates';

export default function EditorToolbar({
  currentLang,
  onLanguageChange,
  onResetCode,
  onCopyCode,
  isSaving
}) {
  const [copied, setCopied] = useState(false);
  const [resetting, setResetting] = useState(false);

  const langMeta = LANGUAGE_METADATA[currentLang] || LANGUAGE_METADATA.cpp17;

  const handleCopy = async () => {
    const success = await onCopyCode();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  const handleReset = () => {
    setResetting(true);
    onResetCode();
    setTimeout(() => setResetting(false), 1200);
  };

  return (
    <div
      className="cfusion-editor-toolbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '42px',
        minHeight: '42px',
        maxHeight: '42px',
        backgroundColor: '#172033',
        borderBottom: '1px solid #273449',
        padding: '0 12px',
        flexShrink: 0,
        userSelect: 'none',
        zIndex: 5
      }}
    >
      {/* File Tab & Save Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#111827',
            color: '#F8FAFC',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            padding: '5px 12px',
            borderRadius: '6px 6px 0 0',
            borderTop: '2px solid #6366F1',
            fontWeight: 600,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
          }}
        >
          <FileCode style={{ color: '#818CF8', width: '14px', height: '14px' }} />
          <span>{langMeta.filename}</span>
        </div>

        {/* Auto-save Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginLeft: '6px' }}>
          {isSaving ? (
            <span style={{ color: '#F59E0B' }}>Saving...</span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#10B981' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }}></span>
              <span>Saved</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions (Language Dropdown, Reset, Copy) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LanguageSelector currentLang={currentLang} onLanguageChange={onLanguageChange} />

        {/* Reset Code */}
        <button
          onClick={handleReset}
          className="cfusion-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '6px',
            backgroundColor: '#0B1120',
            color: '#E2E8F0',
            border: '1px solid #273449',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Reset code to original starter template"
        >
          <RotateCcw
            style={{ width: '12px', height: '12px', color: resetting ? '#F59E0B' : '#94A3B8' }}
            className={resetting ? 'animate-spin' : ''}
          />
          <span>{resetting ? 'Reset!' : 'Reset'}</span>
        </button>

        {/* Copy Code */}
        <button
          onClick={handleCopy}
          className="cfusion-btn"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 10px',
            fontSize: '12px',
            fontWeight: 500,
            borderRadius: '6px',
            backgroundColor: copied ? '#10B981' : '#0B1120',
            color: copied ? '#FFFFFF' : '#E2E8F0',
            border: copied ? '1px solid #10B981' : '1px solid #273449',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Copy current code to clipboard"
        >
          {copied ? (
            <Check style={{ width: '12px', height: '12px', color: '#FFFFFF' }} />
          ) : (
            <Copy style={{ width: '12px', height: '12px', color: '#94A3B8' }} />
          )}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}
