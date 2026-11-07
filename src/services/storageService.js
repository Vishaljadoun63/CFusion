/**
 * CFusion - Storage Service
 * Handles problem-specific code persistence and user preferences via Chrome Storage API
 */

function getStorageKey(contestId, problemIndex, langId) {
  const cId = contestId || 'global';
  const pIdx = problemIndex || 'main';
  return `cfusion_code_${cId}_${pIdx}_${langId}`;
}

/**
 * Save code for a specific problem and language
 */
export async function saveProblemCode(contestId, problemIndex, langId, code) {
  const key = getStorageKey(contestId, problemIndex, langId);

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set({ [key]: code });
      return true;
    } catch (err) {
      console.warn('[CFusion Storage] chrome.storage.local failed, falling back to localStorage', err);
    }
  }

  try {
    localStorage.setItem(key, code);
    return true;
  } catch (err) {
    console.error('[CFusion Storage] Failed to persist code:', err);
    return false;
  }
}

/**
 * Load saved code for a specific problem and language
 */
export async function loadProblemCode(contestId, problemIndex, langId) {
  const key = getStorageKey(contestId, problemIndex, langId);

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const result = await chrome.storage.local.get(key);
      if (result && result[key] !== undefined) {
        return result[key];
      }
    } catch (err) {
      console.warn('[CFusion Storage] chrome.storage.local read error:', err);
    }
  }

  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.error('[CFusion Storage] Failed to read from localStorage:', err);
    return null;
  }
}

/**
 * Save user's preferred programming language
 */
export async function savePreferredLanguage(langId) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set({ cfusion_pref_language: langId });
      return;
    } catch (err) {
      console.warn(err);
    }
  }
  localStorage.setItem('cfusion_pref_language', langId);
}

/**
 * Load user's preferred programming language (defaults to cpp17)
 */
export async function loadPreferredLanguage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const res = await chrome.storage.local.get('cfusion_pref_language');
      if (res && res.cfusion_pref_language) {
        return res.cfusion_pref_language;
      }
    } catch (err) {
      console.warn(err);
    }
  }
  return localStorage.getItem('cfusion_pref_language') || 'cpp17';
}
