// Function to update toggle button state
function updateToggleButton(enabled) {
  const button = document.getElementById("toggle-scan");
  button.textContent = enabled ? "Stop Scanning" : "Start Scanning";
  button.style.background = enabled ? "#dc3545" : "#25d366";
}

// Initialize popup
document.addEventListener("DOMContentLoaded", () => {
  // Load current state
  chrome.storage.local.get("scanEnabled", (data) => {
    updateToggleButton(data.scanEnabled || false);
  });

  // Handle toggle button click
  document.getElementById("toggle-scan").addEventListener("click", () => {
    chrome.storage.local.get("scanEnabled", (data) => {
      const newState = !data.scanEnabled;

      // Update storage
      chrome.storage.local.set({ scanEnabled: newState }, () => {
        updateToggleButton(newState);

        // Send message to content script
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              {
                action: newState ? "startScan" : "stopScan",
              },
              (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Error:", chrome.runtime.lastError);
                } else {
                  console.log("Scan status:", response.status);
                }
              }
            );
          }
        });
      });
    });
  });
});
