import { showToast } from './toast.js';
import { showConfirmationDialog } from './dialog.js';
import './tooltip.js';  // Import for side effects only
import { initializeSearch, setupSearch } from './search.js';
import { 
  displayAnnotationText, 
  displayExistingAnnotations, 
  editAnnotation, 
  deleteAnnotation 
} from './annotations.js';
import { loadSidebar } from './sidebar.js';

// Initialize UI components
function initializeUI() {
  setupSearch();
}

export {
  // Toast notifications
  showToast,
  
  // Dialog functionality
  showConfirmationDialog,
  
  // Search functionality
  initializeSearch,
  setupSearch,
  
  // Annotation management
  displayAnnotationText,
  displayExistingAnnotations,
  editAnnotation,
  deleteAnnotation,
  
  // Sidebar management
  loadSidebar,
  
  // UI initialization
  initializeUI
};
