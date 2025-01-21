// src/content/modules/annotation.js

import { showToast } from './ui.js';
import {
  splitRangeByBlockElements,
  calculateFullOffsetUsingMarkers,
  getXPath,
  findTextNode,
  hasOverlappingHighlight,
  hasOverlappingAnnotation,
  rangesIntersect
} from './utils.js';
import { highlightText } from './highlight.js';
import {
  loadSidebar,
  displayAnnotationText,
  displayExistingAnnotations
} from './ui.js';
import { initialize } from './storage.js';

/**
 * ---------------------------------------------------------------------------
 * Re-apply highlight from storage (multi-block)
 * ---------------------------------------------------------------------------
 */
export function applyHighlight(highlight) {
  if (!highlight.subRanges || highlight.subRanges.length === 0) return;
  highlight.subRanges.forEach(sub => {
    const range = document.createRange();
    const startContainer = findTextNode(sub.startXPath);
    const endContainer = findTextNode(sub.endXPath);
    if (startContainer && endContainer) {
      try {
        range.setStart(startContainer, sub.startOffset);
        range.setEnd(endContainer, sub.endOffset);
        if (range.toString().length > 0) {
          console.log(`[DEBUG annotation.js] applyHighlight -> text: "${range.toString()}" ID: ${highlight.id}`);
          highlightText(range, highlight.id, highlight.color || 'yellow');
        }
      } catch (e) {
        console.error("Error applying highlight subrange:", e, sub);
      }
    }
  });
}

/**
 * ---------------------------------------------------------------------------
 * highlightAnnotation - loops each annotation subRange & underlines it
 * ---------------------------------------------------------------------------
 */
export function highlightAnnotation(annotation) {
  if (!annotation.subRanges || annotation.subRanges.length === 0) return;
  annotation.subRanges.forEach(sub => {
    const range = document.createRange();
    const startContainer = findTextNode(sub.startXPath);
    const endContainer = findTextNode(sub.endXPath);
    if (startContainer && endContainer) {
      try {
        range.setStart(startContainer, sub.startOffset);
        range.setEnd(endContainer, sub.endOffset);
        if (range.toString().length > 0) {
          console.log(`[DEBUG annotation.js] highlightAnnotation -> text: "${range.toString()}" ID: ${annotation.id}`);
          applyAnnotationHighlight(range, annotation.id);
        }
      } catch (e) {
        console.error("Error applying annotation subrange:", e, sub);
      }
    }
  });
}

/**
 * ---------------------------------------------------------------------------
 * applyAnnotationHighlight - Extract & Wrap approach to avoid partial nesting
 * ---------------------------------------------------------------------------
 */
export function applyAnnotationHighlight(range, annotationId = null) {
  if (!range || range.collapsed) {
    console.warn("[DEBUG applyAnnotationHighlight] Range is collapsed or invalid.");
    return;
  }

  // Check for overlapping highlights
  if (hasOverlappingHighlight(range)) {
    console.warn("[DEBUG applyAnnotationHighlight] Cannot annotate highlighted text");
    showToast("This feature is not yet supported: Cannot annotate text that is already highlighted. Please select a different text region.");
    return;
  }

  // Check for overlapping annotations
  if (hasOverlappingAnnotation(range)) {
    console.warn("[DEBUG applyAnnotationHighlight] Cannot create overlapping annotation");
    showToast("This feature is not yet supported: Cannot create overlapping annotations. Please select a different text region.");
    return;
  }

  console.log(`[DEBUG applyAnnotationHighlight] Underlining text: "${range.toString()}" annotation ID: ${annotationId}`);
  
  // Create the annotation span
  const span = document.createElement('span');
  span.className = 'annotated-text';
  span.setAttribute('data-annotation-id', annotationId);
  
  try {
    // Wrap the range with the annotation span
    range.surroundContents(span);
  } catch (error) {
    console.error("[DEBUG applyAnnotationHighlight] Error wrapping range:", error);
    throw new Error("Could not create annotation. The selected text may cross HTML elements.");
  }
  
  return {
    range: range,
    id: annotationId
  };
}

