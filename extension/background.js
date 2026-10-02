/**
 * AutoCompare Multi-Marketplace - Background Service Worker (Manifest V3)
 */

// Enable opening sidePanel on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('sidePanel.setPanelBehavior failed:', err);
    });
  }

  // Initialize storage with 5 empty slots
  chrome.storage.local.get(['slots'], (res) => {
    if (!res.slots || !Array.isArray(res.slots) || res.slots.length !== 5) {
      chrome.storage.local.set({
        slots: [null, null, null, null, null],
      });
    }
  });
});

// Listener for messages from sidepanel or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_SLOTS') {
    chrome.storage.local.get(['slots'], (res) => {
      sendResponse({ slots: res.slots || [null, null, null, null, null] });
    });
    return true; // async response
  }
});
