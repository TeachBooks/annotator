////////////////////////////////////////////////////////////////////////////////
// FULL UPDATED CONTENT SCRIPT CODE - WITH MULTI-BLOCK HIGHLIGHT SUPPORT
// NOW STORING ARRAYS OF SUB-RANGES FOR HIGHLIGHTS & ANNOTATIONS
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
    console.log(`Content script initialized. isActive: ${isActive}`);
});

// **3. Listen for Storage Changes (Optional)**
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.isActive) {
        isActive = changes.isActive.newValue;
        console.log(`Activation state changed. isActive: ${isActive}`);
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
            console.log("Text selected outside annotated elements:", range.toString());
            showFloatingToolbar(range);
        } else {
            console.log("Text selected within an annotated element:", range.toString());
            showAnnotationToolbar(range);
        }
    }
});

document.addEventListener("mousedown", function(event) {
    if (!isActive) return; // Exit if the extension is not active

    const toolbar = document.getElementById("floating-toolbar");
    if (toolbar && !toolbar.contains(event.target)) {
        console.log("Clicked outside toolbar, removing toolbar");
        toolbar.remove();
    }

    // Remove annotation toolbar if clicking outside
    const annotationToolbar = document.getElementById("annotation-toolbar");
    if (annotationToolbar && !annotationToolbar.contains(event.target)) {
        console.log("Clicked outside annotation toolbar, removing toolbar");
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
        console.log("Annotation toolbar created");

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
            console.log("View annotation clicked");
            openAllAnnotationsSidebar();
            toolbar.remove();
        });

        removeBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            console.log("Remove annotation clicked");
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

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleActivation') {
        isActive = !isActive;
        console.log(`Extension is now ${isActive ? 'active' : 'inactive'}.`);

        chrome.storage.local.set({ isActive: isActive }, () => {
            if (isActive) {
                showToast("Extension activated.");
            } else {
                showToast("Extension deactivated.");
                // Cleanup UI when deactivated
                const floatingToolbar = document.getElementById("floating-toolbar");
                if (floatingToolbar) floatingToolbar.remove();

                const annotationToolbar = document.getElementById("annotation-toolbar");
                if (annotationToolbar) annotationToolbar.remove();

                const sidebar = document.getElementById("annotation-sidebar");
                if (sidebar) sidebar.style.display = "none";
            }
            sendResponse({ status: `Extension is now ${isActive ? 'active' : 'inactive'}.` });
        });
        return true; // Indicate async
    }

    if (request.action === 'openSidebar') {
        if (isActive) {
            console.log("Message received: Open Annotation Sidebar");
            openAllAnnotationsSidebar();
            sendResponse({ status: "Sidebar opened." });
        } else {
            sendResponse({ status: "Extension inactive. Sidebar not opened." });
        }
        return true;
    }
});

// Ensure we init after DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
} else {
    initialize();
}
