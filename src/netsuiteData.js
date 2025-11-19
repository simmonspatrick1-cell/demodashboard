/**
 * NetSuite Reference Data
 *
 * This file contains all NetSuite reference data (classes, departments, employees, locations)
 * exported from your NetSuite account. You can customize display names here and they will
 * flow through to NetSuite record creation.
 */

/**
 * NetSuite Classes
 * Format: { id, name, displayName (optional custom name) }
 */
export const NETSUITE_CLASSES = [
  { id: '1', name: 'Professional Services', displayName: null },
  { id: '2', name: 'Software Sales', displayName: null },
  { id: '3', name: 'Consulting', displayName: null },
  { id: '4', name: 'Training', displayName: null },
  { id: '5', name: 'Support Services', displayName: null },
  { id: '6', name: 'Implementation', displayName: null },
  { id: '7', name: 'Managed Services', displayName: null },
  { id: '8', name: 'Cloud Services', displayName: null }
];

/**
 * NetSuite Departments
 * Format: { id, name, displayName (optional custom name) }
 */
export const NETSUITE_DEPARTMENTS = [
  { id: '1', name: 'Sales', displayName: null },
  { id: '2', name: 'Marketing', displayName: null },
  { id: '3', name: 'Engineering', displayName: null },
  { id: '4', name: 'Operations', displayName: null },
  { id: '5', name: 'Customer Success', displayName: null },
  { id: '6', name: 'Finance', displayName: null },
  { id: '7', name: 'Human Resources', displayName: null },
  { id: '8', name: 'Professional Services', displayName: null }
];

/**
 * NetSuite Employees
 * Format: { id, name, displayName (optional custom name), email, department }
 */
export const NETSUITE_EMPLOYEES = [
  { id: '1', name: 'John Smith', displayName: null, email: 'jsmith@company.com', department: 'Sales' },
  { id: '2', name: 'Sarah Johnson', displayName: null, email: 'sjohnson@company.com', department: 'Engineering' },
  { id: '3', name: 'Michael Chen', displayName: null, email: 'mchen@company.com', department: 'Professional Services' },
  { id: '4', name: 'Emily Davis', displayName: null, email: 'edavis@company.com', department: 'Customer Success' },
  { id: '5', name: 'Robert Wilson', displayName: null, email: 'rwilson@company.com', department: 'Sales' },
  { id: '6', name: 'Jennifer Lee', displayName: null, email: 'jlee@company.com', department: 'Marketing' },
  { id: '7', name: 'David Martinez', displayName: null, email: 'dmartinez@company.com', department: 'Engineering' },
  { id: '8', name: 'Lisa Anderson', displayName: null, email: 'landerson@company.com', department: 'Finance' }
];

/**
 * NetSuite Locations
 * Format: { id, name, displayName (optional custom name) }
 */
export const NETSUITE_LOCATIONS = [
  { id: '1', name: 'San Francisco HQ', displayName: null },
  { id: '2', name: 'New York Office', displayName: null },
  { id: '3', name: 'London Office', displayName: null },
  { id: '4', name: 'Austin Office', displayName: null },
  { id: '5', name: 'Remote', displayName: null }
];

/**
 * Get display name for a record (falls back to original name if no custom name)
 */
export function getDisplayName(record) {
  return record.displayName || record.name;
}

/**
 * Find a record by name or display name
 */
export function findRecord(records, searchName) {
  return records.find(r =>
    r.name === searchName ||
    r.displayName === searchName ||
    r.id === searchName
  );
}

/**
 * Update a record's display name
 */
export function updateDisplayName(records, recordId, newDisplayName) {
  const record = records.find(r => r.id === recordId);
  if (record) {
    record.displayName = newDisplayName === record.name ? null : newDisplayName;
  }
  return records;
}

export default {
  NETSUITE_CLASSES,
  NETSUITE_DEPARTMENTS,
  NETSUITE_EMPLOYEES,
  NETSUITE_LOCATIONS,
  getDisplayName,
  findRecord,
  updateDisplayName
};
