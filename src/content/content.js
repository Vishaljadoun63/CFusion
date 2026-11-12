/**
 * CFusion - Content Script (Codeforces Reimagined)
 * Injected into codeforces.com
 */

import './styles.css';
import './workspace.css';
import { initProblemWorkspace, teardownProblemWorkspace } from './problemLayout';

console.log(
  `%c[CFusion]%c Codeforces Reimagined active! 🚀`,
  'background: #F59E0B; color: #111; font-weight: bold; padding: 2px 6px; border-radius: 4px;',
  'color: #F59E0B; font-weight: bold;'
);

/**
 * Detect the current Codeforces page type and context
 */
export function detectPageContext() {
  const path = window.location.pathname;

  const problemsetMatch = path.match(/\/problemset\/problem\/(\d+)\/([A-Za-z0-9]+)/i);
  if (problemsetMatch) {
    return {
      type: 'problem',
      contestId: problemsetMatch[1],
      problemIndex: problemsetMatch[2],
      isContest: false
    };
  }

  const contestProblemMatch = path.match(/\/contest\/(\d+)\/problem\/([A-Za-z0-9]+)/i);
  if (contestProblemMatch) {
    return {
      type: 'problem',
      contestId: contestProblemMatch[1],
      problemIndex: contestProblemMatch[2],
      isContest: true
    };
  }

  if (path.startsWith('/problemset')) {
    return { type: 'problemset' };
  }

  if (path.match(/\/contest\/\d+/i)) {
    return { type: 'contest' };
  }

  return { type: 'general' };
}

/**
 * Apply or remove theme classes on the <html> root
 */
function applyTheme(enabled, theme) {
  const root = document.documentElement;

  if (enabled) {
    root.classList.add('cfusion-enabled');
    if (theme === 'dark') {
      root.classList.add('cfusion-dark');
    } else {
      root.classList.remove('cfusion-dark');
    }
  } else {
    root.classList.remove('cfusion-enabled', 'cfusion-dark');
  }
}

/**
 * Mount a minimal, elegant indicator verifying CFusion is active on non-problem pages
 */
function mountIndicator(context) {
  // On problem pages, the topbar already displays the CFusion pill badge
  if (context.type === 'problem') return;
  if (document.getElementById('cfusion-indicator')) return;

  const badge = document.createElement('div');
  badge.id = 'cfusion-indicator';

  let contextLabel = 'Codeforces';
  if (context.type === 'contest') {
    contextLabel = 'Contest';
  } else if (context.type === 'problemset') {
    contextLabel = 'Problemset';
  }

  badge.innerHTML = `
    <span style="display:inline-block; width:6px; height:6px; border-radius:50%; background:#10B981;"></span>
    <span>CFusion • ${contextLabel}</span>
  `;

  document.body.appendChild(badge);
}

/**
 * Initialize CFusion on the current page
 */
async function initCFusion() {
  const context = detectPageContext();
  console.log('[CFusion] Page Context detected:', context);

  // Retrieve current user settings
  let settings = { cfusion_enabled: true, theme: 'dark' };
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    const stored = await chrome.storage.local.get(['cfusion_enabled', 'theme']);
    if (stored.cfusion_enabled !== undefined) settings.cfusion_enabled = stored.cfusion_enabled;
    if (stored.theme !== undefined) settings.theme = stored.theme;

    // Reactively listen to live settings changes from popup
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
        if (changes.cfusion_enabled !== undefined) {
          settings.cfusion_enabled = changes.cfusion_enabled.newValue;
          if (context.type === 'problem') {
            if (settings.cfusion_enabled) {
              initProblemWorkspace(context);
            } else {
              teardownProblemWorkspace();
            }
          }
        }
        if (changes.theme !== undefined) {
          settings.theme = changes.theme.newValue;
        }
        applyTheme(settings.cfusion_enabled, settings.theme);
      }
    });
  }

  applyTheme(settings.cfusion_enabled, settings.theme);

  const onDomReady = () => {
    mountIndicator(context);
    if (context.type === 'problem' && settings.cfusion_enabled) {
      initProblemWorkspace(context);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady);
  } else {
    onDomReady();
  }
}

// Immediately execute early theme setup to prevent white flash
initCFusion();
