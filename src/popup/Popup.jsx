import React, { useState, useEffect } from 'react';
import {
  Code2,
  Moon,
  Sun,
  Sliders,
  ExternalLink,
  CheckCircle2,
  Sparkles,
  Terminal,
  Zap
} from 'lucide-react';

export default function Popup() {
  const [enabled, setEnabled] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [autoMountEditor, setAutoMountEditor] = useState(true);
  const [savedStatus, setSavedStatus] = useState(false);

  // Load preferences from Chrome Storage API
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['cfusion_enabled', 'theme', 'auto_mount_editor'], (result) => {
        if (result.cfusion_enabled !== undefined) setEnabled(result.cfusion_enabled);
        if (result.theme !== undefined) setTheme(result.theme);
        if (result.auto_mount_editor !== undefined) setAutoMountEditor(result.auto_mount_editor);
      });
    }
  }, []);

  const updateSetting = (key, value) => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [key]: value }, () => {
        setSavedStatus(true);
        setTimeout(() => setSavedStatus(false), 1200);
      });
    }
  };

  const handleToggleEnabled = () => {
    const nextVal = !enabled;
    setEnabled(nextVal);
    updateSetting('cfusion_enabled', nextVal);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    updateSetting('theme', nextTheme);
  };

  const handleToggleEditor = () => {
    const nextVal = !autoMountEditor;
    setAutoMountEditor(nextVal);
    updateSetting('auto_mount_editor', nextVal);
  };

  const openLink = (url) => {
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url });
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="w-[360px] bg-[#0B1120] text-[#F8FAFC] flex flex-col p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#273449]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#6366F1] to-[#38BDF8] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-white">CFusion</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#273449] text-[#38BDF8]">
                v0.1.0
              </span>
            </div>
            <p className="text-[11px] text-[#94A3B8] -mt-0.5">Codeforces Reimagined</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs text-emerald-400 font-medium">Ready</span>
        </div>
      </div>

      {/* Main Controls Card */}
      <div className="my-3 space-y-2.5">
        {/* Master Switch */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#172033] border border-[#273449] hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <Zap className={`w-4 h-4 ${enabled ? 'text-indigo-400' : 'text-[#94A3B8]'}`} />
            <div>
              <p className="text-xs font-semibold text-white">CFusion Redesign</p>
              <p className="text-[11px] text-[#94A3B8]">Transform Codeforces UI</p>
            </div>
          </div>
          <button
            onClick={handleToggleEnabled}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
              enabled ? 'bg-[#6366F1]' : 'bg-[#273449]'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Theme Toggle */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#172033] border border-[#273449] hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            {theme === 'dark' ? (
              <Moon className="w-4 h-4 text-sky-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
            <div>
              <p className="text-xs font-semibold text-white">Appearance</p>
              <p className="text-[11px] text-[#94A3B8]">
                {theme === 'dark' ? 'Modern Dark Theme' : 'Standard Light Theme'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleTheme}
            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-[#273449] hover:bg-[#334460] text-white transition-colors cursor-pointer"
          >
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
        </div>

        {/* Monaco Editor Toggle (Prepared for Phase 3) */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-[#172033] border border-[#273449] hover:border-indigo-500/40 transition-colors">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="text-xs font-semibold text-white">Monaco Code Editor</p>
              <p className="text-[11px] text-[#94A3B8]">Auto-dock editor on problem pages</p>
            </div>
          </div>
          <button
            onClick={handleToggleEditor}
            className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 ease-in-out cursor-pointer ${
              autoMountEditor ? 'bg-[#6366F1]' : 'bg-[#273449]'
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                autoMountEditor ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Quick Launch Actions */}
      <div className="pt-2">
        <p className="text-[10px] uppercase font-bold tracking-wider text-[#94A3B8] mb-2">
          Quick Access
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => openLink('https://codeforces.com/problemset')}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#111827] border border-[#273449] hover:border-indigo-500/50 hover:bg-[#172033] transition-all text-left cursor-pointer group"
          >
            <span className="text-xs font-medium text-slate-200 group-hover:text-indigo-300">
              Problemset
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-indigo-400" />
          </button>

          <button
            onClick={() => openLink('https://codeforces.com/contests')}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-[#111827] border border-[#273449] hover:border-indigo-500/50 hover:bg-[#172033] transition-all text-left cursor-pointer group"
          >
            <span className="text-xs font-medium text-slate-200 group-hover:text-indigo-300">
              Contests
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-[#94A3B8] group-hover:text-indigo-400" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-[#273449] flex items-center justify-between text-[11px] text-[#94A3B8]">
        <span className="flex items-center gap-1">
          {savedStatus && (
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Saved
            </span>
          )}
          {!savedStatus && 'Changes apply live'}
        </span>
        <span className="flex items-center gap-1 text-indigo-400 font-medium">
          <Sparkles className="w-3 h-3" /> Phase 1 Active
        </span>
      </div>
    </div>
  );
}
