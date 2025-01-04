// src/content/modules/ui.js

import { splitTextIntoLines } from './utils.js';
import { removeAnnotationHighlight } from './annotation.js';

/**
 * showToast
 */
export function showToast(message) {
    const existingToast = document.getElementById('custom-toast');
    if (existingToast) {
        existingToast.remove();
    }
    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.innerText = message;
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
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 500);
    }, 3000);
}

/**
 * showConfirmationDialog
 */
export function showConfirmationDialog(message, onConfirm) {
    const existingDialog = document.getElementById('custom-confirmation-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    const overlay = document.createElement('div');
    overlay.id = 'custom-dialog-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '10000';

    const dialog = document.createElement('div');
    dialog.id = 'custom-confirmation-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = '#fff';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '5px';
    dialog.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    dialog.style.zIndex = '10001';

    const messageElem = document.createElement('p');
    messageElem.innerText = message;
    dialog.appendChild(messageElem);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'flex-end';
    buttonsContainer.style.marginTop = '20px';

    const cancelButton = document.createElement('button');
    cancelButton.innerText = 'Cancel';
    cancelButton.style.marginRight = '10px';
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });

    const confirmButton = document.createElement('button');
    confirmButton.innerText = 'Confirm';
    confirmButton.style.backgroundColor = '#007bff';
    confirmButton.style.color = '#fff';
    confirmButton.style.border = 'none';
    confirmButton.style.padding = '5px 10px';
    confirmButton.style.borderRadius = '3px';
    confirmButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });

    buttonsContainer.appendChild(cancelButton);
    buttonsContainer.appendChild(confirmButton);
    dialog.appendChild(buttonsContainer);
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
}

/**
 * loadSidebar
 */
export function loadSidebar(callback) {
    console.log("[DEBUG] Loading sidebar");
    let sidebar = document.getElementById('annotation-sidebar');
    if (sidebar) {
        console.log("[DEBUG] Sidebar already exists.");
        sidebar.style.display = "block";
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            editorContainer.style.display = "block";
        }
        callback();
        return;
    }

    fetch(chrome.runtime.getURL('src/content/sidebar/sidebar.html'))
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('beforeend', data);
            sidebar = document.getElementById('annotation-sidebar');
            if (!sidebar) {
                console.error("[ERROR] Sidebar element not found after insertion.");
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('src/content/sidebar/css/sidebar.css');
            document.head.appendChild(link);

            const toggleButton = document.getElementById('toggle-sidebar-button');
            if (toggleButton) {
                toggleButton.addEventListener('click', function() {
                    sidebar.style.display = "none";
                    const editorContainer = document.getElementById('editor-container');
                    if (editorContainer) {
                        editorContainer.style.display = "none";
                    }
                });
            }
            callback();
        })
        .catch(err => console.error("[ERROR] Error loading sidebar:", err));
}

/**
 * displayAnnotationText
 */
export function displayAnnotationText(fullText, element) {
    const maxLineLength = 50;
    const maxLines = 2;

    const lines = splitTextIntoLines(fullText, maxLineLength);
    let truncatedText = lines.slice(0, maxLines).join('<br>');

    if (lines.length > maxLines) {
        truncatedText = truncatedText.replace(/<br>$/, '') + '...<a href="#" class="more-link">More</a>';
    }

    element.innerHTML = `<p>${truncatedText}</p>`;
    if (lines.length > maxLines) {
        const moreLink = element.querySelector('.more-link');
        moreLink.addEventListener('click', function(event) {
            event.preventDefault();
            element.innerHTML = `<p>${lines.join('<br>')}</p>`;
        });
    }
}

/**
 * displayExistingAnnotations
 */
