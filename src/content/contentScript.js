////////////////////////////////////////////////////////////////////////////////
// FULL UPDATED CONTENT SCRIPT CODE - WITH MULTI-BLOCK HIGHLIGHT SUPPORT
// NOW STORING ARRAYS OF SUB-RANGES FOR HIGHLIGHTS & ANNOTATIONS
// IMMEDIATE APPLICATION (NO REFRESH NEEDED)
// OVERLAPPING FIXES FOR HIGHLIGHTS & ANNOTATIONS
// EXTRA LOGS FOR DEBUG
////////////////////////////////////////////////////////////////////////////////

import { showFloatingToolbar, showAnnotationToolbar } from './modules/toolbar.js';
import { openAllAnnotationsSidebar, removeAnnotationById } from './modules/annotation.js';
import { showToast } from './modules/ui.js';
import { initialize } from './modules/storage.js';

// **1. Add Activation State Variable**
let isActive = false; // Extension is inactive by default

// **2. Initialize Activation State from Storage**
chrome.storage.local.get(['isActive'], (result) => {
  isActive = result.isActive || false;
  console.log(`[DEBUG contentScript] Content script initialized. isActive: ${isActive}`);
});

// **3. Listen for Storage Changes (Optional)**
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.isActive) {
    isActive = changes.isActive.newValue;
    console.log(`[DEBUG contentScript] Activation state changed. isActive: ${isActive}`);
    if (isActive) {
      showToast("Extension activated.");
    } else {
      showToast("Extension deactivated.");
      // Cleanup UI elements when deactivated
      const floatingToolbar = document.getElementById("floating-toolbar");
      if (floatingToolbar) floatingToolbar.remove();

      const annotationToolbar = document.getElementById("annotation-toolbar");
      if (annotationToolbar) annotationToolbar.remove();

      const sidebar = document.getElementById("annotation-sidebar");
      if (sidebar) sidebar.style.display = "none";
    }
  }
});

// **4. Wrap Event Listeners with Activation Checks**
document.addEventListener("mouseup", function(event) {
  if (!isActive) return; // Exit if the extension is not active

  const selection = window.getSelection();
  if (
      !selection ||
      selection.rangeCount === 0 ||
      event.target.closest('#floating-toolbar') ||
      event.target.closest('#annotation-toolbar')
  ) {
    return;
  }

  // Loop through all ranges in the selection
  for (let i = 0; i < selection.rangeCount; i++) {
    const range = selection.getRangeAt(i);
    if (!range || range.collapsed) continue;

    let commonAncestor = range.commonAncestorContainer;
    if (commonAncestor.nodeType === Node.TEXT_NODE) {
      commonAncestor = commonAncestor.parentElement;
    }

    const isWithinAnnotatedText = commonAncestor.closest('.annotated-annotation') !== null;
    if (!isWithinAnnotatedText) {
      console.log("[DEBUG contentScript] Text selected outside annotated elements:", range.toString());
      showFloatingToolbar(range);
    } else {
      console.log("[DEBUG contentScript] Text selected within an annotated element:", range.toString());
      showAnnotationToolbar(range);
    }
  }
});

document.addEventListener("mousedown", function(event) {
  if (!isActive) return; // Exit if the extension is not active

  const toolbar = document.getElementById("floating-toolbar");
  if (toolbar && !toolbar.contains(event.target)) {
    console.log("[DEBUG contentScript] Clicked outside toolbar, removing toolbar");
    toolbar.remove();
  }

  // Remove annotation toolbar if clicking outside
  const annotationToolbar = document.getElementById("annotation-toolbar");
  if (annotationToolbar && !annotationToolbar.contains(event.target)) {
    console.log("[DEBUG contentScript] Clicked outside annotation toolbar, removing toolbar");
    annotationToolbar.remove();
  }
});

