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

// ---------------------------------------------------------------------------
// Test Cases Storage Management (Phase 5)
// ---------------------------------------------------------------------------

const MAX_TEXT_LENGTH = 128 * 1024; // 128 KB limit per field

function getTestCasesStorageKey(contestId, problemIndex) {
  const cId = contestId || 'global';
  const pIdx = problemIndex || 'main';
  return `cfusion_testcases_${cId}_${pIdx}`;
}

/**
 * Validate a test case against size limits.
 * Rejects oversized inputs/outputs with an actionable message instead of silent truncation.
 *
 * @param {object} tc
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateTestCase(tc) {
  if (!tc || typeof tc !== 'object') {
    return { valid: false, error: 'Test case data must be an object.' };
  }
  if (typeof tc.input === 'string' && tc.input.length > MAX_TEXT_LENGTH) {
    const sizeKb = Math.round(tc.input.length / 1024);
    return {
      valid: false,
      error: `Input for "${tc.name || 'Test Case'}" (${sizeKb} KB) exceeds the maximum allowed size of 128 KB.`
    };
  }
  if (typeof tc.expectedOutput === 'string' && tc.expectedOutput.length > MAX_TEXT_LENGTH) {
    const sizeKb = Math.round(tc.expectedOutput.length / 1024);
    return {
      valid: false,
      error: `Expected output for "${tc.name || 'Test Case'}" (${sizeKb} KB) exceeds the maximum allowed size of 128 KB.`
    };
  }
  return { valid: true };
}

/**
 * Sanitize test case objects before storage (without silent truncation)
 */
function sanitizeTestCase(tc, index) {
  if (!tc || typeof tc !== 'object') return null;

  const id = typeof tc.id === 'string' && tc.id.trim()
    ? tc.id.trim()
    : `tc_${Date.now()}_${index}`;
  const name = typeof tc.name === 'string' && tc.name.trim()
    ? tc.name.trim()
    : `Case ${index + 1}`;
  const input = typeof tc.input === 'string' ? tc.input : '';
  const expectedOutput = typeof tc.expectedOutput === 'string' ? tc.expectedOutput : '';
  const isSample = Boolean(tc.isSample);

  return {
    id,
    name,
    input,
    expectedOutput,
    isSample,
    result: {
      testCaseId: tc.result?.testCaseId || id,
      inputSnapshot: typeof tc.result?.inputSnapshot === 'string' ? tc.result.inputSnapshot : input,
      expectedOutputSnapshot: typeof tc.result?.expectedOutputSnapshot === 'string' ? tc.result.expectedOutputSnapshot : expectedOutput,
      actualOutput: typeof tc.result?.actualOutput === 'string'
        ? tc.result.actualOutput
        : (typeof tc.result?.stdout === 'string' ? tc.result.stdout : ''),
      stdout: typeof tc.result?.actualOutput === 'string'
        ? tc.result.actualOutput
        : (typeof tc.result?.stdout === 'string' ? tc.result.stdout : ''),
      status: tc.result?.status || 'idle',
      statusDescription: tc.result?.statusDescription || '',
      stderr: typeof tc.result?.stderr === 'string' ? tc.result.stderr.slice(0, 32768) : '',
      compile_output: typeof tc.result?.compile_output === 'string' ? tc.result.compile_output.slice(0, 32768) : '',
      time: tc.result?.time || null,
      memory: tc.result?.memory || null,
      executedAt: tc.result?.executedAt || null
    }
  };
}

/**
 * Load saved test cases for a specific problem.
 * Returns an array of validated test cases or empty array.
 *
 * @param {string} contestId
 * @param {string} problemIndex
 * @returns {Promise<Array<object>>}
 */
export async function getTestCases(contestId, problemIndex) {
  const key = getTestCasesStorageKey(contestId, problemIndex);

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      const result = await chrome.storage.local.get(key);
      if (result && Array.isArray(result[key])) {
        return result[key];
      }
    } catch (err) {
      console.warn('[CFusion Storage] chrome.storage.local read error for testcases:', err);
    }
  }

  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[CFusion Storage] Failed to read testcases from localStorage:', err);
  }

  return [];
}

/**
 * Save test cases for a specific problem.
 * Validates against size limits (rejects >128KB with error), handles chrome.storage.local with localStorage fallback.
 *
 * @param {string} contestId
 * @param {string} problemIndex
 * @param {Array<object>} testCases
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function saveTestCases(contestId, problemIndex, testCases) {
  if (!Array.isArray(testCases)) {
    console.warn('[CFusion Storage] saveTestCases expected an array, received:', typeof testCases);
    return { success: false, error: 'Test cases must be an array.' };
  }

  // Validate all test cases first — reject oversized data cleanly
  for (let i = 0; i < testCases.length; i++) {
    const val = validateTestCase(testCases[i]);
    if (!val.valid) {
      console.warn('[CFusion Storage] Test case validation rejected:', val.error);
      return { success: false, error: val.error };
    }
  }

  const sanitized = testCases
    .map((tc, idx) => sanitizeTestCase(tc, idx))
    .filter(Boolean);

  const key = getTestCasesStorageKey(contestId, problemIndex);

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    try {
      await chrome.storage.local.set({ [key]: sanitized });
      return { success: true };
    } catch (err) {
      console.warn('[CFusion Storage] chrome.storage.local set failed for testcases, falling back to localStorage', err);
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(sanitized));
    return { success: true };
  } catch (err) {
    console.error('[CFusion Storage] Failed to persist testcases to localStorage:', err);
    return { success: false, error: err.message || 'Storage write failed.' };
  }
}


/**
 * Delete a specific test case by its unique ID for a problem.
 *
 * @param {string} contestId
 * @param {string} problemIndex
 * @param {string} testCaseId
 * @returns {Promise<boolean>}
 */
export async function deleteTestCase(contestId, problemIndex, testCaseId) {
  if (!testCaseId) return false;
  const current = await getTestCases(contestId, problemIndex);
  const filtered = current.filter(tc => tc.id !== testCaseId);
  return saveTestCases(contestId, problemIndex, filtered);
}
