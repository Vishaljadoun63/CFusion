/**
 * CFusion - Problem Layout Engine
 * Converts Codeforces problem page into a modern split-screen workspace
 */

import { enhanceSampleTests } from './sampleCopier';

let origProblemMarker = null;
let origSidebarMarker = null;
let workspaceMounted = false;

// Default code templates for Phase 2 placeholder editor
const CODE_TEMPLATES = {
  cpp17: `#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

void solve() {
    int w;
    if (!(cin >> w)) return;
    
    // CF 4A - Watermelon logic
    if (w > 2 && w % 2 == 0) {
        cout << "YES\\n";
    } else {
        cout << "NO\\n";
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    solve();
    return 0;
}`,
  cpp20: `#include <iostream>
#include <vector>
#include <span>
#include <ranges>

using namespace std;

void solve() {
    int w;
    if (!(cin >> w)) return;

    if (w > 2 && w % 2 == 0) {
        cout << "YES\\n";
    } else {
        cout << "NO\\n";
    }
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    solve();
    return 0;
}`,
  python3: `import sys

def solve():
    input_data = sys.stdin.read().split()
    if not input_data:
        return
    
    w = int(input_data[0])
    if w > 2 and w % 2 == 0:
        print("YES")
    else:
        print("NO")

if __name__ == '__main__':
    solve()
`,
  java: `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        if (scanner.hasNextInt()) {
            int w = scanner.nextInt();
            if (w > 2 && w % 2 == 0) {
                System.out.println("YES");
            } else {
                System.out.println("NO");
            }
        }
    }
}
`
};

/**
 * Extract problem metadata from DOM
 */
function extractProblemMetadata(problemStatement) {
  const titleEl = problemStatement.querySelector('.header .title');
  const timeLimitEl = problemStatement.querySelector('.header .time-limit');
  const memoryLimitEl = problemStatement.querySelector('.header .memory-limit');

  const title = titleEl ? titleEl.textContent.trim() : 'Problem';
  const timeLimit = timeLimitEl ? timeLimitEl.textContent.replace('time limit per test', '').trim() : '1.0s';
  const memoryLimit = memoryLimitEl ? memoryLimitEl.textContent.replace('memory limit per test', '').trim() : '256MB';

  // Extract first sample input for convenience
  const firstSampleInputPre = problemStatement.querySelector('.sample-test .input pre');
  let sampleInput = '8';
  if (firstSampleInputPre) {
    const divs = firstSampleInputPre.querySelectorAll('div');
    if (divs.length > 0) {
      sampleInput = Array.from(divs).map(d => d.textContent).join('\n').trim();
    } else {
      sampleInput = firstSampleInputPre.textContent.trim();
    }
  }

  // Extract problem tags from sidebar if available
  const tags = [];
  const tagNodes = document.querySelectorAll('.tag-box');
  tagNodes.forEach(tag => {
    const text = tag.textContent.trim();
    if (text) tags.push(text);
  });

  return { title, timeLimit, memoryLimit, sampleInput, tags };
}

/**
 * Initialize the Modern Split-Screen Problem Workspace
 */