document.addEventListener("click", function(event) {
  if (!isActive) return; // Exit if the extension is not active

  const annotatedElement = event.target.closest('.annotated-annotation');
  if (annotatedElement) {
    event.preventDefault();
    event.stopPropagation();

    // Remove any existing annotation toolbar
    const existingToolbar = document.getElementById("annotation-toolbar");
    if (existingToolbar) {
      existingToolbar.remove();
    }

    // Create the annotation toolbar
    const toolbar = document.createElement("div");
    toolbar.id = "annotation-toolbar";
    toolbar.innerHTML = `
        <button id="view-annotation-btn" class="toolbar-button">View Annotation</button>
        <button id="remove-annotation-btn" class="toolbar-button">Remove Annotation</button>
    `;
    console.log("[DEBUG contentScript] Annotation toolbar created");

    // Position the toolbar near the annotated text
    const rect = annotatedElement.getBoundingClientRect();
    toolbar.style.position = "absolute";
    toolbar.style.top = `${window.scrollY + rect.top - 40}px`;
    toolbar.style.left = `${rect.left}px`;
    toolbar.style.zIndex = "10000";
    toolbar.style.backgroundColor = "#fff";
    toolbar.style.border = "1px solid #ccc";
    toolbar.style.padding = "5px";
    toolbar.style.borderRadius = "4px";
    toolbar.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";

    document.body.appendChild(toolbar);

    // Show the toolbar with animation
    setTimeout(() => toolbar.classList.add("show"), 10);

    const viewBtn = document.getElementById("view-annotation-btn");
    const removeBtn = document.getElementById("remove-annotation-btn");

    viewBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      console.log("[DEBUG contentScript] View annotation clicked");
      openAllAnnotationsSidebar();
      toolbar.remove();
    });

    removeBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      console.log("[DEBUG contentScript] Remove annotation clicked");
      const annotationId = annotatedElement.getAttribute('data-annotation-id');
      if (annotationId) {
        removeAnnotationById(annotationId, annotatedElement);
      }
      toolbar.remove();
    });

    // Optional: remove the toolbar after 5s
    setTimeout(() => {
      if (toolbar.parentNode) {
        toolbar.remove();
      }
    }, 5000);
  } else {
    // Clicked outside an annotated text, remove annotation toolbar if exists
    const toolbar = document.getElementById("annotation-toolbar");
    if (toolbar) {
      toolbar.remove();
    }
  }
});

// Handle all messages in a single listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("[DEBUG contentScript] onMessage:", request);
  
  switch (request.action) {
    case 'toggleActivation':
      isActive = !isActive;
      console.log(`[DEBUG contentScript] Extension is now ${isActive ? 'active' : 'inactive'}.`);
      chrome.storage.local.set({ isActive: isActive }, () => {
        if (isActive) {
          showToast("Extension activated.");
        } else {
          cleanupUI();
        }
        sendResponse({ status: `Extension is now ${isActive ? 'active' : 'inactive'}.` });
      });
      return true;

    case 'activate':
      isActive = true;
      chrome.storage.local.set({ isActive: true });
      console.log("[DEBUG contentScript] Extension activated via background script");
      sendResponse({ status: "activated" });
      return true;

    case 'deactivate':
      isActive = false;
      chrome.storage.local.set({ isActive: false });
      cleanupUI();
      console.log("[DEBUG contentScript] Extension deactivated via background script");
      sendResponse({ status: "deactivated" });
      return true;

    case 'openSidebar':
      if (isActive) {
        console.log("[DEBUG contentScript] Open Annotation Sidebar message received");
        openAllAnnotationsSidebar();
        sendResponse({ status: "Sidebar opened." });
      } else {
        sendResponse({ status: "Extension inactive. Sidebar not opened." });
      }
      return true;

    case 'showToast':
      if (request.message) {
        showToast(request.message);
        sendResponse({ status: "toast shown" });
      }
      return true;

    default:
      console.warn("[DEBUG contentScript] Unknown action:", request.action);
      sendResponse({ status: "error", message: "Unknown action" });
      return true;
  }
});

// Helper function to cleanup UI elements
function cleanupUI() {
  showToast("Extension deactivated.");
  const floatingToolbar = document.getElementById("floating-toolbar");
  if (floatingToolbar) floatingToolbar.remove();
  const annotationToolbar = document.getElementById("annotation-toolbar");
  if (annotationToolbar) annotationToolbar.remove();
  const sidebar = document.getElementById("annotation-sidebar");
  if (sidebar) sidebar.style.display = "none";
}

// Set loaded flag and initialize
window.__teachbooksAnnotatorLoaded = true;
console.log("[DEBUG contentScript] Content script loaded flag set");

// Ensure we init after DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    console.log("[DEBUG contentScript] DOMContentLoaded -> initialize()");
    initialize();
  });
} else {
  console.log("[DEBUG contentScript] document.readyState complete -> initialize()");
  initialize();
}
