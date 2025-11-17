/**
 * NetSuite Service Handler
 * Integrates React dashboard with NetSuite MCP tools
 * Handles customer data fetching and field syncing
 */

import { NS_Services_Stairway } from '@anthropic-sdk/mcp';

class NetSuiteService {
  constructor() {
    this.instance = 'td3049589'; // Your NetSuite instance ID
    this.accountMap = {
      'services': 'td3049589',
      'software': 'td3049589-soft',
      'saas': 'td3049589-saas'
    };
  }

  /**
   * Fetch customer record with all custom fields
   * @param {number} customerId - NetSuite internal customer ID
   * @param {string} account - Demo account identifier
   * @returns {Promise<Object>} Customer data with custom fields
   */
  async fetchCustomerData(customerId, account = 'services') {
    try {
      const instance = this.accountMap[account] || this.instance;
      
      // Use the ns_getRecord tool to fetch customer
      const response = await NS_Services_Stairway.ns_getRecord({
        recordType: 'customer',
        recordId: String(customerId),
        fields: 'id,entityid,companyname,email,phone,custentity13,custentity16,custentity15,custentity_esc_industry,custentity_esc_annual_revenue,custentity_esc_no_of_employees'
      });

      if (response.error) {
        console.error('NetSuite fetch error:', response.error);
        return null;
      }

      return {
        id: response.id,
        entityId: response.entityid,
        companyName: response.companyname,
        email: response.email,
        phone: response.phone,
        customFields: {
          aiGeneratedSummary: response.custentity13 || 'Not populated',
          industryType: response.custentity16 || 'Not specified',
          opportunitySummary: response.custentity15 || 'Not specified',
          industry: response.custentity_esc_industry || 'Not specified',
          annualRevenue: response.custentity_esc_annual_revenue || 'Not specified',
          numberOfEmployees: response.custentity_esc_no_of_employees || 'Not specified'
        }
      };
    } catch (error) {
      console.error('Error fetching customer from NetSuite:', error);
      throw error;
    }
  }

  /**
   * Fetch all active customers for the demo account
   * @param {string} account - Demo account identifier
   * @returns {Promise<Array>} Array of customer objects
   */
  async fetchAllCustomers(account = 'services') {
    try {
      // Use SuiteQL to get all active customers with custom fields
      const query = `
        SELECT id, entityid, companyname, email, phone, 
               custentity13, custentity16, custentity15,
               custentity_esc_industry, custentity_esc_annual_revenue, 
               custentity_esc_no_of_employees
        FROM customer
        WHERE isInactive = 'F'
      `;

      const response = await NS_Services_Stairway.ns_runCustomSuiteQL({
        sqlQuery: query,
        description: 'Fetch all active customers with custom fields for demo dashboard',
        pageSize: 50
      });

      if (!response.data) {
        return [];
      }

      return response.data.map(record => ({
        id: record.id,
        entityId: record.entityid,
        companyName: record.companyname,
        email: record.email,
        phone: record.phone,
        customFields: {
          aiGeneratedSummary: record.custentity13,
          industryType: record.custentity16,
          opportunitySummary: record.custentity15,
          industry: record.custentity_esc_industry,
          annualRevenue: record.custentity_esc_annual_revenue,
          numberOfEmployees: record.custentity_esc_no_of_employees
        }
      }));
    } catch (error) {
      console.error('Error fetching customers from NetSuite:', error);
      throw error;
    }
  }

