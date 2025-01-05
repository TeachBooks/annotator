// src/content/modules/ui.js

import { splitTextIntoLines } from './utils.js';
import { removeAnnotationHighlight } from './annotation.js';
import { initialize } from './storage.js';
import { initializeSidebar } from './sidebar.js';

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
  // ...
}

/**
 * loadSidebar
 */
export function loadSidebar(callback) {
  console.log("[DEBUG ui.js] Loading sidebar");
  let container = document.querySelector('.annotation-container');
  let sidebar = document.getElementById('annotation-sidebar');
  
  if (container && sidebar) {
    console.log("[DEBUG ui.js] Sidebar already exists.");
    container.style.display = "flex";
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
      editorContainer.style.display = 'block';
    }
    callback();
    return;
  }

  fetch(chrome.runtime.getURL('src/content/sidebar/sidebar.html'))
    .then(response => response.text())
    .then(data => {
      // Create container if it doesn't exist
      if (!container) {
        container = document.createElement('div');
        container.className = 'annotation-container';
        document.body.appendChild(container);
      }

      // Add resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      container.appendChild(resizeHandle);

      // Insert sidebar HTML into container
      container.insertAdjacentHTML('beforeend', data);
      sidebar = document.getElementById('annotation-sidebar');
      
      if (!sidebar) {
        console.error("[ERROR ui.js] Sidebar element not found after insertion.");
        return;
      }

      // Hide editor container by default
      const editorContainer = document.getElementById('editor-container');
      if (editorContainer) {
        editorContainer.style.display = 'none';
      }

      // Add stylesheets
      const stylesheets = [
        'src/content/sidebar/css/sidebar.css',
        'src/content/sidebar/css/annotations.css',
        'src/content/sidebar/css/buttons.css',
        'src/content/sidebar/css/container.css',
        'src/content/sidebar/css/general.css',
        'src/content/sidebar/css/navigation.css',
        'src/content/sidebar/css/notes.css',
        'src/content/sidebar/css/tags.css',
        'src/content/sidebar/css/topbar.css'
      ];

      stylesheets.forEach(stylesheet => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = chrome.runtime.getURL(stylesheet);
        document.head.appendChild(link);
      });

      // Initialize resize functionality
      initializeSidebar();

      // Setup toggle button
      const toggleButton = document.getElementById('toggle-sidebar-button');
      if (toggleButton) {
        toggleButton.addEventListener('click', function() {
          container.style.display = "none";
          const editorContainer = document.getElementById('editor-container');
          if (editorContainer) {
            editorContainer.style.display = 'none';
          }
        });
      }

      // Restore saved width if any
      const savedWidth = localStorage.getItem('annotationSidebarWidth');
      if (savedWidth) {
        container.style.width = savedWidth;
      }

      callback();
    })
    .catch(err => console.error("[ERROR ui.js] Error loading sidebar:", err));
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
    if (moreLink) {
      moreLink.addEventListener('click', function(event) {
        event.preventDefault();
        element.innerHTML = `<p>${lines.join('<br>')}</p>`;
      });
    }
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
      annotationItem.setAttribute('data-annotation-id', annotation.id);

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
        console.log("[DEBUG ui.js] Edit button clicked for annotation:", annotation.id);
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
  console.log("[DEBUG ui.js] Editing annotation:", annotation);
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
  console.log("[DEBUG ui.js] Deleting annotation ID:", annotationId);
  chrome.storage.local.get({ annotations: [] }, function(result) {
    const annotations = result.annotations.filter(ann => ann.id !== annotationId);
    chrome.storage.local.set({ annotations: annotations }, function() {
      console.log("[DEBUG ui.js] Annotation deleted. Updated annotations:", annotations);
      displayExistingAnnotations();
      removeAnnotationHighlight(annotationId);
      showToast("Annotation deleted successfully!");
    });
  });
}

// Listen for save/cancel
document.addEventListener("click", function(event) {
  if (event.target && event.target.id === "save-button") {
    console.log("[DEBUG ui.js] Save button clicked.");
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
          initialize(); // Rebuild from storage after saving
        });
      });
    } else {
      console.error("[DEBUG ui.js] No annotation data found in window.annotationData.");
    }
  } else if (event.target && event.target.id === "cancel-button") {
    console.log("[DEBUG ui.js] Cancel button clicked.");
    document.getElementById('editor-container').style.display = 'none';
  }
});

/**
 * Example search input logic
 */
document.addEventListener("DOMContentLoaded", function() {
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');

  if (searchButton && searchInput) {
    searchButton.addEventListener('click', function(event) {
      console.log("[DEBUG ui.js] Search button toggled.");
      event.stopPropagation();
      searchInput.classList.toggle('visible');
      if (searchInput.classList.contains('visible')) {
        searchInput.focus();
      } else {
        searchInput.value = '';
        displayExistingAnnotations();
      }
    });

    searchInput.addEventListener('input', function(event) {
      const query = event.target.value.trim().toLowerCase();
      displayExistingAnnotations(query);
    });
  }
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
