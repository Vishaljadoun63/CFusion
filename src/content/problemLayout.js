/**
 * CFusion - Problem Layout Engine
 * Converts Codeforces problem page into a modern split-screen workspace
 * with integrated Monaco Editor powered by React 18
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { enhanceSampleTests } from './sampleCopier';
import WorkspaceRightPane from '../editor/WorkspaceRightPane';

let origProblemMarker = null;
let origSidebarMarker = null;
let workspaceMounted = false;
let reactRightPaneRoot = null;

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

  // Extract first sample expected output for convenience
  const firstSampleOutputPre = problemStatement.querySelector('.sample-test .output pre');
  let sampleOutput = '';
  if (firstSampleOutputPre) {
    const divs = firstSampleOutputPre.querySelectorAll('div');
    if (divs.length > 0) {
      sampleOutput = Array.from(divs).map(d => d.textContent).join('\n').trim();
    } else {
      sampleOutput = firstSampleOutputPre.textContent.trim();
    }
  }

  // Extract problem tags from sidebar if available
  const tags = [];
  const tagNodes = document.querySelectorAll('.tag-box');
  tagNodes.forEach(tag => {
    const text = tag.textContent.trim();
    if (text) tags.push(text);
  });

  return { title, timeLimit, memoryLimit, sampleInput, sampleOutput, tags };
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

      <!-- My Codes Library Toggle -->
      <button class="cfusion-btn" id="cfusion-toggle-library" title="Open My Codes Library">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><polyline points="10 2 10 10 13 7 16 10 16 2"/></svg>
        <span>My Codes</span>
      </button>

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

  // Right Pane: Mount React Root for Monaco Editor
  const rightPane = document.createElement('div');
  rightPane.id = 'cfusion-right-pane';

  const isDarkMode = document.documentElement.classList.contains('cfusion-dark');
  reactRightPaneRoot = ReactDOM.createRoot(rightPane);
  reactRightPaneRoot.render(
    React.createElement(WorkspaceRightPane, {
      context,
      meta,
      initialTheme: isDarkMode ? 'dark' : 'light'
    })
  );

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

  const toggleLibraryBtn = topbar.querySelector('#cfusion-toggle-library');
  if (toggleLibraryBtn) {
    toggleLibraryBtn.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('cfusion:toggle-library'));
    });
  }

  workspaceMounted = true;
  console.log('[CFusion] Split-screen problem workspace with Monaco Editor successfully mounted!');
}

/**
 * Setup Draggable Resizer with LocalStorage memory and Monaco layout recalculation
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
      // Notify Monaco to trigger automatic layout recalculation
      window.dispatchEvent(new Event('resize'));
    }
  });

  window.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      resizer.classList.remove('is-dragging');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.dispatchEvent(new Event('resize'));
    }
  });

  // Double click resets to 50/50
  resizer.addEventListener('dblclick', () => {
    leftPane.style.flex = '1 1 50%';
    rightPane.style.flex = '1 1 50%';
    localStorage.removeItem('cfusion_split_ratio');
    window.dispatchEvent(new Event('resize'));
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
      window.dispatchEvent(new Event('resize'));
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
 * Teardown workspace and restore original Codeforces DOM elements
 */
export function teardownProblemWorkspace() {
  if (!workspaceMounted) return;

  if (reactRightPaneRoot) {
    try {
      reactRightPaneRoot.unmount();
    } catch (e) {
      console.warn('[CFusion] Error unmounting React root:', e);
    }
    reactRightPaneRoot = null;
  }

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
