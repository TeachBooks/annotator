// src/content/modules/storage.js

import {
    calculateFullOffsetUsingMarkers,
    getXPath,
    findTextNode
  } from './utils.js';
  
  import { highlightText } from './highlight.js';
  import { applyAnnotationHighlight } from './annotation.js';
  
  /**
   * ---------------------------------------------------------------------------
   * Store MULTIPLE subranges in one highlight record
   * ---------------------------------------------------------------------------
   */
  export function saveMultiBlockHighlight(subRanges, color) {
    // Use one ID for the entire multi-block highlight
    const highlightId = Date.now();
  
    // Combine all text from subRanges for quick reference (optional)
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
  
      // (Optional) display existing annotations or do a UI update
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
          span.className = 'annotated-annotation';
          span.style.textDecoration = 'underline';
          span.style.textDecorationColor = 'red';
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
