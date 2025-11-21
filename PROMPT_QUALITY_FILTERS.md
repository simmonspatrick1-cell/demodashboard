# Prompt Quality Filters

## Overview

The prompt parser now includes quality filters to ensure only actionable, well-formed prompts are imported into the dashboard.

## Filters Applied

### 1. **Word Count Filter** (Minimum 5 Words)
All prompts must contain at least 5 words to be imported.

**Why**: Short prompts like "Create customer" or "Set up project" lack the detail needed to generate meaningful NetSuite demo data.

**Examples**:
- ❌ "Create customer" (2 words - rejected)
- ❌ "Set up new project" (4 words - rejected)
- ✅ "Create a new customer for TechStart Solutions" (7 words - accepted)
- ✅ "Set up a project for Q1 Website Redesign" (9 words - accepted)

### 2. **Action Word Validation**
Prompts must contain at least one action verb:
- Create
- Set up
- Generate
- Add

**Why**: Ensures prompts are actionable instructions, not descriptions or notes.

### 3. **Minimum Character Length**
Prompts must be at least 20 characters long.

**Why**: Provides a baseline quality check in addition to word count.

### 4. **Empty Category Removal**
Categories with no valid prompts after filtering are automatically removed.

**Why**: Prevents cluttering the UI with empty categories.

## Implementation

The filters are applied in two stages:

### Stage 1: During Parsing
```javascript
// In parsePromptsFromHTML()
const wordCount = promptText.split(/\s+/).filter(word => word.length > 0).length;

if (wordCount >= 5 && 
    promptText.length > 20 && 
    (promptText.includes('Create') || 
     promptText.includes('Set up') || 
     promptText.includes('Generate') || 
     promptText.includes('Add'))) {
  // Add prompt
}
```

### Stage 2: Post-Processing Cleanup
```javascript
// After parsing is complete
prompts.categories = prompts.categories.map(category => ({
  ...category,
  prompts: category.prompts.filter(prompt => {
    const content = prompt.content || '';
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    return wordCount >= 5;
  })
})).filter(category => category.prompts.length > 0);
```

## Benefits

1. **Higher Quality Data**: Only detailed, actionable prompts make it to the dashboard
2. **Better User Experience**: Users don't waste time on vague or incomplete prompts
3. **Cleaner UI**: No empty categories or low-quality entries
4. **Better AI Results**: More detailed prompts lead to better AI-generated demo data

## Testing

To verify the filters are working:

1. Import prompts via the dashboard
2. Check the import stats - total prompt count should reflect only valid prompts
3. Browse imported categories - all prompts should be detailed and actionable
4. No categories should be empty

## Future Enhancements

Potential additional filters:
- **Duplicate Detection**: Remove identical or very similar prompts
- **NetSuite Entity Validation**: Ensure prompts reference valid NetSuite record types
- **Placeholder Detection**: Flag prompts with too many placeholders (e.g., [X], [Y], [Z])
- **Length Limits**: Set maximum word count to prevent overly complex prompts
