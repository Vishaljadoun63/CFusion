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
    <div className="flex items-center justify-between h-[42px] min-h-[42px] bg-[#172033] border-b border-[#273449] px-3 select-none">
      {/* File Tab */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-[#111827] text-[#F8FAFC] text-xs font-mono px-3 py-1.5 rounded-t-md border-t-2 border-[#6366F1] font-medium shadow-sm">
          <FileCode className="w-3.5 h-3.5 text-[#818CF8]" />
          <span>{langMeta.filename}</span>
        </div>

        {/* Auto-save Status Indicator */}
        <div className="flex items-center gap-1 text-[11px] text-[#94A3B8] ml-2">
          {isSaving ? (
            <span className="text-amber-400">Saving...</span>
          ) : (
            <span className="flex items-center gap-1 text-emerald-400/80">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Saved</span>
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <LanguageSelector currentLang={currentLang} onLanguageChange={onLanguageChange} />

        {/* Reset Code */}
        <button
          onClick={handleReset}
          className="cfusion-btn flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-[#0B1120] hover:bg-[#1E293B] text-[#E2E8F0] border border-[#273449] hover:border-[#475569] transition-all cursor-pointer"
          title="Reset code to original starter template"
        >
          <RotateCcw className={`w-3 h-3 ${resetting ? 'animate-spin text-amber-400' : ''}`} />
          <span className="hidden sm:inline">{resetting ? 'Reset!' : 'Reset'}</span>
        </button>

        {/* Copy Code */}
        <button
          onClick={handleCopy}
          className={`cfusion-btn flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-600 border-emerald-500 text-white'
              : 'bg-[#0B1120] hover:bg-[#1E293B] text-[#E2E8F0] border-[#273449] hover:border-[#475569]'
          }`}
          title="Copy current code to clipboard"
        >
          {copied ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
          <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>
    </div>
  );
}
