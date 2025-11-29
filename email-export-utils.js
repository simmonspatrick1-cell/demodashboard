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
  projectStatus: 'status',            // NetSuite project status
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

  // Special sections (processed separately)
  tasks: 'tasks',
  checklists: 'checklists'
};

/**
 * Validates data against NetSuite field mappings and returns validation results
 * @param {Object} data - The data to validate (flat object with hashtag-like keys)
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

  // Handle null/undefined input
  if (!data || typeof data !== 'object') {
    return results;
  }

  // Flatten data for validation (supports nested objects like { customer: { entityid } } -> customerEntityid)
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
  // Handle null/undefined input
  if (!data || typeof data !== 'object') {
    return {};
  }

  const result = {};

  function processObject(obj, prefix = '') {
    // Safety check
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return;
    }

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
 * Build a sanitized structure that only contains fields supported by NetSuite/SuiteScript.
 * - Normalizes common aliases to the names SuiteScript expects
 * - Drops unknown/custom fields
 * - Adds idempotencyKey computed from a stable subset of content
 * @param {Object} data
 * @returns {Object} filtered
 */
export function filterToNetSuiteData(data = {}) {
  const filtered = {};

  // Metadata (kept minimal for traceability; not emitted as hashtags)
  if (data.exportVersion) filtered.exportVersion = data.exportVersion;
  filtered.exportId = data.exportId || generateExportId();
  if (data.type) filtered.type = data.type;
  if (data.timestamp) filtered.timestamp = data.timestamp;

  // Customer
  if (data.customer && typeof data.customer === 'object') {
    const c = data.customer;
    const fc = {};
    if (c.name || c.companyname) fc.name = c.name || c.companyname;
    if (c.entityid || c.entityId) fc.entityid = c.entityid || c.entityId;
    if (c.email) fc.email = c.email;
    if (c.phone) fc.phone = c.phone;
    if (Object.keys(fc).length) filtered.customer = fc;
  }

  // Project
  if (data.project && typeof data.project === 'object') {
    const p = data.project;
    const fp = {};
    if (p.name || p.companyname) fp.name = p.name || p.companyname;
    if (p.entityid || p.code) fp.entityid = p.entityid || p.code;
    if (p.customerId || p.customer) fp.customerId = p.customerId || p.customer;
    if (p.startDate || p.startdate) fp.startDate = p.startDate || p.startdate;
    if (p.endDate || p.enddate) fp.endDate = p.endDate || p.enddate;
    if (p.budget || p.projectedtotalvalue) fp.budget = p.budget || p.projectedtotalvalue;
    if (p.status) fp.status = p.status;
    if (p.description) fp.description = p.description;
    if (Object.keys(fp).length) filtered.project = fp;
  }

  // Estimate
  if (data.estimate && typeof data.estimate === 'object') {
    const e = data.estimate;
    const fe = {};
    // IDs (by name or ID; SuiteScript resolves names to IDs)
    if (e.customer || data.estimateCustomer) fe.customer = e.customer || data.estimateCustomer;
    if (e.project || data.estimateProject) fe.project = e.project || data.estimateProject;
    // Status and dates
    if (e.status || data.estimateStatus) fe.status = e.status || data.estimateStatus;
    if (e.dueDate || e.duedate || data.estimateDueDate) fe.dueDate = e.dueDate || e.duedate || data.estimateDueDate;
    // Optional memo
    if (e.memo || e.message || data.memo || data.message) fe.memo = e.memo || e.message || data.memo || data.message;
    // Classification
    if (e.class || e.classId || data.estimateClass) fe.class = e.class || e.classId || data.estimateClass;
    if (e.department || e.departmentId || data.estimateDepartment) fe.department = e.department || e.departmentId || data.estimateDepartment;
    if (e.location || e.locationId || data.estimateLocation) fe.location = e.location || e.locationId || data.estimateLocation;
    // Billing schedule (optional support in optimized script)
    if (e.billingSchedule || data.billingSchedule) fe.billingSchedule = e.billingSchedule || data.billingSchedule;

    // Items
    const items = e.items && Array.isArray(e.items) ? e.items
      : (Array.isArray(data.estimateItems) ? data.estimateItems : null);
    if (items) {
      fe.items = items.map(it => ({
        name: it.name || it.item || it.displayName || 'Unknown Item',
        displayName: it.displayName,
        quantity: it.quantity || 1,
        rate: it.rate || it.price || 0,
        description: it.description,
        nsItemId: it.nsItemId || it.itemId || it.internalId
      }));
    }

    if (Object.keys(fe).length) filtered.estimate = fe;
  } else {
    // Backward-compat: some flows set estimate-like keys at top-level
    const fe = {};
    if (data.estimateCustomer) fe.customer = data.estimateCustomer;
    if (data.estimateProject) fe.project = data.estimateProject;
    if (data.estimateStatus) fe.status = data.estimateStatus;
    if (data.estimateDueDate) fe.dueDate = data.estimateDueDate;
    if (data.estimateClass) fe.class = data.estimateClass;
    if (data.estimateDepartment) fe.department = data.estimateDepartment;
    if (data.estimateLocation) fe.location = data.estimateLocation;
    if (Array.isArray(data.estimateItems)) {
      fe.items = data.estimateItems.map(it => ({
        name: it.name || it.item || it.displayName || 'Unknown Item',
        displayName: it.displayName,
        quantity: it.quantity || 1,
        rate: it.rate || it.price || 0,
        description: it.description,
        nsItemId: it.nsItemId || it.itemId || it.internalId
      }));
    }
    if (Object.keys(fe).length) filtered.estimate = fe;
  }

  // Tasks
  if (Array.isArray(data.tasks)) {
    filtered.tasks = data.tasks.map(t => ({
      name: t.name || t.title || 'Unnamed Task',
      estimatedHours: t.estimatedHours,
      plannedWork: t.plannedWork,
      status: t.status,
      resource: t.resource, // Generic resource ID (912-916)
      serviceItem: t.serviceItem,
      billingClass: t.billingClass,
      unitCost: t.unitCost,
      assignee: t.assignee,
      dueDate: t.dueDate
    }));
  }

  // Checklists
  if (Array.isArray(data.checklists)) {
    filtered.checklists = data.checklists.map(cl => ({
      name: cl.name || cl.title || 'Unnamed Checklist',
      items: Array.isArray(cl.items) ? cl.items.map(i => ({
        name: i.name || i.task || 'Unnamed Item',
        completed: !!i.completed
      })) : []
    }));
  }

  // Compute idempotency key from a stable subset (do not include timestamp or exportId)
  const keyBasis = {
    customer: filtered.customer ? { entityid: filtered.customer.entityid || filtered.customer.name } : null,
    project: filtered.project ? { entityid: filtered.project.entityid || filtered.project.name } : null,
    estimate: filtered.estimate ? {
      customer: filtered.estimate.customer || null,
      project: filtered.estimate.project || null,
      status: filtered.estimate.status || null,
      dueDate: filtered.estimate.dueDate || null,
      items: Array.isArray(filtered.estimate.items)
        ? filtered.estimate.items.map(i => ({ name: i.name, qty: i.quantity, rate: i.rate }))
        : null
    } : null
  };
  filtered.idempotencyKey = computeIdempotencyKey(keyBasis);

  return filtered;
}

