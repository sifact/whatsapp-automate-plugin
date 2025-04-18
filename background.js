// Keep track of scanning state
let isScanning = false;

// Listen for scan state changes
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "SCAN_STATE_CHANGE") {
    isScanning = message.scanning;

    // Update badge to show scanning state
    chrome.action.setBadgeText({
      text: isScanning ? "ON" : "OFF",
    });
    chrome.action.setBadgeBackgroundColor({
      color: isScanning ? "#25d366" : "#dc3545",
    });
  }
});

// Initialize badge
chrome.action.setBadgeText({ text: "OFF" });
chrome.action.setBadgeBackgroundColor({ color: "#dc3545" });

// When extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  // Reset scanning state
  chrome.storage.local.set({ scanEnabled: false });
});
