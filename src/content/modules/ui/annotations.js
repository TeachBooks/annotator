import { splitTextIntoLines } from '../utils.js';
import { removeAnnotationHighlight } from '../annotation.js';
import { initialize } from '../storage.js';
import { showToast } from './toast.js';
import { showConfirmationDialog } from './dialog.js';
import { loadSidebar } from './sidebar.js';

/**
 * Display annotation text with truncation and "More" link
 * @param {string} fullText - The complete text to display
 * @param {HTMLElement} element - The element to display the text in
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
 * Display existing annotations with optional search filtering
 * @param {string} searchQuery - Optional search query to filter annotations
 */
export function displayExistingAnnotations(searchQuery = '') {
  console.log("[DEBUG annotations.js] displayExistingAnnotations called with query:", searchQuery);
  chrome.storage.local.get({ annotations: [] }, function(result) {
    const annotations = result.annotations.filter(a => a.url === window.location.href);
    const annotationList = document.getElementById('annotation-list');
    if (!annotationList) {
      console.error("[DEBUG annotations.js] Annotation list element not found.");
      return;
    }

    annotationList.innerHTML = '';

    const filtered = annotations.filter(a => {
      if (!searchQuery) return true;
      const textMatch = a.text.toLowerCase().includes(searchQuery);
      const annoMatch = (a.annotationText || '').toLowerCase().includes(searchQuery);
      return textMatch || annoMatch;
    });

    console.log("[DEBUG annotations.js] Filtered annotations count:", filtered.length);

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
        console.log("[DEBUG annotations.js] Edit button clicked for annotation:", annotation.id);
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
 * Edit an existing annotation
 * @param {Object} annotation - The annotation to edit
 */
export function editAnnotation(annotation) {
  console.log("[DEBUG annotations.js] Editing annotation:", annotation);
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
 * Delete an annotation
 * @param {string} annotationId - The ID of the annotation to delete
 */
export function deleteAnnotation(annotationId) {
  console.log("[DEBUG annotations.js] Deleting annotation ID:", annotationId);
  chrome.storage.local.get({ annotations: [] }, function(result) {
    const annotations = result.annotations.filter(ann => ann.id !== annotationId);
    chrome.storage.local.set({ annotations: annotations }, function() {
      console.log("[DEBUG annotations.js] Annotation deleted. Updated annotations:", annotations);
      displayExistingAnnotations();
      removeAnnotationHighlight(annotationId);
      initialize(); // Rebuild from storage after deletion
      showToast("Annotation deleted successfully!");
    });
  });
}

// Listen for save/cancel
document.addEventListener("click", function(event) {
  if (event.target && event.target.id === "save-button") {
    console.log("[DEBUG annotations.js] Save button clicked.");
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
      console.error("[DEBUG annotations.js] No annotation data found in window.annotationData.");
    }
  } else if (event.target && event.target.id === "cancel-button") {
    console.log("[DEBUG annotations.js] Cancel button clicked.");
    document.getElementById('editor-container').style.display = 'none';
  }
});
