import { initializeSidebar as initializeSidebarResize } from '../sidebar.js';
import { setupSearch } from './search.js';

/**
 * Load and initialize the sidebar
 * @param {Function} callback - Callback function to execute after sidebar is loaded
 */
export function loadSidebar(callback) {
  console.log("[DEBUG sidebar.js] Loading sidebar");
  let container = document.querySelector('.annotation-container');
  let sidebar = document.getElementById('annotation-sidebar');
  
  if (container && sidebar) {
    console.log("[DEBUG sidebar.js] Sidebar already exists.");
    container.style.display = "flex";
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
      editorContainer.style.display = 'block';
    }
    callback();
    return;
  }

  fetch(chrome.runtime.getURL('src/content/sidebar/sidebar.html'))
    .then(response => response.text())
    .then(data => {
      // Create container if it doesn't exist
      if (!container) {
        container = document.createElement('div');
        container.className = 'annotation-container';
        document.body.appendChild(container);
      }

      // Add resize handle
      const resizeHandle = document.createElement('div');
      resizeHandle.className = 'resize-handle';
      container.appendChild(resizeHandle);

      // Insert sidebar HTML into container
      container.insertAdjacentHTML('beforeend', data);
      sidebar = document.getElementById('annotation-sidebar');
      
      if (!sidebar) {
        console.error("[ERROR sidebar.js] Sidebar element not found after insertion.");
        return;
      }

      // Hide editor container by default
      const editorContainer = document.getElementById('editor-container');
      if (editorContainer) {
        editorContainer.style.display = 'none';
      }

      // Add stylesheets
      const stylesheets = [
        'src/content/sidebar/css/sidebar.css',
        'src/content/sidebar/css/annotations.css',
        'src/content/sidebar/css/buttons.css',
        'src/content/sidebar/css/container.css',
        'src/content/sidebar/css/general.css',
        'src/content/sidebar/css/navigation.css',
        'src/content/sidebar/css/notes.css',
        'src/content/sidebar/css/tags.css',
        'src/content/sidebar/css/topbar.css'
      ];

      stylesheets.forEach(stylesheet => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = chrome.runtime.getURL(stylesheet);
        document.head.appendChild(link);
      });

      // Initialize resize functionality
      initializeSidebarResize();

      // Setup toggle button
      const toggleButton = document.getElementById('toggle-sidebar-button');
      if (toggleButton) {
        toggleButton.addEventListener('click', function() {
          container.style.display = "none";
          const editorContainer = document.getElementById('editor-container');
          if (editorContainer) {
            editorContainer.style.display = 'none';
          }
        });
      }

      // Restore saved width if any
      const savedWidth = localStorage.getItem('annotationSidebarWidth');
      if (savedWidth) {
        container.style.width = savedWidth;
      }

      // Initialize search functionality
      setupSearch();
      
      callback();
    })
    .catch(err => console.error("[ERROR sidebar.js] Error loading sidebar:", err));
}
