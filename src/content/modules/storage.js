// src/content/modules/storage.js

import {
    calculateFullOffsetUsingMarkers,
    getXPath,
    findTextNode,
    hasOverlappingHighlight,
    hasOverlappingAnnotation
  } from './utils.js';
  
import { highlightText } from './highlight.js';
import { applyAnnotationHighlight } from './annotation.js';
import { showToast } from './ui.js';
  
/**
 * ---------------------------------------------------------------------------
 * Store MULTIPLE subranges in one highlight record
 * ---------------------------------------------------------------------------
 */
export function saveMultiBlockHighlight(subRanges, color) {
  // Check for overlaps before saving
  for (const range of subRanges) {
    if (hasOverlappingHighlight(range)) {
      console.warn("[DEBUG storage] Cannot create overlapping highlight");
      showToast("This feature is not yet supported: Cannot create overlapping highlights. Please select a different text region.");
      return;
    }
    if (hasOverlappingAnnotation(range)) {
      console.warn("[DEBUG storage] Cannot highlight annotated text");
      showToast("This feature is not yet supported: Cannot highlight text that is already annotated. Please select a different text region.");
      return;
    }
  }

  // If no overlaps, proceed with saving
  const highlightId = Date.now();
  const combinedText = subRanges.map(r => r.toString?.() || '').join(' ');

  const storedSubRanges = [];
  subRanges.forEach(range => {
    const { startOffset, endOffset } = calculateFullOffsetUsingMarkers(range);
    storedSubRanges.push({
      startOffset,
      endOffset,
      startXPath: getXPath(range.startContainer),
      endXPath: getXPath(range.endContainer),
    });
  });

  const highlightData = {
    id: highlightId,
    text: combinedText,
    url: window.location.href,
    color: color,
    subRanges: storedSubRanges
  };

  console.log("[DEBUG storage] Saving multi-block highlight:", highlightData);
  chrome.storage.local.get({ highlights: [] }, function(result) {
    const highlights = result.highlights;
    highlights.push(highlightData);
    chrome.storage.local.set({ highlights: highlights }, function() {
      console.log("[DEBUG storage] Multi-block highlight saved. Current highlights:", highlights);
      initialize(); // Rebuild highlights from storage after saving
    });
  });
}
  
/**
 * ---------------------------------------------------------------------------
 * Removing highlight from storage by ID
 * ---------------------------------------------------------------------------
 */
export function removeHighlightFromStorageById(highlightId) {
  console.log("[DEBUG storage] removeHighlightFromStorageById ->", highlightId);
  chrome.storage.local.get({ highlights: [] }, function(result) {
    const highlights = result.highlights;
    const indexToRemove = highlights.findIndex(high => high.id == highlightId);
    if (indexToRemove !== -1) {
      console.log("[DEBUG storage] Found highlight to remove:", highlights[indexToRemove]);
      highlights.splice(indexToRemove, 1);
      chrome.storage.local.set({ highlights: highlights }, function() {
        console.log("[DEBUG storage] Updated highlights after removal:", highlights);
        initialize(); // Rebuild highlights from storage after removal
      });
    } else {
      console.log("[DEBUG storage] No matching highlight found in storage for ID:", highlightId);
    }
  });
}
  
/**
 * removeHighlightFromStorage (for partial backward compatibility)
 */
export function removeHighlightFromStorage(range) {
  console.log("[DEBUG storage] removeHighlightFromStorage -> Calculating offsets");
  const { startOffset, endOffset } = calculateFullOffsetUsingMarkers(range);
  chrome.storage.local.get({ highlights: [] }, function(result) {
    const highlights = result.highlights;
    const indexToRemove = highlights.findIndex(high => {
      if (high.subRanges) return false;
      return (
        high.rangeInfo &&
        high.rangeInfo.startOffset === startOffset &&
        high.rangeInfo.endOffset === endOffset &&
        high.url === window.location.href
      );
    });
    if (indexToRemove !== -1) {
      highlights.splice(indexToRemove, 1);
      chrome.storage.local.set({ highlights: highlights }, function() {
        console.log("[DEBUG storage] Removed highlight from storage. Updated highlights:", highlights);
      });
    }
  });
}

/**
 * ---------------------------------------------------------------------------
 * Apply filters to elements based on stored filter state
 * ---------------------------------------------------------------------------
 */
function applyStoredFilters() {
  chrome.storage.local.get({ filterState: {
    showAnnotations: true,
    showYellow: true,
    showPink: true,
    showGreen: true,
    showBlue: true
  }}, (result) => {
    const filters = result.filterState;
    
    // Apply to annotations
    const annotations = document.querySelectorAll('.annotated-text');
    annotations.forEach(annotation => {
      if (!filters.showAnnotations) {
        annotation.style.borderBottom = 'none';
      } else {
        annotation.style.borderBottom = '2px solid red';
      }
    });

    // Apply to highlights
    const highlights = document.querySelectorAll('.highlighted-text');
    highlights.forEach(highlight => {
      let visible = false;
      let color = '';

      // Determine if highlight should be visible and what color it should be
      if (highlight.style.backgroundColor.includes('255, 255, 0')) { // Yellow
        visible = filters.showYellow;
        color = 'rgba(255, 255, 0, 0.4)';
      } else if (highlight.style.backgroundColor.includes('255, 192, 203')) { // Pink
        visible = filters.showPink;
        color = 'rgba(255, 192, 203, 0.4)';
      } else if (highlight.style.backgroundColor.includes('144, 238, 144')) { // Green
        visible = filters.showGreen;
        color = 'rgba(144, 238, 144, 0.4)';
      } else if (highlight.style.backgroundColor.includes('173, 216, 230')) { // Blue
        visible = filters.showBlue;
        color = 'rgba(173, 216, 230, 0.4)';
      }

      // Apply visibility
      highlight.style.backgroundColor = visible ? color : 'transparent';
    });
  });
}
  
