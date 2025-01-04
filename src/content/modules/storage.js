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
    const combinedText = subRanges.map(r => r.toString()).join(' ');

    // Build subRange data
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
        // each highlight has an array of subRanges
        subRanges: storedSubRanges
    };

    chrome.storage.local.get({ highlights: [] }, function(result) {
        const highlights = result.highlights;
        highlights.push(highlightData);
        chrome.storage.local.set({ highlights: highlights }, function() {
            console.log("Multi-block highlight saved:", JSON.stringify(highlights, null, 2));
        });
    });
}

/**
 * ---------------------------------------------------------------------------
 * Removing highlight from storage by ID
 * ---------------------------------------------------------------------------
 */
export function removeHighlightFromStorageById(highlightId) {
    chrome.storage.local.get({ highlights: [] }, function(result) {
        const highlights = result.highlights;
        const indexToRemove = highlights.findIndex(high => high.id == highlightId);
        if (indexToRemove !== -1) {
            console.log("Matching highlight found for removal:", highlights[indexToRemove]);
            highlights.splice(indexToRemove, 1);
            chrome.storage.local.set({ highlights: highlights }, function() {
                console.log("Highlight removed. Updated highlights:", JSON.stringify(highlights, null, 2));
            });
        } else {
            console.log("No matching highlight found in storage to remove. ID:", highlightId);
        }
    });
}

/**
 * removeHighlightFromStorage
 * (For partial backward compatibility - from the original code)
 */
export function removeHighlightFromStorage(range) {
    const { startOffset, endOffset } = calculateFullOffsetUsingMarkers(range);
    console.log("Attempting to remove highlight with offsets:", startOffset, endOffset);

    chrome.storage.local.get({ highlights: [] }, function(result) {
        const highlights = result.highlights;
        const indexToRemove = highlights.findIndex(high => {
            // If old single-range highlights
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
                console.log("Highlight removed from storage. Updated highlights:", JSON.stringify(highlights, null, 2));
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
    console.log("Reapplying highlights and annotations on page load");
    chrome.storage.local.get({ highlights: [], annotations: [] }, function(result) {
        const highlights = result.highlights;
        const annotations = result.annotations;
        console.log("Loaded highlights from storage:", highlights);
        console.log("Loaded annotations from storage:", annotations);

        // We'll flatten each highlight/annotation into multiple items
        // so existing rebuild logic can place them in the text.
        const groupedItems = groupAndSortByXPathAndOffset(highlights, annotations);
        Object.keys(groupedItems).forEach(xpath => {
            const itemGroup = groupedItems[xpath].filter(i => i.url === window.location.href);
            rebuildElementWithStyles(xpath, itemGroup);
        });

        displayExistingAnnotations(); // Display annotations in the sidebar
    });
}

/**
 * groupAndSortByXPathAndOffset
 */
function groupAndSortByXPathAndOffset(highlights, annotations) {
    const grouped = {};

    // For each highlight, break out subRanges, then treat each subrange as a separate item
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
 * rebuildElementWithStyles
 */
function rebuildElementWithStyles(xpath, items) {
    const element = findElementByXPath(xpath);
    if (!element) {
        console.error("No element found for XPath:", xpath);
        return;
    }

    const fullText = element.innerText;
    const output = document.createDocumentFragment();

    let highlightStack = [];   // stack of currently open highlight spans
    let annotationStack = [];  // stack of currently open annotation spans
    let currentContainer = output;

    for (let i = 0; i < fullText.length; i++) {
        const char = fullText[i];
        // Filter highlights or annotations that cover this character index
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

    // Close any still-open spans
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
        console.error("XPath evaluation error for rebuildElementByXPath:", e, xpath);
        return null;
    }
}

/**
 * displayExistingAnnotations
 * - The original code references a function by this name in UI, so keep as is.
 */
import { displayExistingAnnotations } from './ui.js';
