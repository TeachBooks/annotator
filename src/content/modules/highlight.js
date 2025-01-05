// src/content/modules/highlight.js

import { rangesIntersect } from './utils.js';

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
 * highlightText (Extract & Wrap approach for safe overlapping)
 * ---------------------------------------------------------------------------
 */
export function highlightText(range, highlightId, color = 'yellow') {
  if (!range || range.collapsed) {
    console.warn("[DEBUG highlightText] Cannot highlight an empty/collapsed range.");
    return;
  }

  console.log(`[DEBUG highlightText] Highlighting text: "${range.toString()}" with color "${color}" and ID "${highlightId}"`);

  try {
    // Instead of manipulating DOM directly, just return the range info
    return {
      range: range,
      color: color,
      id: highlightId
    };
  } catch (err) {
    console.error("Error applying highlight:", err);
  }
}

/**
 * ---------------------------------------------------------------------------
 * removeHighlight: Removing highlights from DOM (and optionally from storage)
 * ---------------------------------------------------------------------------
 */
export function removeHighlight(range) {
  if (!range || range.collapsed) {
    console.warn("[DEBUG removeHighlight] No valid selection to remove highlight.");
    return;
  }

  // Get highlight IDs to remove from storage
  const highlightSpans = getAllIntersectingHighlights(range);
  highlightSpans.forEach(span => {
    const highlightId = span.getAttribute('data-highlight-id');
    if (highlightId) {
      console.log(`[DEBUG removeHighlight] Found highlight ID to remove: ${highlightId}`);
      // Return the ID so it can be removed from storage
      return highlightId;
    }
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
