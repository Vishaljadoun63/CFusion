import React from 'react';
import { LANGUAGE_METADATA } from './starterTemplates';

export default function LanguageSelector({ currentLang, onLanguageChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <select
        value={currentLang}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="cfusion-select bg-[#0B1120] text-[#F8FAFC] border border-[#273449] rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer focus:border-[#6366F1] focus:ring-1 focus:ring-[#6366F1] outline-none transition-all"
        title="Select Programming Language"
      >
        {Object.values(LANGUAGE_METADATA).map((lang) => (
          <option key={lang.id} value={lang.id} className="bg-[#111827] text-[#F8FAFC]">
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
