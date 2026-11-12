import React, { useState } from 'react';
import { RotateCcw, Copy, Check, FileCode, Bookmark } from 'lucide-react';
import LanguageSelector from './LanguageSelector';
import { LANGUAGE_METADATA } from './starterTemplates';

export default function EditorToolbar({
  currentLang,
  onLanguageChange,
  onResetCode,
  onCopyCode,
  onOpenSaveModal,
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
        backgroundColor: '#111111',
        borderBottom: '1px solid #292929',
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
            backgroundColor: '#151515',
            color: '#E5E5E5',
            fontSize: '12px',
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            padding: '5px 12px',
            borderRadius: '5px 5px 0 0',
            borderTop: '2px solid #F59E0B',
            fontWeight: 600
          }}
        >
          <FileCode style={{ color: '#F59E0B', width: '13px', height: '13px' }} />
          <span>{langMeta.filename}</span>
        </div>

        {/* Auto-save Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginLeft: '6px' }}>
          {isSaving ? (
            <span style={{ color: '#F59E0B' }}>Saving...</span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#71717A' }}>
              <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#22C55E', display: 'inline-block' }}></span>
              <span>Saved</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions (Language Dropdown, Save Code, Reset, Copy) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <LanguageSelector currentLang={currentLang} onLanguageChange={onLanguageChange} />

        {/* Save Code Action (Primary) */}
        <button
          onClick={onOpenSaveModal}
          className="cfusion-btn cfusion-btn-primary"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 11px',
            fontSize: '12px',
            fontWeight: 600,
            borderRadius: '5px',
            backgroundColor: '#1A1A1A',
            color: '#FFFFFF',
            border: '1px solid #333333',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Save this code to your Personal Code Library"
        >
          <Bookmark style={{ width: '12px', height: '12px', color: '#F59E0B' }} />
          <span>Save Code</span>
        </button>

        {/* Reset Code (Secondary) */}
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
            borderRadius: '5px',
            backgroundColor: '#151515',
            color: '#A1A1AA',
            border: '1px solid #292929',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Reset code to original starter template"
        >
          <RotateCcw
            style={{ width: '12px', height: '12px', color: resetting ? '#F59E0B' : '#71717A' }}
            className={resetting ? 'animate-spin' : ''}
          />
          <span>{resetting ? 'Reset!' : 'Reset'}</span>
        </button>

        {/* Copy Code (Secondary) */}
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
            borderRadius: '5px',
            backgroundColor: copied ? '#22C55E' : '#151515',
            color: copied ? '#111111' : '#A1A1AA',
            border: copied ? '1px solid #22C55E' : '1px solid #292929',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title="Copy current code to clipboard"
        >
          {copied ? (
            <Check style={{ width: '12px', height: '12px', color: '#111111' }} />
          ) : (
            <Copy style={{ width: '12px', height: '12px', color: '#71717A' }} />
          )}
          <span>{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}
