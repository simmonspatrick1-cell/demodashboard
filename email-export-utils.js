/**
 * Email Export Utilities
 * Formats NetSuite data with hashtags for email-based integration
 *
 * This allows the web app to export JSON data via email, which is then
 * processed by a SuiteScript scheduled script that parses emails and
 * creates NetSuite records.
 */

/**
 * Valid NetSuite field mappings for email export
 * Only these fields are processed by the SuiteScript
 */
const VALID_NETSUITE_FIELDS = {
  // Record type
  recordType: 'type',

  // Customer fields (standard NetSuite fields only)
  customerName: 'companyname',
  customerEntityid: 'entityid',
  customerEmail: 'email',
  customerPhone: 'phone',

  // Project fields
  projectName: 'companyname',
  projectCode: 'entityid',
  projectEntityid: 'entityid',        // Alternative field name
  projectCustomer: 'customer',
  projectStartDate: 'startdate',
  projectEndDate: 'enddate',
  projectBudget: 'projectedtotalvalue',
  projectStatus: 'status',            // NetSuite project status (not standardized like estimates)
  projectDescription: 'comments',

  // Estimate fields
  estimateCustomer: 'entity',      // Maps to NetSuite 'entity' field (customer ID)
  estimateProject: 'job',          // Maps to NetSuite 'job' field (project ID)
  estimateStatus: 'status',        // Maps to NetSuite status (A=Open, B=Pending, C=Closed, D=Expired)
  estimateDueDate: 'duedate',      // Maps to NetSuite due date
  estimateClass: 'class',          // Maps to NetSuite class ID (looked up by name)
  estimateDepartment: 'department', // Maps to NetSuite department ID (looked up by name)
  estimateLocation: 'location',     // Maps to NetSuite location ID (looked up by name)
  estimateItems: 'items',          // Line items array - processed separately

  // Note: estimateType and estimateTotal are exported for reference but not used by NetSuite
  // estimateTotal is calculated from line items, estimateType is for categorization only

  // Special sections (processed separately)
  tasks: 'tasks',
  checklists: 'checklists'
};

/**
 * Validates data against NetSuite field mappings and returns validation results
 * @param {Object} data - The data to validate
 * @returns {Object} - Validation results with valid/invalid fields
 */
export function validateNetSuiteFields(data) {
  const results = {
    valid: {},
    invalid: {},
    warnings: [],
    summary: {
      totalFields: 0,
      validFields: 0,
      invalidFields: 0
    }
  };

  // Flatten data for validation
  const flatData = flattenData(data);

  for (const [key, value] of Object.entries(flatData)) {
    results.summary.totalFields++;

    if (VALID_NETSUITE_FIELDS[key]) {
      results.valid[key] = value;
      results.summary.validFields++;
    } else {
      results.invalid[key] = value;
      results.summary.invalidFields++;

      // Add specific warnings for common invalid fields
      if (key.includes('Industry') || key.includes('Revenue') || key.includes('Size')) {
        results.warnings.push(`⚠️ ${key}: Custom fields require NetSuite setup. See SuiteScript comments.`);
      } else if (key.includes('Budget') && !key.includes('projectBudget')) {
        results.warnings.push(`⚠️ ${key}: Budget field not recognized. Use projectBudget for projects.`);
      } else {
        results.warnings.push(`⚠️ ${key}: Field not supported by current SuiteScript.`);
      }
    }
  }

  return results;
}

/**
 * Flattens nested data structure for validation
 * @param {Object} data - Nested data object
 * @returns {Object} - Flattened key-value pairs with proper prefixes
 */
function flattenData(data) {
  const result = {};

  function processObject(obj, prefix = '') {
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // For nested objects, add prefix
        const newPrefix = prefix ? `${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}` : key;
        processObject(value, newPrefix);
      } else {
        // For primitive values, use the full key path
        const fullKey = prefix ? `${prefix}${key.charAt(0).toUpperCase() + key.slice(1)}` : key;
        result[fullKey] = value;
      }
    }
  }

  processObject(data);
  return result;
}

