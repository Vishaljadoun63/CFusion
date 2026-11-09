/**
 * CFusion - Test Case Parser & Model
 * Extracts sample test cases from Codeforces problem statement DOM
 * and provides test-case factory utilities.
 */

const MAX_TEXT_LENGTH = 128 * 1024; // 128 KB limit per field

/**
 * Creates a normalized test-case object
 *
 * @param {object} options
 * @param {string} [options.id]
 * @param {string} [options.name]
 * @param {string} [options.input]
 * @param {string} [options.expectedOutput]
 * @param {boolean} [options.isSample]
 * @returns {object} Normalized test-case entity
 */
export function createTestCase({
  id = null,
  name = 'Custom 1',
  input = '',
  expectedOutput = '',
  isSample = false
} = {}) {
  const safeInput = typeof input === 'string' ? input : '';
  const safeExpected = typeof expectedOutput === 'string' ? expectedOutput : '';

  return {
    id: id || `tc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    name: name || 'Test Case',
    input: safeInput,
    expectedOutput: safeExpected,
    isSample: Boolean(isSample),
    result: {
      status: 'idle',
      statusDescription: '',
      actualOutput: '',
      stderr: '',
      compile_output: '',
      time: null,
      memory: null,
      executedAt: null
    }
  };
}

/**
 * Safely extracts text content from a Codeforces <pre> block,
 * preserving line breaks and meaningful leading/trailing whitespace
 * while stripping only HTML structural newlines.
 *
 * @param {HTMLElement|null} preEl
 * @returns {string}
 */
export function extractPreText(preEl) {
  if (!preEl) return '';

  let text = '';
  // Codeforces sample pre blocks can contain separate child <div> nodes for each line
  const childDivs = Array.from(preEl.children).filter(el => el.tagName && el.tagName.toLowerCase() === 'div');
  if (childDivs.length > 0) {
    text = childDivs.map(d => d.textContent || '').join('\n');
  } else {
    try {
      const clone = preEl.cloneNode(true);
      // Remove any injected buttons
      const copyBtns = clone.querySelectorAll('.cfusion-copy-btn');
      copyBtns.forEach(btn => btn.remove());
      const brs = clone.querySelectorAll('br');
      brs.forEach(br => br.replaceWith('\n'));
      text = clone.textContent || '';
    } catch {
      text = preEl.textContent || '';
    }
  }

  // Normalize Windows CRLF to standard LF
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip single outer structural newlines
  if (text.startsWith('\n')) text = text.slice(1);
  if (text.endsWith('\n')) text = text.slice(0, -1);

  return text;
}

/**
 * Extracts all paired sample test cases (.input pre and .output pre)
 * from a Codeforces problem statement DOM without mutating the DOM.
 *
 * @param {Document|HTMLElement} [container=document]
 * @returns {Array<object>} Array of parsed test-case objects
 */
export function extractSampleTestCases(container = (typeof document !== 'undefined' ? document : null)) {
  if (!container || typeof container.querySelector !== 'function') {
    return [];
  }

  try {
    // Search in container, or fallback to document if container does not have the samples
    let inputBlocks = container.querySelectorAll('.sample-test .input pre, .sample-tests .input pre');
    let outputBlocks = container.querySelectorAll('.sample-test .output pre, .sample-tests .output pre');

    if ((inputBlocks.length === 0 || outputBlocks.length === 0) && typeof document !== 'undefined' && container !== document) {
      inputBlocks = document.querySelectorAll('.sample-test .input pre, .sample-tests .input pre, #cfusion-left-pane .input pre');
      outputBlocks = document.querySelectorAll('.sample-test .output pre, .sample-tests .output pre, #cfusion-left-pane .output pre');
    }

    const totalSamples = Math.max(inputBlocks.length, outputBlocks.length);
    if (totalSamples === 0) {
      return [];
    }

    const testCases = [];
    for (let i = 0; i < totalSamples; i++) {
      const inputPre = inputBlocks[i] || null;
      const outputPre = outputBlocks[i] || null;

      const input = extractPreText(inputPre);
      const expectedOutput = extractPreText(outputPre);

      testCases.push(
        createTestCase({
          id: `sample_${i + 1}`,
          name: `Sample ${i + 1}`,
          input,
          expectedOutput,
          isSample: true
        })
      );
    }

    return testCases;
  } catch (err) {
    console.warn('[CFusion Parser] Error extracting sample test cases:', err);
    return [];
  }
}
