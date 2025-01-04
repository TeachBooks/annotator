////////////////////////////////////////////////////////////////////////////////
// FULL UPDATED CONTENT SCRIPT CODE - WITH MULTI-BLOCK HIGHLIGHT SUPPORT
// NOW STORING ARRAYS OF SUB-RANGES FOR HIGHLIGHTS & ANNOTATIONS
////////////////////////////////////////////////////////////////////////////////

// **1. Add Activation State Variable**
let isActive = false; // Extension is inactive by default

// **2. Initialize Activation State from Storage**
chrome.storage.local.get(['isActive'], (result) => {
    isActive = result.isActive || false;
    console.log(`Content script initialized. isActive: ${isActive}`);
});

// **3. Listen for Storage Changes (Optional)**
chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.isActive) {
        isActive = changes.isActive.newValue;
        console.log(`Activation state changed. isActive: ${isActive}`);
        if (isActive) {
            showToast("Extension activated.");
        } else {
            showToast("Extension deactivated.");
            // Cleanup UI elements when deactivated
            const floatingToolbar = document.getElementById("floating-toolbar");
            if (floatingToolbar) floatingToolbar.remove();

            const annotationToolbar = document.getElementById("annotation-toolbar");
            if (annotationToolbar) annotationToolbar.remove();

            const sidebar = document.getElementById("annotation-sidebar");
            if (sidebar) sidebar.style.display = "none";
        }
    }
});

// **4. Wrap Event Listeners with Activation Checks**
document.addEventListener("mouseup", function(event) {
    if (!isActive) return; // Exit if the extension is not active

    const selection = window.getSelection();
    if (
        !selection ||
        selection.rangeCount === 0 ||
        event.target.closest('#floating-toolbar') ||
        event.target.closest('#annotation-toolbar')
    ) {
        return;
    }

    // Loop through all ranges in the selection
    for (let i = 0; i < selection.rangeCount; i++) {
        const range = selection.getRangeAt(i);
        if (!range || range.collapsed) continue;

        let commonAncestor = range.commonAncestorContainer;
        if (commonAncestor.nodeType === Node.TEXT_NODE) {
            commonAncestor = commonAncestor.parentElement;
        }
        
        const isWithinAnnotatedText = commonAncestor.closest('.annotated-annotation') !== null;
        if (!isWithinAnnotatedText) {
            console.log("Text selected outside annotated elements:", range.toString());
            showFloatingToolbar(range);
        } else {
            console.log("Text selected within an annotated element:", range.toString());
            showAnnotationToolbar(range);
        }
    }
});

document.addEventListener("mousedown", function(event) {
    if (!isActive) return; // Exit if the extension is not active

    const toolbar = document.getElementById("floating-toolbar");
    if (toolbar && !toolbar.contains(event.target)) {
        console.log("Clicked outside toolbar, removing toolbar");
        toolbar.remove();
    }
    
    // Remove annotation toolbar if clicking outside
    const annotationToolbar = document.getElementById("annotation-toolbar");
    if (annotationToolbar && !annotationToolbar.contains(event.target)) {
        console.log("Clicked outside annotation toolbar, removing toolbar");
        annotationToolbar.remove();
    }
});

