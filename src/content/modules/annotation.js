// src/content/modules/annotation.js

import { showToast } from './ui.js';

/**
 * ---------------------------------------------------------------------------
 * showAnnotationToolbar
 * ---------------------------------------------------------------------------
 * (Kept in contentScript originally, but referencing annotation. If you prefer
 *  it in a separate file, adapt accordingly. The original code has showAnnotationToolbar
 *  plus logic for removing or viewing annotation.)
 */

// We'll keep the main "applyAnnotationHighlight", "highlightAnnotation" etc. from original code:

/**
 * Re-apply highlight from storage (multi-block)
 */
export function applyHighlight(highlight) {
    // For multi-block, highlight.subRanges is an array
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
                    highlightText(range, highlight.id, highlight.color || 'yellow');
                }
            } catch (e) {
                console.error("Error applying highlight subrange:", e, sub);
            }
        }
    });
}

/**
 * highlightAnnotation
 */
export function highlightAnnotation(annotation) {
    // For multi-block, annotation.subRanges is an array
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
                    applyAnnotationHighlight(range, annotation.id);
                }
            } catch (e) {
                console.error("Error applying annotation subrange:", e, sub);
            }
        }
    });
}

/**
 * applyAnnotationHighlight
 */
export function applyAnnotationHighlight(range, annotationId = null) {
    const span = document.createElement("span");
    span.className = "annotated-annotation";
    if (annotationId) {
        span.setAttribute('data-annotation-id', annotationId);
    }
    span.style.textDecoration = 'underline';
    span.style.textDecorationColor = 'red';
    range.surroundContents(span);
    console.log("Text underlined with annotation style.");
}

/**
 * removeAnnotationHighlight
 */
export function removeAnnotationHighlight(annotationId) {
    const annotatedElements = document.querySelectorAll(`[data-annotation-id="${annotationId}"]`);
    annotatedElements.forEach(element => {
        const parent = element.parentNode;
        while (element.firstChild) {
            parent.insertBefore(element.firstChild, element);
        }
        parent.removeChild(element);
    });
    console.log(`Annotation highlight with ID ${annotationId} removed from DOM.`);
}

/**
 * removeAnnotationById
 */
export function removeAnnotationById(annotationId, annotatedElement) {
    if (annotatedElement && annotatedElement.parentNode) {
        while (annotatedElement.firstChild) {
            annotatedElement.parentNode.insertBefore(annotatedElement.firstChild, annotatedElement);
        }
        annotatedElement.parentNode.removeChild(annotatedElement);
        console.log("Annotated element removed from DOM.");
    }

    chrome.storage.local.get({ annotations: [] }, function(result) {
        let annotations = result.annotations;
        const index = annotations.findIndex(ann => ann.id === Number(annotationId));
        if (index !== -1) {
            const removed = annotations.splice(index, 1)[0];
            chrome.storage.local.set({ annotations: annotations }, function() {
                console.log("Annotation removed from storage:", removed);
                // Re-display existing annotations in sidebar if needed
                showToast("Annotation removed successfully!");
            });
        } else {
            console.error("No annotation found with ID:", annotationId);
        }
    });
}

/**
 * openAnnotationSidebar
 */
export function openAnnotationSidebar(selectedText, range) {
    console.log("[DEBUG] Annotate button clicked, selected text:", selectedText);

    // We'll handle multi-block annotation too
    const subRanges = splitRangeByBlockElements(range);
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

    const annotationData = {
        id: Date.now(),
        text: combinedText,
        url: window.location.href,
        subRanges: storedSubRanges,
        annotationText: ""
    };

    console.log("[DEBUG] Annotation data prepared:", JSON.stringify(annotationData, null, 2));
    loadSidebar(() => {
        const sidebar = document.getElementById("annotation-sidebar");
        if (!sidebar) {
            console.error("[ERROR] Annotation sidebar not found after loading.");
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
}

/**
 * viewAnnotation
 */
export function viewAnnotation(annotationId) {
    chrome.storage.local.get({ annotations: [] }, function(result) {
        const annotations = result.annotations;
        const annotation = annotations.find(ann => ann.id === Number(annotationId));
        if (annotation) {
            console.log("Viewing annotation:", annotation);
            window.annotationData = annotation;
            loadSidebar(() => {
                console.log("Sidebar loaded for viewing annotation.");
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
                }
            });
        } else {
            console.error("Annotation not found with ID:", annotationId);
        }
    });
}

/**
 * openAllAnnotationsSidebar
 */
export function openAllAnnotationsSidebar() {
    console.log("Opening annotations sidebar to display all annotations.");
    loadSidebar(() => {
        const sidebar = document.getElementById("annotation-sidebar");
        if (!sidebar) {
            console.error("[ERROR] Annotation sidebar not found after loading.");
            return;
        }
        // Make sure the sidebar is visible
        sidebar.style.display = "block";
        // Just display existing annotations; no new annotation is created
        displayExistingAnnotations();
    });
}

// Below imports or references come from your original code. 
// We must keep them exactly:
import {
    loadSidebar,
    displayAnnotationText,
    displayExistingAnnotations
} from './ui.js';

import {
    splitRangeByBlockElements,
    calculateFullOffsetUsingMarkers,
    getXPath
} from './utils.js';

import {
    highlightText
} from './highlight.js';
