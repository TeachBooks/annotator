// src/content/modules/highlight.js

import {
    splitRangeByBlockElements,
    findTextNode,
    rangesIntersect
} from './utils.js';

/**
 * ---------------------------------------------------------------------------
 * isTextHighlighted: checks if ANY portion of selection is in .highlighted-text
 * ---------------------------------------------------------------------------
 */
export function isTextHighlighted(range) {
    const textNodes = getTextNodesWithin(range);
    return textNodes.some(nodeInfo => {
        const parent = nodeInfo.node.parentElement;
        return parent && parent.classList.contains('highlighted-text');
    });
}

/**
 * ---------------------------------------------------------------------------
 * highlightText: apply highlight styles to each text node in the sub-range
 * ---------------------------------------------------------------------------
 */
export function highlightText(range, highlightId, color = 'yellow') {
    if (!range || range.collapsed) {
        console.warn("Cannot highlight an empty/collapsed range.");
        return;
    }
    const tempRange = range.cloneRange();
    const textNodes = getTextNodesWithin(tempRange);
    if (textNodes.length === 0) {
        console.warn("No text nodes found within the selected range.");
        return;
    }

    textNodes.forEach(nodeInfo => {
        const { node, startOffset, endOffset } = nodeInfo;
        const nodeRange = document.createRange();
        nodeRange.setStart(node, startOffset);
        nodeRange.setEnd(node, endOffset);

        const span = document.createElement("span");
        span.className = "highlighted-text";
        span.style.backgroundColor = color;
        if (highlightId) {
            span.setAttribute('data-highlight-id', highlightId);
        }
        try {
            nodeRange.surroundContents(span);
        } catch (err) {
            console.error("Error highlighting text node:", err);
        }
    });

    console.log("Multi-node highlighting complete. ID:", highlightId, "Color:", color);
}

/**
 * ---------------------------------------------------------------------------
 * removeHighlight: Removing highlights from DOM & storage
 * ---------------------------------------------------------------------------
 */
export function removeHighlight(range) {
    if (!range || range.collapsed) {
        console.warn("No valid selection to remove highlight.");
        return;
    }
    const highlightSpans = getAllIntersectingHighlights(range);
    highlightSpans.forEach(span => {
        const highlightId = span.getAttribute('data-highlight-id') || null;
        if (highlightId) {
            // removeHighlightFromStorageById is stored in storage.js
            // We'll call it from the content script or wherever you handle cross-module
        }
        const parent = span.parentNode;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        console.log(`Removed highlight with ID: ${highlightId}`);
    });
}

/**
 * ---------------------------------------------------------------------------
 * getAllIntersectingHighlights
 * ---------------------------------------------------------------------------
 */
function getAllIntersectingHighlights(range) {
    const spans = Array.from(document.querySelectorAll('.highlighted-text'));
    return spans.filter(span => {
        const spanRange = document.createRange();
        spanRange.selectNodeContents(span);
        return rangesIntersect(range, spanRange);
    });
}

/**
 * ---------------------------------------------------------------------------
 * Utility: Return array of text nodes in the given range
 * ---------------------------------------------------------------------------
 */
export function getTextNodesWithin(range) {
    const textNodes = [];
    const treeWalker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                if (!node.nodeValue.trim()) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    while (treeWalker.nextNode()) {
        const currentNode = treeWalker.currentNode;
        try {
            const nodeStart = range.comparePoint(currentNode, 0);
            const nodeEnd = range.comparePoint(currentNode, currentNode.nodeValue.length);
            if (nodeStart === 1 || nodeEnd === -1) {
                continue;
            }
            let startOffset = 0;
            let endOffset = currentNode.nodeValue.length;

            if (nodeStart === -1) {
                startOffset = 0;
            } else {
                startOffset = range.startOffset;
            }
            if (nodeEnd === 1) {
                endOffset = currentNode.nodeValue.length;
            } else {
                endOffset = range.endOffset;
            }

            startOffset = Math.max(0, Math.min(startOffset, currentNode.nodeValue.length));
            endOffset = Math.max(startOffset, Math.min(endOffset, currentNode.nodeValue.length));

            if (startOffset < endOffset) {
                textNodes.push({
                    node: currentNode,
                    startOffset,
                    endOffset
                });
            }
        } catch (err) {
            console.error("comparePoint error (possibly different doc):", err);
        }
    }
    return textNodes;
}

/**
 * ---------------------------------------------------------------------------
 * splitRangeByBlockElements wrapper for multi-block highlight
 * ---------------------------------------------------------------------------
 */
export function splitRangeByBlockEls(range) {
    return splitRangeByBlockElements(range);
}
