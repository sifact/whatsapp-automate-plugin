// Check if script is already injected
if (typeof window.whatsappScannerInjected === "undefined") {
  window.whatsappScannerInjected = true;

  let scanInterval;
  let isScanning = false;
  let lastOpenedChat = null;

  // Function to get latest unread customer messages
  function getUnreadCustomerMessages() {
    try {
      // Find all messages in the chat
      const messageContainer = document.querySelector('div[role="application"]');
      if (!messageContainer) return null;

      // Get all message rows
      const messageRows = messageContainer.querySelectorAll('div[role="row"]');
      if (!messageRows.length) return null;

      // Find the last customer message that hasn't been replied to
      let lastCustomerMessages = [];
      let foundOwnerResponse = false;

      // Go through messages in reverse order to find unreplied customer messages
      for (let i = messageRows.length - 1; i >= 0; i--) {
        const row = messageRows[i];
        if (row.querySelector(".message-out")) {
          // Found owner's response, stop collecting customer messages
          foundOwnerResponse = true;
          break;
        } else if (row.querySelector(".message-in")) {
          // Found customer message
          const messageText = row.querySelector("span.selectable-text.copyable-text");
          if (messageText) {
            lastCustomerMessages.unshift(messageText.textContent.trim());
          }
        }
      }

      // Only return messages if we haven't found an owner response
      return !foundOwnerResponse ? lastCustomerMessages : null;
    } catch (error) {
      console.error("Error getting customer messages:", error);
      return null;
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

            // Find chat div
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
            ].filter(Boolean);

            // Try each possible target
            for (const target of possibleClickTargets) {
              target.click();
              await new Promise((resolve) => setTimeout(resolve, 200));
            }

            // Wait for chat to load
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Get unread customer messages
            const unreadMessages = getUnreadCustomerMessages();
            if (unreadMessages && unreadMessages.length > 0) {
              console.log("Unread messages from", chatName + ":", unreadMessages);
            }

            lastOpenedChat = chatName;
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
