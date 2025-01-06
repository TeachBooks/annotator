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

      // Initialize search functionality
      initializeSearch();
      
      callback();
    })
    .catch(err => console.error("[ERROR ui.js] Error loading sidebar:", err));
}

// Export initializeSearch so it can be called from other modules if needed
export { initializeSearch };

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
  console.log("[DEBUG ui.js] displayExistingAnnotations called with query:", searchQuery);
  chrome.storage.local.get({ annotations: [] }, function(result) {
    const annotations = result.annotations.filter(a => a.url === window.location.href);
    const annotationList = document.getElementById('annotation-list');
    if (!annotationList) {
      console.error("[DEBUG ui.js] Annotation list element not found.");
      return;
    }

    annotationList.innerHTML = '';

    const filtered = annotations.filter(a => {
      if (!searchQuery) return true;
      const textMatch = a.text.toLowerCase().includes(searchQuery);
      const annoMatch = (a.annotationText || '').toLowerCase().includes(searchQuery);
      return textMatch || annoMatch;
    });

    console.log("[DEBUG ui.js] Filtered annotations count:", filtered.length);

    if (filtered.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-results';
      noResults.innerText = searchQuery ? 'No matching annotations found.' : 'No annotations found.';
      annotationList.appendChild(noResults);
      return;
    }

    filtered.forEach(annotation => {
      // Highlight matching text if there's a search query
      const highlightText = (text) => {
        if (!searchQuery) return text;
        const regex = new RegExp(`(${searchQuery})`, 'gi');
        return text.replace(regex, '<span class="search-match">$1</span>');
      };
      const annotationItem = document.createElement('div');
      annotationItem.className = 'annotation-item';
      annotationItem.setAttribute('data-annotation-id', annotation.id);

      // Create header
      const header = document.createElement('div');
      header.className = 'annotation-item-header';

      const selectedTextElement = document.createElement('div');
      selectedTextElement.className = 'selected-text';
      selectedTextElement.innerHTML = highlightText(annotation.text);

      const dateElement = document.createElement('div');
      dateElement.className = 'annotation-date';
      const date = new Date(annotation.id);
      dateElement.innerText = date.toLocaleString();

      header.appendChild(selectedTextElement);
      header.appendChild(dateElement);

      const annotationTextElement = document.createElement('div');
      annotationTextElement.className = 'annotation-text-content';
      
      // For annotation text, we need to handle the "More" link differently
      if (annotation.annotationText) {
        const lines = splitTextIntoLines(annotation.annotationText, 50);
        const maxLines = 2;
        let displayText = lines.slice(0, maxLines).join('<br>');
        
        if (lines.length > maxLines) {
          displayText = displayText.replace(/<br>$/, '') + '...<a href="#" class="more-link">More</a>';
        }
        
        // Apply search highlighting
        displayText = highlightText(displayText);
        annotationTextElement.innerHTML = `<p>${displayText}</p>`;
        
        // Re-attach more link handler if present
        const moreLink = annotationTextElement.querySelector('.more-link');
        if (moreLink) {
          moreLink.addEventListener('click', function(event) {
            event.preventDefault();
            annotationTextElement.innerHTML = `<p>${highlightText(lines.join('<br>'))}</p>`;
          });
        }
      }

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
 * Search functionality
 */
let searchInitialized = false;

function initializeSearch() {
  if (searchInitialized) {
    console.log("[DEBUG ui.js] Search already initialized, skipping");
    return;
  }

  console.log("[DEBUG ui.js] Initializing search functionality");
  const topBar = document.getElementById('top-bar');
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');
  const backButton = document.getElementById('back-button');

  if (!topBar || !searchButton || !searchInput || !backButton) {
    console.error("[ERROR ui.js] Search elements not found:", {
      topBar: !!topBar,
      searchButton: !!searchButton,
      searchInput: !!searchInput,
      backButton: !!backButton
    });
    return;
  }

  // Handle search activation
  const activateSearch = function(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    console.log("[DEBUG ui.js] Search activated");
    
    // Always ensure search mode is active
    topBar.classList.add('search-mode');
    
    // Force a reflow to ensure the transition works
    void topBar.offsetWidth;
    
    // Focus the input after the transition
    setTimeout(() => {
      searchInput.focus();
      // Ensure the input is visible and interactive
      searchInput.style.opacity = '1';
      searchInput.style.visibility = 'visible';
      searchInput.style.pointerEvents = 'auto';
      searchInput.style.width = '100%';
      searchInput.style.maxWidth = '100%';
    }, 100);
  };

  // Add click event listener to the search button
  searchButton.addEventListener('click', activateSearch);
  
  // Ensure the search icon click also triggers search
  const searchIcon = searchButton.querySelector('i.fa-search');
  if (searchIcon) {
    searchIcon.addEventListener('click', function(event) {
      event.stopPropagation();
      activateSearch(event);
    });
  }

  // Back button click handler
  backButton.addEventListener('click', function() {
    console.log("[DEBUG ui.js] Back button clicked.");
    topBar.classList.remove('search-mode');
    searchInput.value = '';
    searchInput.style.width = '0';
    searchInput.style.maxWidth = '0';
    displayExistingAnnotations();
  });

  // Define search handler
  function handleSearch(event) {
    console.log("[DEBUG ui.js] Search input event triggered:", event.type);
    const query = event.target.value.trim().toLowerCase();
    console.log("[DEBUG ui.js] Search input changed. Query:", query);
    
    // Log the current state
    console.log("[DEBUG ui.js] Search input element:", {
      value: searchInput.value,
      visibility: searchInput.style.visibility,
      opacity: searchInput.style.opacity,
      width: searchInput.style.width,
      display: searchInput.style.display
    });
    
    // Force immediate update
    displayExistingAnnotations(query);
  }

  // Create a debounced version of the search handler
  let searchTimeout;
  function debouncedSearch(event) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleSearch(event), 100);
  }

  // Add event listeners
  searchInput.addEventListener('input', debouncedSearch);
  searchInput.addEventListener('keyup', debouncedSearch);
  searchInput.addEventListener('change', debouncedSearch);

  // Also add direct property handlers
  searchInput.oninput = debouncedSearch;
  searchInput.onkeyup = debouncedSearch;
  searchInput.onchange = debouncedSearch;

  // Add focus handler to ensure input is ready
  searchInput.addEventListener('focus', function() {
    console.log("[DEBUG ui.js] Search input focused");
    if (!topBar.classList.contains('search-mode')) {
      activateSearch();
    }
  });

  // Handle escape key and other keyboard events
  searchInput.addEventListener('keydown', function(event) {
    console.log("[DEBUG ui.js] Search input keydown:", event.key);
    if (event.key === 'Escape') {
      backButton.click();
    } else if (event.key === 'Enter') {
      handleSearch(event);
    }
  });

  // Ensure search mode is properly activated
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer) {
    searchContainer.addEventListener('click', function(event) {
      console.log("[DEBUG ui.js] Search container clicked");
      if (!topBar.classList.contains('search-mode')) {
        activateSearch();
      }
      searchInput.focus();
    });
  }

  // Mark as initialized
  searchInitialized = true;
  console.log("[DEBUG ui.js] Search initialization complete");
}

// Initialize search when sidebar is loaded
function setupSearch() {
  console.log("[DEBUG ui.js] Setting up search functionality");

  function tryInitialize() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      console.log("[DEBUG ui.js] Search input found, initializing");
      
      // Force the input to be interactive
      searchInput.style.pointerEvents = 'auto';
      searchInput.style.visibility = 'visible';
      searchInput.style.opacity = '1';
      
      // Initialize search functionality
      initializeSearch();
      
      // Add direct event listener for input
      searchInput.addEventListener('input', function(event) {
        const query = event.target.value.trim().toLowerCase();
        console.log("[DEBUG ui.js] Direct input event. Query:", query);
        displayExistingAnnotations(query);
      });
      
      return true;
    }
    return false;
  }

  // Try to initialize immediately
  if (!tryInitialize()) {
    console.log("[DEBUG ui.js] Search input not found, setting up observer");
    
    // Set up observer to wait for the search input
    const observer = new MutationObserver(function(mutations) {
      if (tryInitialize()) {
        console.log("[DEBUG ui.js] Search initialized via observer");
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Set up search when the module loads
setupSearch();

// Also set up search when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupSearch);
} else {
  setupSearch();
}

// Add a global handler for search input
document.addEventListener('input', function(event) {
  if (event.target && event.target.id === 'search-input') {
    const query = event.target.value.trim().toLowerCase();
    console.log("[DEBUG ui.js] Global input event. Query:", query);
    displayExistingAnnotations(query);
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