/**
 * Generate a lightweight export ID for traceability
 */
function generateExportId() {
  return 'NSDD-' + Math.random().toString(36).slice(2, 10) + '-' + Date.now().toString(36);
}

/**
 * Deterministic idempotency key for exports based on content
 * Stable stringify + djb2 hash -> hex
 */
export function computeIdempotencyKey(obj) {
  function stableStringify(o) {
    if (o === null || typeof o !== 'object') return JSON.stringify(o);
    if (Array.isArray(o)) return '[' + o.map(stableStringify).join(',') + ']';
    const keys = Object.keys(o).sort();
    return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify(o[k])).join(',') + '}';
  }
  const str = stableStringify(obj);
  // djb2
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xffffffff;
  }
  // to unsigned hex
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return 'NSDD-' + hex;
}

/**
 * Formats customer, project, and estimate data with hashtags (NetSuite-compatible only)
 * @param {Object} data - The data to format
 * @param {Object} options - Formatting options
 * @returns {string} - Formatted string with hashtags
 */
export function formatDataWithHashtags(data, options = {}) {
  const { includeValidation = false, includeInvalidFields = false } = options;
  const lines = [];

  // Validate fields first
  const validation = validateNetSuiteFields(data);

  // Add validation summary if requested
  if (includeValidation) {
    lines.push(`--- FIELD VALIDATION ---`);
    lines.push(`Valid fields: ${validation.summary.validFields}/${validation.summary.totalFields}`);
    if (validation.warnings.length > 0) {
      lines.push(`Warnings:`);
      validation.warnings.forEach(warning => lines.push(`  ${warning}`));
    }
    lines.push(``);
  }

  // Add metadata
  if (data.exportVersion) {
    lines.push(`#exportVersion: ${data.exportVersion}`);
  }
  if (data.exportId) {
    lines.push(`#exportId: ${data.exportId}`);
  }
  if (data.type) {
    lines.push(`#recordType: ${data.type}`);
  }

  // Customer fields (only valid NetSuite fields)
  if (data.customer) {
    if (data.customer.name || data.customer.companyname) {
      lines.push(`#customerName: ${data.customer.name || data.customer.companyname}`);
    }
    if (data.customer.entityid) {
      lines.push(`#customerEntityId: ${data.customer.entityid}`);
    }
    if (data.customer.email) {
      lines.push(`#customerEmail: ${data.customer.email}`);
    }
    if (data.customer.phone) {
      lines.push(`#customerPhone: ${data.customer.phone}`);
    }

    // Note: Custom fields like industry, revenue, size are NOT included
    // They would need to be added to SuiteScript with proper field IDs
  }

  // Project fields
  if (data.project) {
    if (data.project.name || data.project.companyname) {
      lines.push(`#projectName: ${data.project.name || data.project.companyname}`);
    }
    if (data.project.entityid || data.project.code) {
      lines.push(`#projectCode: ${data.project.entityid || data.project.code}`);
    }
    if (data.project.customerId || data.project.customer) {
      lines.push(`#projectCustomer: ${data.project.customerId || data.project.customer}`);
    }
    if (data.project.startDate || data.project.startdate) {
      lines.push(`#projectStartDate: ${data.project.startDate || data.project.startdate}`);
    }
    if (data.project.endDate || data.project.enddate) {
      lines.push(`#projectEndDate: ${data.project.endDate || data.project.enddate}`);
    }
    if (data.project.budget || data.project.projectedtotalvalue) {
      lines.push(`#projectBudget: ${data.project.budget || data.project.projectedtotalvalue}`);
    }
    if (data.project.status) {
      lines.push(`#projectStatus: ${data.project.status}`);
    }
    if (data.project.description) {
      lines.push(`#projectDescription: ${data.project.description}`);
    }
  }

  // Estimate fields
  if (data.estimate) {
    if (data.estimate.type) {
      lines.push(`#estimateType: ${data.estimate.type}`);
    }
    if (data.estimate.customerId || data.estimate.customer) {
      lines.push(`#estimateCustomer: ${data.estimate.customerId || data.estimate.customer}`);
    }
    if (data.estimate.projectId || data.estimate.project) {
      lines.push(`#estimateProject: ${data.estimate.projectId || data.estimate.project}`);
    }
    if (data.estimate.total || data.estimate.amount) {
      lines.push(`#estimateTotal: ${data.estimate.total || data.estimate.amount}`);
    }
    if (data.estimate.status) {
      lines.push(`#estimateStatus: ${data.estimate.status}`);
    }
    if (data.estimate.dueDate || data.estimate.duedate) {
      lines.push(`#estimateDueDate: ${data.estimate.dueDate || data.estimate.duedate}`);
    }

    // Class, Department, Location (optional)
    if (data.estimate.class || data.estimate.classId) {
      lines.push(`#estimateClass: ${data.estimate.class || data.estimate.classId}`);
    }
    if (data.estimate.department || data.estimate.departmentId) {
      lines.push(`#estimateDepartment: ${data.estimate.department || data.estimate.departmentId}`);
    }
    if (data.estimate.location || data.estimate.locationId) {
      lines.push(`#estimateLocation: ${data.estimate.location || data.estimate.locationId}`);
    }

    if (data.estimate.items && Array.isArray(data.estimate.items)) {
      const itemLines = data.estimate.items.map((item, idx) => {
        return `  - ${item.name || item.item || 'Unknown Item'}: Qty=${item.quantity || 1}, Rate=${item.rate || item.price || 0}`;
      }).join('\n');
      lines.push(`#estimateItems:\n${itemLines}`);
    }
  }

  // Tasks (supported by SuiteScript)
  if (data.tasks && Array.isArray(data.tasks)) {
    lines.push(`#tasks:`);
    data.tasks.forEach((task, idx) => {
      lines.push(`  Task ${idx + 1}: ${task.name || task.title || 'Unnamed Task'}`);
      if (task.estimatedHours) lines.push(`    Estimated Hours: ${task.estimatedHours}`);
      if (task.assignee) lines.push(`    Assignee: ${task.assignee}`);
      if (task.dueDate) lines.push(`    Due Date: ${task.dueDate}`);
    });
  }

  // Checklists (supported by SuiteScript)
  if (data.checklists && Array.isArray(data.checklists)) {
    lines.push(`#checklists:`);
    data.checklists.forEach((checklist, idx) => {
      lines.push(`  Checklist ${idx + 1}: ${checklist.name || checklist.title || 'Unnamed Checklist'}`);
      if (checklist.items && Array.isArray(checklist.items)) {
        checklist.items.forEach(item => {
          const status = item.completed ? '✓' : '○';
          lines.push(`    ${status} ${item.name || item.task || 'Unnamed Item'}`);
        });
      }
    });
  }

  // Raw JSON data (for complex scenarios - always include for debugging)
  if (data.includeJson !== false) {
    lines.push('\n--- JSON DATA ---');
    lines.push(JSON.stringify(data, null, 2));
  }

  return lines.join('\n');
}

