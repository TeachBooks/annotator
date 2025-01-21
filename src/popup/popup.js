document.addEventListener('DOMContentLoaded', () => {
    // Menu buttons and panels
    const showStatsButton = document.getElementById('show-stats');
    const showFiltersButton = document.getElementById('show-filters');
    const summaryPanel = document.getElementById('summary');
    const filterPanel = document.querySelector('.filter-section');
    const exportPanel = document.querySelector('.export-options');
    const confirmExportButton = document.getElementById('confirm-export');

    // Action buttons
    const openSidebarButton = document.getElementById('open-sidebar');
    const clearHighlightsButton = document.getElementById('clear-highlights');
    const clearAnnotationsButton = document.getElementById('clear-annotations');
    const exportDataButton = document.getElementById('export-data');
    const importDataButton = document.getElementById('import-data');
    const importFileInput = document.getElementById('import-file');
    const toggleExtensionButton = document.getElementById('toggle-extension');

    // Menu button click handlers
    showStatsButton.addEventListener('click', () => {
        summaryPanel.classList.add('active');
        filterPanel.classList.remove('active');
        exportPanel.classList.remove('active');
        showStatsButton.style.backgroundColor = '#357abd';
        showFiltersButton.style.backgroundColor = '#4a90e2';
        exportDataButton.textContent = 'Export Data';
    });

    showFiltersButton.addEventListener('click', () => {
        summaryPanel.classList.remove('active');
        filterPanel.classList.add('active');
        exportPanel.classList.remove('active');
        showStatsButton.style.backgroundColor = '#4a90e2';
        showFiltersButton.style.backgroundColor = '#357abd';
        exportDataButton.textContent = 'Export Data';
    });

    // Show stats panel by default
    showStatsButton.click();

    // Filter checkboxes
    const showAnnotationsCheckbox = document.getElementById('show-annotations');
    const showYellowCheckbox = document.getElementById('show-yellow');
    const showPinkCheckbox = document.getElementById('show-pink');
    const showGreenCheckbox = document.getElementById('show-green');
    const showBlueCheckbox = document.getElementById('show-blue');

    // Export checkboxes
    const exportAnnotationsCheckbox = document.getElementById('export-annotations');
    const exportYellowCheckbox = document.getElementById('export-yellow');
    const exportPinkCheckbox = document.getElementById('export-pink');
    const exportGreenCheckbox = document.getElementById('export-green');
    const exportBlueCheckbox = document.getElementById('export-blue');

    let currentUrl = '';

    // Get the current tab URL
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        currentUrl = new URL(tabs[0].url).href;
        updateSummary(currentUrl);
        updateToggleButton();
        loadFilterState(); // Load saved filter state
    });

    // Save filter state to storage
    function saveFilterState() {
        const filterState = {
            showAnnotations: showAnnotationsCheckbox.checked,
            showYellow: showYellowCheckbox.checked,
            showPink: showPinkCheckbox.checked,
            showGreen: showGreenCheckbox.checked,
            showBlue: showBlueCheckbox.checked
        };
        chrome.storage.local.set({ filterState });
    }

    // Load filter state from storage
    function loadFilterState() {
        chrome.storage.local.get({ filterState: {
            showAnnotations: true,
            showYellow: true,
            showPink: true,
            showGreen: true,
            showBlue: true
        }}, (result) => {
            showAnnotationsCheckbox.checked = result.filterState.showAnnotations;
            showYellowCheckbox.checked = result.filterState.showYellow;
            showPinkCheckbox.checked = result.filterState.showPink;
            showGreenCheckbox.checked = result.filterState.showGreen;
            showBlueCheckbox.checked = result.filterState.showBlue;
            
            // Apply initial filter state
            applyFilters();
        });
    }

    // Apply filters to the page
    function applyFilters() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: 'applyFilters',
                filters: {
                    showAnnotations: showAnnotationsCheckbox.checked,
                    showYellow: showYellowCheckbox.checked,
                    showPink: showPinkCheckbox.checked,
                    showGreen: showGreenCheckbox.checked,
                    showBlue: showBlueCheckbox.checked
                }
            });
        });
        saveFilterState();
    }

    // Add filter change listeners
    [showAnnotationsCheckbox, showYellowCheckbox, showPinkCheckbox, 
     showGreenCheckbox, showBlueCheckbox].forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });

    // Fetch highlights and annotations from chrome storage for the specific webpage and display summary
    function updateSummary(url) {
        chrome.storage.local.get({ highlights: [], annotations: [] }, (result) => {
            const webpageHighlights = result.highlights.filter(h => h.url === url);
            const webpageAnnotations = result.annotations.filter(a => a.url === url);

            const highlightsByColor = {
                yellow: webpageHighlights.filter(h => h.color === 'rgba(255, 255, 0, 0.4)').length,
                pink: webpageHighlights.filter(h => h.color === 'rgba(255, 192, 203, 0.4)').length,
                green: webpageHighlights.filter(h => h.color === 'rgba(144, 238, 144, 0.4)').length,
                blue: webpageHighlights.filter(h => h.color === 'rgba(173, 216, 230, 0.4)').length
            };

            summaryPanel.innerHTML = `
                <p>For this webpage:</p>
                <ul style="margin: 5px 0; padding-left: 20px;">
                    <li>Yellow highlights: ${highlightsByColor.yellow}</li>
                    <li>Pink highlights: ${highlightsByColor.pink}</li>
                    <li>Green highlights: ${highlightsByColor.green}</li>
                    <li>Blue highlights: ${highlightsByColor.blue}</li>
                    <li>Annotations: ${webpageAnnotations.length}</li>
                </ul>
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
                if (newState) {
                    toggleExtensionButton.textContent = "Deactivate Extension";
                    toggleExtensionButton.classList.add('deactivate');
                    showToast("Extension activated.");
                } else {
                    toggleExtensionButton.textContent = "Activate Extension";
                    toggleExtensionButton.classList.remove('deactivate');
                    showToast("Extension deactivated.");
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        chrome.tabs.sendMessage(tabs[0].id, { action: 'deactivate' });
                    });
                }

                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0].id) {
                        chrome.tabs.sendMessage(tabs[0].id, { 
                            action: newState ? 'activate' : 'deactivate' 
                        });
                    }
                });
            });
        });
    });

    // Open the annotation sidebar
    openSidebarButton.addEventListener('click', () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'openSidebar' });
        });
    });

    // Clear all highlights for the current webpage
    clearHighlightsButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all highlights for this webpage?")) {
            chrome.storage.local.get({ highlights: [] }, (result) => {
                const filteredHighlights = result.highlights.filter(h => h.url !== currentUrl);
                chrome.storage.local.set({ highlights: filteredHighlights }, () => {
                    showToast("All highlights for this webpage cleared.");
                    updateSummary(currentUrl);
                });
            });
        }
    });

    // Clear all annotations for the current webpage
    clearAnnotationsButton.addEventListener('click', () => {
        if (confirm("Are you sure you want to clear all annotations for this webpage?")) {
            chrome.storage.local.get({ annotations: [] }, (result) => {
                const filteredAnnotations = result.annotations.filter(a => a.url !== currentUrl);
                chrome.storage.local.set({ annotations: filteredAnnotations }, () => {
                    showToast("All annotations for this webpage cleared.");
                    updateSummary(currentUrl);
                });
            });
        }
    });

    // Show export options when clicking export
    exportDataButton.addEventListener('click', () => {
        summaryPanel.classList.remove('active');
        filterPanel.classList.remove('active');
        exportPanel.classList.add('active');
        showStatsButton.style.backgroundColor = '#4a90e2';
        showFiltersButton.style.backgroundColor = '#4a90e2';
    });

    // Handle export when clicking confirm export
    confirmExportButton.addEventListener('click', () => {
        // Export with filters
        chrome.storage.local.get({ highlights: [], annotations: [] }, (result) => {
            const filteredData = {
                highlights: result.highlights.filter(h => {
                    if (h.url !== currentUrl) return false;
                    switch (h.color) {
                        case 'rgba(255, 255, 0, 0.4)': return exportYellowCheckbox.checked;
                        case 'rgba(255, 192, 203, 0.4)': return exportPinkCheckbox.checked;
                        case 'rgba(144, 238, 144, 0.4)': return exportGreenCheckbox.checked;
                        case 'rgba(173, 216, 230, 0.4)': return exportBlueCheckbox.checked;
                        default: return false;
                    }
                }),
                annotations: exportAnnotationsCheckbox.checked ? 
                    result.annotations.filter(a => a.url === currentUrl) : []
            };

            const blob = new Blob([JSON.stringify(filteredData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'annotations_data.json';
            a.click();
            URL.revokeObjectURL(url);

            // Reset export panel and show stats
            exportPanel.classList.remove('active');
            summaryPanel.classList.add('active');
            showStatsButton.style.backgroundColor = '#357abd';
            showFiltersButton.style.backgroundColor = '#4a90e2';
            showToast("Data exported successfully!");
        });
    });

    // Import data
    importDataButton.addEventListener('click', () => {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    chrome.storage.local.get({ highlights: [], annotations: [] }, (result) => {
                        // Remove existing items for current URL
                        const existingHighlights = result.highlights.filter(h => h.url !== currentUrl);
                        const existingAnnotations = result.annotations.filter(a => a.url !== currentUrl);

                        // Add imported items
                        const mergedHighlights = [...existingHighlights, ...importedData.highlights];
                        const mergedAnnotations = [...existingAnnotations, ...importedData.annotations];

                        chrome.storage.local.set({ 
                            highlights: mergedHighlights, 
                            annotations: mergedAnnotations 
                        }, () => {
                            showToast("Data imported successfully.");
                            updateSummary(currentUrl);
                        });
                    });
                } catch (error) {
                    showToast('Failed to import data: Invalid JSON file.');
                }
            };
            reader.readAsText(file);
        }
    });

    // Function to show a toast notification
    function showToast(message) {
        const existingToast = document.getElementById('custom-toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.id = 'custom-toast';
        toast.innerText = message;

        Object.assign(toast.style, {
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: '#333',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: '5px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            zIndex: '10000',
            opacity: '0',
            transition: 'opacity 0.5s ease'
        });

        document.body.appendChild(toast);
        setTimeout(() => toast.style.opacity = '1', 10);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 3000);
    }
});
