// Check if script is already injected
if (typeof window.whatsappScannerInjected === "undefined") {
  window.whatsappScannerInjected = true;

  let scanInterval;
  let isScanning = false;
  let lastOpenedChat = null;

  // Function to attempt clicking in multiple ways
  async function attemptClick(element) {
    // Try different click methods
    try {
      // 1. Try direct click
      element.click();
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 2. Try mousedown/mouseup sequence
      element.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 50));
      element.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
      await new Promise((resolve) => setTimeout(resolve, 50));
      element.dispatchEvent(new MouseEvent("click", { bubbles: true }));

      // 3. Try focus then click
      element.focus();
      await new Promise((resolve) => setTimeout(resolve, 50));
      element.click();
    } catch (error) {
      console.error("Click attempt failed:", error);
    }
  }

  // Function to scan for unread messages
  async function scanUnreadMessages() {
    try {
      // Find all chat list items with unread messages
      const unreadChats = document.querySelectorAll('div[role="listitem"] ._ahlk');
      console.log("Found unread chats:", unreadChats.length);

      if (unreadChats.length > 0) {
        for (const unreadBadge of unreadChats) {
          try {
            // Get the parent list item
            const listItem = unreadBadge.closest('div[role="listitem"]');
            if (!listItem) continue;

            // Find all possible clickable elements
            const chatDiv = listItem.querySelector("div._ak72");
            if (!chatDiv) continue;

            // Get chat name for logging
            const chatName = chatDiv.textContent.trim();

            // Skip if this was the last chat we opened
            if (chatName === lastOpenedChat) continue;

            console.log("Attempting to open chat:", chatName);

            // Try clicking various elements in order
            const possibleClickTargets = [
              listItem.querySelector('div[role="gridcell"]'),
              listItem.querySelector('div[tabindex="-1"]'),
              listItem.querySelector("div._ak8q"),
              listItem.querySelector("div._ak8j"),
              chatDiv,
            ].filter(Boolean); // Remove null elements

            // Try each possible target
            for (const target of possibleClickTargets) {
              await attemptClick(target);
              await new Promise((resolve) => setTimeout(resolve, 200));
            }

            lastOpenedChat = chatName;
            // Only try one chat at a time
            break;
          } catch (error) {
            console.error("Error opening chat:", error);
          }
        }
      }
    } catch (error) {
      console.error("Error scanning messages:", error);
    }
  }

  // Function to start scanning
  function startScanning() {
    if (!isScanning) {
      isScanning = true;
      lastOpenedChat = null;

      setTimeout(() => {
        console.log("Starting scanner...");
        scanUnreadMessages();
        scanInterval = setInterval(scanUnreadMessages, 5000);

        // Update badge
        chrome.runtime.sendMessage({
          type: "SCAN_STATE_CHANGE",
          scanning: true,
        });
      }, 2000);
    }
  }

  // Function to stop scanning
  function stopScanning() {
    if (isScanning) {
      clearInterval(scanInterval);
      isScanning = false;
      lastOpenedChat = null;
      console.log("Stopped scanning");

      // Update badge
      chrome.runtime.sendMessage({
        type: "SCAN_STATE_CHANGE",
        scanning: false,
      });
    }
  }

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startScan") {
      startScanning();
      sendResponse({ status: "started" });
    } else if (request.action === "stopScan") {
      stopScanning();
      sendResponse({ status: "stopped" });
    }
    return true;
  });

  // Clean up on unload
  window.addEventListener("unload", () => {
    stopScanning();
  });

  // Initialize state from storage
  chrome.storage.local.get("scanEnabled", (data) => {
    if (data.scanEnabled) {
      startScanning();
    }
  });
}