document.addEventListener("click", function(event) {
    if (!isActive) return; // Exit if the extension is not active

    const annotatedElement = event.target.closest('.annotated-annotation');
    if (annotatedElement) {
        event.preventDefault();
        event.stopPropagation();
        
        // Remove any existing annotation toolbar
        const existingToolbar = document.getElementById("annotation-toolbar");
        if (existingToolbar) {
            existingToolbar.remove();
        }
        
        // Create the annotation toolbar
        const toolbar = document.createElement("div");
        toolbar.id = "annotation-toolbar";
        toolbar.innerHTML = `
            <button id="view-annotation-btn" class="toolbar-button">View Annotation</button>
            <button id="remove-annotation-btn" class="toolbar-button">Remove Annotation</button>
        `;
        console.log("Annotation toolbar created");
        
        // Position the toolbar near the annotated text
        const rect = annotatedElement.getBoundingClientRect();
        toolbar.style.position = "absolute";
        toolbar.style.top = `${window.scrollY + rect.top - 40}px`;
        toolbar.style.left = `${rect.left}px`;
        toolbar.style.zIndex = "10000"; 
        toolbar.style.backgroundColor = "#fff";
        toolbar.style.border = "1px solid #ccc";
        toolbar.style.padding = "5px";
        toolbar.style.borderRadius = "4px";
        toolbar.style.boxShadow = "0 2px 6px rgba(0,0,0,0.2)";
        
        document.body.appendChild(toolbar);
        
        // Show the toolbar with animation
        setTimeout(() => toolbar.classList.add("show"), 10);
        
        const viewBtn = document.getElementById("view-annotation-btn");
        const removeBtn = document.getElementById("remove-annotation-btn");
        
        viewBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            console.log("View annotation clicked");
            openAllAnnotationsSidebar();
            toolbar.remove(); 
        });
        
        removeBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            console.log("Remove annotation clicked");
            const annotationId = annotatedElement.getAttribute('data-annotation-id');
            if (annotationId) {
                removeAnnotationById(annotationId, annotatedElement);
            }
            toolbar.remove();
        });
        
        // Optional: remove the toolbar after 5s
        setTimeout(() => {
            if (toolbar.parentNode) {
                toolbar.remove();
            }
        }, 5000);
    } else {
        // Clicked outside an annotated text, remove annotation toolbar if exists
        const toolbar = document.getElementById("annotation-toolbar");
        if (toolbar) {
            toolbar.remove();
        }
    }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'toggleActivation') {
        isActive = !isActive; 
        console.log(`Extension is now ${isActive ? 'active' : 'inactive'}.`);
        
        chrome.storage.local.set({ isActive: isActive }, () => {
            if (isActive) {
                showToast("Extension activated.");
            } else {
                showToast("Extension deactivated.");
                // Cleanup UI when deactivated
                const floatingToolbar = document.getElementById("floating-toolbar");
                if (floatingToolbar) floatingToolbar.remove();

                const annotationToolbar = document.getElementById("annotation-toolbar");
                if (annotationToolbar) annotationToolbar.remove();

                const sidebar = document.getElementById("annotation-sidebar");
                if (sidebar) sidebar.style.display = "none";
            }
            sendResponse({ status: `Extension is now ${isActive ? 'active' : 'inactive'}.` });
        });
        return true; // Indicate async
    }

    if (request.action === 'openSidebar') {
        if (isActive) {
            console.log("Message received: Open Annotation Sidebar");
            openAllAnnotationsSidebar();
            sendResponse({ status: "Sidebar opened." });
        } else {
            sendResponse({ status: "Extension inactive. Sidebar not opened." });
        }
        return true;
    }
});

// ---------------------------------------------------------------------------
// showAnnotationToolbar
// ---------------------------------------------------------------------------
function showAnnotationToolbar(range) {
    const existingToolbar = document.getElementById("annotation-toolbar");
    if (existingToolbar) {
        console.log("Removing existing annotation toolbar");
        existingToolbar.remove();
    }

    const toolbar = document.createElement("div");
    toolbar.id = "annotation-toolbar";
    toolbar.innerHTML = `
        <button id="view-annotation-btn" class="toolbar-button">View Annotation</button>
        <button id="remove-annotation-btn" class="toolbar-button">Remove Annotation</button>
    `;
    console.log("Annotation toolbar created");

    const rect = range.getBoundingClientRect();
    toolbar.style.position = "absolute";
    toolbar.style.top = `${window.scrollY + rect.top - 40}px`;
    toolbar.style.left = `${rect.left}px`;
    document.body.appendChild(toolbar);

    setTimeout(() => toolbar.classList.add("show"), 10);

    const viewBtn = document.getElementById("view-annotation-btn");
    const removeBtn = document.getElementById("remove-annotation-btn");

    viewBtn.addEventListener("click", function(event) {
        event.stopPropagation();
        console.log("View Annotation button clicked");
        openAllAnnotationsSidebar();
        toolbar.classList.remove("show");
        setTimeout(() => toolbar.remove(), 300);
    });

    removeBtn.addEventListener("click", function(event) {
        event.stopPropagation();
        console.log("Remove Annotation button clicked");
        const annotationId = range.startContainer.parentElement.getAttribute('data-annotation-id');
        if (annotationId) {
            removeAnnotationById(annotationId);
        }
        toolbar.classList.remove("show");
        setTimeout(() => toolbar.remove(), 300);
    });
}