/**
 * Creates an email subject line from the data
 * @param {Object} data - The data being exported
 * @returns {string} - Email subject
 */
export function createEmailSubject(data) {
  const parts = [];

  if (data.type) {
    parts.push(data.type.toUpperCase());
  }

  if (data.project?.name) {
    parts.push(data.project.name);
  } else if (data.customer?.name) {
    parts.push(data.customer.name);
  }

  if (data.estimate?.type) {
    parts.push(`Estimate (${data.estimate.type})`);
  }

  return parts.length > 0
    ? `NetSuite Export: ${parts.join(' - ')}`
    : 'NetSuite Data Export';
}

/**
 * Prepares email content with formatted data
 * @param {Object} data - The data to export
 * @param {Object} options - Export options
 * @returns {Object} - Email content with subject and body
 */
export function prepareEmailContent(data, options = {}) {
  const {
    recipientEmail = 'simmonspatrick1@gmail.com',
    includeInstructions = true,
    includeValidation = true
  } = options;

  const subject = createEmailSubject(data);
  const hashtagContent = formatDataWithHashtags(data, { includeValidation });

  let body = '';

  if (includeInstructions) {
    body += 'This email contains NetSuite data formatted for automated processing.\n';
    body += 'The SuiteScript scheduled script will parse the hashtags and create records.\n\n';
    body += '---\n\n';
  }

  body += hashtagContent;

  return {
    to: recipientEmail,
    subject,
    body
  };
}