export function displayExistingAnnotations(searchQuery = '') {
    chrome.storage.local.get({ annotations: [] }, function(result) {
        const annotations = result.annotations.filter(a => a.url === window.location.href);
        const annotationList = document.getElementById('annotation-list');
        if (!annotationList) return;

        annotationList.innerHTML = '';

        const filtered = annotations.filter(a => {
            const textMatch = a.text.toLowerCase().includes(searchQuery);
            const annoMatch = (a.annotationText || '').toLowerCase().includes(searchQuery);
            return textMatch || annoMatch;
        });

        if (filtered.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerText = 'No annotations found.';
            annotationList.appendChild(noResults);
            return;
        }

        filtered.forEach(annotation => {
            const annotationItem = document.createElement('div');
            annotationItem.className = 'annotation-item';

            // Create header
            const header = document.createElement('div');
            header.className = 'annotation-item-header';

            const selectedTextElement = document.createElement('div');
            selectedTextElement.className = 'selected-text';
            selectedTextElement.innerText = annotation.text;

            const dateElement = document.createElement('div');
            dateElement.className = 'annotation-date';
            const date = new Date(annotation.id);
            dateElement.innerText = date.toLocaleString();

            header.appendChild(selectedTextElement);
            header.appendChild(dateElement);

            const annotationTextElement = document.createElement('div');
            annotationTextElement.className = 'annotation-text-content';
            displayAnnotationText(annotation.annotationText || '', annotationTextElement);

            const actions = document.createElement('div');
            actions.className = 'annotation-actions';

            const editButton = document.createElement('button');
            editButton.className = 'edit-annotation';
            editButton.innerText = 'Edit';
            editButton.addEventListener('click', function() {
                console.log("Edit button clicked for annotation:", annotation.id);
                editAnnotation(annotation);
            });

            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-annotation';
            deleteButton.innerText = 'Delete';
            deleteButton.addEventListener('click', function() {
                showConfirmationDialog('Are you sure you want to delete this annotation?', function() {
                    deleteAnnotation(annotation.id);
                });
            });

            actions.appendChild(editButton);
            actions.appendChild(deleteButton);

            annotationItem.appendChild(header);
            annotationItem.appendChild(annotationTextElement);
            annotationItem.appendChild(actions);

            annotationList.appendChild(annotationItem);
        });
    });
}

/**
 * editAnnotation
 */
export function editAnnotation(annotation) {
    console.log("Editing annotation:", annotation);
    window.annotationData = annotation;
    loadSidebar(() => {
        const sidebar = document.getElementById("annotation-sidebar");
        if (sidebar) {
            sidebar.style.display = 'block';
            const editorContainer = document.getElementById('editor-container');
            if (editorContainer) {
                editorContainer.style.display = 'block';
                const annotationTextElement = document.querySelector(".annotation-text");
                if (annotationTextElement) {
                    displayAnnotationText(annotation.text, annotationTextElement);
                }
                const annotationEditor = document.getElementById("annotation-editor");
                if (annotationEditor) {
                    annotationEditor.innerText = annotation.annotationText || '';
                }
            }
        }
    });
}

/**
 * deleteAnnotation
 */
export function deleteAnnotation(annotationId) {
    chrome.storage.local.get({ annotations: [] }, function(result) {
        const annotations = result.annotations.filter(ann => ann.id !== annotationId);
        chrome.storage.local.set({ annotations: annotations }, function() {
            console.log("Annotation deleted. Updated:", JSON.stringify(annotations, null, 2));
            displayExistingAnnotations();
            removeAnnotationHighlight(annotationId);
            showToast("Annotation deleted successfully!");
        });
    });
}

// Listen for save / cancel in the original code:
document.addEventListener("click", function(event) {
    if (event.target && event.target.id === "save-button") {
        console.log("Save button clicked.");
        const annotationText = document.getElementById("annotation-editor").innerText;
        if (window.annotationData) {
            const annotationData = {
                ...window.annotationData,
                annotationText
            };
            chrome.storage.local.get({ annotations: [] }, function(result) {
                let annotations = result.annotations;
                const existingIndex = annotations.findIndex(ann => ann.id === annotationData.id);
                if (existingIndex !== -1) {
                    removeAnnotationHighlight(annotationData.id);
                    annotations[existingIndex] = annotationData;
                } else {
                    annotations.push(annotationData);
                }
                chrome.storage.local.set({ annotations: annotations }, function() {
                    showToast("Annotation saved successfully!");
                    document.getElementById("annotation-editor").innerText = '';
                    document.getElementById('editor-container').style.display = 'none';
                    displayExistingAnnotations();
                });
            });
        } else {
            console.error("No annotation data found in window.annotationData.");
        }
    } else if (event.target && event.target.id === "cancel-button") {
        console.log("Cancel button clicked.");
        document.getElementById('editor-container').style.display = 'none';
    }
});

