// src/content/modules/utils.js

// -------------- ADD THIS NEAR THE TOP -------------
export function splitTextIntoLines(text, maxLineLength) {
    const lines = [];
    let start = 0;
    while (start < text.length) {
        let end = start + maxLineLength;
        if (end > text.length) {
            end = text.length;
        }
        lines.push(text.substring(start, end));
        start = end;
    }
    return lines;
}

/** Intersect two ranges - returns new sub-range or null if none. */
export function intersectRanges(r1, r2) {
    let intersection = null;
    const compareStart = r1.compareBoundaryPoints(Range.START_TO_START, r2);
    const compareEnd   = r1.compareBoundaryPoints(Range.END_TO_END, r2);

    let startContainer, startOffset, endContainer, endOffset;

    if (compareStart >= 0) {
        startContainer = r1.startContainer;
        startOffset = r1.startOffset;
    } else {
        startContainer = r2.startContainer;
        startOffset = r2.startOffset;
    }

    if (compareEnd <= 0) {
        endContainer = r1.endContainer;
        endOffset = r1.endOffset;
    } else {
        endContainer = r2.endContainer;
        endOffset = r2.endOffset;
    }

    try {
        intersection = document.createRange();
        intersection.setStart(startContainer, startOffset);
        intersection.setEnd(endContainer, endOffset);
        if (intersection.collapsed) {
            return null;
        }
    } catch (err) {
        return null;
    }
    return intersection;
}

export function rangesIntersect(r1, r2) {
    return (
        r1.compareBoundaryPoints(Range.END_TO_START, r2) < 0 &&
        r1.compareBoundaryPoints(Range.START_TO_END, r2) > 0
    );
}

export function getBlockAncestor(node) {
    let elem = (node.nodeType === Node.ELEMENT_NODE) ? node : node.parentNode;
    while (elem && !isBlockElement(elem)) {
        elem = elem.parentNode;
    }
    return elem;
}

export function isBlockElement(elem) {
    const display = window.getComputedStyle(elem).display;
    return (
        display === 'block' || display === 'flex' ||
        display === 'list-item' || display === 'table' ||
        display === 'grid'
    );
}

export function getNextBlockElement(elem) {
    let next = elem;
    while (next) {
        next = next.nextSibling;
        if (next && next.nodeType === Node.ELEMENT_NODE && isBlockElement(next)) {
            return next;
        }
    }
    return null;
}

/**
 * Splitting a user selection range across multiple block-level elements
 */
export function splitRangeByBlockElements(range) {
    const startBlock = getBlockAncestor(range.startContainer);
    const endBlock = getBlockAncestor(range.endContainer);
    if (!startBlock || !endBlock || startBlock === endBlock) {
        // Just return an array with the single range
        return [range.cloneRange()];
    }

    const subRanges = [];
    // partial range in startBlock
    const firstRange = range.cloneRange();
    firstRange.setEndAfter(startBlock.lastChild || startBlock);
    subRanges.push(firstRange);

    // full block ranges for intermediate blocks
    let curBlock = getNextBlockElement(startBlock);
    while (curBlock && curBlock !== endBlock) {
        const blockRange = document.createRange();
        blockRange.selectNodeContents(curBlock);
        subRanges.push(blockRange);
        curBlock = getNextBlockElement(curBlock);
    }

    // partial range in endBlock
    if (endBlock !== startBlock) {
        const lastRange = range.cloneRange();
        lastRange.setStartBefore(endBlock.firstChild || endBlock);
        subRanges.push(lastRange);
    }

    // Intersect each sub-range with the original range to avoid overshoot
    const finalSubs = [];
    subRanges.forEach(r => {
        const clipped = intersectRanges(r, range);
        if (clipped && !clipped.collapsed) {
            finalSubs.push(clipped);
        }
    });
    return finalSubs;
}

/**
 * Utility to get the XPath of a node
 */
export function getXPath(node) {
    if (!node) return '';
    if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode;
    }
    const parts = [];
    while (node && node.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling = node.previousSibling;
        while (sibling) {
            if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === node.nodeName) {
                index++;
            }
            sibling = sibling.previousSibling;
        }
        const part = `${node.nodeName.toLowerCase()}${index ? `[${index + 1}]` : ''}`;
        parts.unshift(part);
        node = node.parentNode;
    }
    return parts.length ? `/${parts.join('/')}` : '';
}

/**
 * Find a text node from an XPath
 */
export function findTextNode(xpath) {
    try {
        const evaluator = new XPathEvaluator();
        const result = evaluator.evaluate(xpath, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
        const node = result.singleNodeValue;
        if (node && node.nodeType === Node.ELEMENT_NODE) {
            return node.firstChild; 
        }
        return node;
    } catch (e) {
        console.error("XPath evaluation error for rebuildElementByXPath:", e, xpath);
        return null;
    }
}

/**
 * Insert marker spans, measure offsets, remove marker spans, return offsets.
 */
export function calculateFullOffsetUsingMarkers(range) {
    const startMarker = document.createElement("span");
    const endMarker = document.createElement("span");

    startMarker.className = "offset-marker";
    endMarker.className = "offset-marker";

    range.insertNode(startMarker);
    range.collapse(false);
    range.insertNode(endMarker);

    const startOffset = getOffsetRelativeToParent(startMarker);
    const endOffset = getOffsetRelativeToParent(endMarker) + endMarker.textContent.length;

    startMarker.remove();
    endMarker.remove();

    return { startOffset, endOffset };
}

function getOffsetRelativeToParent(marker) {
    let offset = 0;
    let currentNode = marker.previousSibling;

    while (currentNode) {
        if (currentNode.nodeType === Node.TEXT_NODE) {
            offset += currentNode.textContent.length;
        } else if (currentNode.nodeType === Node.ELEMENT_NODE) {
            offset += currentNode.innerText.length;
        }
        currentNode = currentNode.previousSibling;
    }
    return offset;
}
