import { displayExistingAnnotations } from './annotations.js';

let searchInitialized = false;

/**
 * Initialize search functionality
 */
function initializeSearch() {
  if (searchInitialized) {
    console.log("[DEBUG search.js] Search already initialized, skipping");
    return;
  }

  console.log("[DEBUG search.js] Initializing search functionality");
  const topBar = document.getElementById('top-bar');
  const searchButton = document.getElementById('search-button');
  const searchInput = document.getElementById('search-input');
  const backButton = document.getElementById('back-button');

  if (!topBar || !searchButton || !searchInput || !backButton) {
    console.error("[ERROR search.js] Search elements not found:", {
      topBar: !!topBar,
      searchButton: !!searchButton,
      searchInput: !!searchInput,
      backButton: !!backButton
    });
    return;
  }

  // Handle search activation
  const activateSearch = function(event) {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    console.log("[DEBUG search.js] Search activated");
    
    // Always ensure search mode is active
    topBar.classList.add('search-mode');
    
    // Force a reflow to ensure the transition works
    void topBar.offsetWidth;
    
    // Focus the input after the transition
    setTimeout(() => {
      searchInput.focus();
      // Ensure the input is visible and interactive
      searchInput.style.opacity = '1';
      searchInput.style.visibility = 'visible';
      searchInput.style.pointerEvents = 'auto';
      searchInput.style.width = '100%';
      searchInput.style.maxWidth = '100%';
    }, 100);
  };

  // Add click event listener to the search button
  searchButton.addEventListener('click', activateSearch);
  
  // Ensure the search icon click also triggers search
  const searchIcon = searchButton.querySelector('i.fa-search');
  if (searchIcon) {
    searchIcon.addEventListener('click', function(event) {
      event.stopPropagation();
      activateSearch(event);
    });
  }

  // Back button click handler
  backButton.addEventListener('click', function() {
    console.log("[DEBUG search.js] Back button clicked.");
    topBar.classList.remove('search-mode');
    searchInput.value = '';
    searchInput.style.width = '0';
    searchInput.style.maxWidth = '0';
    displayExistingAnnotations();
  });

  // Define search handler
  function handleSearch(event) {
    console.log("[DEBUG search.js] Search input event triggered:", event.type);
    const query = event.target.value.trim().toLowerCase();
    console.log("[DEBUG search.js] Search input changed. Query:", query);
    
    // Log the current state
    console.log("[DEBUG search.js] Search input element:", {
      value: searchInput.value,
      visibility: searchInput.style.visibility,
      opacity: searchInput.style.opacity,
      width: searchInput.style.width,
      display: searchInput.style.display
    });
    
    // Force immediate update
    displayExistingAnnotations(query);
  }

  // Create a debounced version of the search handler
  let searchTimeout;
  function debouncedSearch(event) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => handleSearch(event), 100);
  }

  // Add event listeners
  searchInput.addEventListener('input', debouncedSearch);
  searchInput.addEventListener('keyup', debouncedSearch);
  searchInput.addEventListener('change', debouncedSearch);

  // Also add direct property handlers
  searchInput.oninput = debouncedSearch;
  searchInput.onkeyup = debouncedSearch;
  searchInput.onchange = debouncedSearch;

  // Add focus handler to ensure input is ready
  searchInput.addEventListener('focus', function() {
    console.log("[DEBUG search.js] Search input focused");
    if (!topBar.classList.contains('search-mode')) {
      activateSearch();
    }
  });

  // Handle escape key and other keyboard events
  searchInput.addEventListener('keydown', function(event) {
    console.log("[DEBUG search.js] Search input keydown:", event.key);
    if (event.key === 'Escape') {
      backButton.click();
    } else if (event.key === 'Enter') {
      handleSearch(event);
    }
  });

  // Ensure search mode is properly activated
  const searchContainer = document.querySelector('.search-container');
  if (searchContainer) {
    searchContainer.addEventListener('click', function(event) {
      console.log("[DEBUG search.js] Search container clicked");
      if (!topBar.classList.contains('search-mode')) {
        activateSearch();
      }
      searchInput.focus();
    });
  }

  // Mark as initialized
  searchInitialized = true;
  console.log("[DEBUG search.js] Search initialization complete");
}

/**
 * Setup search functionality
 */
function setupSearch() {
  console.log("[DEBUG search.js] Setting up search functionality");

  function tryInitialize() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      console.log("[DEBUG search.js] Search input found, initializing");
      
      // Force the input to be interactive
      searchInput.style.pointerEvents = 'auto';
      searchInput.style.visibility = 'visible';
      searchInput.style.opacity = '1';
      
      // Initialize search functionality
      initializeSearch();
      
      // Add direct event listener for input
      searchInput.addEventListener('input', function(event) {
        const query = event.target.value.trim().toLowerCase();
        console.log("[DEBUG search.js] Direct input event. Query:", query);
        displayExistingAnnotations(query);
      });
      
      return true;
    }
    return false;
  }

  // Try to initialize immediately
  if (!tryInitialize()) {
    console.log("[DEBUG search.js] Search input not found, setting up observer");
    
    // Set up observer to wait for the search input
    const observer = new MutationObserver(function(mutations) {
      if (tryInitialize()) {
        console.log("[DEBUG search.js] Search initialized via observer");
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Add a global handler for search input
document.addEventListener('input', function(event) {
  if (event.target && event.target.id === 'search-input') {
    const query = event.target.value.trim().toLowerCase();
    console.log("[DEBUG search.js] Global input event. Query:", query);
    displayExistingAnnotations(query);
  }
});

export { initializeSearch, setupSearch };
