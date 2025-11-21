/**
 * Prompt Parser Utility
 * Extracts and parses NetSuite demo prompts from HTML/text documents
 */

/**
 * Parse HTML content and extract prompts
 * @param {string} htmlContent - Raw HTML content
 * @returns {Object} Structured prompts data
 */
export function parsePromptsFromHTML(htmlContent) {
  // Create a temporary DOM element to parse HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const prompts = {
    categories: [],
    allPrompts: []
  };

  let currentCategory = null;
  let currentPrompt = null;

  // Find all headings, paragraphs, and table cells
  const elements = doc.querySelectorAll('h1, h2, h3, p, ul, ol, td');

  elements.forEach(element => {
    const text = element.textContent.trim();

    if (!text) return;

    // Skip empty or very short content
    if (text.length < 3) return;

    // H1 or H2 = Main category
    if (element.tagName === 'H1' || element.tagName === 'H2') {
      if (currentCategory && currentCategory.prompts.length > 0) {
        prompts.categories.push(currentCategory);
      }

      currentCategory = {
        name: text,
        prompts: [],
        description: ''
      };
      currentPrompt = null;
    }

    // H3 = Subcategory or Prompt title
    else if (element.tagName === 'H3') {
      // Save previous prompt if exists
      if (currentPrompt && currentCategory) {
        currentCategory.prompts.push(currentPrompt);
        prompts.allPrompts.push(currentPrompt);
      }

      // Start new subcategory
      currentPrompt = {
        title: text,
        content: '',
        category: currentCategory?.name || 'Uncategorized',
        tags: []
      };
    }

    // TD (table cell) = Individual prompt in a structured format
    else if (element.tagName === 'TD' && currentCategory) {
      // Extract prompt text from table cell (strip quotes if present)
      const promptText = text.replace(/^[""]|[""]$/g, '').trim();

      // Count words in the prompt
      const wordCount = promptText.split(/\s+/).filter(word => word.length > 0).length;

      // Only add if it's a valid prompt: has 5+ words, sufficient length, and contains key action words
      if (wordCount >= 5 && promptText.length > 20 && (promptText.includes('Create') || promptText.includes('Set up') || promptText.includes('Generate') || promptText.includes('Add'))) {
        // Create a standalone prompt
        const tablePrompt = {
          title: currentPrompt?.title || currentCategory.name,
          content: promptText,
          category: currentCategory.name,
          tags: []
        };

        currentCategory.prompts.push(tablePrompt);
        prompts.allPrompts.push(tablePrompt);
      }
    }

    // P or Lists = Prompt content (for non-table format)
    else if ((element.tagName === 'P' || element.tagName === 'UL' || element.tagName === 'OL') && currentPrompt) {
      // Skip if this is inside a table (already handled)
      if (element.closest('table')) return;

      if (currentPrompt.content) {
        currentPrompt.content += '\n\n' + text;
      } else {
        currentPrompt.content = text;
      }
    }

    // If no current prompt, add to category description
    else if ((element.tagName === 'P') && currentCategory && !currentPrompt) {
      // Skip if inside table
      if (element.closest('table')) return;

      if (currentCategory.description) {
        currentCategory.description += '\n' + text;
      } else {
        currentCategory.description = text;
      }
    }
  });

  // Add final prompt and category
  if (currentPrompt && currentCategory) {
    currentCategory.prompts.push(currentPrompt);
    prompts.allPrompts.push(currentPrompt);
  }
  if (currentCategory && currentCategory.prompts.length > 0) {
    prompts.categories.push(currentCategory);
  }

  // Clean up: Filter out prompts with less than 5 words
  prompts.categories = prompts.categories.map(category => ({
    ...category,
    prompts: category.prompts.filter(prompt => {
      const content = prompt.content || '';
      const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
      return wordCount >= 5;
    })
  })).filter(category => category.prompts.length > 0); // Remove empty categories

  // Update allPrompts to match filtered categories
  prompts.allPrompts = prompts.categories.flatMap(cat => cat.prompts);

  return prompts;
}

/**
 * Load prompts from a URL (e.g., /prompts-source.html)
 * @param {string} url - URL to fetch prompts from
 * @returns {Promise<Object>} Structured prompts data
 */
export async function loadPromptsFromURL(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to load prompts: ${response.status}`);
    }

    const htmlContent = await response.text();
    return parsePromptsFromHTML(htmlContent);
  } catch (error) {
    console.error('Error loading prompts:', error);
    return {
      categories: [],
      allPrompts: [],
      error: error.message
    };
  }
}

/**
 * Search prompts by keyword
 * @param {Array} prompts - Array of prompt objects
 * @param {string} query - Search query
 * @returns {Array} Filtered prompts
 */
export function searchPrompts(prompts, query) {
  if (!query) return prompts;

  const lowerQuery = query.toLowerCase();
  return prompts.filter(prompt =>
    prompt.title.toLowerCase().includes(lowerQuery) ||
    prompt.content.toLowerCase().includes(lowerQuery) ||
    prompt.category.toLowerCase().includes(lowerQuery) ||
    prompt.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Group prompts by category
 * @param {Array} prompts - Array of prompt objects
 * @returns {Object} Prompts grouped by category
 */
export function groupPromptsByCategory(prompts) {
  return prompts.reduce((acc, prompt) => {
    const category = prompt.category || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(prompt);
    return acc;
  }, {});
}

/**
 * Convert prompts to format used by DemoDashboard
 * @param {Object} parsedPrompts - Parsed prompts from HTML
 * @returns {Object} Prompts in dashboard format
 */
export function convertToDashboardFormat(parsedPrompts) {
  const dashboardPrompts = {};

  parsedPrompts.categories.forEach(category => {
    const categoryKey = category.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/(^_|_$)/g, '');

    dashboardPrompts[categoryKey] = {
      label: category.name,
      description: category.description,
      prompts: category.prompts.map(prompt => ({
        label: prompt.title,
        prompt: prompt.content,
        tags: prompt.tags
      }))
    };
  });

  return dashboardPrompts;
}

/**
 * Merge new prompts with existing prompts
 * @param {Object} existingPrompts - Current prompts in dashboard
 * @param {Object} newPrompts - New prompts to merge
 * @returns {Object} Merged prompts
 */
export function mergePrompts(existingPrompts, newPrompts) {
  return {
    ...existingPrompts,
    ...newPrompts
  };
}
