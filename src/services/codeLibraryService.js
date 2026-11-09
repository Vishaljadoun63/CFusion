/**
 * CFusion - Personal Code Library Service (Phase 6)
 * Local-first storage service for saving, organizing, searching,
 * opening, renaming, and deleting competitive programming solutions.
 */

export const STORAGE_KEY = 'cfusion_saved_code_library';

export const SUGGESTED_TOPICS = [
  'Arrays',
  'Strings',
  'Binary Search',
  'Dynamic Programming',
  'Graphs',
  'Trees',
  'Greedy',
  'Math',
  'Number Theory',
  'Sorting',
  'Recursion',
  'Backtracking',
  'Other'
];

/**
 * Maps language ID to human-readable label
 */
export function getLanguageLabel(langId) {
  switch (langId) {
    case 'cpp17':
      return 'C++17';
    case 'cpp20':
      return 'C++20';
    case 'python3':
      return 'Python 3';
    case 'java':
    case 'java17':
      return 'Java 17';
    default:
      return langId ? String(langId).toUpperCase() : 'C++17';
  }
}

/**
 * Safely read raw library array from chrome.storage.local or localStorage
 */
async function getRawLibrary() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const res = await chrome.storage.local.get(STORAGE_KEY);
      if (res && Array.isArray(res[STORAGE_KEY])) {
        return res[STORAGE_KEY];
      }
    } catch (err) {
      console.warn('[CFusion CodeLibrary] chrome.storage.local read error:', err);
    }
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[CFusion CodeLibrary] localStorage read error:', err);
  }

  return [];
}

/**
 * Safely persist raw library array to chrome.storage.local and localStorage
 */
async function setRawLibrary(libraryArray) {
  if (!Array.isArray(libraryArray)) {
    throw new Error('Library must be an array.');
  }

  let chromeSuccess = false;
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: libraryArray });
      chromeSuccess = true;
    } catch (err) {
      console.error('[CFusion CodeLibrary] chrome.storage.local set error:', err);
      if (err?.message && err.message.toLowerCase().includes('quota')) {
        return {
          success: false,
          error: 'quota_exceeded',
          message: 'Storage quota exceeded. Please delete some solutions to free up space.'
        };
      }
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(libraryArray));
    return { success: true };
  } catch (err) {
    console.error('[CFusion CodeLibrary] localStorage set error:', err);
    if (!chromeSuccess) {
      return {
        success: false,
        error: 'storage_error',
        message: err.message || 'Failed to save code to local storage.'
      };
    }
    return { success: true };
  }
}

/**
 * Retrieve all saved solutions sorted by recently updated
 */
export async function getAllSavedCodes() {
  const list = await getRawLibrary();
  return list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

/**
 * Retrieve a specific saved solution by its unique ID
 */
export async function getSavedCodeById(id) {
  if (!id) return null;
  const list = await getRawLibrary();
  return list.find(item => item.id === id) || null;
}

/**
 * Normalize tags array from array or comma-separated string
 */
function normalizeTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map(t => String(t).trim()).filter(Boolean);
  }
  if (typeof tags === 'string') {
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  }
  return [];
}

/**
 * Save a new solution to the personal code library
 *
 * @param {object} codeData
 * @param {string} codeData.name - Required
 * @param {string} codeData.code - Required
 * @param {string} [codeData.language='cpp17']
 * @param {string} [codeData.problemName='']
 * @param {string} [codeData.problemCode='']
 * @param {string} [codeData.problemUrl='']
 * @param {string} [codeData.platform='Codeforces']
 * @param {string} [codeData.topic='Other']
 * @param {Array<string>|string} [codeData.tags=[]]
 * @param {string} [codeData.notes='']
 * @param {boolean} [codeData.overwrite=false]
 * @returns {Promise<{ success: boolean, solution?: object, error?: string, message?: string }>}
 */