/**
 * Formats customer, project, and estimate data with hashtags (NetSuite-compatible only)
 * @param {Object} data - The raw data to format
 * @param {Object} options - Formatting options
 *   - includeValidation: boolean (default true)
 *   - includeJsonFiltered: boolean (default true)
 * @returns {string} - Formatted string with hashtags
 */
export function formatDataWithHashtags(data, options = {}) {
  const {
    includeValidation = true,
    includeJsonFiltered = true
  } = options;

  const filtered = filterToNetSuiteData(data);
  const lines = [];

  // Build a flat object of only the hashtag keys we will emit for validation summary
  const hv = {};

  // Idempotency (used by SuiteScript to dedupe Estimates)
  if (filtered.idempotencyKey) {
    lines.push(`#idempotencyKey: ${filtered.idempotencyKey}`);
    // Not part of VALID_NETSUITE_FIELDS on purpose (meta), so we don't add to hv
  }

  // Customer fields (only valid NetSuite fields)
  if (filtered.customer) {
    const c = filtered.customer;
    if (c.name) {
      lines.push(`#customerName: ${c.name}`);
      hv.customerName = c.name;
    }
    if (c.entityid) {
      lines.push(`#customerEntityId: ${c.entityid}`);
      hv.customerEntityid = c.entityid; // key aligned to validator
    }
    if (c.email) {
      lines.push(`#customerEmail: ${c.email}`);
      hv.customerEmail = c.email;
    }
    if (c.phone) {
      lines.push(`#customerPhone: ${c.phone}`);
      hv.customerPhone = c.phone;
    }
  }

  // Project fields
  if (filtered.project) {
    const p = filtered.project;
    if (p.name) {
      lines.push(`#projectName: ${p.name}`);
      hv.projectName = p.name;
    }
    if (p.entityid) {
      lines.push(`#projectCode: ${p.entityid}`);
      hv.projectCode = p.entityid;
    }
    if (p.customerId) {
      lines.push(`#projectCustomer: ${p.customerId}`);
      hv.projectCustomer = p.customerId;
    }
    if (p.startDate) {
      lines.push(`#projectStartDate: ${p.startDate}`);
      hv.projectStartDate = p.startDate;
    }
    if (p.endDate) {
      lines.push(`#projectEndDate: ${p.endDate}`);
      hv.projectEndDate = p.endDate;
    }
    if (p.budget != null) {
      lines.push(`#projectBudget: ${p.budget}`);
      hv.projectBudget = p.budget;
    }
    if (p.status) {
      lines.push(`#projectStatus: ${p.status}`);
      hv.projectStatus = p.status;
    }
    if (p.description) {
      lines.push(`#projectDescription: ${p.description}`);
      hv.projectDescription = p.description;
    }
  }

  // Estimate fields (no estimateType/estimateTotal)
  if (filtered.estimate) {
    const e = filtered.estimate;
    if (e.customer) {
      lines.push(`#estimateCustomer: ${e.customer}`);
      hv.estimateCustomer = e.customer;
    }
    if (e.project) {
      lines.push(`#estimateProject: ${e.project}`);
      hv.estimateProject = e.project;
    }
    if (e.status) {
      lines.push(`#estimateStatus: ${e.status}`);
      hv.estimateStatus = e.status;
    }
    if (e.dueDate) {
      lines.push(`#estimateDueDate: ${e.dueDate}`);
      hv.estimateDueDate = e.dueDate;
    }
    if (e.class) {
      lines.push(`#estimateClass: ${e.class}`);
      hv.estimateClass = e.class;
    }
    if (e.department) {
      lines.push(`#estimateDepartment: ${e.department}`);
      hv.estimateDepartment = e.department;
    }
    if (e.location) {
      lines.push(`#estimateLocation: ${e.location}`);
      hv.estimateLocation = e.location;
    }
    if (Array.isArray(e.items) && e.items.length) {
      const itemLines = e.items.map((item, idx) => {
        return `  - ${item.name || 'Unknown Item'}: Qty=${item.quantity || 1}, Rate=${item.rate || 0}`;
      }).join('\n');
      lines.push(`#estimateItems:\n${itemLines}`);
      hv.estimateItems = e.items.length;
    }
  }

  // Tasks (supported by SuiteScript)
  if (filtered.tasks && Array.isArray(filtered.tasks)) {
    lines.push(`#tasks:`);
    filtered.tasks.forEach((task, idx) => {
      lines.push(`  Task ${idx + 1}: ${task.name || 'Unnamed Task'}`);
      if (task.estimatedHours) lines.push(`    Estimated Hours: ${task.estimatedHours}`);
      if (task.plannedWork) lines.push(`    Planned Work: ${task.plannedWork} hrs`);
      if (task.status) lines.push(`    Status: ${task.status}`);
      if (task.resource) {
        const resourceNames = {
          '912': 'Business Analyst',
          '913': 'Consultant',
          '914': 'Project Manager',
          '915': 'Technical Consultant',
          '916': 'Trainer'
        };
        lines.push(`    Resource: ${resourceNames[task.resource] || task.resource} (ID: ${task.resource})`);
      }
      if (task.serviceItem) lines.push(`    Service Item: ${task.serviceItem}`);
      if (task.billingClass) lines.push(`    Billing Class: ${task.billingClass}`);
      if (task.unitCost) lines.push(`    Unit Cost: $${task.unitCost}`);
      if (task.assignee) lines.push(`    Assignee: ${task.assignee}`);
      if (task.dueDate) lines.push(`    Due Date: ${task.dueDate}`);
    });
    hv.tasks = filtered.tasks.length;
  }

  // Checklists (supported by SuiteScript)
  if (filtered.checklists && Array.isArray(filtered.checklists)) {
    lines.push(`#checklists:`);
    filtered.checklists.forEach((checklist, idx) => {
      lines.push(`  Checklist ${idx + 1}: ${checklist.name || 'Unnamed Checklist'}`);
      if (checklist.items && Array.isArray(checklist.items)) {
        checklist.items.forEach(item => {
          const status = item.completed ? '✓' : '○';
          lines.push(`    ${status} ${item.name || 'Unnamed Item'}`);
        });
      }
    });
    hv.checklists = filtered.checklists.length;
  }

  // Validation summary (only over hashtag keys we actually emitted)
  if (includeValidation) {
    const v = validateNetSuiteFields(hv);
    lines.unshift('');
    lines.unshift(`Valid fields: ${v.summary.validFields}/${v.summary.totalFields}`);
    if (v.warnings.length > 0) {
      lines.unshift(`Warnings:`);
      v.warnings.forEach(w => lines.unshift(`  ${w}`));
    }
    lines.unshift(`--- FIELD VALIDATION ---`);
  }

  // Filtered JSON data (optional, defaults to included)
  if (includeJsonFiltered) {
    lines.push('\n--- JSON DATA ---');
    lines.push(JSON.stringify(filtered, null, 2));
  }

  return lines.join('\n');
}

