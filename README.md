# Local Annotator Extension

> This page reuses BSD 3-Clause License content from {cite:t}`annotator`. {fa}`quote-left`{ref}`Find out more here.<external_resources>`


```{admonition} User types
:class: tip
This page is useful for all user types, although explicitly designed for students!
```
+++
{bdg-success}`Chrome Extension`

```{admonition} Work in progress
:class: warning
This tool is still in development
```

A tool for making annotations on websites, with the primary application for use with online interactive textbooks. This extension provides students, readers and anyone with the ability to use an online textbook in a similar way as a paper book: highlight text and make notes in the margins. The extension is developed by the TeachBooks team (info@teachbooks.io)

You can download the extension directly from the [Chrome Web Store](https://chromewebstore.google.com/detail/teachbooks-annotator/dimjlbhnlppdgeckiigomiidepaopidm).

If you want to try it in **developer mode**, follow the step-by-step instructions below.

---

## Features

### Current Features
- **Multiple Highlight Colors**: Choose from four different highlight colors (Yellow, Pink, Green, Blue) to organize your highlights.
- **Annotations**: Add annotations with a clean red underline style.
- **Filtering System**:
  - Toggle visibility of annotations
  - Toggle visibility of specific highlight colors
  - Filters persist across page refreshes
- **Export/Import System**:
  - Selectively export annotations and highlights
  - Choose which color highlights to include in export
  - Export data in JSON format
  - Import previously exported data
  - Share annotations and highlights with others through exported files
- **Statistics View**: See a summary of your highlights and annotations for the current page
- **Search Functionality**: Search through your highlights and annotations
- **Overlap Prevention**:
  - Prevents overlapping highlights
  - Prevents overlapping annotations
  - Prevents highlighting annotated text
- **Contextual Toolbars**:
  - Floating toolbar for text selection
  - Annotation toolbar for managing existing annotations
- **Annotation Sidebar**:
  - View all annotations for the current page
  - Edit and delete annotations
  - Animated scrolling to selected annotations
- **Persistent Storage**: All highlights and annotations are saved locally and persist across sessions
- **Extension State Management**: Ability to activate/deactivate the extension
- **Multi-block Selection**: Support for selecting text across multiple blocks/paragraphs
- **Toast Notifications**: User-friendly feedback for actions

### Future Features
- **Tags for Annotations**: Allow users to categorize annotations using custom tags
- **Organized Dashboard**: A centralized dashboard to manage annotations across multiple pages
- **Multi-page View**: Navigate and manage annotations across multiple tabs or pages
- **Enhanced Export Options**: Export in multiple formats (PDF, Markdown, CSV)
- **Collaborative Features**: Real-time collaboration on annotations with others

---

## Installation

### From Chrome Web Store
1. Visit the [Chrome Web Store link](https://chromewebstore.google.com/detail/teachbooks-annotator/dimjlbhnlppdgeckiigomiidepaopidm).
2. Click the **"Add to Chrome"** button.
3. Once installed, the Local Annotator extension icon will appear in your Chrome toolbar.

### Developer Mode
1. Clone or download this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the extension
4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist` directory

---

## How to Use

### Highlighting Text
1. Select any text on the page
2. Click one of the highlight color buttons in the floating toolbar
3. Toggle highlight visibility using the filter menu in the extension popup

### Adding Annotations
1. Select text you want to annotate
2. Click the annotation button in the floating toolbar
3. Add your annotation in the sidebar that appears
4. The annotated text will be marked with a red underline

### Managing Visibility
1. Click the extension icon to open the popup
2. Use the "Filters" tab to:
   - Toggle annotation visibility
   - Toggle specific highlight colors
3. Filter settings persist across page refreshes

### Exporting Data
1. Click the extension icon
2. Click "Export Data"
3. Select what to include in the export:
   - Choose which highlight colors to export
   - Choose whether to include annotations
4. Click "Export Selected" to download the JSON file

### Importing Data
1. Click the extension icon
2. Click "Import Data"
3. Select a previously exported JSON file
4. Your highlights and annotations will be restored

### Viewing Statistics
1. Click the extension icon
2. The "Statistics" tab shows:
   - Count of highlights by color
   - Total number of annotations
   - All statistics for the current page

---

## Technical Challenges: The Overlap Problem

One of the most significant challenges during development was handling overlapping highlights and annotations. This is an inherently complex problem due to the nature of DOM manipulation and the various ways text can be selected across different HTML elements.

### Attempted Solutions

1. **DOM Tree Traversal**:
   - Attempted to traverse the DOM tree to find and split overlapping ranges
   - Failed because nested highlights created complex DOM structures that were difficult to traverse reliably
   - Led to inconsistent results when multiple highlights overlapped

2. **Range Intersection Detection**:
   - Tried to detect intersections between ranges before applying highlights
   - Worked for simple cases but failed with complex selections spanning multiple DOM elements
   - Couldn't handle cases where selections partially overlapped existing highlights

3. **DOM Fragment Manipulation**:
   - Attempted to extract content, modify it, and reinsert it
   - Led to issues with DOM structure integrity
   - Lost event listeners and broke existing highlights

4. **Layer-based Approach**:
   - Tried to create separate layers for different highlights
   - Failed because it required significant DOM restructuring
   - Caused issues with text selection and copy/paste functionality

5. **Virtual DOM Implementation**:
   - Attempted to maintain a virtual representation of the highlights
   - Synchronization between virtual and actual DOM became extremely complex
   - Performance issues with large numbers of highlights

6. **CSS-only Solution**:
   - Tried using pure CSS for highlighting without DOM manipulation
   - Couldn't achieve the required precision for text selection
   - Failed to handle multi-block selections properly

### Current Implementation

Due to these challenges, the current implementation prevents overlapping entirely. When a user tries to create a highlight or annotation that would overlap with existing ones, the operation is blocked and a user-friendly message is displayed. This decision was made because:

1. **DOM Stability**: 
   - Each highlight and annotation modifies the DOM structure
   - Overlapping modifications can lead to unpredictable results
   - Maintaining DOM integrity is crucial for proper functionality

2. **User Experience**:
   - Clear feedback when overlap is detected
   - Consistent behavior across different scenarios
   - No risk of corrupting existing highlights or annotations

3. **Future Maintainability**:
   - Clean separation between different highlights and annotations
   - Simpler codebase without complex overlap handling
   - More reliable storage and restoration of highlights

### Future Considerations

While overlapping highlights and annotations remain unsupported, potential future solutions might include:

- Implementing a layer-based system using modern web technologies
- Using Web Components for better encapsulation
- Exploring new DOM manipulation techniques as browsers evolve

---

## Feedback and Contributions
Feel free to submit feedback or suggest new features by creating an issue in this repository. Your input helps make the Local Annotator better for everyone!