  /**
   * Get projects for a specific customer
   * @param {number} customerId - NetSuite customer ID
   * @returns {Promise<Array>} Array of project objects
   */
  async fetchCustomerProjects(customerId) {
    try {
      const query = `
        SELECT id, entityid, companyname, startdate, enddate, 
               status, projectedtotalvalue
        FROM job
        WHERE customer = '${customerId}' AND isinactive = 'F'
        ORDER BY startdate DESC
      `;

      const response = await NS_Services_Stairway.ns_runCustomSuiteQL({
        sqlQuery: query,
        description: 'Fetch projects for customer ' + customerId,
        pageSize: 20
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching customer projects:', error);
      return [];
    }
  }

  /**
   * Get resource allocation for a project
   * @param {number} projectId - NetSuite project/job ID
   * @returns {Promise<Array>} Array of resource/charge records
   */
  async fetchProjectResources(projectId) {
    try {
      const query = `
        SELECT id, employee, BILLTO as customer, rate, 
               quantity, lineNumber
        FROM charge
        WHERE billto = '${projectId}' AND use = 'Forecast'
        ORDER BY employee
      `;

      const response = await NS_Services_Stairway.ns_runCustomSuiteQL({
        sqlQuery: query,
        description: 'Fetch resource allocation for project ' + projectId,
        pageSize: 100
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching project resources:', error);
      return [];
    }
  }

  /**
   * Get time entries for a project
   * @param {number} projectId - NetSuite project/job ID
   * @returns {Promise<Array>} Array of time entry records
   */
  async fetchProjectTimeEntries(projectId) {
    try {
      const query = `
        SELECT id, employee, customer, hours, trandate, 
               memo, isbillable, approvalstatus
        FROM timebill
        WHERE customer = '${projectId}'
        ORDER BY trandate DESC
      `;

      const response = await NS_Services_Stairway.ns_runCustomSuiteQL({
        sqlQuery: query,
        description: 'Fetch time entries for project ' + projectId,
        pageSize: 100
      });

      return response.data || [];
    } catch (error) {
      console.error('Error fetching project time entries:', error);
      return [];
    }
  }

  /**
   * Create a project for demo purposes
   * @param {Object} projectData - Project creation data
   * @returns {Promise<Object>} Created project record
   */
  async createDemoProject(projectData) {
    try {
      const payload = {
        entityid: projectData.projectCode,
        companyname: projectData.projectName,
        customer: projectData.customerId,
        startdate: projectData.startDate,
        enddate: projectData.endDate,
        status: 'OPEN',
        projectedtotalvalue: projectData.budget
      };

      const response = await NS_Services_Stairway.ns_createRecord({
        recordType: 'job',
        data: JSON.stringify(payload)
      });

      return response;
    } catch (error) {
      console.error('Error creating demo project:', error);
      throw error;
    }
  }

  /**
   * Create sample time entries for a project
   * @param {number} projectId - NetSuite project ID
   * @param {Array} entries - Array of time entry objects
   * @returns {Promise<Array>} Created time entry IDs
   */
  async createSampleTimeEntries(projectId, entries) {
    try {
      const createdIds = [];

      for (const entry of entries) {
        const payload = {
          employee: entry.employeeId,
          customer: projectId,
          hours: entry.hours,
          tranDate: entry.date,
          memo: entry.memo || 'Demo time entry',
          isbillable: true,
          approvalStatus: '2', // Approved
          item: entry.itemId || '89' // Default billable item
        };

        const response = await NS_Services_Stairway.ns_createRecord({
          recordType: 'timeBill',
          data: JSON.stringify(payload)
        });

        if (response.id) {
          createdIds.push(response.id);
        }
      }

      return createdIds;
    } catch (error) {
      console.error('Error creating time entries:', error);
      throw error;
    }
  }

  /**
   * Format NetSuite data for dashboard display
   * @param {Object} customerData - Raw customer data from NetSuite
   * @returns {Object} Formatted customer data
   */
  formatCustomerForDisplay(customerData) {
    return {
      id: customerData.id,
      name: customerData.companyName,
      entityId: customerData.entityId,
      email: customerData.email,
      phone: customerData.phone,
      industry: customerData.customFields?.industryType || 'Not specified',
      size: customerData.customFields?.numberOfEmployees || 'Not specified',
      revenue: customerData.customFields?.annualRevenue || 'Not specified',
      summary: customerData.customFields?.aiGeneratedSummary || 'No summary available',
      focus: (customerData.customFields?.opportunitySummary || '').split(',').filter(f => f.trim())
    };
  }
}

// Export for use in React component and backend
export default new NetSuiteService();