/**
 * ---------------------------------------------------------------------------
 * Rebuild text with highlights & annotations on page load
 * ---------------------------------------------------------------------------
 */
export function initialize() {
  console.log("[DEBUG storage] initialize -> Reapplying highlights and annotations on page load");
  chrome.storage.local.get({ highlights: [], annotations: [] }, function(result) {
    const highlights = result.highlights;
    const annotations = result.annotations;
    console.log("[DEBUG storage] Loaded highlights from storage:", highlights);
    console.log("[DEBUG storage] Loaded annotations from storage:", annotations);

    // We'll flatten each highlight/annotation into multiple items
    const groupedItems = groupAndSortByXPathAndOffset(highlights, annotations);
    Object.keys(groupedItems).forEach(xpath => {
      const itemGroup = groupedItems[xpath].filter(i => i.url === window.location.href);
      rebuildElementWithStyles(xpath, itemGroup);
    });

    // Apply stored filters after rebuilding elements
    applyStoredFilters();
  });
}
  
function groupAndSortByXPathAndOffset(highlights, annotations) {
  const grouped = {};

  // For each highlight, break out subRanges
  highlights.forEach(h => {
    (h.subRanges || []).forEach(sub => {
      const xp = sub.endXPath;
      if (!grouped[xp]) grouped[xp] = [];
      grouped[xp].push({
        ...h,
        type: 'highlight',
        rangeInfo: sub
      });
    });
  });

  // For each annotation, break out subRanges
  annotations.forEach(a => {
    (a.subRanges || []).forEach(sub => {
      const xp = sub.endXPath;
      if (!grouped[xp]) grouped[xp] = [];
      grouped[xp].push({
        ...a,
        type: 'annotation',
        rangeInfo: sub
      });
    });
  });

  // Sort each array by startOffset ascending
  Object.keys(grouped).forEach(xp => {
    grouped[xp].sort((a, b) => a.rangeInfo.startOffset - b.rangeInfo.startOffset);
  });
  return grouped;
}
  
/**
 * Rebuild approach for partially overlapping text
 */
function rebuildElementWithStyles(xpath, items) {
  const element = findElementByXPath(xpath);
  if (!element) {
    console.error("[DEBUG storage] No element found for XPath:", xpath);
    return;
  }

  console.log(`[DEBUG storage] Rebuilding element for XPath: ${xpath}. Items:`, items);
  const fullText = element.innerText;
  const output = document.createDocumentFragment();

  let highlightStack = [];   // stack of currently open highlight spans
  let annotationStack = [];  // stack of currently open annotation spans
  let currentContainer = output;

  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const newHighlights = items.filter(
      h => h.type === 'highlight' &&
           h.rangeInfo.startOffset <= i && h.rangeInfo.endOffset > i
    );
    const newAnnotations = items.filter(
      a => a.type === 'annotation' &&
           a.rangeInfo.startOffset <= i && a.rangeInfo.endOffset > i
    );

    // Close old annotation spans first
    if (!arraysEqualById(annotationStack, newAnnotations)) {
      while (annotationStack.length > 0) {
        annotationStack.pop();
        currentContainer = currentContainer.parentNode;
      }
    }
    // Close old highlight spans
    if (!arraysEqualById(highlightStack, newHighlights)) {
      while (highlightStack.length > 0) {
        highlightStack.pop();
        currentContainer = currentContainer.parentNode;
      }
      // Open new highlight spans
      newHighlights.forEach(h => {
        const span = document.createElement('span');
        span.className = 'highlighted-text';
        span.style.backgroundColor = h.color || 'rgba(255,255,0,0.4)';
        span.setAttribute('data-highlight-id', h.id);
        currentContainer.appendChild(span);
        currentContainer = span;
        highlightStack.push(h);
      });
    }

    // Now open new annotation spans (nested in highlights if any)
    if (!arraysEqualById(annotationStack, newAnnotations)) {
      newAnnotations.forEach(a => {
        const span = document.createElement('span');
        span.className = 'annotated-text';
        span.style.borderBottom = '2px solid red';
        span.setAttribute('data-annotation-id', a.id);
        currentContainer.appendChild(span);
        currentContainer = span;
        annotationStack.push(a);
      });
    }

    currentContainer.appendChild(document.createTextNode(char));
  }

  while (annotationStack.length > 0) {
    annotationStack.pop();
    currentContainer = currentContainer.parentNode;
  }
  while (highlightStack.length > 0) {
    highlightStack.pop();
    currentContainer = currentContainer.parentNode;
  }

  element.innerHTML = '';
  element.appendChild(output);
}
  
function arraysEqualById(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  const ids1 = arr1.map(h => h.id).sort();
  const ids2 = arr2.map(h => h.id).sort();
  return ids1.every((id, index) => id === ids2[index]);
}
  
function findElementByXPath(xpath) {
  try {
    const evaluator = new XPathEvaluator();
    const result = evaluator.evaluate(xpath, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
    return result.singleNodeValue;
  } catch (e) {
    console.error("[DEBUG storage] XPath evaluation error for rebuildElementByXPath:", e, xpath);
    return null;
  }
}
