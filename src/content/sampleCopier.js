/**
 * CFusion - Sample Test Copier
 * Enhances Codeforces sample test cases with one-click copy buttons
 */

export function enhanceSampleTests(container = document) {
  const sampleBlocks = container.querySelectorAll('.sample-test .input, .sample-test .output');

  sampleBlocks.forEach((block) => {
    const titleEl = block.querySelector('.title');
    const preEl = block.querySelector('pre');

    if (!titleEl || !preEl) return;
    if (titleEl.querySelector('.cfusion-copy-btn')) return; // already added

    const copyBtn = document.createElement('button');
    copyBtn.className = 'cfusion-copy-btn';
    copyBtn.type = 'button';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
      </svg>
      <span>Copy</span>
    `;

    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();

      let textToCopy = '';
      // Codeforces sample pre blocks can contain multiple div child elements or plain text
      const divs = preEl.querySelectorAll('div');
      if (divs.length > 0) {
        textToCopy = Array.from(divs).map(d => d.textContent).join('\n');
      } else {
        textToCopy = preEl.textContent || '';
      }

      try {
        await navigator.clipboard.writeText(textToCopy.trim());
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Copied!</span>
        `;
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect width="14" height="14" x="8" y="8" rx="2" ry="2"/>
              <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
            </svg>
            <span>Copy</span>
          `;
        }, 2000);
      } catch (err) {
        console.error('[CFusion] Failed to copy sample test:', err);
      }
    });

    titleEl.appendChild(copyBtn);
  });
}
