// src/content/modules/toolbar.js

import { isTextHighlighted, splitRangeByBlockEls } from './highlight.js';
import { removeHighlight } from './highlight.js';
import { openAnnotationSidebar } from './annotation.js';
import { saveMultiBlockHighlight } from './storage.js';

/**
 * ---------------------------------------------------------------------------
 * showFloatingToolbar - uses multi-block sub-range approach when highlighting
 * ---------------------------------------------------------------------------
 */
export function showFloatingToolbar(range) {
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
                const subRanges = splitRangeByBlockEls(range);

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

/**
 * ---------------------------------------------------------------------------
 * showAnnotationToolbar
 * ---------------------------------------------------------------------------
 */
export function showAnnotationToolbar(range) {
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
        // openAllAnnotationsSidebar() or relevant logic
        toolbar.classList.remove("show");
        setTimeout(() => toolbar.remove(), 300);
    });

    removeBtn.addEventListener("click", function(event) {
        event.stopPropagation();
        console.log("Remove Annotation button clicked");
        const annotationId = range.startContainer.parentElement.getAttribute('data-annotation-id');
        if (annotationId) {
            // removeAnnotationById(annotationId) or relevant logic
        }
        toolbar.classList.remove("show");
        setTimeout(() => toolbar.remove(), 300);
    });
}
