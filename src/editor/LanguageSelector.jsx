import React from 'react';
import { LANGUAGE_METADATA } from './starterTemplates';

export default function LanguageSelector({ currentLang, onLanguageChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <select
        value={currentLang}
        onChange={(e) => onLanguageChange(e.target.value)}
        className="cfusion-select"
        style={{
          backgroundColor: '#111111',
          color: '#E5E5E5',
          border: '1px solid #292929',
          borderRadius: '5px',
          padding: '4px 10px',
          fontSize: '12px',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          fontFamily: "'JetBrains Mono', Consolas, monospace",
          transition: 'all 0.15s ease'
        }}
        title="Select Programming Language"
      >
        {Object.values(LANGUAGE_METADATA).map((lang) => (
          <option
            key={lang.id}
            value={lang.id}
            style={{ backgroundColor: '#151515', color: '#E5E5E5' }}
          >
            {lang.label}
          </option>
        ))}
      </select>
    </div>
  );
}
