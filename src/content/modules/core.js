// Import utility functions
import { showToast } from './utils.js';

// **1. Add Activation State Variable**
export let isActive = false; // Extension is inactive by default

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
</write_to_file>
