// Sidebar functionality
export function initializeSidebar() {
    // Add resize handle to container
    const container = document.querySelector('.annotation-container');
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'resize-handle';
    container.appendChild(resizeHandle);

    let isResizing = false;
    let startX;
    let startWidth;

    // Initialize resize functionality
    resizeHandle.addEventListener('mousedown', initResize);

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
    }

    function resize(e) {
        if (!isResizing) return;

        // Calculate new width
        const width = startWidth - (e.clientX - startX);
        
        // Apply min/max constraints
        const minWidth = 300;
        const maxWidth = 800;
        const newWidth = Math.min(Math.max(width, minWidth), maxWidth);
        
        // Update container width
        container.style.width = `${newWidth}px`;
    }

    function stopResize() {
        isResizing = false;
        
        // Remove active class
        resizeHandle.classList.remove('active');
        
        // Remove event listeners
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('mouseup', stopResize);
        
        // Re-enable text selection
        document.body.style.userSelect = '';
    }

    // Store sidebar width in localStorage
    window.addEventListener('beforeunload', () => {
        const width = container.style.width;
        if (width) {
            localStorage.setItem('annotationSidebarWidth', width);
        }
    });

    // Restore sidebar width from localStorage
    const savedWidth = localStorage.getItem('annotationSidebarWidth');
    if (savedWidth) {
        container.style.width = savedWidth;
    }
}
