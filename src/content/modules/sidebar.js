// Sidebar functionality
import { initializeSearch } from './ui.js';

export function initializeSidebar() {
    // Add resize handle to container
    const container = document.querySelector('.annotation-container');
    if (!container) {
        console.error('Container not found');
        return;
    }

    let resizeHandle = container.querySelector('.resize-handle');
    if (!resizeHandle) {
        resizeHandle = document.createElement('div');
        resizeHandle.className = 'resize-handle';
        container.appendChild(resizeHandle);
    }

    let isResizing = false;
    let startX;
    let startWidth;

    function initResize(e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = parseInt(getComputedStyle(container).width, 10);
        
        // Add active class for visual feedback
        resizeHandle.classList.add('active');
        
        // Add event listeners for resize
        document.addEventListener('mousemove', resize);
        document.addEventListener('mouseup', stopResize);
        
        // Prevent text selection while resizing
        document.body.style.userSelect = 'none';
        
        // Prevent default drag behavior
        e.preventDefault();
    }

    function resize(e) {
        if (!isResizing) return;

        // Calculate new width (subtract from startWidth since handle is on left side)
        const width = startWidth - (e.clientX - startX);
        
        // Apply min/max constraints
        const minWidth = 300;
        const maxWidth = 800;
        const newWidth = Math.min(Math.max(width, minWidth), maxWidth);
        
        // Update container width
        container.style.width = `${newWidth}px`;
        
        // Save width immediately
        localStorage.setItem('annotationSidebarWidth', `${newWidth}px`);
        
        // Prevent text selection
        e.preventDefault();
    }

    function stopResize() {
        if (!isResizing) return;
        
        isResizing = false;
        
        // Remove active class
        resizeHandle.classList.remove('active');
        
        // Remove event listeners
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        
        // Re-enable text selection
        document.body.style.userSelect = '';
    }

    // Remove any existing event listeners before adding new ones
    resizeHandle.removeEventListener('mousedown', initResize);
    resizeHandle.addEventListener('mousedown', initResize);

    // Restore saved width if any
    const savedWidth = localStorage.getItem('annotationSidebarWidth');
    if (savedWidth) {
        container.style.width = savedWidth;
    }

    // Initialize search functionality
    initializeSearch();
}
