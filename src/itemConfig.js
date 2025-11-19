/**
 * Item Configuration for Dashboard Exports
 * 
 * This file defines which NetSuite items to use when creating estimates.
 * You can easily customize item names here without editing the main dashboard code.
 * 
 * All items listed here exist in your NetSuite account (from ItemSearchResults891.xls)
 */

export const ITEM_CONFIG = {
  // Default item for all service line items
  // This is used by the "Create Estimate" button
  defaultServiceItem: 'PS - Post Go-Live Support',
  
  // Predefined estimate line items
  // You can customize these to use different NetSuite items
  estimateLineItems: {
    // Professional Services line item
    professionalServices: {
      name: 'PS - Post Go-Live Support',  // Must match a NetSuite item
      description: 'Professional Services - Implementation and Configuration',
      quantity: 1,
      salesPrice: 175,  // Sales price per unit
      purchasePrice: 0,  // Purchase/cost price
      rate: 175  // Same as salesPrice for service items
    },
    
    // Travel & Expenses line item
    travelExpenses: {
      name: 'EXP_Travel Expenses',  // Using existing NetSuite expense item
      description: 'Travel & Expenses - On-site Support',
      quantity: 1,
      salesPrice: 5000,
      purchasePrice: 0,
      rate: 5000
    },
    
    // Software/Licensing line item
    softwareLicensing: {
      name: 'NIN_AA1: SaaS License A',  // Using existing NetSuite license item
      description: 'Software Licensing - Annual Subscription',
      quantity: 1,
      salesPrice: 24000,
      purchasePrice: 0,
      rate: 24000
    }
  }
};

/**
 * Available NetSuite Service Items (from your account)
 * Use these names in the configuration above
 */
export const AVAILABLE_ITEMS = {
  // Professional Services
  PS_POST_GO_LIVE: 'PS - Post Go-Live Support',
  PS_GO_LIVE: 'PS - Go-Live Support',
  PS_TRAINING: 'PS - Training Services',
  PS_DATA_MIGRATION: 'PS - Data Migration',
  PS_DISCOVERY: 'PS - Discovery & Design Strategy',
  
  // Project Services
  SVC_PR_CONSULTING: 'SVC_PR_Consulting',
  SVC_PR_PROJECT_MGMT: 'SVC_PR_Project Management',
  SVC_PR_DEVELOPMENT: 'SVC_PR_Development',
  SVC_PR_TESTING: 'SVC_PR_Testing',
  SVC_PR_TRAINING: 'SVC_PR_Training',
  SVC_PR_INTEGRATION: 'SVC_PR_Integration',
  SVC_PR_DATA_MIGRATION: 'SVC_PR_Data Migration',
  SVC_PR_BUSINESS_ANALYSIS: 'SVC_PR_Business Analysis',
  SVC_PR_HOURLY_SUPPORT: 'SVC_PR_Hourly Support',
  SVC_PR_TRAVEL: 'SVC_PR_Travel',
  
  // Expenses
  EXP_TRAVEL: 'EXP_Travel Expenses',
  EXP_3RD_PARTY: 'EXP_3rd Party Services',
  
  // Software/Licensing
  LICENSE_SAAS: 'NIN_AA1: SaaS License A',
  LICENSE_PERPETUAL: 'NIN_AA1: Perpetual License',
  LICENSE_PLATINUM_SUPPORT: 'NIN_AA1: Platinum Support',
  
  // Service Operations
  SVC_SO_IT_CONSULTING: 'SVC_SO_IT Consulting',
  SVC_SO_IT_INSTALL: 'SVC_SO_IT Install',
  SVC_SO_IT_TESTING: 'SVC_SO_IT Testing',
  
  // Field Services
  SVC_FIELD_TECH: 'SVC-001: Field Technician Labor',
  SVC_SENIOR_ENGINEER: 'SVC-002: Senior Engineer Labor',
  SVC_PROJECT_MANAGER: 'SVC-003: Project Manager Services',
  SVC_INSPECTION: 'SVC-004: Inspection Services',
  SVC_EMERGENCY: 'SVC-005: Emergency Response Services'
};