export function initProblemWorkspace(context) {
  if (workspaceMounted) return;

  const problemStatement = document.querySelector('.problem-statement');
  if (!problemStatement) {
    // Retry if DOM is still populating
    setTimeout(() => initProblemWorkspace(context), 150);
    return;
  }

  const sidebar = document.querySelector('#sidebar');
  const meta = extractProblemMetadata(problemStatement);

  // Preserve original positions with markers so we can revert cleanly
  origProblemMarker = document.createComment('cfusion-problem-marker');
  problemStatement.parentNode.insertBefore(origProblemMarker, problemStatement);

  if (sidebar) {
    origSidebarMarker = document.createComment('cfusion-sidebar-marker');
    sidebar.parentNode.insertBefore(origSidebarMarker, sidebar);
  }

  document.body.classList.add('cfusion-workspace-active');

  // Build Workspace Container
  const workspace = document.createElement('div');
  workspace.id = 'cfusion-workspace';

  // ==========================================
  // 1. TOPBAR
  // ==========================================
  const problemCode = `${context.contestId}${context.problemIndex}`;
  const contestUrl = context.isContest ? `/contest/${context.contestId}` : `/problemset`;

  const topbar = document.createElement('div');
  topbar.id = 'cfusion-topbar';
  topbar.innerHTML = `
    <div class="cfusion-topbar-left">
      <a href="${contestUrl}" class="cfusion-brand-pill" title="Back to Problemset / Contest">
        <div class="cfusion-brand-logo">&lt;/&gt;</div>
        <span>CFusion</span>
      </a>

      <div class="cfusion-problem-info">
        <span class="cfusion-problem-code-badge">${problemCode}</span>
        <span class="cfusion-problem-title" title="${meta.title}">${meta.title}</span>
      </div>

      <div class="cfusion-topbar-center cfusion-hide-mobile">
        <div class="cfusion-meta-pill" title="Time Limit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${meta.timeLimit}</span>
        </div>
        <div class="cfusion-meta-pill" title="Memory Limit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10M7 12h10M7 17h10"/></svg>
          <span>${meta.memoryLimit}</span>
        </div>
      </div>
    </div>

    <div class="cfusion-topbar-right">
      <!-- Layout Mode Switcher -->
      <div class="cfusion-segmented-control cfusion-hide-mobile" id="cfusion-layout-switch">
        <button class="cfusion-segmented-btn active" data-mode="split" title="Split Screen">Split</button>
        <button class="cfusion-segmented-btn" data-mode="problem" title="Problem Only">Problem</button>
        <button class="cfusion-segmented-btn" data-mode="editor" title="Editor Only">Editor</button>
      </div>

      <!-- Problem Tags Toggle -->
      ${meta.tags.length > 0 ? `
        <button class="cfusion-btn" id="cfusion-toggle-tags" title="Toggle Problem Tags">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2H2v10l9.29 9.29c.94.94 2.48.94 3.42 0l6.58-6.58c.94-.94.94-2.48 0-3.42L12 2Z"/><circle cx="7" cy="7" r=".5" fill="currentColor"/></svg>
          <span>Tags</span>
        </button>
      ` : ''}

      <!-- Contest Sidebar Drawer Toggle -->
      <button class="cfusion-btn" id="cfusion-toggle-sidebar" title="Open Contest Sidebar & Submissions">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><line x1="15" x2="15" y1="3" y2="21"/></svg>
        <span>Contest Tools</span>
      </button>
    </div>
  `;

  // Tags Popover
  const tagsPopover = document.createElement('div');
  tagsPopover.className = 'cfusion-tags-popover';
  tagsPopover.innerHTML = `
    <div style="font-size:12px; font-weight:600; color:#F8FAFC; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center;">
      <span>Problem Tags</span>
      <span style="font-size:10px; color:#94A3B8;">Spoiler Warning</span>
    </div>
    <div>
      ${meta.tags.map(t => `<span class="cfusion-tag-pill">${t}</span>`).join('')}
    </div>
  `;
  topbar.appendChild(tagsPopover);

  // ==========================================
  // 2. SPLIT CONTAINER
  // ==========================================
  const splitContainer = document.createElement('div');
  splitContainer.id = 'cfusion-split-container';

  // Left Pane (Independently Scrollable)
  const leftPane = document.createElement('div');
  leftPane.id = 'cfusion-left-pane';
  leftPane.className = 'cfusion-scrollable';
  // Move the actual problemStatement DOM node here
  leftPane.appendChild(problemStatement);

  // Resizer Bar
  const resizer = document.createElement('div');
  resizer.id = 'cfusion-resizer';
  resizer.title = 'Drag to resize panes • Double click to reset 50/50';

  // Right Pane (Workspace & Editor Placeholder)
  const rightPane = document.createElement('div');
  rightPane.id = 'cfusion-right-pane';

  let currentLang = 'cpp17';
  let currentCode = CODE_TEMPLATES[currentLang];

  rightPane.innerHTML = `
    <!-- Editor Header Toolbar -->
    <div class="cfusion-editor-header">
      <div class="cfusion-editor-tabs">
        <div class="cfusion-editor-tab" id="cfusion-file-tab">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#818CF8" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          <span id="cfusion-filename">solution.cpp</span>
        </div>
      </div>

      <div class="cfusion-editor-actions">
        <select class="cfusion-select" id="cfusion-lang-select">
          <option value="cpp17">C++17 (gcc 11)</option>
          <option value="cpp20">C++20 (gcc 13)</option>
          <option value="python3">Python 3 (3.11)</option>
          <option value="java">Java (OpenJDK 17)</option>
        </select>

        <button class="cfusion-btn" id="cfusion-reset-code" title="Reset Code to Template">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>
          <span class="cfusion-hide-mobile">Reset</span>
        </button>

        <button class="cfusion-btn" id="cfusion-copy-code" title="Copy Code">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span class="cfusion-hide-mobile">Copy</span>
        </button>
      </div>
    </div>

    <!-- Main Editor Canvas Area (Monaco Placeholder) -->
    <div class="cfusion-editor-body cfusion-scrollable">
      <div class="cfusion-gutter" id="cfusion-line-numbers">
        ${Array.from({ length: 28 }, (_, i) => `<div>${i + 1}</div>`).join('')}
      </div>
      <div class="cfusion-editor-code" id="cfusion-code-canvas" contenteditable="true" spellcheck="false">${escapeHtml(currentCode)}</div>
    </div>

    <!-- Bottom Console & Input/Output Panel -->
    <div class="cfusion-console-panel">
      <div class="cfusion-console-header">
        <div class="cfusion-console-tabs">
          <button class="cfusion-console-tab active" data-tab="stdin">Custom Input</button>
          <button class="cfusion-console-tab" data-tab="stdout">Output</button>
        </div>

        <div style="font-size:11px; color:#94A3B8; display:flex; align-items:center; gap:6px;">
          <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981;"></span>
          <span id="cfusion-status-text">Ready</span>
        </div>
      </div>

      <div class="cfusion-console-content" id="cfusion-console-body">
        <textarea id="cfusion-custom-stdin" placeholder="Enter standard input (stdin)...">${escapeHtml(meta.sampleInput)}</textarea>
        <div id="cfusion-custom-stdout" style="display:none; white-space:pre; color:#38BDF8; font-size:13px; padding:6px;">Click "Run Code" to compile and execute with custom input.</div>
      </div>

      <!-- Execution Toolbar -->
      <div class="cfusion-execution-bar">
        <div style="font-size:11px; color:#94A3B8;">
          <span>Phase 2: UI Workspace Active</span>
        </div>

        <div style="display:flex; gap:8px;">
          <button class="cfusion-btn cfusion-btn-accent" id="cfusion-run-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            <span>Run Code</span>
          </button>

          <button class="cfusion-btn cfusion-btn-success" id="cfusion-submit-btn">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            <span>Submit</span>
          </button>
        </div>
      </div>
    </div>
  `;

  splitContainer.appendChild(leftPane);
  splitContainer.appendChild(resizer);
  splitContainer.appendChild(rightPane);

  // ==========================================
  // 3. COLLAPSIBLE SIDEBAR DRAWER
  // ==========================================
  const backdrop = document.createElement('div');
  backdrop.id = 'cfusion-sidebar-backdrop';

  const drawer = document.createElement('div');
  drawer.id = 'cfusion-sidebar-drawer';
  drawer.innerHTML = `
    <div class="cfusion-drawer-header">
      <div class="cfusion-drawer-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><line x1="15" x2="15" y1="3" y2="21"/></svg>
        <span>Contest Tools & Sidebar</span>
      </div>
      <button class="cfusion-btn" id="cfusion-close-drawer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="cfusion-drawer-content cfusion-scrollable" id="cfusion-drawer-body">
    </div>
  `;

  // Move the original sidebar into the drawer body
  if (sidebar) {
    const drawerBody = drawer.querySelector('#cfusion-drawer-body');
    drawerBody.appendChild(sidebar);
  }

  // Assemble full workspace
  workspace.appendChild(topbar);
  workspace.appendChild(splitContainer);

  document.body.appendChild(workspace);
  document.body.appendChild(backdrop);
  document.body.appendChild(drawer);

  // Enhance sample tests with one-click copy buttons
  enhanceSampleTests(leftPane);

  // ==========================================
  // 4. ATTACH INTERACTIVE EVENT LISTENERS
  // ==========================================
  setupResizer(resizer, leftPane, rightPane);
  setupLayoutSwitch(topbar, leftPane, resizer, rightPane);
  setupSidebarDrawer(topbar, drawer, backdrop);
  setupTagsPopover(topbar, tagsPopover);
  setupEditorInteractions(rightPane);

  workspaceMounted = true;
  console.log('[CFusion] Split-screen problem workspace successfully mounted!');
}