/**
 * Creates a mailto: URL for email export
 * @param {Object} data - The data to export
 * @param {Object} options - Export options
 * @returns {string} - mailto: URL
 */
export function createMailtoUrl(data, options = {}) {
  const emailContent = prepareEmailContent(data, options);

  const subject = encodeURIComponent(emailContent.subject);
  const body = encodeURIComponent(emailContent.body);

  return `mailto:${emailContent.to}?subject=${subject}&body=${body}`;
}

/**
 * Creates a Gmail compose URL
 * @param {Object} data - The data to export
 * @param {Object} options - Export options
 * @returns {string} - Gmail compose URL
 */
export function createGmailComposeUrl(data, options = {}) {
  const emailContent = prepareEmailContent(data, options);

  const to = encodeURIComponent(emailContent.to);
  const subject = encodeURIComponent(emailContent.subject);
  const body = encodeURIComponent(emailContent.body);

  // Gmail compose URL format
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${subject}&body=${body}`;
}

/**
 * Exports data via email (opens Gmail in browser)
 * @param {Object} data - The data to export
 * @param {Object} options - Export options
 */
export function exportViaEmail(data, options = {}) {
  // Use Gmail compose URL instead of mailto: to ensure Gmail is used
  const gmailUrl = createGmailComposeUrl(data, options);
  window.open(gmailUrl, '_blank');
}

/**
 * Creates export data structure from customer and project selection
 * @param {Object} customerData - Customer data from dashboard
 * @param {Object} projectData - Optional project data
 * @param {Object} additionalData - Any additional data (tasks, estimates, etc.)
 * @returns {Object} - Formatted export data (only NetSuite-compatible fields)
 */
export function createExportData(customerData, projectData = null, additionalData = {}) {
  const exportData = {
    exportVersion: '1.0',
    exportId: generateExportId(),
    type: projectData ? 'project' : 'customer',
    timestamp: new Date().toISOString(),
    customer: customerData ? {
      // Only include NetSuite-compatible fields
      name: customerData.name || customerData.companyname,
      entityid: customerData.entityid,
      email: customerData.email,
      phone: customerData.phone,
      // Note: Custom fields like industry, revenue, size are excluded
      // They would need to be added to SuiteScript with proper field IDs
      nsId: customerData.nsId || customerData.id
    } : null,
    ...additionalData
  };

  if (projectData) {
    exportData.project = {
      name: projectData.name || projectData.companyname,
      entityid: projectData.entityid || projectData.code,
      customerId: projectData.customerId || customerData?.nsId,
      startDate: projectData.startDate || projectData.startdate,
      endDate: projectData.endDate || projectData.enddate,
      budget: projectData.budget || projectData.projectedtotalvalue,
      status: projectData.status || 'OPEN',
      description: projectData.description
    };
  }

  return exportData;
}

export default {
  formatDataWithHashtags,
  createEmailSubject,
  prepareEmailContent,
  createMailtoUrl,
  exportViaEmail,
  createExportData,
  validateNetSuiteFields,
  computeIdempotencyKey
};
