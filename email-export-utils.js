/**
 * Email Export Utilities
 * Formats NetSuite data with hashtags for email-based integration
 * 
 * This allows the web app to export JSON data via email, which is then
 * processed by a SuiteScript scheduled script that parses emails and
 * creates NetSuite records.
 */

/**
 * Formats customer, project, and estimate data with hashtags
 * @param {Object} data - The data to format
 * @returns {string} - Formatted string with hashtags
 */
export function formatDataWithHashtags(data) {
  const lines = [];
  
  // Add metadata
  if (data.type) {
    lines.push(`#recordType: ${data.type}`);
  }
  
  // Customer fields
  if (data.customer) {
    lines.push(`#customerName: ${data.customer.name || data.customer.companyname || ''}`);
    lines.push(`#customerEntityId: ${data.customer.entityid || ''}`);
    lines.push(`#customerIndustry: ${data.customer.industry || data.customer.custentity_esc_industry || ''}`);
    lines.push(`#customerEmail: ${data.customer.email || ''}`);
    lines.push(`#customerPhone: ${data.customer.phone || ''}`);
    lines.push(`#customerRevenue: ${data.customer.revenue || data.customer.custentity_esc_annual_revenue || ''}`);
    lines.push(`#customerSize: ${data.customer.size || data.customer.custentity_esc_no_of_employees || ''}`);
  }
  
  // Project fields
  if (data.project) {
    lines.push(`#projectName: ${data.project.name || data.project.companyname || ''}`);
    lines.push(`#projectCode: ${data.project.entityid || data.project.code || ''}`);
    lines.push(`#projectCustomer: ${data.project.customerId || data.project.customer || ''}`);
    lines.push(`#projectStartDate: ${data.project.startDate || data.project.startdate || ''}`);
    lines.push(`#projectEndDate: ${data.project.endDate || data.project.enddate || ''}`);
    lines.push(`#projectBudget: ${data.project.budget || data.project.projectedtotalvalue || ''}`);
    lines.push(`#projectStatus: ${data.project.status || 'OPEN'}`);
    
    if (data.project.description) {
      lines.push(`#projectDescription: ${data.project.description}`);
    }
  }
  
  // Estimate fields
  if (data.estimate) {
    lines.push(`#estimateType: ${data.estimate.type || 'T&M'}`);
    lines.push(`#estimateCustomer: ${data.estimate.customerId || data.estimate.customer || ''}`);
    lines.push(`#estimateProject: ${data.estimate.projectId || data.estimate.project || ''}`);
    lines.push(`#estimateTotal: ${data.estimate.total || data.estimate.amount || ''}`);
    lines.push(`#estimateStatus: ${data.estimate.status || 'PENDING'}`);
    lines.push(`#estimateDueDate: ${data.estimate.dueDate || data.estimate.duedate || ''}`);
    
    if (data.estimate.items && Array.isArray(data.estimate.items)) {
      const itemLines = data.estimate.items.map((item, idx) => {
        return `  - ${item.name || item.item}: Qty=${item.quantity || 1}, Rate=${item.rate || item.price || ''}`;
      }).join('\n');
      lines.push(`#estimateItems:\n${itemLines}`);
    }
  }
  
  // Modules field (for multi-module implementations)
  if (data.modules && Array.isArray(data.modules)) {
    lines.push(`#modules: ${data.modules.join(',')}`);
  } else if (data.modules && typeof data.modules === 'string') {
    lines.push(`#modules: ${data.modules}`);
  }
  
  // Tasks
  if (data.tasks && Array.isArray(data.tasks)) {
    lines.push(`#tasks:`);
    data.tasks.forEach((task, idx) => {
      lines.push(`  Task ${idx + 1}: ${task.name || task.title || ''}`);
      if (task.estimatedHours) lines.push(`    Estimated Hours: ${task.estimatedHours}`);
      if (task.assignee) lines.push(`    Assignee: ${task.assignee}`);
      if (task.dueDate) lines.push(`    Due Date: ${task.dueDate}`);
    });
  }
  
  // Checklists
  if (data.checklists && Array.isArray(data.checklists)) {
    lines.push(`#checklists:`);
    data.checklists.forEach((checklist, idx) => {
      lines.push(`  Checklist ${idx + 1}: ${checklist.name || checklist.title || ''}`);
      if (checklist.items && Array.isArray(checklist.items)) {
        checklist.items.forEach(item => {
          const status = item.completed ? '✓' : '○';
          lines.push(`    ${status} ${item.name || item.task || ''}`);
        });
      }
    });
  }
  
  // Resource allocation
  if (data.resources && Array.isArray(data.resources)) {
    lines.push(`#resources:`);
    data.resources.forEach(resource => {
      lines.push(`  - ${resource.role || resource.name}: ${resource.hours || 0}hrs @ $${resource.rate || 0}/hr`);
    });
  }
  
  // Raw JSON data (for complex scenarios)
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
    includeInstructions = true
  } = options;
  
  const subject = createEmailSubject(data);
  const hashtagContent = formatDataWithHashtags(data);
  
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
 * @returns {Object} - Formatted export data
 */
export function createExportData(customerData, projectData = null, additionalData = {}) {
  const exportData = {
    type: projectData ? 'project' : 'customer',
    timestamp: new Date().toISOString(),
    customer: customerData ? {
      name: customerData.name || customerData.companyname,
      entityid: customerData.entityid,
      industry: customerData.industry || customerData.custentity_esc_industry,
      email: customerData.email,
      phone: customerData.phone,
      revenue: customerData.budget || customerData.custentity_esc_annual_revenue,
      size: customerData.size || customerData.custentity_esc_no_of_employees,
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
  createExportData
};

