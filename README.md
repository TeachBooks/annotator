# Local Annotator Extension

A tool for making annotations on websites, with the primary application for use with online interactive textbooks. This extension provides students, readers and anyone with the ability to use an online textbook in a similar way as a paper book: highligh text and make notes in the margins. Although the initial feature set is simple, future releases will include the ability to use labels and different annotation types to improve your study sessions as well as features to collaborate with others. The extension is developed by the TeachBooks team (teachbooks@tudelft.nl)

You can download the extension directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/teachbooks-annotator/dimjlbhnlppdgeckiigomiidepaopidm).

If you want to try it in **developer mode**, follow the step-by-step instructions below.

---

## Features

### Current Features
- **Highlight Text**: Select and highlight text on any webpage to make important information stand out.
- **Add Annotations**: Annotate your highlights with detailed notes to capture ideas or insights.
- **Annotation Toolbar**: Contextual toolbar appears when you interact with annotated or selected text, offering editing or deletion options.
- **Annotation Sidebar**:
  - View all annotations for the current page.
  - Edit, delete, or organize annotations from a central location.
- **Search Annotations**: Quickly search for specific annotations or highlighted text using a search bar. (Under development)
- **Export Highlights**: Export your highlights and annotations for later use.
- **Persistent Storage**: Automatically saves your annotations and highlights locally, so they stay on the page even when you refresh.
- **Undo Highlights and Annotations**: Remove highlights or annotations effortlessly.

### Future Features
- **Tags for Annotations**: Allow users to categorize annotations using custom tags for better organization.
- **Different Annotation Colors**: Support for multiple highlight and annotation colors to distinguish different types of information.
- **Annotation Sharing**: Share annotations with others via links or downloadable files.
- **Organized Annotation Dashboard**: A centralized dashboard to manage annotations across multiple pages.
- **Quick Copy Feature**: Allow users to quickly copy annotated or highlighted text.
- **Multi-page Annotation Viewing**: Navigate and manage annotations across multiple tabs or pages.
- **Improved Export Options**: Export highlights in multiple formats like PDF, Markdown, or CSV, or selective export for annotations with a specific tags.

---

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store link](https://chromewebstore.google.com/detail/teachbooks-annotator/dimjlbhnlppdgeckiigomiidepaopidm).
2. Click the **"Add to Chrome"** button.
3. Once installed, the Local Annotator extension icon will appear in your Chrome toolbar.

### Developer Mode (Optional)
If you want to try the extension in **developer mode**, follow these instructions:

1. **Prepare the Extension Files**:
   - Ensure the following files are in a directory named `local-annotator-extension`:
     - `manifest.json`
     - `popup.html`
     - `popup.js`
     - `background.js`
     - `content.js`
     - `styles.css`
     - `icon.png` (128x128 icon image)

2. **Load the Extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable "Developer mode".
   - Click "Load unpacked" and select the `local-annotator-extension` directory.

3. **Test the Extension**:
   - Navigate to any webpage.
   - Open Developer Tools (F12 or right-click and "Inspect") and go to the "Console" tab.
   - Select some text to see context menu options "Annotate" and "Highlight".
   - Click "Annotate" or "Highlight" in the context menu.

---

## How to Use
1. **Highlight Text**:
   - Select the text you want to highlight.
   - Click on the "Highlight" option in the floating toolbar or context menu.
2. **Add Annotations**:
   - Select text and click "Annotate".
   - Write your note in the sidebar editor and save.
3. **Search for Annotations**:
   - Click on the search icon in the sidebar.
   - Type your query to filter annotations.
4. **Manage Annotations**:
   - Use the sidebar to edit or delete annotations.
5. **Export Highlights**:
   - Use the export option to save your highlights for later use.

---

## Feedback and Contributions
Feel free to submit feedback or suggest new features directly via the extension's review section on the Chrome Web Store. Your input helps make the Local Annotator better for everyone!