export async function saveCode(codeData) {
  if (!codeData || typeof codeData !== 'object') {
    return { success: false, error: 'invalid_data', message: 'Solution data must be an object.' };
  }

  const name = typeof codeData.name === 'string' ? codeData.name.trim() : '';
  if (!name) {
    return { success: false, error: 'empty_name', message: 'Solution name is required.' };
  }

  const code = typeof codeData.code === 'string' ? codeData.code : '';
  if (!code || !code.trim()) {
    return { success: false, error: 'empty_code', message: 'Source code cannot be empty.' };
  }

  const currentList = await getRawLibrary();

  // Check for duplicate name
  const existingWithSameName = currentList.find(
    item => item.name.trim().toLowerCase() === name.toLowerCase()
  );

  if (existingWithSameName && !codeData.overwrite) {
    return {
      success: false,
      error: 'duplicate_name',
      message: `A solution named "${name}" already exists in your library.`,
      existingSolution: existingWithSameName
    };
  }

  const now = Date.now();
  const language = codeData.language || 'cpp17';
  const languageLabel = codeData.languageLabel || getLanguageLabel(language);

  // If overwriting existing entry with same name
  if (existingWithSameName && codeData.overwrite) {
    const updatedSolution = {
      ...existingWithSameName,
      name,
      code,
      language,
      languageLabel,
      problemName: codeData.problemName || existingWithSameName.problemName || '',
      problemCode: codeData.problemCode || existingWithSameName.problemCode || '',
      problemUrl: codeData.problemUrl || existingWithSameName.problemUrl || '',
      platform: codeData.platform || existingWithSameName.platform || 'Codeforces',
      topic: codeData.topic || existingWithSameName.topic || 'Other',
      tags: normalizeTags(codeData.tags !== undefined ? codeData.tags : existingWithSameName.tags),
      notes: codeData.notes !== undefined ? codeData.notes : (existingWithSameName.notes || ''),
      updatedAt: now
    };

    const nextList = currentList.map(item => item.id === existingWithSameName.id ? updatedSolution : item);
    const saveRes = await setRawLibrary(nextList);
    if (!saveRes.success) return saveRes;

    return { success: true, solution: updatedSolution, updated: true };
  }

  // Create new unique solution entry
  const newSolution = {
    id: `sol_${now}_${Math.random().toString(36).substring(2, 9)}`,
    name,
    code,
    language,
    languageLabel,
    problemName: codeData.problemName || '',
    problemCode: codeData.problemCode || '',
    problemUrl: codeData.problemUrl || '',
    platform: codeData.platform || 'Codeforces',
    topic: codeData.topic || 'Other',
    tags: normalizeTags(codeData.tags),
    notes: typeof codeData.notes === 'string' ? codeData.notes : '',
    createdAt: now,
    updatedAt: now
  };

  const nextList = [newSolution, ...currentList];
  const saveRes = await setRawLibrary(nextList);
  if (!saveRes.success) return saveRes;

  return { success: true, solution: newSolution, updated: false };
}

/**
 * Update an existing saved solution by ID
 */