/**
 * openAllAnnotationsSidebar is also in annotation.js. 
 * If you need to unify them, do so, but here we keep the code verbatim.
 */

/**
 * Existing Code: DOMContentLoaded for search input
 */
document.addEventListener("DOMContentLoaded", function() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');

    // Toggle search input when search button is clicked
    searchButton.addEventListener('click', function(event) {
        console.log("Search button toggled.");
        event.stopPropagation();
        searchInput.classList.toggle('visible');
        if (searchInput.classList.contains('visible')) {
            searchInput.focus();
        } else {
            searchInput.value = '';
            displayExistingAnnotations();
        }
    });

    // Handle search input
    searchInput.addEventListener('input', function(event) {
        const query = event.target.value.trim().toLowerCase();
        displayExistingAnnotations(query);
    });
});

/* Inject Tooltip Styles Dynamically (If Not Using External CSS) */
(function() {
    if (!document.getElementById('annotation-tooltip-style')) {
        const style = document.createElement('style');
        style.id = 'annotation-tooltip-style';
        style.textContent = `
            .annotation-tooltip {
                position: absolute;
                background-color: #f9f9f9;
                color: #333333;
                padding: 10px 15px;
                border-radius: 6px;
                font-size: 14px;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-width: 300px;
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
                white-space: pre-wrap;
            }
            .annotation-tooltip::after {
                content: "";
                position: absolute;
                bottom: -10px;
                left: 20px;
                border-width: 10px 10px 0 10px;
                border-style: solid;
                border-color: #f9f9f9 transparent transparent transparent;
            }
        `;
        document.head.appendChild(style);
    }
})();

/* Tooltip Handling */
function showAnnotationTooltip(element, annotationId) {
    chrome.storage.local.get(['annotations'], function(result) {
        const annotations = result.annotations;
        const annotation = annotations.find(ann => ann.id === Number(annotationId));

        if (annotation && annotation.annotationText) {
            let tooltip = document.getElementById('annotation-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'annotation-tooltip';
                tooltip.className = 'annotation-tooltip';
                tooltip.setAttribute('role', 'tooltip');
                document.body.appendChild(tooltip);
            }

            tooltip.innerText = annotation.annotationText;
            tooltip.style.top = '0px';
            tooltip.style.left = '0px';
            tooltip.style.opacity = '0';
            tooltip.style.display = 'block';

            requestAnimationFrame(() => {
                const rect = element.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                const scrollY = window.scrollY || window.pageYOffset;
                const scrollX = window.scrollX || window.pageXOffset;

                let top = scrollY + rect.top - tooltipRect.height - 15;
                let left = scrollX + rect.left + (rect.width - tooltipRect.width) / 2;
                if (top < scrollY) {
                    top = scrollY + rect.bottom + 15;
                    tooltip.style.setProperty('--arrow-position', 'top');
                } else {
                    tooltip.style.setProperty('--arrow-position', 'bottom');
                }
                left = Math.max(scrollX + 10, Math.min(left, scrollX + window.innerWidth - tooltipRect.width - 10));

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
                tooltip.style.opacity = '1';
            });
        }
    });
}

function hideAnnotationTooltip() {
    const tooltip = document.getElementById('annotation-tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 300);
    }
}

document.addEventListener('mouseover', function(event) {
    const annotatedElement = event.target.closest('.annotated-annotation');
    if (annotatedElement) {
        const annotationId = annotatedElement.getAttribute('data-annotation-id');
        if (annotationId) {
            showAnnotationTooltip(annotatedElement, annotationId);
        }
    }
});

document.addEventListener('mouseout', function(event) {
    const annotatedElement = event.target.closest('.annotated-annotation');
    if (annotatedElement) {
        hideAnnotationTooltip();
    }
});