/**
 * Setup Draggable Resizer with LocalStorage memory
 */
function setupResizer(resizer, leftPane, rightPane) {
  let isDragging = false;
  let startX = 0;
  let startLeftWidth = 0;
  const container = document.getElementById('cfusion-split-container');

  // Restore saved ratio if present
  const savedRatio = localStorage.getItem('cfusion_split_ratio');
  if (savedRatio) {
    const ratio = parseFloat(savedRatio);
    if (!isNaN(ratio) && ratio >= 20 && ratio <= 80) {
      leftPane.style.flex = `0 0 ${ratio}%`;
      rightPane.style.flex = `0 0 ${100 - ratio}%`;
    }
  }

  resizer.addEventListener('mousedown', (e) => {
    isDragging = true;
    startX = e.clientX;
    startLeftWidth = leftPane.getBoundingClientRect().width;
    resizer.classList.add('is-dragging');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const totalWidth = container.getBoundingClientRect().width;
    const newLeftWidth = startLeftWidth + deltaX;
    const newRatio = (newLeftWidth / totalWidth) * 100;

    if (newRatio >= 20 && newRatio <= 80) {
      leftPane.style.flex = `0 0 ${newRatio}%`;
      rightPane.style.flex = `0 0 ${100 - newRatio}%`;
      localStorage.setItem('cfusion_split_ratio', newRatio.toFixed(1));
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      resizer.classList.remove('is-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  });

  // Double click resets to 50/50
  resizer.addEventListener('dblclick', () => {
    leftPane.style.flex = '1 1 50%';
    rightPane.style.flex = '1 1 50%';
    localStorage.removeItem('cfusion_split_ratio');
  });
}

/**
 * Setup Layout Switcher (Split / Problem Only / Editor Only)
 */
function setupLayoutSwitch(topbar, leftPane, resizer, rightPane) {
  const buttons = topbar.querySelectorAll('#cfusion-layout-switch button');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const mode = btn.getAttribute('data-mode');
      if (mode === 'split') {
        leftPane.style.display = 'block';
        resizer.style.display = 'flex';
        rightPane.style.display = 'flex';
      } else if (mode === 'problem') {
        leftPane.style.display = 'block';
        leftPane.style.flex = '1 1 100%';
        leftPane.style.maxWidth = '100%';
        resizer.style.display = 'none';
        rightPane.style.display = 'none';
      } else if (mode === 'editor') {
        leftPane.style.display = 'none';
        resizer.style.display = 'none';
        rightPane.style.display = 'flex';
        rightPane.style.flex = '1 1 100%';
      }
    });
  });
}