export async function updateSavedCode(id, updates) {
  if (!id) {
    return { success: false, error: 'invalid_id', message: 'Solution ID is required.' };
  }
  if (!updates || typeof updates !== 'object') {
    return { success: false, error: 'invalid_updates', message: 'Updates must be an object.' };
  }

  const currentList = await getRawLibrary();
  const index = currentList.findIndex(item => item.id === id);
  if (index === -1) {
    return { success: false, error: 'not_found', message: 'Solution not found.' };
  }

  const existing = currentList[index];

  if (updates.name !== undefined) {
    const trimmed = String(updates.name).trim();
    if (!trimmed) {
      return { success: false, error: 'empty_name', message: 'Solution name cannot be empty.' };
    }
    // Check if new name collides with another solution
    const collision = currentList.find(
      item => item.id !== id && item.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (collision) {
      return {
        success: false,
        error: 'duplicate_name',
        message: `Another solution named "${trimmed}" already exists.`
      };
    }
  }

  if (updates.code !== undefined) {
    if (!updates.code || !String(updates.code).trim()) {
      return { success: false, error: 'empty_code', message: 'Source code cannot be empty.' };
    }
  }

  const language = updates.language !== undefined ? updates.language : existing.language;
  const languageLabel = updates.language !== undefined
    ? (updates.languageLabel || getLanguageLabel(updates.language))
    : existing.languageLabel;

  const updatedSolution = {
    ...existing,
    ...updates,
    id: existing.id, // Preserve ID
    createdAt: existing.createdAt, // Preserve creation timestamp
    language,
    languageLabel,
    tags: updates.tags !== undefined ? normalizeTags(updates.tags) : existing.tags,
    updatedAt: Date.now()
  };

  currentList[index] = updatedSolution;
  const saveRes = await setRawLibrary(currentList);
  if (!saveRes.success) return saveRes;

  return { success: true, solution: updatedSolution };
}

/**
 * Rename a saved solution
 */
export async function renameSavedCode(id, newName) {
  if (!newName || !String(newName).trim()) {
    return { success: false, error: 'empty_name', message: 'Solution name cannot be empty.' };
  }
  return updateSavedCode(id, { name: String(newName).trim() });
}

/**
 * Delete a saved solution by ID
 */
export async function deleteSavedCode(id) {
  if (!id) {
    return { success: false, error: 'invalid_id', message: 'Solution ID is required.' };
  }

  const currentList = await getRawLibrary();
  const exists = currentList.some(item => item.id === id);
  if (!exists) {
    return { success: false, error: 'not_found', message: 'Solution not found.' };
  }

  const filtered = currentList.filter(item => item.id !== id);
  const saveRes = await setRawLibrary(filtered);
  if (!saveRes.success) return saveRes;

  return { success: true };
}

/**
 * Search saved solutions by query (case-insensitive across name, problem, code, topic, tags, notes)
 */
export function searchSavedCodes(query, codes = []) {
  if (!query || !String(query).trim()) {
    return codes;
  }

  const tokens = String(query).toLowerCase().trim().split(/\s+/).filter(Boolean);

  return codes.filter(sol => {
    const name = (sol.name || '').toLowerCase();
    const probName = (sol.problemName || '').toLowerCase();
    const probCode = (sol.problemCode || '').toLowerCase();
    const topic = (sol.topic || '').toLowerCase();
    const lang = (sol.language || '').toLowerCase();
    const langLabel = (sol.languageLabel || '').toLowerCase();
    const notes = (sol.notes || '').toLowerCase();
    const tags = Array.isArray(sol.tags) ? sol.tags.map(t => String(t).toLowerCase()).join(' ') : '';

    const haystack = `${name} ${probName} ${probCode} ${topic} ${lang} ${langLabel} ${tags} ${notes}`;
    return tokens.every(token => haystack.includes(token));
  });
}

/**
 * Filter saved solutions by programming language
 */
export function getSavedCodesByLanguage(language, codes = []) {
  if (!language || language === 'all') {
    return codes;
  }
  const target = String(language).toLowerCase();
  return codes.filter(sol => {
    if ((sol.language || '').toLowerCase() === target) return true;
    if (target === 'cpp' && (sol.language === 'cpp17' || sol.language === 'cpp20')) return true;
    if (target === 'java17' && sol.language === 'java') return true;
    if (target === 'java' && sol.language === 'java17') return true;
    return false;
  });
}

/**
 * Filter saved solutions by topic
 */
export function getSavedCodesByTopic(topic, codes = []) {
  if (!topic || topic === 'all') {
    return codes;
  }
  const target = String(topic).toLowerCase();
  return codes.filter(sol => (sol.topic || '').toLowerCase() === target);
}

/**
 * Sort saved solutions by criterion
 *
 * @param {Array<object>} codes
 * @param {'recently_updated'|'recently_created'|'name_asc'|'name_desc'} [sortBy='recently_updated']
 */
export function sortSavedCodes(codes = [], sortBy = 'recently_updated') {
  const cloned = [...codes];
  switch (sortBy) {
    case 'recently_created':
      return cloned.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    case 'name_asc':
      return cloned.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    case 'name_desc':
      return cloned.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    case 'recently_updated':
    default:
      return cloned.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }
}
