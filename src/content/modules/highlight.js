// src/content/modules/highlight.js

import { rangesIntersect, splitRangeByBlockElements, intersectRanges, hasOverlappingAnnotation, hasOverlappingHighlight } from './utils.js';

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

  // Check for overlapping highlights
  if (hasOverlappingHighlight(range)) {
    console.warn("[DEBUG highlightText] Cannot create overlapping highlight");
    throw new Error("Cannot create overlapping highlights. Please select a different text region.");
    return;
  }

  // Check for overlapping annotations
  if (hasOverlappingAnnotation(range)) {
    console.warn("[DEBUG highlightText] Cannot highlight annotated text");
    throw new Error("Cannot highlight text that is already annotated. Please select a different text region.");
    return;
  }

  console.log(`[DEBUG highlightText] Highlighting text: "${range.toString()}" with color "${color}" and ID "${highlightId}"`);

  try {
    // Split the range if it spans multiple block elements
    const subRanges = splitRangeByBlockElements(range);
    
    // Process each sub-range
    subRanges.forEach(subRange => {
      // Get existing highlights that intersect with this range
      const intersectingHighlights = getAllIntersectingHighlights(subRange);
      
      if (intersectingHighlights.length === 0) {
        // Simple case: No intersecting highlights
        wrapRangeInHighlight(subRange, highlightId, color);
      } else {
        // Complex case: Handle overlapping highlights
        handleOverlappingHighlights(subRange, intersectingHighlights, highlightId, color);
      }
    });

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
 * Wrap a range in a highlight span
 */
function wrapRangeInHighlight(range, highlightId, color) {
  const span = document.createElement('span');
  span.className = 'highlighted-text';
  span.setAttribute('data-highlight-id', highlightId);
  span.style.backgroundColor = color;
  
  range.surroundContents(span);
}

/**
 * Handle cases where the new highlight overlaps with existing ones
 */
function handleOverlappingHighlights(range, existingHighlights, newHighlightId, color) {
  try {
    // Clone the range and its contents to work with
    const workingRange = range.cloneRange();
    const content = workingRange.extractContents();
    const container = document.createElement('div');
    container.appendChild(content);

    // First, unwrap all highlights in our container while preserving their data
    const highlightData = new Map();
    const unwrapHighlight = (highlight) => {
      const id = highlight.getAttribute('data-highlight-id');
      const style = highlight.style.backgroundColor;
      
      // Store the range information
      const range = document.createRange();
      range.selectNodeContents(highlight);
      highlightData.set(id, {
        color: style,
        range: range.cloneRange()
      });
      
      // Unwrap the highlight
      while (highlight.firstChild) {
        highlight.parentNode.insertBefore(highlight.firstChild, highlight);
      }
      highlight.remove();
    };

    // Process nested highlights from innermost to outermost
    while (container.querySelector('.highlighted-text')) {
      const highlights = Array.from(container.querySelectorAll('.highlighted-text'));
      const deepestHighlight = highlights.reduce((deepest, current) => {
        const currentDepth = getNodeDepth(current);
        const deepestDepth = deepest ? getNodeDepth(deepest) : -1;
        return currentDepth > deepestDepth ? current : deepest;
      }, null);
      
      if (deepestHighlight) {
        unwrapHighlight(deepestHighlight);
      }
    }

    // Now process each text node
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const segments = new Map(); // offset -> Set of highlight IDs
    let totalOffset = 0;

    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent;
      
      // Add boundaries for all highlights that intersect this text node
      highlightData.forEach(({range}, id) => {
        const nodeRange = document.createRange();
        nodeRange.selectNode(node);
        
        if (rangesIntersect(range, nodeRange)) {
          const intersection = intersectRanges(range, nodeRange);
          if (intersection) {
            const start = totalOffset + (intersection.startContainer === node ? 
              intersection.startOffset : 0);
            const end = totalOffset + (intersection.endContainer === node ? 
              intersection.endOffset : text.length);
            
            // Add highlight ID to all offsets in this range
            for (let i = start; i <= end; i++) {
              if (!segments.has(i)) segments.set(i, new Set());
              segments.get(i).add(id);
            }
          }
        }
      });
      
      // Add boundaries for new highlight
      if (rangesIntersect(workingRange, nodeRange)) {
        const intersection = intersectRanges(workingRange, nodeRange);
        if (intersection) {
          const start = totalOffset + (intersection.startContainer === node ? 
            intersection.startOffset : 0);
          const end = totalOffset + (intersection.endContainer === node ? 
            intersection.endOffset : text.length);
          
          for (let i = start; i <= end; i++) {
            if (!segments.has(i)) segments.set(i, new Set());
            segments.get(i).add(newHighlightId);
          }
        }
      }
      
      totalOffset += text.length;
    }

    // Process segments into a flat structure
    const processedSegments = [];
    let currentHighlights = new Set();
    let lastOffset = 0;
    
    // First collect all unique segment boundaries
    const boundaries = new Set();
    segments.forEach((highlights, offset) => boundaries.add(offset));
    const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
    
    // Collect all boundary events
    const boundaryEvents = [];
    sortedBoundaries.forEach(offset => {
      const highlightsAtBoundary = segments.get(offset);
      
      // Find highlights that end at this boundary
      currentHighlights.forEach(id => {
        if (!highlightsAtBoundary.has(id)) {
          boundaryEvents.push({
            offset,
            type: 'end',
            id,
            depth: highlightData.get(id).range.toString().length // Use range length as depth heuristic
          });
        }
      });
      
      // Find highlights that start at this boundary
      highlightsAtBoundary.forEach(id => {
        if (!currentHighlights.has(id)) {
          boundaryEvents.push({
            offset,
            type: 'start',
            id,
            depth: highlightData.get(id).range.toString().length
          });
        }
      });
    });
    
    // Sort boundary events by offset and type
    boundaryEvents.sort((a, b) => {
      if (a.offset !== b.offset) return a.offset - b.offset;
      if (a.type !== b.type) {
        // At same offset: end events before start events
        return a.type === 'end' ? -1 : 1;
      }
      if (a.type === 'end') {
        // For end events: deeper (longer) ranges end first
        return b.depth - a.depth;
      }
      // For start events: shallower (shorter) ranges start first
      return a.depth - b.depth;
    });
    
    // Process boundary events to create segments
    boundaryEvents.forEach(event => {
      // Create segment up to this boundary
      if (event.offset > lastOffset) {
        processedSegments.push({
          text: container.textContent.substring(lastOffset, event.offset),
          highlights: new Set(currentHighlights)
        });
      }
      
      // Update active highlights
      if (event.type === 'start') {
        currentHighlights.add(event.id);
      } else {
        currentHighlights.delete(event.id);
      }
      
      lastOffset = event.offset;
    });
    
    // Add final segment if needed
    if (lastOffset < container.textContent.length) {
      processedSegments.push({
        text: container.textContent.substring(lastOffset),
        highlights: new Set(currentHighlights)
      });
    }
    
    // Clear container
    while (container.firstChild) {
      container.firstChild.remove();
    }
    
    // Merge adjacent segments with identical highlights
    const mergedSegments = [];
    let currentSegment = null;
    
    processedSegments.forEach(segment => {
      if (!segment.text) return;
      
      const highlightIds = Array.from(segment.highlights).sort().join(',');
      
      if (currentSegment && 
          Array.from(currentSegment.highlights).sort().join(',') === highlightIds) {
        // Merge with current segment
        currentSegment.text += segment.text;
      } else {
        // Start new segment
        if (currentSegment) {
          mergedSegments.push(currentSegment);
        }
        currentSegment = {
          text: segment.text,
          highlights: segment.highlights
        };
      }
    });
    
    if (currentSegment) {
      mergedSegments.push(currentSegment);
    }
    
    // Create DOM structure for merged segments
    mergedSegments.forEach(segment => {
      if (!segment.text) return;
      
      let current = document.createTextNode(segment.text);
      
      // Apply highlights in consistent order
      Array.from(segment.highlights).sort().forEach(id => {
        const span = document.createElement('span');
        span.className = 'highlighted-text';
        span.setAttribute('data-highlight-id', id);
        span.style.backgroundColor = id === newHighlightId ? color : highlightData.get(id).color;
        span.appendChild(current);
        current = span;
      });
      
      container.appendChild(current);
    });

    // Helper to compare sets
    function setsEqual(a, b) {
      return a.size === b.size && 
        Array.from(a).every(value => b.has(value));
    }

    // Helper to get node depth
    function getNodeDepth(node) {
      let depth = 0;
      let current = node;
      while (current && current !== document.body) {
        depth++;
        current = current.parentNode;
      }
      return depth;
    }

    // Replace the original content
    range.deleteContents();
    range.insertNode(container);
    
    // Move children out and remove container
    while (container.firstChild) {
      container.parentNode.insertBefore(container.firstChild, container);
    }
    container.remove();

    // Cleanup
    highlightData.forEach(({range}) => range.detach());
    workingRange.detach();
    
    
  } catch (err) {
    console.error("Error in handleOverlappingHighlights:", err);
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

  const removedIds = new Set();
  const highlightSpans = getAllIntersectingHighlights(range);
  
  highlightSpans.forEach(span => {
    const highlightId = span.getAttribute('data-highlight-id');
    if (highlightId) {
      console.log(`[DEBUG removeHighlight] Found highlight ID to remove: ${highlightId}`);
      removedIds.add(highlightId);
      
      // If this highlight contains other highlights, preserve them
      const nestedHighlights = Array.from(span.querySelectorAll('.highlighted-text'));
      const parent = span.parentNode;
      
      if (nestedHighlights.length > 0) {
        // Extract and preserve nested highlights
        nestedHighlights.forEach(nested => {
          // Move nested highlight outside current span before unwrapping
          parent.insertBefore(nested, span);
        });
      }
      
      // Unwrap the current highlight span
      while (span.firstChild) {
        parent.insertBefore(span.firstChild, span);
      }
      span.remove();
    }
  });

  // Return array of removed IDs for storage cleanup
  return Array.from(removedIds);
}

/**
 * ---------------------------------------------------------------------------
 * getAllIntersectingHighlights
 * ---------------------------------------------------------------------------
 */
function getAllIntersectingHighlights(range) {
  const spans = Array.from(document.querySelectorAll('.highlighted-text'));
  const intersecting = new Set();
  
  spans.forEach(span => {
    // Check if this span intersects with our range
    const spanRange = document.createRange();
    spanRange.selectNodeContents(span);
    
    if (rangesIntersect(range, spanRange)) {
      intersecting.add(span);
      
      // Also add any parent highlights that contain this span
      let parent = span.parentElement;
      while (parent) {
        if (parent.classList.contains('highlighted-text')) {
          intersecting.add(parent);
        }
        parent = parent.parentElement;
      }
      
      // And any child highlights within this span
      span.querySelectorAll('.highlighted-text').forEach(child => {
        intersecting.add(child);
      });
    }
    spanRange.detach();
  });
  
  return Array.from(intersecting);
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