/**
 * Setup Collapsible Sidebar Drawer
 */
function setupSidebarDrawer(topbar, drawer, backdrop) {
  const toggleBtn = topbar.querySelector('#cfusion-toggle-sidebar');
  const closeBtn = drawer.querySelector('#cfusion-close-drawer');

  const openDrawer = () => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  };

  const closeDrawer = () => {
    drawer.classList.remove('open');
    backdrop.classList.remove('open');
  };

  if (toggleBtn) toggleBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
}

/**
 * Setup Tags Popover Toggle
 */
function setupTagsPopover(topbar, tagsPopover) {
  const toggleBtn = topbar.querySelector('#cfusion-toggle-tags');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    tagsPopover.classList.toggle('open');
    toggleBtn.classList.toggle('active');
  });

  document.addEventListener('click', (e) => {
    if (!tagsPopover.contains(e.target) && e.target !== toggleBtn) {
      tagsPopover.classList.remove('open');
      toggleBtn.classList.remove('active');
    }
  });
}

/**
 * Setup Editor interactions (Language switch, tabs, run preview)
 */
function setupEditorInteractions(rightPane) {
  const langSelect = rightPane.querySelector('#cfusion-lang-select');
  const codeCanvas = rightPane.querySelector('#cfusion-code-canvas');
  const filenameEl = rightPane.querySelector('#cfusion-filename');
  const resetBtn = rightPane.querySelector('#cfusion-reset-code');
  const copyBtn = rightPane.querySelector('#cfusion-copy-code');
  const runBtn = rightPane.querySelector('#cfusion-run-btn');
  const submitBtn = rightPane.querySelector('#cfusion-submit-btn');
  const statusText = rightPane.querySelector('#cfusion-status-text');

  const consoleTabs = rightPane.querySelectorAll('.cfusion-console-tab');
  const stdinBox = rightPane.querySelector('#cfusion-custom-stdin');
  const stdoutBox = rightPane.querySelector('#cfusion-custom-stdout');

  const fileExtensions = {
    cpp17: 'solution.cpp',
    cpp20: 'solution.cpp',
    python3: 'solution.py',
    java: 'Main.java'
  };

  // Language switch
  langSelect.addEventListener('change', () => {
    const selected = langSelect.value;
    filenameEl.textContent = fileExtensions[selected] || 'solution.cpp';
    codeCanvas.textContent = CODE_TEMPLATES[selected] || '';
  });

  // Reset code button
  resetBtn.addEventListener('click', () => {
    const selected = langSelect.value;
    codeCanvas.textContent = CODE_TEMPLATES[selected] || '';
  });

  // Copy code button
  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(codeCanvas.textContent);
      copyBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="cfusion-hide-mobile">Copied!</span>
      `;
      setTimeout(() => {
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          <span class="cfusion-hide-mobile">Copy</span>
        `;
      }, 1800);
    } catch (err) {
      console.error(err);
    }
  });

  // Console Tabs Switcher
  consoleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      consoleTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const target = tab.getAttribute('data-tab');
      if (target === 'stdin') {
        stdinBox.style.display = 'block';
        stdoutBox.style.display = 'none';
      } else {
        stdinBox.style.display = 'none';
        stdoutBox.style.display = 'block';
      }
    });
  });

  // Mock Run Code Button (Prepares for Phase 4 Judge0)
  runBtn.addEventListener('click', () => {
    statusText.textContent = 'Executing...';
    statusText.style.color = '#F59E0B';

    // Switch to output tab
    consoleTabs.forEach(t => t.classList.remove('active'));
    rightPane.querySelector('.cfusion-console-tab[data-tab="stdout"]').classList.add('active');
    stdinBox.style.display = 'none';
    stdoutBox.style.display = 'block';
    stdoutBox.textContent = 'Compiling and running against custom input...';

    setTimeout(() => {
      statusText.textContent = 'Success (0.02s)';
      statusText.style.color = '#10B981';

      const inputVal = stdinBox.value.trim();
      const num = parseInt(inputVal, 10);
      let expectedOut = 'YES';
      if (isNaN(num) || num <= 2 || num % 2 !== 0) {
        expectedOut = 'NO';
      }

      stdoutBox.innerHTML = `
<span style="color:#10B981; font-weight:600;">Status:</span> Accepted (OK)
<span style="color:#94A3B8;">Execution Time:</span> 24 ms
<span style="color:#94A3B8;">Memory Usage:</span> 1.2 MB

<span style="color:#94A3B8;">--- Standard Output ---</span>
${expectedOut}
`;
    }, 600);
  });

  // Submit button opens CF submit tab/modal
  submitBtn.addEventListener('click', () => {
    // Open sidebar drawer to the submit form
    const drawer = document.getElementById('cfusion-sidebar-drawer');
    const backdrop = document.getElementById('cfusion-sidebar-backdrop');
    if (drawer && backdrop) {
      drawer.classList.add('open');
      backdrop.classList.add('open');
      const submitForm = drawer.querySelector('.submit-form, form[action*="submit"]');
      if (submitForm) {
        submitForm.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

/**
 * Teardown workspace and restore original Codeforces DOM elements
 */
export function teardownProblemWorkspace() {
  if (!workspaceMounted) return;

  const problemStatement = document.querySelector('.problem-statement');
  if (problemStatement && origProblemMarker && origProblemMarker.parentNode) {
    origProblemMarker.parentNode.insertBefore(problemStatement, origProblemMarker);
    origProblemMarker.remove();
  }

  const sidebar = document.querySelector('#sidebar');
  if (sidebar && origSidebarMarker && origSidebarMarker.parentNode) {
    origSidebarMarker.parentNode.insertBefore(sidebar, origSidebarMarker);
    origSidebarMarker.remove();
  }

  const workspace = document.getElementById('cfusion-workspace');
  if (workspace) workspace.remove();

  const backdrop = document.getElementById('cfusion-sidebar-backdrop');
  if (backdrop) backdrop.remove();

  const drawer = document.getElementById('cfusion-sidebar-drawer');
  if (drawer) drawer.remove();

  document.body.classList.remove('cfusion-workspace-active');
  workspaceMounted = false;
  console.log('[CFusion] Split-screen problem workspace torn down.');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