/**
 * Creates an email subject line from the data
 * @param {Object} data - The data being exported
 * @returns {string} - Email subject
 */
export function createEmailSubject(data) {
  // Handle null/undefined data
  if (!data || typeof data !== 'object') {
    return 'NetSuite Data Export';
  }

  const parts = [];

  if (data.type) {
    parts.push(String(data.type).toUpperCase());
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
 *   - recipientEmail
 *   - includeInstructions: default true
 *   - includeValidation: default true
 *   - includeJsonFiltered: default true
 * @returns {Object} - Email content with subject and body
 */
export function prepareEmailContent(data, options = {}) {
  const {
    recipientEmail = 'simmonspatrick1@gmail.com',
    includeInstructions = true,
    includeValidation = true,
    includeJsonFiltered = true
  } = options;

  // Handle null/undefined data
  if (!data || typeof data !== 'object') {
    throw new Error('Data is required and must be an object');
  }

  const subject = createEmailSubject(data);
  const hashtagContent = formatDataWithHashtags(data, { includeValidation, includeJsonFiltered });

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
  // Check if we're in a browser environment
  if (typeof window === 'undefined') {
    throw new Error('exportViaEmail can only be used in a browser environment');
  }

  try {
    // Prepare email content first to validate
    const emailContent = prepareEmailContent(data, options);
    
    // Check URL length - Gmail has limits (~2000 chars for URL)
    // If too long, fall back to mailto: or show error
    const gmailUrl = createGmailComposeUrl(data, options);
    
    if (gmailUrl.length > 2000) {
      console.warn('Gmail URL too long, using mailto: fallback');
      // Fall back to mailto: which handles long content better
      const mailtoUrl = createMailtoUrl(data, options);
      window.location.href = mailtoUrl;
      return;
    }
    
    // Try to open Gmail - handle popup blockers
    const newWindow = window.open(gmailUrl, '_blank');
    
    // Check if popup was blocked
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Popup blocked - fall back to mailto:
      console.warn('Popup blocked, using mailto: fallback');
      const mailtoUrl = createMailtoUrl(data, options);
      window.location.href = mailtoUrl;
      return;
    }
    
    // Success - Gmail opened
    return newWindow;
  } catch (error) {
    console.error('Error in exportViaEmail:', error);
    // Last resort: try mailto:
    try {
      const mailtoUrl = createMailtoUrl(data, options);
      window.location.href = mailtoUrl;
    } catch (fallbackError) {
      console.error('Fallback mailto: also failed:', fallbackError);
      throw new Error('Failed to open email client: ' + error.message);
    }
  }
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
  filterToNetSuiteData,
  formatDataWithHashtags,
  createEmailSubject,
  prepareEmailContent,
  createMailtoUrl,
  exportViaEmail,
  createExportData,
  validateNetSuiteFields,
  computeIdempotencyKey
};