/**
 * ---------------------------------------------------------------------------
 * removeAnnotationHighlight
 * ---------------------------------------------------------------------------
 */
export function removeAnnotationHighlight(annotationId) {
  console.log(`[DEBUG removeAnnotationHighlight] Removing annotation highlight ID: ${annotationId}`);
  // No need for DOM manipulation, just return the ID to be removed
  return annotationId;
}

/**
 * ---------------------------------------------------------------------------
 * removeAnnotationById
 * ---------------------------------------------------------------------------
 */
export function removeAnnotationById(annotationId, annotatedElement) {
  console.log(`[DEBUG removeAnnotationById] annotationId: ${annotationId}`);
  chrome.storage.local.get({ annotations: [] }, function(result) {
    let annotations = result.annotations;
    const index = annotations.findIndex(ann => ann.id === Number(annotationId));
    if (index !== -1) {
      const removed = annotations.splice(index, 1)[0];
      chrome.storage.local.set({ annotations: annotations }, function() {
        console.log("[DEBUG removeAnnotationById] Annotation removed from storage:", removed);
        initialize(); // Rebuild from storage after removal
        showToast("Annotation removed successfully!");
      });
    } else {
      console.error("No annotation found with ID:", annotationId);
    }
  });
}

/**
 * ---------------------------------------------------------------------------
 * openAnnotationSidebar - Possibly underlines text, loads sidebar
 * ---------------------------------------------------------------------------
 */
export function openAnnotationSidebar(selectedText, range) {
  console.log("[DEBUG annotation.js] Annotate button clicked, selected text:", selectedText);

  // Check for overlaps before proceeding
  if (hasOverlappingHighlight(range)) {
    console.warn("[DEBUG annotation.js] Cannot annotate highlighted text");
    showToast("This feature is not yet supported: Cannot annotate text that is already highlighted. Please select a different text region.");
    return;
  }

  if (hasOverlappingAnnotation(range)) {
    console.warn("[DEBUG annotation.js] Cannot create overlapping annotation");
    showToast("This feature is not yet supported: Cannot create overlapping annotations. Please select a different text region.");
    return;
  }

  // We'll handle multi-block annotation too
  const subRanges = splitRangeByBlockElements(range);
  
  // Check each subRange for overlaps
  for (const subRange of subRanges) {
    if (hasOverlappingHighlight(subRange)) {
      console.warn("[DEBUG annotation.js] Cannot annotate highlighted text in subrange");
      showToast("This feature is not yet supported: Cannot annotate text that is already highlighted. Please select a different text region.");
      return;
    }
    if (hasOverlappingAnnotation(subRange)) {
      console.warn("[DEBUG annotation.js] Cannot create overlapping annotation in subrange");
      showToast("This feature is not yet supported: Cannot create overlapping annotations. Please select a different text region.");
      return;
    }
  }

  const combinedText = subRanges.map(r => r.toString()).join(' ');

  // Build subRanges data
  const storedSubRanges = subRanges.map(r => {
    const { startOffset, endOffset } = calculateFullOffsetUsingMarkers(r);
    return {
      startOffset,
      endOffset,
      startXPath: getXPath(r.startContainer),
      endXPath: getXPath(r.endContainer)
    };
  });

  // Save annotation to storage
  chrome.storage.local.get({ annotations: [] }, function(result) {
    // Check if any existing annotations overlap with our ranges
    const existingAnnotations = result.annotations;
    for (const existing of existingAnnotations) {
      if (existing.url === window.location.href) {
        for (const existingSubRange of existing.subRanges) {
          const existingRange = document.createRange();
          const startContainer = findTextNode(existingSubRange.startXPath);
          const endContainer = findTextNode(existingSubRange.endXPath);
          if (startContainer && endContainer) {
            existingRange.setStart(startContainer, existingSubRange.startOffset);
            existingRange.setEnd(endContainer, existingSubRange.endOffset);
            
            // Check if any of our subRanges overlap with this existing range
            for (const subRange of subRanges) {
              if (rangesIntersect(subRange, existingRange)) {
                console.warn("[DEBUG annotation.js] Cannot create overlapping annotation");
                showToast("This feature is not yet supported: Cannot create overlapping annotations. Please select a different text region.");
                return;
              }
            }
          }
        }
      }
    }

    // If no overlaps found, proceed with saving
    const annotationData = {
      id: Date.now(),
      text: combinedText,
      url: window.location.href,
      subRanges: storedSubRanges,
      annotationText: ""
    };

    console.log("[DEBUG annotation.js] Annotation data prepared:", JSON.stringify(annotationData, null, 2));

    // Add to storage and open sidebar
    existingAnnotations.push(annotationData);
    chrome.storage.local.set({ annotations: existingAnnotations }, function() {
      console.log("[DEBUG annotation.js] Annotation saved to storage");
      initialize(); // Rebuild from storage

      // Open sidebar
      loadSidebar(() => {
        const sidebar = document.getElementById("annotation-sidebar");
        if (!sidebar) {
          console.error("[ERROR annotation.js] Annotation sidebar not found after loading.");
          return;
        }
        sidebar.style.display = "block";
        const annotationTextElement = document.querySelector(".annotation-text");
        if (annotationTextElement) {
          displayAnnotationText(selectedText, annotationTextElement);
        }
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
          editorContainer.style.display = 'block';
        }
        window.annotationData = annotationData;
        displayExistingAnnotations();
      });
    });
  });
}

