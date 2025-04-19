// Check if script is already injected
if (typeof window.whatsappScannerInjected === "undefined") {
  window.whatsappScannerInjected = true;

  let scanInterval;
  let isScanning = false;
  let lastOpenedChat = null;
  let resultText = null; // Store the result text from the API
  let checkedConversations = new Set(); // Store already checked conversations

  function getUnreadCustomerMessages() {
    try {
      // Find all messages in the chat
      const messageContainer = document.querySelector('div[role="application"]');
      console.log("messageContainer", messageContainer);
      if (!messageContainer) return null;

      // Get all message rows
      const messageRows = messageContainer.querySelectorAll('div[role="row"]');
      console.log("messageRows", messageRows);
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
          console.log("Found customer message");
          // Found customer message
          const messageText = row.querySelector("span.selectable-text.copyable-text");
          if (messageText) {
            lastCustomerMessages.unshift(messageText.textContent.trim());
          }
        }
      }

      return lastCustomerMessages;
    } catch (error) {
      console.error("Error getting customer messages:", error);
      return null;
    }
  }

  // Function to set draft message
  async function setDraftMessage(inputBox, message) {
    try {
      // Focus the input box first
      inputBox.focus();

      // Create a new keyboard event
      const event = new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: message,
      });

      // Dispatch the event
      inputBox.dispatchEvent(event);

      // Set the content
      const p = document.createElement("p");
      p.className = "selectable-text copyable-text x15bjb6t x1n2onr6";
      p.dir = "ltr";
      p.style.textIndent = "0px";
      p.style.marginTop = "0px";
      p.style.marginBottom = "0px";

      const span = document.createElement("span");
      span.className = "selectable-text copyable-text false";
      span.setAttribute("data-lexical-text", "true");
      span.textContent = message;

      // Clear and append
      p.appendChild(span);
      inputBox.textContent = "";
      inputBox.appendChild(p);

      // Trigger input event
      inputBox.dispatchEvent(
        new Event("input", {
          bubbles: true,
          cancelable: true,
        })
      );

      return true;
    } catch (error) {
      console.error("Error setting draft:", error);
      return false;
    }
  }

  // Function to send message
  async function sendDummyMessage() {
    try {
      // Wait for chat to load
      await new Promise((resolve) => setTimeout(resolve, 500));
      const unreadMessages = getUnreadCustomerMessages();
      console.log(unreadMessages, "unread messages");
      if (!unreadMessages || unreadMessages.length === 0) {
        console.log("No unread messages to respond to.");
        return false;
      }
      if (unreadMessages?.length > 1) {
        for (const message of unreadMessages) {
          const response = await fetch("http://localhost:3000/api/hjf4568uklof/webhook/whatsapp-extension", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: message }),
          });

          if (!response.ok) {
            console.error("Failed to get message from API");
            continue;
            // return false;
          }

          const result = await response.json();
          const replyText = result?.response;

          if (!replyText) {
            console.warn("No message returned from API");
            continue;
          }

          // Find the input box with exact classes
          const inputBox = document.querySelector('div.x1hx0egp.x6ikm8r.x1odjw0f.x1k6rcq7.x6prxxf[role="textbox"][aria-label="Type a message"]');
          // div[role="textbox"][aria-label="Type a message"]
          if (inputBox) {
            // Set draft message
            if (await setDraftMessage(inputBox, replyText)) {
              // Wait for draft to be set
              await new Promise((resolve) => setTimeout(resolve, 500));

              // Find and click send button
              const sendButton = document.querySelector('button[aria-label="Send"]');
              if (sendButton) {
                console.log("Clicking send button");
                sendButton.click();
              }
            }
          }
        }
      } else {
        console.log("Only one unread message found, sending response directly");
        //
        // Find the input box with exact classes
        const inputBox = document.querySelector('div.x1hx0egp.x6ikm8r.x1odjw0f.x1k6rcq7.x6prxxf[role="textbox"][aria-label="Type a message"]');
        // div[role="textbox"][aria-label="Type a message"]
        if (inputBox) {
          // Set draft message
          if (await setDraftMessage(inputBox, resultText)) {
            // Wait for draft to be set
            await new Promise((resolve) => setTimeout(resolve, 500));

            // Find and click send button
            const sendButton = document.querySelector('button[aria-label="Send"]');
            if (sendButton) {
              console.log("Clicking send button");
              sendButton.click();
            }
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  }

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

      // Clear checked conversations if no unread messages
      if (unreadChats.length === 0) {
        console.log("No unread messages, clearing checked conversations");
        checkedConversations.clear();
        return;
      }

      if (unreadChats.length > 0) {
        for (const unreadBadge of unreadChats) {
          try {
            // Get the parent list item
            const listItem = unreadBadge.closest('div[role="listitem"]');
            if (!listItem) continue;

            // Find all possible clickable elements
            const chatDiv = listItem.querySelector("div._ak72");
            if (!chatDiv) continue;

            // Get chat name and preview message
            const customerName = chatDiv.querySelector("div.x78zum5 span.x1iyjqo2").textContent.trim();
            const previewMessage = chatDiv.querySelector("div._ak8k span.x1iyjqo2").textContent.trim();
            const conversationKey = `${customerName}:${previewMessage}`; // Create unique key

            // Skip if already checked and no response existed
            if (checkedConversations.has(conversationKey)) {
              console.log("Already checked this conversation, skipping");
              continue;
            }

            // Check if response exists in DB via API
            try {
              const checkResponse = await fetch("http://localhost:3000/api/hjf4568uklof/webhook/whatsapp-extension", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ message: previewMessage }),
              });

              const result = await checkResponse.json();
              resultText = result?.response;
              if (!resultText) {
                console.log("No response exists for this message, marking as checked");
                checkedConversations.add(conversationKey);
                continue; // Skip this conversation if no response exists
              }
            } catch (error) {
              console.error("Error checking response existence:", error);
              continue;
            }

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
              await attemptClick(target);
              await new Promise((resolve) => setTimeout(resolve, 200));
            }

            // After opening chat, try to send message
            await sendDummyMessage();

            lastOpenedChat = customerName;
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
      checkedConversations.clear(); // Clear checked conversations when stopping
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
