# Prompts Integration Guide

## Overview

Your NetSuite Dashboard now supports importing Professional Services demo preparation prompts from an HTML document.

## Files Added

1. **`public/prompts-ps.html`** - Professional Services NetSuite Demo Preparation Prompts
2. **`src/promptParser.js`** - Utility to parse and extract prompts from HTML
3. **`src/PromptImporter.jsx`** - React component for importing prompts

## How to Use

### Option 1: Integrate into Dashboard

Add the PromptImporter component to your Dashboard Settings:

```jsx
import PromptImporter from './src/PromptImporter';

// In your Settings Modal or Prompts tab:
<PromptImporter
  onPromptsImported={(newPrompts) => {
    // Update promptCategories with new prompts
    console.log('Imported prompts:', newPrompts);
  }}
/>
```

### Option 2: Manual Import

1. Visit your dashboard
2. Open Developer Console (F12)
3. Run:

```javascript
import { loadPromptsFromURL, convertToDashboardFormat } from './src/promptParser.js';

// Load prompts
const parsed = await loadPromptsFromURL('/prompts-ps.html');
const dashboard = convertToDashboardFormat(parsed);

// View the formatted prompts
console.log(dashboard);

// Copy to clipboard
copy(JSON.stringify(dashboard, null, 2));
```

### Option 3: Use CLI Script

Create a Node script to extract prompts:

```bash
# Create extract-prompts.js
node extract-prompts.js > prompts.json
```

## Prompt Structure

The parser converts HTML into this format:

```javascript
{
  "customer_setup": {
    "label": "Customer Setup",
    "description": "Prompts for creating and configuring customers",
    "prompts": [
      {
        "label": "Create Basic Customer",
        "prompt": "Create a new customer for [Company Name]...",
        "tags": []
      }
    ]
  }
}
```

## Integration Steps (Recommended)

### Step 1: Add State for Dynamic Prompts

In `DemoDashboard.jsx`:

```jsx
const [promptCategories, setPromptCategories] = useState([
  {
    name: 'Customer Setup',
    prompts: [ /* ... existing prompts ... */ ]
  }
]);
```

### Step 2: Add Import Button

In the PromptLibrary component, add:

```jsx
import PromptImporter from './src/PromptImporter';

// In PromptLibrary component:
<PromptImporter
  onPromptsImported={(newPrompts) => {
    // Convert and merge with existing
    const newCategories = Object.values(newPrompts).map(cat => ({
      name: cat.label,
      prompts: cat.prompts.map(p => p.prompt)
    }));

    setPromptCategories([...promptCategories, ...newCategories]);
  }}
/>
```

### Step 3: Persist to LocalStorage

```jsx
// Save when prompts change
useEffect(() => {
  localStorage.setItem('customPrompts', JSON.stringify(promptCategories));
}, [promptCategories]);

// Load on mount
useEffect(() => {
  const saved = localStorage.getItem('customPrompts');
  if (saved) {
    setPromptCategories(JSON.parse(saved));
  }
}, []);
```

## Alternative: Static Extraction

If you prefer to extract prompts once and hardcode them:

1. Load the HTML file in browser
2. Open DevTools Console
3. Copy this script:

```javascript
const parser = new DOMParser();
const response = await fetch('/prompts-source.html');
const html = await response.text();
const doc = parser.parseFromString(html, 'text/html');

const prompts = [];
doc.querySelectorAll('h3, p').forEach(el => {
  if (el.tagName === 'H3') {
    prompts.push({ title: el.textContent, content: '' });
  } else if (prompts.length > 0) {
    prompts[prompts.length - 1].content += el.textContent + '\n';
  }
});

console.log(JSON.stringify(prompts, null, 2));
```

4. Copy output and update `promptCategories` in your code

## Updating Prompts

When your prompts document changes:

1. Re-export to HTML
2. Replace `public/prompts-ps.html`
3. Use PromptImporter to reload
4. Or re-run extraction script

## Benefits

- ✅ Centralized prompt management
- ✅ Easy updates from master document
- ✅ No manual copying/pasting
- ✅ Version control for prompts
- ✅ Share prompts across team

## Next Steps

1. Review extracted prompts
2. Choose integration method (dynamic vs static)
3. Test import functionality
4. Update documentation
5. Share with team

---

**Note**: The HTML file is quite large (~67k tokens). Consider creating a simplified version with just the prompts text if performance is a concern.