/**
 * ---------------------------------------------------------------------------
 * viewAnnotation
 * ---------------------------------------------------------------------------
 */
export function viewAnnotation(annotationId) {
  console.log(`[DEBUG annotation.js] viewAnnotation -> ID: ${annotationId}`);
  chrome.storage.local.get({ annotations: [] }, function(result) {
    const annotations = result.annotations;
    const annotation = annotations.find(ann => ann.id === Number(annotationId));
    if (annotation) {
      console.log("[DEBUG annotation.js] Viewing annotation:", annotation);
      window.annotationData = annotation;
      loadSidebar(() => {
        console.log("[DEBUG annotation.js] Sidebar loaded for viewing annotation.");
        const sidebar = document.getElementById("annotation-sidebar");
        if (sidebar) {
          sidebar.style.display = "block";
          const annotationTextElement = document.querySelector(".annotation-text");
          if (annotationTextElement) {
            displayAnnotationText(annotation.annotationText || annotation.text, annotationTextElement);
          }
          const editorContainer = document.getElementById('editor-container');
          if (editorContainer) {
            editorContainer.style.display = 'none';
          }

          // Display annotations and then animate the clicked one
          displayExistingAnnotations();
          
          // Wait for annotations to be rendered
          setTimeout(() => {
            const annotationItem = document.querySelector(`.annotation-item[data-annotation-id="${annotation.id}"]`);
            if (annotationItem) {
              // First scroll to the item
              annotationItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
              
              // Wait for scroll to complete then add animation
              setTimeout(() => {
                // Remove bounce class from any other items
                document.querySelectorAll('.annotation-item').forEach(item => {
                  item.classList.remove('bounce');
                });
                
                // Add bounce to this item
                annotationItem.classList.add('bounce');
                
                // Remove bounce class after animation completes
                setTimeout(() => {
                  annotationItem.classList.remove('bounce');
                }, 6000); // Match CSS animation duration of 6s
              }, 300); // Wait for scroll to complete
            }
          }, 100); // Wait for annotations to render
        }
      });
    } else {
      console.error("[DEBUG annotation.js] Annotation not found with ID:", annotationId);
    }
  });
}

/**
 * ---------------------------------------------------------------------------
 * openAllAnnotationsSidebar
 * ---------------------------------------------------------------------------
 */
export function openAllAnnotationsSidebar() {
  console.log("[DEBUG annotation.js] Opening annotations sidebar to display all annotations.");
  loadSidebar(() => {
    const sidebar = document.getElementById("annotation-sidebar");
    if (!sidebar) {
      console.error("[ERROR annotation.js] Annotation sidebar not found after loading.");
      return;
    }
    sidebar.style.display = "block";
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
      editorContainer.style.display = 'none';
    }
    displayExistingAnnotations();
  });
}
