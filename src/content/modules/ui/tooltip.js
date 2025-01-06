/* Inject Tooltip Styles Dynamically */
function injectTooltipStyles() {
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
}

/**
 * Shows a tooltip for an annotation
 * @param {HTMLElement} element - The element to show the tooltip for
 * @param {string} annotationId - The ID of the annotation
 */
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

/**
 * Hides the annotation tooltip
 */
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

// Initialize tooltip functionality immediately
injectTooltipStyles();

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
