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

// Message listener for future cross-context requests (e.g., proxying execution requests)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ status: 'PONG', timestamp: Date.now() });
    return true;
  }
});
