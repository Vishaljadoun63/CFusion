/**
 * CFusion - Background Service Worker (Manifest V3)
 * Manages extension lifecycle, default preferences, and cross-context events.
 */

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[CFusion] Extension installed/updated. Reason:', details.reason);

  // Initialize default user settings in Chrome Storage
  const defaultSettings = {
    cfusion_enabled: true,
    theme: 'dark',
    auto_mount_editor: true,
    font_size: 14,
    preferred_language: 'cpp17'
  };

  const stored = await chrome.storage.local.get(Object.keys(defaultSettings));
  const toUpdate = {};
  for (const [key, val] of Object.entries(defaultSettings)) {
    if (stored[key] === undefined) {
      toUpdate[key] = val;
    }
  }

  if (Object.keys(toUpdate).length > 0) {
    await chrome.storage.local.set(toUpdate);
    console.log('[CFusion] Default settings initialized:', toUpdate);
  }
});

// Message listener — PING health check + EXECUTE_CODE proxy
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
    return true;
  }

  if (request.action === 'EXECUTE_CODE') {
    handleExecuteCode(request.payload, sendResponse);
    // Return true so the channel stays open while the async handler runs
    return true;
  }
});

/**
 * Proxy a code execution request to the local Judge0 backend.
 * Validates payload, fetches with timeout, parses response, and
 * calls sendResponse exactly once with a normalized result object.
 *
 * @param {object} payload - { languageId, sourceCode, stdin }
 * @param {function} sendResponse - Chrome runtime sendResponse callback
 */
async function handleExecuteCode(payload, sendResponse) {
  const BACKEND_URL = 'http://127.0.0.1:3001/api/execute';
  const TIMEOUT_MS = 25000; // 25s — matches server polling ceiling

  // --- Validation ---
  if (!payload || typeof payload !== 'object') {
    sendResponse({
      success: false,
      status: 'error',
      statusDescription: 'Invalid request: missing payload.',
      stdout: '',
      stderr: 'Background worker received an invalid EXECUTE_CODE payload.'
    });
    return;
  }

  const { languageId, sourceCode, stdin } = payload;

  if (!languageId || typeof languageId !== 'string') {
    sendResponse({
      success: false,
      status: 'error',
      statusDescription: 'Invalid request: languageId is required.',
      stdout: '',
      stderr: 'languageId must be a non-empty string (e.g., "cpp17", "python3").'
    });
    return;
  }

  if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
    sendResponse({
      success: false,
      status: 'error',
      statusDescription: 'Invalid request: sourceCode is empty.',
      stdout: '',
      stderr: 'Cannot execute an empty program.'
    });
    return;
  }

  // --- Fetch with timeout ---
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        languageId,
        sourceCode,
        stdin: typeof stdin === 'string' ? stdin : ''
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // --- HTTP-level errors ---
    if (!response.ok) {
      let errorBody = { error: `HTTP ${response.status}` };
      try { errorBody = await response.json(); } catch (_) { /* ignore */ }
      sendResponse({
        success: false,
        status: 'error',
        statusDescription: `Execution server error (${response.status})`,
        stdout: '',
        stderr: errorBody.error || `HTTP ${response.status}: ${response.statusText}`
      });
      return;
    }

    // --- Parse JSON ---
    let result;
    try {
      result = await response.json();
    } catch (_) {
      sendResponse({
        success: false,
        status: 'error',
        statusDescription: 'Invalid response from execution server.',
        stdout: '',
        stderr: 'The backend returned a non-JSON response.'
      });
      return;
    }

    // Pass the backend's normalized result through directly
    sendResponse(result);

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      sendResponse({
        success: false,
        status: 'error',
        statusDescription: 'Execution timed out.',
        stdout: '',
        stderr: 'The request to the execution server timed out after 25 seconds.'
      });
    } else {
      // Network error — server is likely not running
      sendResponse({
        success: false,
        status: 'error',
        statusDescription: 'Execution server unavailable.',
        stdout: '',
        stderr: 'Could not connect to the CFusion execution server at http://127.0.0.1:3001.\n\nPlease start the server with:\n  node server/server.js\nfrom the C:\\CFusion directory.'
      });
    }
  }
}

