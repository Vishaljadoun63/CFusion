import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Bookmark,
  Code,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Play,
  ArrowLeft,
  Filter,
  Plus,
  AlertTriangle,
  Check,
  FileText,
  Tag
} from 'lucide-react';
import {
  getAllSavedCodes,
  deleteSavedCode,
  renameSavedCode,
  searchSavedCodes,
  getSavedCodesByLanguage,
  getSavedCodesByTopic,
  sortSavedCodes,
  SUGGESTED_TOPICS,
  getLanguageLabel
} from '../services/codeLibraryService';

export default function CodeLibraryPanel({
  isOpen,
  onClose,
  onOpenInEditor,
  onOpenSaveModal,
  currentEditorCode = '',
  currentLang = 'cpp17'
}) {
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('all');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [sortBy, setSortBy] = useState('recently_updated');

  // Modals & confirmation dialogs
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [renameTarget, setRenameTarget] = useState(null); // { id, name }
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [openConfirmTarget, setOpenConfirmTarget] = useState(null); // solution to open
  const [toastMessage, setToastMessage] = useState('');

  // Load solutions whenever panel opens
  const refreshSolutions = async () => {
    setLoading(true);
    try {
      const all = await getAllSavedCodes();
      setSolutions(all);
    } catch (err) {
      console.error('[CFusion Library] Refresh error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshSolutions();
      setDeleteConfirmId(null);
      setRenameTarget(null);
      setOpenConfirmTarget(null);
    }
  }, [isOpen]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Filter and search computation
  const filteredSolutions = useMemo(() => {
    let list = solutions;
    if (selectedLanguage !== 'all') {
      list = getSavedCodesByLanguage(selectedLanguage, list);
    }
    if (selectedTopic !== 'all') {
      list = getSavedCodesByTopic(selectedTopic, list);
    }
    if (searchQuery.trim()) {
      list = searchSavedCodes(searchQuery, list);
    }
    return sortSavedCodes(list, sortBy);
  }, [solutions, selectedLanguage, selectedTopic, searchQuery, sortBy]);

  if (!isOpen) return null;

  // Handle Opening solution in Monaco
  const handleOpenClick = (sol) => {
    // Check if current editor has existing code that differs from this solution
    const hasUnsavedChanges =
      currentEditorCode &&
      currentEditorCode.trim() !== '' &&
      currentEditorCode.trim() !== (sol.code || '').trim();

    if (hasUnsavedChanges) {
      setOpenConfirmTarget(sol);
    } else {
      executeOpen(sol);
    }
  };

  const executeOpen = (sol) => {
    setOpenConfirmTarget(null);
    onOpenInEditor(sol);
    showToast(`Loaded "${sol.name}" into editor!`);
    onClose();
  };

  // Handle Delete
  const executeDelete = async (id) => {
    const res = await deleteSavedCode(id);
    if (res.success) {
      setDeleteConfirmId(null);
      await refreshSolutions();
      showToast('Solution deleted.');
    } else {
      alert(res.message || 'Failed to delete solution.');
    }
  };

  // Handle Rename
  const handleStartRename = (sol) => {
    setRenameTarget(sol);
    setRenameValue(sol.name);
    setRenameError('');
  };

  const executeRename = async () => {
    if (!renameValue.trim()) {
      setRenameError('Solution name cannot be empty.');
      return;
    }
    const res = await renameSavedCode(renameTarget.id, renameValue.trim());
    if (res.success) {
      setRenameTarget(null);
      await refreshSolutions();
      showToast(`Renamed to "${renameValue.trim()}".`);
    } else {
      setRenameError(res.message || 'Failed to rename.');
    }
  };

  const formatDate = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const deleteTargetSol = solutions.find(s => s.id === deleteConfirmId);

  return (
    <div
      className="cfusion-library-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#0A0A0A',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none'
      }}
    >
      {/* 1. Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '46px',
          minHeight: '46px',
          padding: '0 16px',
          backgroundColor: '#111111',
          borderBottom: '1px solid #292929',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={onClose}
            className="cfusion-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              fontSize: '12px',
              borderRadius: '6px',
              backgroundColor: '#151515',
              color: '#A1A1AA',
              border: '1px solid #292929',
              cursor: 'pointer'
            }}
            title="Return to Monaco Editor"
          >
            <ArrowLeft size={13} />
            <span>Editor</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Bookmark size={16} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#E5E5E5' }}>
              My Codes
            </span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: '#151515',
                color: '#F59E0B',
                border: '1px solid #292929'
              }}
            >
              {solutions.length} {solutions.length === 1 ? 'solution' : 'solutions'}
            </span>
          </div>
        </div>

        {/* Right Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={onOpenSaveModal}
            className="cfusion-btn"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              borderRadius: '6px',
              backgroundColor: '#1A1A1A',
              color: '#FFFFFF',
              border: '1px solid #333333',
              cursor: 'pointer'
            }}
            title="Save current code from editor"
          >
            <Plus size={13} style={{ color: '#F59E0B' }} />
            <span>Save Code</span>
          </button>

          <button
            onClick={onClose}
            className="cfusion-btn"
            style={{
              padding: '5px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: '#A1A1AA',
              cursor: 'pointer'
            }}
            title="Close Library"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          style={{
            position: 'absolute',
            top: '54px',
            right: '20px',
            backgroundColor: '#22C55E',
            color: '#111111',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 60,
            border: '1px solid #22C55E'
          }}
        >
          <Check size={14} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. Controls Bar (Search + Language Filters + Topic Filter + Sort) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '12px 16px',
          backgroundColor: '#111111',
          borderBottom: '1px solid #292929',
          flexShrink: 0
        }}
      >
        {/* Row 1: Search & Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#151515',
              border: '1px solid #292929',
              borderRadius: '6px',
              padding: '6px 10px',
              flex: '1 1 0%'
            }}
          >
            <Search size={14} style={{ color: '#71717A' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search solutions by name, problem, code, topic, tags..."
              style={{
                width: '100%',
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#E5E5E5',
                fontSize: '12px'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#71717A',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Topic Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: '#71717A' }}>Topic:</span>
            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              style={{
                backgroundColor: '#151515',
                border: '1px solid #292929',
                borderRadius: '6px',
                color: '#E5E5E5',
                fontSize: '11px',
                padding: '5px 8px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Topics</option>
              {SUGGESTED_TOPICS.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ fontSize: '11px', color: '#71717A' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                backgroundColor: '#151515',
                border: '1px solid #292929',
                borderRadius: '6px',
                color: '#E5E5E5',
                fontSize: '11px',
                padding: '5px 8px',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="recently_updated">Recently Updated</option>
              <option value="recently_created">Recently Created</option>
              <option value="name_asc">Name (A–Z)</option>
              <option value="name_desc">Name (Z–A)</option>
            </select>
          </div>
        </div>

        {/* Row 2: Language Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto' }}>
          <span style={{ fontSize: '11px', color: '#71717A', marginRight: '4px' }}>Language:</span>
          {[
            { id: 'all', label: 'All' },
            { id: 'cpp17', label: 'C++17' },
            { id: 'cpp20', label: 'C++20' },
            { id: 'python3', label: 'Python 3' },
            { id: 'java', label: 'Java 17' }
          ].map(lang => {
            const isSelected = selectedLanguage === lang.id;
            return (
              <button
                key={lang.id}
                onClick={() => setSelectedLanguage(lang.id)}
                className="cfusion-btn"
                style={{
                  padding: '3px 9px',
                  fontSize: '11px',
                  fontWeight: isSelected ? 600 : 500,
                  borderRadius: '5px',
                  backgroundColor: isSelected ? '#1C1C1C' : 'transparent',
                  color: isSelected ? '#F59E0B' : '#A1A1AA',
                  border: isSelected ? '1px solid #F59E0B' : '1px solid #292929',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Solutions List Area */}
      <div
        style={{
          flex: '1 1 0%',
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '160px', color: '#F59E0B' }}>
            <span>Loading library…</span>
          </div>
        ) : solutions.length === 0 ? (
          /* Empty Library State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '240px',
              color: '#71717A',
              gap: '12px',
              textAlign: 'center'
            }}
          >
            <Bookmark size={36} style={{ color: '#292929' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#E5E5E5', marginBottom: '4px' }}>
                No saved solutions yet.
              </div>
              <div style={{ fontSize: '12px', color: '#71717A', maxWidth: '300px' }}>
                Save your solutions from the editor to build your personal competitive programming reference.
              </div>
            </div>
            <button
              onClick={onOpenSaveModal}
              className="cfusion-btn"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#1A1A1A',
                color: '#FFFFFF',
                border: '1px solid #333333',
                cursor: 'pointer'
              }}
            >
              <Plus size={13} style={{ color: '#F59E0B' }} />
              <span>Save Your First Solution</span>
            </button>
          </div>
        ) : filteredSolutions.length === 0 ? (
          /* Search Empty State */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '200px',
              color: '#71717A',
              gap: '8px'
            }}
          >
            <Search size={28} style={{ color: '#292929' }} />
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#A1A1AA' }}>
              No solutions found. Try another search.
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedLanguage('all');
                setSelectedTopic('all');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: '#F59E0B',
                fontSize: '12px',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          /* Solution Cards Grid */
          filteredSolutions.map((sol) => {
            const isDeleting = deleteConfirmId === sol.id;
            const codeLines = (sol.code || '').split('\n').length;
            const tags = Array.isArray(sol.tags) ? sol.tags : [];

            return (
              <div
                key={sol.id}
                style={{
                  backgroundColor: '#111111',
                  border: '1px solid #292929',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'border-color 0.15s ease'
                }}
              >
                {/* Top Row: Solution Name + Badges + Actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ flex: '1 1 0%', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#E5E5E5' }}>
                        {sol.name}
                      </span>

                      {/* Language Badge */}
                      <span
                        style={{
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: '#151515',
                          color: '#F59E0B',
                          border: '1px solid #292929'
                        }}
                      >
                        {sol.languageLabel || getLanguageLabel(sol.language)}
                      </span>

                      {/* Topic Badge */}
                      {sol.topic && (
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: '#151515',
                            color: '#A1A1AA',
                            border: '1px solid #292929'
                          }}
                        >
                          {sol.topic}
                        </span>
                      )}
                    </div>

                    {/* Problem Info */}
                    {(sol.problemName || sol.problemCode) && (
                      <div style={{ fontSize: '11px', color: '#A1A1AA', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {sol.problemCode && (
                          <span style={{ color: '#F59E0B', fontWeight: 600 }}>
                            {sol.problemCode}
                          </span>
                        )}
                        <span>{sol.problemName}</span>
                        {sol.problemUrl && (
                          <a
                            href={sol.problemUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#71717A', display: 'inline-flex', alignItems: 'center' }}
                            title="View Problem on Codeforces"
                          >
                            <ExternalLink size={11} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Action Buttons: Open, Rename, Delete */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    {/* Open Button */}
                    <button
                      onClick={() => handleOpenClick(sol)}
                      className="cfusion-btn"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 600,
                        borderRadius: '5px',
                        backgroundColor: '#151515',
                        color: '#E5E5E5',
                        border: '1px solid #292929',
                        cursor: 'pointer'
                      }}
                      title="Load this code into Monaco editor"
                    >
                      <Play size={10} fill="currentColor" />
                      <span>Open</span>
                    </button>

                    {/* Rename Button */}
                    <button
                      onClick={() => handleStartRename(sol)}
                      className="cfusion-btn"
                      style={{
                        padding: '4px 7px',
                        fontSize: '11px',
                        borderRadius: '5px',
                        backgroundColor: 'transparent',
                        color: '#A1A1AA',
                        border: '1px solid #292929',
                        cursor: 'pointer'
                      }}
                      title="Rename this solution"
                    >
                      <Edit2 size={11} />
                    </button>

                    {/* Delete Button */}
                    <button
                      onClick={() => setDeleteConfirmId(sol.id)}
                      className="cfusion-btn"
                      style={{
                        padding: '4px 7px',
                        fontSize: '11px',
                        borderRadius: '5px',
                        backgroundColor: 'transparent',
                        color: '#EF4444',
                        border: '1px solid #292929',
                        cursor: 'pointer'
                      }}
                      title="Delete this solution from library"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Notes (if present) */}
                {sol.notes && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: '#A1A1AA',
                      backgroundColor: '#0A0A0A',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      border: '1px solid #292929',
                      fontStyle: 'italic',
                      lineHeight: '1.4'
                    }}
                  >
                    {sol.notes}
                  </div>
                )}

                {/* Tags row */}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <Tag size={10} style={{ color: '#71717A' }} />
                    {tags.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          fontSize: '10px',
                          color: '#A1A1AA',
                          backgroundColor: '#151515',
                          border: '1px solid #292929',
                          padding: '1px 5px',
                          borderRadius: '3px'
                        }}
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Card Footer: Metadata */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '10px',
                    color: '#71717A',
                    borderTop: '1px solid #292929',
                    paddingTop: '6px',
                    marginTop: '2px'
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Calendar size={10} />
                    Updated {formatDate(sol.updatedAt || sol.createdAt)}
                  </span>
                  <span>{codeLines} {codeLines === 1 ? 'line' : 'lines'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 4. Rename Modal */}
      {renameTarget && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setRenameTarget(null); }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#111111',
              border: '1px solid #292929',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#E5E5E5' }}>
              Rename Solution
            </div>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => { setRenameValue(e.target.value); setRenameError(''); }}
              autoFocus
              style={{
                width: '100%',
                padding: '6px 10px',
                backgroundColor: '#151515',
                border: '1px solid #292929',
                borderRadius: '6px',
                color: '#E5E5E5',
                fontSize: '12px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            {renameError && (
              <div style={{ color: '#EF4444', fontSize: '11px' }}>{renameError}</div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setRenameTarget(null)}
                className="cfusion-btn"
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  borderRadius: '5px',
                  backgroundColor: 'transparent',
                  color: '#A1A1AA',
                  border: '1px solid #292929',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={executeRename}
                className="cfusion-btn"
                style={{
                  padding: '5px 14px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '5px',
                  backgroundColor: '#1A1A1A',
                  color: '#FFFFFF',
                  border: '1px solid #333333',
                  cursor: 'pointer'
                }}
              >
                Save Name
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Delete Confirmation Modal */}
      {deleteConfirmId && deleteTargetSol && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null); }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '380px',
              backgroundColor: '#111111',
              border: '1px solid #EF4444',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '13px', fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>Confirm Delete</span>
            </div>
            <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: '1.4' }}>
              Are you sure you want to delete <strong style={{ color: '#E5E5E5' }}>"{deleteTargetSol.name}"</strong>? This action cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="cfusion-btn"
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  borderRadius: '5px',
                  backgroundColor: 'transparent',
                  color: '#A1A1AA',
                  border: '1px solid #292929',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeDelete(deleteConfirmId)}
                className="cfusion-btn"
                style={{
                  padding: '5px 14px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '5px',
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: '1px solid #EF4444',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. Open Confirmation Modal (if editor has unsaved changes) */}
      {openConfirmTarget && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(2px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpenConfirmTarget(null); }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '400px',
              backgroundColor: '#111111',
              border: '1px solid #292929',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#F59E0B', fontSize: '13px', fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>Replace Current Editor Code?</span>
            </div>
            <div style={{ fontSize: '12px', color: '#A1A1AA', lineHeight: '1.4' }}>
              Your current editor contains code. Opening <strong style={{ color: '#E5E5E5' }}>"{openConfirmTarget.name}"</strong> will replace the code currently in Monaco.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setOpenConfirmTarget(null)}
                className="cfusion-btn"
                style={{
                  padding: '5px 12px',
                  fontSize: '11px',
                  borderRadius: '5px',
                  backgroundColor: 'transparent',
                  color: '#A1A1AA',
                  border: '1px solid #292929',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => executeOpen(openConfirmTarget)}
                className="cfusion-btn"
                style={{
                  padding: '5px 14px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '5px',
                  backgroundColor: '#1A1A1A',
                  color: '#FFFFFF',
                  border: '1px solid #333333',
                  cursor: 'pointer'
                }}
              >
                Replace and Open
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
