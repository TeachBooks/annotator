// src/background/background.js

// Log a message when the extension is installed or updated
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log("TeachBooks Annotator Extension Installed");
    // Initialize activation state to inactive
    chrome.storage.local.set({ isActive: false }, () => {
      console.log("Extension initialized as inactive.");
    });
  } else if (details.reason === 'update') {
    console.log("TeachBooks Annotator Extension Updated");
    // Optionally, handle updates to activation state if needed
  }
});

// Function to set or remove the popup based on activation state
function updatePopup(isActive) {
  if (isActive) {
    chrome.action.setPopup({ popup: "src/popup/popup.html" }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error setting popup:", chrome.runtime.lastError.message);
      } else {
        console.log("Popup set to src/popup/popup.html");
      }
    });
  } else {
    chrome.action.setPopup({ popup: "" }, () => {
      if (chrome.runtime.lastError) {
        console.error("Error removing popup:", chrome.runtime.lastError.message);
      } else {
        console.log("Popup removed.");
      }
    });
  }
}

// On startup, set the popup based on stored activation state
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get(['isActive'], (result) => {
    const isActive = result.isActive || false;
    console.log("Extension isActive on startup:", isActive);
    updatePopup(isActive);
  });
});

// Also handle cases where browser is already running when the extension is loaded
chrome.storage.local.get(['isActive'], (result) => {
  const isActive = result.isActive || false;
  console.log("Extension isActive on load:", isActive);
  updatePopup(isActive);
});

// Handle toolbar icon clicks to toggle activation
chrome.action.onClicked.addListener((tab) => {
  // On click, check current activation state
  chrome.storage.local.get(['isActive'], (result) => {
    const isActive = result.isActive || false;
    if (!isActive) {
      // Activate the extension
      chrome.storage.local.set({ isActive: true }, () => {
        console.log("Extension activated via toolbar icon.");
        updatePopup(true); // Set the popup to show when active

        // Check if we can inject into this tab
        if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('edge://')) {
          // Ensure content script is loaded before sending messages
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            function: () => {
              // This will return true if our content script is loaded
              return typeof window.__teachbooksAnnotatorLoaded !== 'undefined';
            }
          }).then((results) => {
            const isLoaded = results[0]?.result;
            
            if (isLoaded) {
              // Content script is loaded, send messages
              chrome.tabs.sendMessage(tab.id, { action: "activate" }, (response) => {
                if (chrome.runtime.lastError) {
                  console.error("Error sending activate message:", chrome.runtime.lastError.message);
                } else {
                  console.log("Activate message response:", response);
                  // Only show toast if activate was successful
                  chrome.tabs.sendMessage(tab.id, { 
                    action: "showToast", 
                    message: "Extension activated." 
                  });
                }
              });
            } else {
              // Content script needs to be injected
              chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['src/content/contentScript.js']
              }).then(() => {
                // Wait a brief moment for the script to initialize
                setTimeout(() => {
                  chrome.tabs.sendMessage(tab.id, { action: "activate" }, (response) => {
                    if (chrome.runtime.lastError) {
                      console.error("Error sending activate message:", chrome.runtime.lastError.message);
                    } else {
                      console.log("Activate message response:", response);
                      chrome.tabs.sendMessage(tab.id, { 
                        action: "showToast", 
                        message: "Extension activated." 
                      });
                    }
                  });
                }, 100);
              }).catch(err => {
                console.error("Error injecting content script:", err);
              });
            }
          }).catch(err => {
            console.error("Error checking content script status:", err);
          });
        } else {
          console.log("Cannot activate extension on this page type");
        }
      });
    } else {
      // If active, clicking the icon will open the popup as it's set
      console.log("Extension is active. Popup will open.");
      // No further action needed here
    }
  });
});

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[DEBUG background] Message received:", request);
  if (request.action === "openSidebar") {
    console.log("Received request to open sidebar with text:", request.text);
    sendResponse({ status: "Sidebar opening initiated" });
  } else if (request.action === "deactivate") {
    // Handle deactivation from popup
    chrome.storage.local.set({ isActive: false }, () => {
      console.log("Extension deactivated via popup.");
      updatePopup(false); // Remove the popup

      // Send a message to content script to deactivate features
      if (sender.tab && sender.tab.id) {
        chrome.tabs.sendMessage(sender.tab.id, { action: "deactivate" }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending deactivate message:", chrome.runtime.lastError.message);
          } else {
            console.log("Deactivate message response:", response);
          }
        });

        // Show toast notification via content script
        chrome.tabs.sendMessage(sender.tab.id, { action: "showToast", message: "Extension deactivated." });
      }

      sendResponse({ status: "Extension deactivated" });
    });
  } else {
    console.warn("Unknown action:", request.action);
    sendResponse({ status: "Error", message: "Unknown action" });
  }

  return true; // Indicate async response
});