/**
 * Quick presets for common estimate types
 */
export const ESTIMATE_PRESETS = {
  // Standard implementation estimate
  standard: {
    name: 'Standard Implementation',
    items: [
      {
        name: AVAILABLE_ITEMS.PS_POST_GO_LIVE,
        description: 'Professional Services - Implementation and Configuration',
        quantity: 1,
        salesPrice: 175,
        purchasePrice: 0,
        rate: 175
      },
      {
        name: AVAILABLE_ITEMS.EXP_TRAVEL,
        description: 'Travel & Expenses - On-site Support',
        quantity: 1,
        salesPrice: 5000,
        purchasePrice: 0,
        rate: 5000
      },
      {
        name: AVAILABLE_ITEMS.LICENSE_SAAS,
        description: 'Software Licensing - Annual Subscription',
        quantity: 1,
        salesPrice: 24000,
        purchasePrice: 0,
        rate: 24000
      }
    ]
  },
  
  // Consulting-focused estimate
  consulting: {
    name: 'Consulting Services',
    items: [
      {
        name: AVAILABLE_ITEMS.SVC_PR_CONSULTING,
        description: 'Strategic Consulting Services',
        quantity: 1,
        salesPrice: 200,
        purchasePrice: 0,
        rate: 200
      },
      {
        name: AVAILABLE_ITEMS.SVC_PR_BUSINESS_ANALYSIS,
        description: 'Business Analysis and Process Review',
        quantity: 1,
        salesPrice: 120,
        purchasePrice: 0,
        rate: 120
      },
      {
        name: AVAILABLE_ITEMS.SVC_PR_TRAVEL,
        description: 'Travel and On-site Support',
        quantity: 1,
        salesPrice: 200,
        purchasePrice: 0,
        rate: 200
      }
    ]
  },
  
  // Development project estimate
  development: {
    name: 'Custom Development',
    items: [
      {
        name: AVAILABLE_ITEMS.SVC_PR_DEVELOPMENT,
        description: 'Custom Development Services',
        quantity: 1,
        salesPrice: 220,
        purchasePrice: 0,
        rate: 220
      },
      {
        name: AVAILABLE_ITEMS.SVC_PR_TESTING,
        description: 'Quality Assurance and Testing',
        quantity: 1,
        salesPrice: 200,
        purchasePrice: 0,
        rate: 200
      },
      {
        name: AVAILABLE_ITEMS.SVC_PR_TRAINING,
        description: 'End User Training',
        quantity: 1,
        salesPrice: 120,
        purchasePrice: 0,
        rate: 120
      },
      {
        name: AVAILABLE_ITEMS.SVC_PR_PROJECT_MGMT,
        description: 'Project Management',
        quantity: 1,
        salesPrice: 375,
        purchasePrice: 0,
        rate: 375
      }
    ]
  },
  
  // Data migration project
  dataMigration: {
    name: 'Data Migration Project',
    items: [
      {
        name: AVAILABLE_ITEMS.PS_DATA_MIGRATION,
        description: 'Data Migration Services',
        quantity: 1,
        salesPrice: 140,
        purchasePrice: 0,
        rate: 140
      },
      {
        name: AVAILABLE_ITEMS.SVC_PR_TESTING,
        description: 'Data Validation and Testing',
        quantity: 1,
        salesPrice: 200,
        purchasePrice: 0,
        rate: 200
      },
      {
        name: AVAILABLE_ITEMS.SVC_PR_TRAINING,
        description: 'Training on New System',
        quantity: 1,
        salesPrice: 120,
        purchasePrice: 0,
        rate: 120
      }
    ]
  }
};

export default ITEM_CONFIG;