// ---------------------------------------------------------------------------
// showFloatingToolbar - uses multi-block sub-range approach when highlighting
// ---------------------------------------------------------------------------
function showFloatingToolbar(range) {
    const existingToolbar = document.getElementById("floating-toolbar");
    if (existingToolbar) existingToolbar.remove();

    const toolbar = document.createElement("div");
    toolbar.id = "floating-toolbar";
    toolbar.innerHTML = `
        <button id="annotate-btn">Annotate</button>
        <button id="highlight-btn">Highlight</button>
        <button id="remove-highlight-btn" style="display: none;">Remove Highlight</button>
    `;
    console.log("Toolbar created");

    const rect = range.getBoundingClientRect();
    toolbar.style.position = "absolute";
    toolbar.style.top = `${window.scrollY + rect.top - 40}px`;
    toolbar.style.left = `${rect.left}px`;
    toolbar.style.zIndex = "10000";

    document.body.appendChild(toolbar);
    console.log("Toolbar positioned at: ", toolbar.style.top, toolbar.style.left);

    const highlightButton = document.getElementById("highlight-btn");
    const removeHighlightButton = document.getElementById("remove-highlight-btn");
    const annotateButton = document.getElementById("annotate-btn");

    // Check if text is already highlighted
    if (isTextHighlighted(range)) {
        highlightButton.style.display = "block";
        removeHighlightButton.style.display = "block";
        console.log("Text is already highlighted. Both highlight and remove highlight are visible.");
    } else {
        highlightButton.style.display = "block";
        removeHighlightButton.style.display = "none";
        console.log("Text is not highlighted. Only highlight button is visible.");
    }

    setTimeout(() => toolbar.classList.add("show"), 10);

    highlightButton.addEventListener("click", function(event) {
        event.stopPropagation();
        console.log("Highlight button clicked");
    
        // Show a color palette
        const colorPalette = document.createElement('div');
        colorPalette.id = 'color-palette';
        colorPalette.style.position = 'absolute';
        colorPalette.style.top = `${parseInt(toolbar.style.top) + 40}px`;
        colorPalette.style.left = toolbar.style.left;
        colorPalette.style.zIndex = '10001';
        colorPalette.style.background = '#fff';
        colorPalette.style.border = '1px solid #ccc';
        colorPalette.style.padding = '5px';
        colorPalette.style.borderRadius = '4px';
        colorPalette.style.boxShadow = '0 2px 6px rgba(0,0,0,0.2)';

        const colors = [
            'rgba(255, 255, 0, 0.4)',
            'rgba(255, 192, 203, 0.4)',
            'rgba(144, 238, 144, 0.4)',
            'rgba(173, 216, 230, 0.4)'
        ];

        colors.forEach(c => {
            const colorBtn = document.createElement('button');
            colorBtn.style.background = c;
            colorBtn.style.width = '20px';
            colorBtn.style.height = '20px';
            colorBtn.style.margin = '2px';
            colorBtn.style.border = 'none';
            colorBtn.style.cursor = 'pointer';
            colorBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                // We'll split the user’s selection into sub-ranges per block
                const subRanges = splitRangeByBlockElements(range);

                // Save as a single highlight record with multiple subRanges
                saveMultiBlockHighlight(subRanges, c);

                colorPalette.remove();
                toolbar.classList.remove("show");
                setTimeout(() => toolbar.remove(), 300);
            });
            colorPalette.appendChild(colorBtn);
        });

        document.body.appendChild(colorPalette);
    });

    removeHighlightButton.addEventListener("click", function(event) {
        event.stopPropagation();
        console.log("Remove highlight button clicked");
        removeHighlight(range);
        toolbar.classList.remove("show");
        setTimeout(() => toolbar.remove(), 300);
    });

    annotateButton.addEventListener("click", function(event) {
        event.stopPropagation();
        console.log("Annotate button clicked");
        openAnnotationSidebar(range.toString(), range);
        toolbar.classList.remove("show");
        setTimeout(() => toolbar.remove(), 300);
    });
}

