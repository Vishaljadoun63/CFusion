import React, { useState, useEffect } from 'react';
import { X, Bookmark, AlertTriangle, Check, Code, FileText } from 'lucide-react';
import { saveCode, SUGGESTED_TOPICS, getLanguageLabel, getAllSavedCodes } from '../services/codeLibraryService';
import { LANGUAGE_METADATA } from './starterTemplates';

export default function SaveSolutionModal({
  isOpen,
  onClose,
  onSaveSuccess,
  code = '',
  currentLang = 'cpp17',
  meta = {},
  context = {}
}) {
  const [name, setName] = useState('');
  const [topic, setTopic] = useState('Other');
  const [customTopic, setCustomTopic] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [existingMatch, setExistingMatch] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const problemCode = context.contestId && context.problemIndex
    ? `${context.contestId}${context.problemIndex}`
    : '';
  const problemName = meta.title || '';
  const problemUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Initialize modal state on open
  useEffect(() => {
    if (isOpen) {
      const defaultName = problemName
        ? `${problemCode ? problemCode + ' · ' : ''}${problemName}`
        : 'Solution';
      setName(defaultName);
      setTopic('Other');
      setCustomTopic('');
      setTagsInput(Array.isArray(meta.tags) ? meta.tags.join(', ') : '');
      setNotes('');
      setOverwrite(false);
      setExistingMatch(null);
      setErrorMsg('');

      // Check existing codes to detect duplicate name upfront
      getAllSavedCodes().then(codes => {
        const match = codes.find(c => c.name.trim().toLowerCase() === defaultName.trim().toLowerCase());
        if (match) setExistingMatch(match);
      });
    }
  }, [isOpen, problemName, problemCode]);

  // Live duplicate check when name changes
  const handleNameChange = async (e) => {
    const val = e.target.value;
    setName(val);
    setErrorMsg('');
    if (!val.trim()) {
      setExistingMatch(null);
      return;
    }
    const codes = await getAllSavedCodes();
    const match = codes.find(c => c.name.trim().toLowerCase() === val.trim().toLowerCase());
    setExistingMatch(match || null);
    if (!match) setOverwrite(false);
  };

  if (!isOpen) return null;

  const codeLines = code.split('\n').length;
  const langLabel = getLanguageLabel(currentLang);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a solution name.');
      return;
    }
    if (!code || !code.trim()) {
      setErrorMsg('Current editor code is empty.');
      return;
    }

    if (existingMatch && !overwrite) {
      setErrorMsg(`A solution named "${name.trim()}" already exists. Check "Overwrite existing" or use a different name.`);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    const finalTopic = topic === '__custom__'
      ? (customTopic.trim() || 'Other')
      : topic;

    const res = await saveCode({
      name: name.trim(),
      code,
      language: currentLang,
      languageLabel: langLabel,
      problemName,
      problemCode,
      problemUrl,
      platform: 'Codeforces',
      topic: finalTopic,
      tags: tagsInput,
      notes,
      overwrite
    });

    setIsSubmitting(false);

    if (res.success) {
      onSaveSuccess?.(res.solution);
      onClose();
    } else {
      setErrorMsg(res.message || 'Failed to save solution.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(3px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        boxSizing: 'border-box'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#0F172A',
          border: '1px solid #334155',
          borderRadius: '10px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: '#1E293B',
            borderBottom: '1px solid #334155'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bookmark size={16} style={{ color: '#818CF8' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#F8FAFC' }}>
              Save Solution to Library
            </span>
          </div>
          <button
            onClick={onClose}
            className="cfusion-btn"
            style={{
              padding: '4px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#94A3B8',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '16px 18px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            fontSize: '12px'
          }}
        >
          {/* Solution Name */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#E2E8F0', marginBottom: '5px' }}>
              Solution Name <span style={{ color: '#EF4444' }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="e.g. Two Sum - Optimal Map"
              autoFocus
              style={{
                width: '100%',
                padding: '7px 10px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Duplicate Name Alert */}
          {existingMatch && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '8px 10px',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid #F59E0B',
                borderRadius: '6px',
                color: '#FCD34D',
                fontSize: '11px'
              }}
            >
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: '1 1 0%' }}>
                <div>A solution with this name already exists in your library.</div>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px', cursor: 'pointer', fontWeight: 600 }}>
                  <input
                    type="checkbox"
                    checked={overwrite}
                    onChange={(e) => setOverwrite(e.target.checked)}
                  />
                  <span>Overwrite existing solution</span>
                </label>
              </div>
            </div>
          )}

          {/* Metadata Row: Language & Problem */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Language */}
            <div style={{ flex: '1 1 0%' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                Language
              </label>
              <div
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#38BDF8',
                  fontWeight: 600,
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Code size={13} />
                <span>{langLabel}</span>
              </div>
            </div>

            {/* Problem Code & Title */}
            <div style={{ flex: '2 1 0%' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                Problem
              </label>
              <div
                style={{
                  padding: '6px 10px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#E2E8F0',
                  fontSize: '11px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={`${problemCode ? problemCode + ' · ' : ''}${problemName || 'Custom Problem'}`}
              >
                {problemCode && <span style={{ color: '#818CF8', fontWeight: 600, marginRight: '6px' }}>{problemCode}</span>}
                <span>{problemName || 'Custom Problem'}</span>
              </div>
            </div>
          </div>

          {/* Topic & Tags Row */}
          <div style={{ display: 'flex', gap: '10px' }}>
            {/* Topic */}
            <div style={{ flex: '1 1 0%' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px' }}>
                Topic
              </label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              >
                {SUGGESTED_TOPICS.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
                <option value="__custom__">+ Custom Topic</option>
              </select>
              {topic === '__custom__' && (
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="Enter topic name..."
                  style={{
                    width: '100%',
                    marginTop: '5px',
                    padding: '5px 8px',
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    borderRadius: '5px',
                    color: '#F8FAFC',
                    fontSize: '11px',
                    boxSizing: 'border-box'
                  }}
                />
              )}
            </div>

            {/* Tags */}
            <div style={{ flex: '1 1 0%' }}>
              <label style={{ display: 'block', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px' }}>
                Tags <span style={{ color: '#64748B', fontWeight: 400 }}>(comma-separated)</span>
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. greedy, math, two-pointers"
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#F8FAFC',
                  fontSize: '12px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', fontWeight: 600, color: '#E2E8F0', marginBottom: '4px' }}>
              Notes & Complexity <span style={{ color: '#64748B', fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. O(n) time, O(1) space. Edge case when n is odd..."
              rows={2}
              style={{
                width: '100%',
                padding: '6px 10px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '6px',
                color: '#F8FAFC',
                fontSize: '12px',
                lineHeight: '1.4',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Captured Code Info Preview */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              backgroundColor: '#0B1120',
              border: '1px solid #1E293B',
              borderRadius: '6px',
              fontSize: '11px',
              color: '#64748B'
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <FileText size={12} style={{ color: '#818CF8' }} />
              Capturing current Monaco editor content
            </span>
            <span>{codeLines} {codeLines === 1 ? 'line' : 'lines'} ({Math.round(code.length / 1024 * 10) / 10} KB)</span>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div style={{ color: '#EF4444', fontSize: '11px', fontWeight: 500 }}>
              {errorMsg}
            </div>
          )}

          {/* Footer Actions */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '8px',
              paddingTop: '8px',
              borderTop: '1px solid #1E293B'
            }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="cfusion-btn"
              style={{
                padding: '6px 14px',
                fontSize: '12px',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                color: '#94A3B8',
                border: '1px solid #334155',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cfusion-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 16px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#4F46E5',
                color: '#FFFFFF',
                border: '1px solid #4F46E5',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 3px rgba(79, 70, 229, 0.4)'
              }}
            >
              <Bookmark size={13} />
              <span>{isSubmitting ? 'Saving…' : (overwrite ? 'Overwrite Solution' : 'Save Solution')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
