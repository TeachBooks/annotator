document.addEventListener('DOMContentLoaded', () => {
    const summaryElement = document.getElementById('summary');
    const openSidebarButton = document.getElementById('open-sidebar');
    const clearHighlightsButton = document.getElementById('clear-highlights');
    const clearAnnotationsButton = document.getElementById('clear-annotations');
    const exportDataButton = document.getElementById('export-data');
    const importDataButton = document.getElementById('import-data');
    const importFileInput = document.getElementById('import-file');
    const toggleExtensionButton = document.getElementById('toggle-extension');
  
    let currentUrl = '';
  
    // Get the current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        currentUrl = new URL(tabs[0].url).href;  // Capture the full URL
        updateSummary(currentUrl);
        updateToggleButton();
    });
  
    // Fetch highlights and annotations from chrome storage for the specific webpage and display summary
    function updateSummary(url) {
        chrome.storage.local.get({ highlights: [], annotations: [] }, (result) => {
            // Filter highlights and annotations by the current webpage URL
            const webpageHighlights = result.highlights.filter(h => h.url === url);
            const webpageAnnotations = result.annotations.filter(a => a.url === url);
  
            const highlightCount = webpageHighlights.length;
            const annotationCount = webpageAnnotations.length;
            
            summaryElement.innerHTML = `
                <p>For this webpage, you have <strong>${highlightCount}</strong> highlights and <strong>${annotationCount}</strong> annotations.</p>
            `;
        });
    }
  
    // Update the Toggle Extension button based on the current activation state
    function updateToggleButton() {
        chrome.storage.local.get(['isActive'], (result) => {
            const isActive = result.isActive || false;
            if (isActive) {
                toggleExtensionButton.textContent = "Deactivate Extension";
                toggleExtensionButton.classList.add('deactivate');
            } else {
                toggleExtensionButton.textContent = "Activate Extension";
                toggleExtensionButton.classList.remove('deactivate');
            }
        });
    }
  
    // Handle Toggle Extension button click
    toggleExtensionButton.addEventListener('click', () => {
        chrome.storage.local.get(['isActive'], (result) => {
            const isActive = result.isActive || false;
            const newState = !isActive;
  
            chrome.storage.local.set({ isActive: newState }, () => {
                // Update the button UI
                if (newState) {
                    toggleExtensionButton.textContent = "Deactivate Extension";
                    toggleExtensionButton.classList.add('deactivate');
                    showToast("Extension activated.");
                } else {
                    toggleExtensionButton.textContent = "Activate Extension";
                    toggleExtensionButton.classList.remove('deactivate');
                    showToast("Extension deactivated.");
                    // Optionally, clear UI elements when deactivated
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, { action: 'deactivate' });
                    });
                }
  
                // Send a message to content scripts to update their state
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0].id) {
                        chrome.tabs.sendMessage(tabs[0].id, { action: newState ? 'activate' : 'deactivate' }, (response) => {
                            if (chrome.runtime.lastError) {
                                console.error("Error sending message to content script:", chrome.runtime.lastError.message);
                            } else {
                                console.log("Content script responded:", response);
                            }
                        });
                    }
                });
            });
        });
    });
  
    // Open the annotation sidebar on the main page when button is clicked
    openSidebarButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'openSidebar' });
        });
    });
  
    // Clear all highlights for the current webpage with confirmation
    clearHighlightsButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all highlights for this webpage?")) {
            chrome.storage.local.get({ highlights: [] }, (result) => {
                const filteredHighlights = result.highlights.filter(h => h.url !== currentUrl); // Exclude highlights for current URL
                chrome.storage.local.set({ highlights: filteredHighlights }, () => {
                    alert("All highlights for this webpage cleared.");
                    updateSummary(currentUrl);  // Update the summary after clearing
                });
            });
        }
    });
  
    // Clear all annotations for the current webpage with confirmation
    clearAnnotationsButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all annotations for this webpage?")) {
            chrome.storage.local.get({ annotations: [] }, (result) => {
                const filteredAnnotations = result.annotations.filter(a => a.url !== currentUrl); // Exclude annotations for current URL
                chrome.storage.local.set({ annotations: filteredAnnotations }, () => {
                    alert("All annotations for this webpage cleared.");
                    updateSummary(currentUrl);  // Update the summary after clearing
                });
            });
        }
    });
  
    // Export highlights and annotations to a JSON file
    exportDataButton.addEventListener('click', () => {
        chrome.storage.local.get({ highlights: [], annotations: [] }, (result) => {
            const data = {
                highlights: result.highlights,
                annotations: result.annotations
            };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'annotations_data.json';
            a.click();
            URL.revokeObjectURL(url);  // Release memory
        });
    });
  
    // Import highlights and annotations from a JSON file
    importDataButton.addEventListener('click', () => {
        importFileInput.click();  // Trigger file input click
    });
  
    // Handle the file input for importing data
    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    chrome.storage.local.get({ highlights: [], annotations: [] }, (result) => {
                        const mergedHighlights = [...result.highlights, ...importedData.highlights];
                        const mergedAnnotations = [...result.annotations, ...importedData.annotations];
  
                        chrome.storage.local.set({ highlights: mergedHighlights, annotations: mergedAnnotations }, () => {
                            alert("Data imported successfully.");
                            updateSummary(currentUrl);  // Update the summary after importing
                        });
                    });
                } catch (error) {
                    alert('Failed to import data: Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    });
  
    // Function to show a toast notification
    function showToast(message) {
        // Remove any existing toast
        const existingToast = document.getElementById('custom-toast');
        if (existingToast) {
            existingToast.remove();
        }
  
        // Create the toast element
        const toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.innerText = message;
  
        // Style the toast
        toast.style.position = 'fixed';
        toast.style.bottom = '20px';
        toast.style.right = '20px';
        toast.style.backgroundColor = '#333';
        toast.style.color = '#fff';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
        toast.style.zIndex = '10000';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';
  
        // Append to the body
        document.body.appendChild(toast);
  
        // Fade in the toast
        setTimeout(() => {
            toast.style.opacity = '1';
        }, 10);
  
        // Remove the toast after 3 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            // Remove the toast after the fade-out transition
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500);
        }, 3000);
    }
  });
  