// ---------------------------------------------------------------------------
// Utility to split a user selection range across multiple block-level elements
// ---------------------------------------------------------------------------
function splitRangeByBlockElements(range) {
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

function getBlockAncestor(node) {
    let elem = (node.nodeType === Node.ELEMENT_NODE) ? node : node.parentNode;
    while (elem && !isBlockElement(elem)) {
        elem = elem.parentNode;
    }
    return elem;
}

function isBlockElement(elem) {
    const display = window.getComputedStyle(elem).display;
    return (
        display === 'block' || display === 'flex' ||
        display === 'list-item' || display === 'table' || 
        display === 'grid'
    );
}

function getNextBlockElement(elem) {
    let next = elem;
    while (next) {
        next = next.nextSibling;
        if (next && next.nodeType === Node.ELEMENT_NODE && isBlockElement(next)) {
            return next;
        }
    }
    return null;
}

/** Intersect two ranges - returns new sub-range or null if none. */
function intersectRanges(r1, r2) {
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

// ---------------------------------------------------------------------------
// Store MULTIPLE subranges in one highlight record
// ---------------------------------------------------------------------------
function saveMultiBlockHighlight(subRanges, color) {
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

// ---------------------------------------------------------------------------
// Original offset calculations (used to help store offsets via markers)
// ---------------------------------------------------------------------------
function calculateFullOffsetUsingMarkers(range) {
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

// ---------------------------------------------------------------------------
// Removing highlights from DOM & storage
// ---------------------------------------------------------------------------
function removeHighlight(range) {
    if (!range || range.collapsed) {
        console.warn("No valid selection to remove highlight.");
        return;
    }
    const highlightSpans = getAllIntersectingHighlights(range);
    highlightSpans.forEach(span => {
        const highlightId = span.getAttribute('data-highlight-id') || null;
        if (highlightId) {
            removeHighlightFromStorageById(highlightId);
        }
        const parent = span.parentNode;
        while (span.firstChild) {
            parent.insertBefore(span.firstChild, span);
        }
        parent.removeChild(span);
        console.log(`Removed highlight with ID: ${highlightId}`);
    });
}

function getAllIntersectingHighlights(range) {
    const spans = Array.from(document.querySelectorAll('.highlighted-text'));
    return spans.filter(span => {
        const spanRange = document.createRange();
        spanRange.selectNodeContents(span);
        return rangesIntersect(range, spanRange);
    });
}

function rangesIntersect(r1, r2) {
    return (
        r1.compareBoundaryPoints(Range.END_TO_START, r2) < 0 &&
        r1.compareBoundaryPoints(Range.START_TO_END, r2) > 0
    );
}

function removeHighlightFromStorageById(highlightId) {
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

// For partial backward compatibility
function removeHighlightFromStorage(range) {
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

// ---------------------------------------------------------------------------
// isTextHighlighted: checks if ANY portion of selection is in .highlighted-text
// ---------------------------------------------------------------------------
function isTextHighlighted(range) {
    const textNodes = getTextNodesWithin(range);
    return textNodes.some(nodeInfo => {
        const parent = nodeInfo.node.parentElement;
        return parent && parent.classList.contains('highlighted-text');
    });
}

// ---------------------------------------------------------------------------
// highlightText: apply highlight styles to each text node in the sub-range
// ---------------------------------------------------------------------------
function highlightText(range, highlightId, color = 'yellow') {
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

function getTextNodesWithin(range) {
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

// ---------------------------------------------------------------------------
// Annotation logic - storing multi-block subranges as well
// ---------------------------------------------------------------------------
function openAnnotationSidebar(selectedText, range) {
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
        subRanges: storedSubRanges,   // multi-block subRanges
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

// Re-apply highlight from storage (multi-block)
function applyHighlight(highlight) {
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

function highlightAnnotation(annotation) {
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

function applyAnnotationHighlight(range, annotationId = null) {
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

function applyAnnotationHighlightFromStorage(annotationData) {
    // For multi-block
    if (!annotationData.subRanges || annotationData.subRanges.length === 0) return;
    annotationData.subRanges.forEach(sub => {
        const range = document.createRange();
        const startContainer = findTextNode(sub.startXPath);
        const endContainer = findTextNode(sub.endXPath);

        if (startContainer && endContainer) {
            try {
                range.setStart(startContainer, sub.startOffset);
                range.setEnd(endContainer, sub.endOffset);
                if (range.toString().length > 0) {
                    applyAnnotationHighlight(range, annotationData.id);
                }
            } catch (e) {
                console.error("Error applying annotation highlight from storage:", e, sub);
            }
        }
    });
}
// -------------- ADD THIS NEAR THE TOP -------------
function splitTextIntoLines(text, maxLineLength) {
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
// ---------------------------------------------------------------------------
// The rest: displayExistingAnnotations, editAnnotation, removeAnnotationById, etc.
// ---------------------------------------------------------------------------
function displayAnnotationText(fullText, element) {
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
        moreLink.addEventListener('click', function(event) {
            event.preventDefault();
            element.innerHTML = `<p>${lines.join('<br>')}</p>`;
        });
    }
}

function displayExistingAnnotations(searchQuery = '') {
    chrome.storage.local.get({ annotations: [] }, function(result) {
        const annotations = result.annotations.filter(a => a.url === window.location.href);
        const annotationList = document.getElementById('annotation-list');
        annotationList.innerHTML = '';

        const filtered = annotations.filter(a => {
            const textMatch = a.text.toLowerCase().includes(searchQuery);
            const annoMatch = (a.annotationText || '').toLowerCase().includes(searchQuery);
            return textMatch || annoMatch;
        });
    
        if (filtered.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'no-results';
            noResults.innerText = 'No annotations found.';
            annotationList.appendChild(noResults);
            return;
        }
    
        filtered.forEach(annotation => {
            const annotationItem = document.createElement('div');
            annotationItem.className = 'annotation-item';
    
            // Create header
            const header = document.createElement('div');
            header.className = 'annotation-item-header';

            const selectedTextElement = document.createElement('div');
            selectedTextElement.className = 'selected-text';
            selectedTextElement.innerText = annotation.text;

            const dateElement = document.createElement('div');
            dateElement.className = 'annotation-date';
            const date = new Date(annotation.id);
            dateElement.innerText = date.toLocaleString();

            header.appendChild(selectedTextElement);
            header.appendChild(dateElement);

            const annotationTextElement = document.createElement('div');
            annotationTextElement.className = 'annotation-text-content';
            displayAnnotationText(annotation.annotationText || '', annotationTextElement);

            const actions = document.createElement('div');
            actions.className = 'annotation-actions';

            const editButton = document.createElement('button');
            editButton.className = 'edit-annotation';
            editButton.innerText = 'Edit';
            editButton.addEventListener('click', function() {
                console.log("Edit button clicked for annotation:", annotation.id);
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

function editAnnotation(annotation) {
    console.log("Editing annotation:", annotation);
    window.annotationData = annotation;
    loadSidebar(() => {
        const sidebar = document.getElementById("annotation-sidebar");
        if (sidebar) {
            sidebar.style.display = "block";
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

function deleteAnnotation(annotationId) {
    chrome.storage.local.get({ annotations: [] }, function(result) {
        const annotations = result.annotations.filter(ann => ann.id !== annotationId);
        chrome.storage.local.set({ annotations: annotations }, function() {
            console.log("Annotation deleted. Updated:", JSON.stringify(annotations, null, 2));
            displayExistingAnnotations();
            removeAnnotationHighlight(annotationId);
            showToast("Annotation deleted successfully!");
        });
    });
}

function removeAnnotationHighlight(annotationId) {
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

function removeAnnotationById(annotationId, annotatedElement) {
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
                displayExistingAnnotations();
                showToast("Annotation removed successfully!");
            });
        } else {
            console.error("No annotation found with ID:", annotationId);
        }
    });
}

// Save or update annotation from sidebar
document.addEventListener("click", function(event) {
    if (event.target && event.target.id === "save-button") {
        console.log("Save button clicked.");
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
                });
            });
        } else {
            console.error("No annotation data found in window.annotationData.");
        }
    } else if (event.target && event.target.id === "cancel-button") {
        console.log("Cancel button clicked.");
        document.getElementById('editor-container').style.display = 'none';
    }
});

// ---------------------------------------------------------------------------
// Rebuild text with highlights & annotations on page load
// (Now we handle multi-block by distributing subRanges to the existing logic.)
// ---------------------------------------------------------------------------
function initialize() {
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

// Ensure we init after DOM ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize);
} else {
    initialize();
}

// Function to view a specific annotation in the sidebar
function viewAnnotation(annotationId) {
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

// loadSidebar, showToast, showConfirmationDialog, openAllAnnotationsSidebar, etc.
function loadSidebar(callback) {
    console.log("[DEBUG] Loading sidebar");
    let sidebar = document.getElementById('annotation-sidebar');
    if (sidebar) {
        console.log("[DEBUG] Sidebar already exists.");
        sidebar.style.display = "block";
        const editorContainer = document.getElementById('editor-container');
        if (editorContainer) {
            editorContainer.style.display = "block";
        }
        callback();
        return;
    }

    fetch(chrome.runtime.getURL('src/content/sidebar/sidebar.html'))
        .then(response => response.text())
        .then(data => {
            document.body.insertAdjacentHTML('beforeend', data);
            sidebar = document.getElementById('annotation-sidebar');
            if (!sidebar) {
                console.error("[ERROR] Sidebar element not found after insertion.");
                return;
            }
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = chrome.runtime.getURL('src/content/sidebar/css/sidebar.css');
            document.head.appendChild(link);

            const toggleButton = document.getElementById('toggle-sidebar-button');
            if (toggleButton) {
                toggleButton.addEventListener('click', function() {
                    sidebar.style.display = "none";
                    const editorContainer = document.getElementById('editor-container');
                    if (editorContainer) {
                        editorContainer.style.display = "none";
                    }
                });
            }
            callback();
        })
        .catch(err => console.error("[ERROR] Error loading sidebar:", err));
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'openSidebar') {
        console.log("Message received: Open Annotation Sidebar");
        openAllAnnotationsSidebar();
    }
});

function showToast(message) {
    const existingToast = document.getElementById('custom-toast');
    if (existingToast) {
        existingToast.remove();
    }
    const toast = document.createElement('div');
    toast.id = 'custom-toast';
    toast.innerText = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.right = '20px';
    toast.style.backgroundColor = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    toast.style.zIndex = '10000';
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 500);
    }, 3000);
}

function showConfirmationDialog(message, onConfirm) {
    const existingDialog = document.getElementById('custom-confirmation-dialog');
    if (existingDialog) {
        existingDialog.remove();
    }
    const overlay = document.createElement('div');
    overlay.id = 'custom-dialog-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.zIndex = '10000';

    const dialog = document.createElement('div');
    dialog.id = 'custom-confirmation-dialog';
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = '#fff';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '5px';
    dialog.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
    dialog.style.zIndex = '10001';

    const messageElem = document.createElement('p');
    messageElem.innerText = message;
    dialog.appendChild(messageElem);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.display = 'flex';
    buttonsContainer.style.justifyContent = 'flex-end';
    buttonsContainer.style.marginTop = '20px';

    const cancelButton = document.createElement('button');
    cancelButton.innerText = 'Cancel';
    cancelButton.style.marginRight = '10px';
    cancelButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
    });

    const confirmButton = document.createElement('button');
    confirmButton.innerText = 'Confirm';
    confirmButton.style.backgroundColor = '#007bff';
    confirmButton.style.color = '#fff';
    confirmButton.style.border = 'none';
    confirmButton.style.padding = '5px 10px';
    confirmButton.style.borderRadius = '3px';
    confirmButton.addEventListener('click', () => {
        document.body.removeChild(overlay);
        document.body.removeChild(dialog);
        if (typeof onConfirm === 'function') {
            onConfirm();
        }
    });

    buttonsContainer.appendChild(cancelButton);
    buttonsContainer.appendChild(confirmButton);
    dialog.appendChild(buttonsContainer);
    document.body.appendChild(overlay);
    document.body.appendChild(dialog);
}
function openAllAnnotationsSidebar() {
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


// Existing Code: DOMContentLoaded for search input
document.addEventListener("DOMContentLoaded", function() {
    const searchButton = document.getElementById('search-button');
    const searchInput = document.getElementById('search-input');
    
    // Toggle search input when search button is clicked
    searchButton.addEventListener('click', function(event) {
        console.log("Search button toggled.");
        event.stopPropagation();
        searchInput.classList.toggle('visible');
        if (searchInput.classList.contains('visible')) {
            searchInput.focus();
        } else {
            searchInput.value = '';
            displayExistingAnnotations();
        }
    });
    
    // Handle search input
    searchInput.addEventListener('input', function(event) {
        const query = event.target.value.trim().toLowerCase();
        displayExistingAnnotations(query);
    });
});

/* Inject Tooltip Styles Dynamically (If Not Using External CSS) */
(function() {
    if (!document.getElementById('annotation-tooltip-style')) {
        const style = document.createElement('style');
        style.id = 'annotation-tooltip-style';
        style.textContent = `
            .annotation-tooltip {
                position: absolute;
                background-color: #f9f9f9;
                color: #333333;
                padding: 10px 15px;
                border-radius: 6px;
                font-size: 14px;
                font-family: Arial, sans-serif;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                max-width: 300px;
                z-index: 10000;
                pointer-events: none;
                opacity: 0;
                transition: opacity 0.3s ease-in-out;
                white-space: pre-wrap;
            }
            .annotation-tooltip::after {
                content: "";
                position: absolute;
                bottom: -10px;
                left: 20px;
                border-width: 10px 10px 0 10px;
                border-style: solid;
                border-color: #f9f9f9 transparent transparent transparent;
            }
        `;
        document.head.appendChild(style);
    }
})();

/* Tooltip Handling */
function showAnnotationTooltip(element, annotationId) {
    chrome.storage.local.get(['annotations'], function(result) {
        const annotations = result.annotations;
        const annotation = annotations.find(ann => ann.id === Number(annotationId));

        if (annotation && annotation.annotationText) {
            let tooltip = document.getElementById('annotation-tooltip');
            if (!tooltip) {
                tooltip = document.createElement('div');
                tooltip.id = 'annotation-tooltip';
                tooltip.className = 'annotation-tooltip';
                tooltip.setAttribute('role', 'tooltip');
                document.body.appendChild(tooltip);
            }

            tooltip.innerText = annotation.annotationText;
            tooltip.style.top = '0px';
            tooltip.style.left = '0px';
            tooltip.style.opacity = '0';
            tooltip.style.display = 'block';

            requestAnimationFrame(() => {
                const rect = element.getBoundingClientRect();
                const tooltipRect = tooltip.getBoundingClientRect();
                const scrollY = window.scrollY || window.pageYOffset;
                const scrollX = window.scrollX || window.pageXOffset;

                let top = scrollY + rect.top - tooltipRect.height - 15;
                let left = scrollX + rect.left + (rect.width - tooltipRect.width) / 2;
                if (top < scrollY) {
                    top = scrollY + rect.bottom + 15;
                    tooltip.style.setProperty('--arrow-position', 'top');
                } else {
                    tooltip.style.setProperty('--arrow-position', 'bottom');
                }
                left = Math.max(scrollX + 10, Math.min(left, scrollX + window.innerWidth - tooltipRect.width - 10));

                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
                tooltip.style.opacity = '1';
            });
        }
    });
}

function hideAnnotationTooltip() {
    const tooltip = document.getElementById('annotation-tooltip');
    if (tooltip) {
        tooltip.style.opacity = '0';
        setTimeout(() => {
            if (tooltip.parentNode) {
                tooltip.parentNode.removeChild(tooltip);
            }
        }, 300);
    }
}

document.addEventListener('mouseover', function(event) {
    const annotatedElement = event.target.closest('.annotated-annotation');
    if (annotatedElement) {
        const annotationId = annotatedElement.getAttribute('data-annotation-id');
        if (annotationId) {
            showAnnotationTooltip(annotatedElement, annotationId);
        }
    }
});

document.addEventListener('mouseout', function(event) {
    const annotatedElement = event.target.closest('.annotated-annotation');
    if (annotatedElement) {
        hideAnnotationTooltip();
    }
});
function getXPath(node) {
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
