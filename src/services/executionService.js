/**
 * CFusion - Execution Service
 * Client-side bridge between React components and the background service worker
 * that proxies code execution requests to the local Judge0 backend.
 *
 * Keep this module independent of React — it can be imported by any JS/JSX file.
 */

/** CFusion language IDs that are accepted by the backend */
const SUPPORTED_LANGUAGE_IDS = ['cpp17', 'cpp20', 'python3', 'java'];

/**
 * Run source code against the Judge0 backend via the background service worker.
 *
 * @param {string} languageId  - CFusion language ID (e.g. "cpp17", "python3")
 * @param {string} sourceCode  - Full source code to compile and execute
 * @param {string} [stdin]     - Optional standard input string
 * @returns {Promise<object>}  - Normalized execution result:
 *   {
 *     success: boolean,
 *     status: 'success'|'compilation_error'|'runtime_error'|'time_limit'|'error',
 *     statusDescription: string,
 *     stdout: string,
 *     stderr: string,
 *     compile_output: string,
 *     time: string|null,
 *     memory: string|null
 *   }
 */
export async function runCode(languageId, sourceCode, stdin = '') {
  // --- Argument validation ---
  if (!languageId || typeof languageId !== 'string') {
    return makeError('Invalid languageId: must be a non-empty string.');
  }

  if (!SUPPORTED_LANGUAGE_IDS.includes(languageId)) {
    return makeError(
      `Unsupported language: "${languageId}".\nSupported: ${SUPPORTED_LANGUAGE_IDS.join(', ')}.`
    );
  }

  if (typeof sourceCode !== 'string' || sourceCode.trim().length === 0) {
    return makeError('Source code cannot be empty.');
  }

  // --- Chrome runtime availability guard ---
  if (
    typeof chrome === 'undefined' ||
    !chrome.runtime ||
    !chrome.runtime.sendMessage
  ) {
    return makeError(
      'Chrome extension runtime is not available.\n' +
      'This feature requires the CFusion extension to be active.'
    );
  }

  // --- Dispatch to background service worker ---
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        {
          action: 'EXECUTE_CODE',
          payload: {
            languageId,
            sourceCode,
            stdin: typeof stdin === 'string' ? stdin : ''
          }
        },
        (response) => {
          // Handle Chrome messaging errors (e.g., service worker crashed)
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message || 'Unknown messaging error.';
            console.error('[CFusion ExecutionService] Runtime messaging error:', msg);
            resolve(
              makeError(
                `Could not reach the CFusion background worker.\n${msg}\n\n` +
                'Try reloading the extension from chrome://extensions/'
              )
            );
            return;
          }

          // Guard against null/undefined response
          if (!response || typeof response !== 'object') {
            resolve(makeError('Background worker returned an unexpected empty response.'));
            return;
          }

          resolve(response);
        }
      );
    } catch (err) {
      // Synchronous throw from sendMessage (very rare — isolated world teardown, etc.)
      console.error('[CFusion ExecutionService] sendMessage threw synchronously:', err);
      resolve(makeError(`Execution dispatch failed: ${err.message || String(err)}`));
    }
  });
}

/**
 * Build a normalized error response for client-side failures
 * (before the request even reaches the backend).
 *
 * @param {string} errorMessage - Developer-friendly error description
 * @returns {object} Normalized error result
 */
function makeError(errorMessage) {
  return {
    success: false,
    status: 'error',
    statusDescription: 'Execution Error',
    stdout: '',
    stderr: errorMessage,
    compile_output: '',
    time: null,
    memory: null
  };
}
