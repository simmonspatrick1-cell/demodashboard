/**
 * Scenario Builder Module
 * 
 * This module provides utilities for building complete demo scenarios
 * with customers, projects, and time entries for NetSuite demonstrations.
 */

export class ScenarioBuilder {
  constructor(netsuiteService) {
    this.netsuiteService = netsuiteService;
    this.scenarios = new Map();
  }

  /**
   * Available scenario templates
   */
  static getTemplates() {
    return {
      standard: {
        name: 'Standard Technology Demo',
        description: 'Basic demo with technology companies and common projects',
        customers: [
          {
            entityid: 'ACME001',
            companyname: 'ACME Corporation',
            industry: 'Technology',
            email: 'contact@acme.com',
            revenue: 5000000
          },
          {
            entityid: 'GLOBAL002', 
            companyname: 'Global Solutions Inc',
            industry: 'Consulting',
            email: 'info@globalsolutions.com',
            revenue: 3500000
          },
          {
            entityid: 'INNOV003',
            companyname: 'Innovation Labs',
            industry: 'Software Development',
            email: 'hello@innovlabs.com',
            revenue: 2200000
          }
        ],
        projectTemplates: [
          {
            name: 'Digital Transformation Initiative',
            duration: 90,
            budget: 150000,
            description: 'Modernize legacy systems and processes'
          },
          {
            name: 'Cloud Migration Project',
            duration: 60,
            budget: 80000,
            description: 'Migrate infrastructure to cloud platforms'
          },
          {
            name: 'Mobile App Development',
            duration: 120,
            budget: 200000,
            description: 'Build customer-facing mobile applications'
          }
        ],
        resourceAllocation: {
          consultants: 3,
          developers: 5,
          projectManagers: 2,
          hoursPerDay: 8,
          utilizationRate: 0.85
        }
      },

      enterprise: {
        name: 'Enterprise Solutions Demo',
        description: 'Large-scale enterprise implementations',
        customers: [
          {
            entityid: 'ENT001',
            companyname: 'Enterprise Corporation',
            industry: 'Financial Services',
            email: 'partnerships@entcorp.com',
            revenue: 25000000
          },
          {
            entityid: 'MEGA002',
            companyname: 'Mega Industries',
            industry: 'Manufacturing',
            email: 'projects@megaind.com',
            revenue: 18000000
          },
          {
            entityid: 'CORP003',
            companyname: 'Corporate Healthcare Solutions',
            industry: 'Healthcare',
            email: 'solutions@corpshealth.com',
            revenue: 12000000
          }
        ],
        projectTemplates: [
          {
            name: 'ERP Implementation & Integration',
            duration: 180,
            budget: 500000,
            description: 'Full enterprise resource planning system deployment'
          },
          {
            name: 'Business Process Optimization',
            duration: 120,
            budget: 300000,
            description: 'Streamline and automate core business processes'
          },
          {
            name: 'Compliance Management System',
            duration: 90,
            budget: 250000,
            description: 'Implement regulatory compliance tracking'
          }
        ],
        resourceAllocation: {
          consultants: 8,
          developers: 12,
          projectManagers: 4,
          hoursPerDay: 8,
          utilizationRate: 0.90
        }
      },

      consulting: {
        name: 'Professional Services Firm',
        description: 'Consulting and advisory services scenario',
        customers: [
          {
            entityid: 'RETAIL001',
            companyname: 'Premier Retail Group',
            industry: 'Retail',
            email: 'operations@premierretail.com',
            revenue: 8000000
          },
          {
            entityid: 'FINANCE002',
            companyname: 'Regional Credit Union',
            industry: 'Financial Services', 
            email: 'technology@rcu.org',
            revenue: 4500000
          },
          {
            entityid: 'STARTUP003',
            companyname: 'TechStart Innovations',
            industry: 'Technology Startup',
            email: 'growth@techstart.io',
            revenue: 1200000
          }
        ],
        projectTemplates: [
          {
            name: 'Strategic Planning & Roadmap',
            duration: 45,
            budget: 75000,
            description: 'Develop 3-year strategic technology roadmap'
          },
          {
            name: 'Change Management Initiative',
            duration: 75,
            budget: 120000,
            description: 'Guide organizational transformation'
          },
          {
            name: 'Process Improvement Analysis',
            duration: 30,
            budget: 45000,
            description: 'Identify and optimize key business processes'
          }
        ],
        resourceAllocation: {
          consultants: 6,
          developers: 2,
          projectManagers: 3,
          hoursPerDay: 8,
          utilizationRate: 0.80
        }
      }
    };
  }

  /**
   * Build a complete scenario
   */
  async buildScenario(templateName, options = {}) {
    const template = ScenarioBuilder.getTemplates()[templateName];
    if (!template) {
      throw new Error(`Unknown scenario template: ${templateName}`);
    }

    const scenarioId = `${templateName}_${Date.now()}`;
    const scenario = {
      id: scenarioId,
      template: templateName,
      createdAt: new Date(),
      customers: [],
      projects: [],
      timeEntries: [],
      status: 'building'
    };

    try {
      // Step 1: Create customers
      console.log(`Building ${templateName} scenario - Creating customers...`);
      for (const customerData of template.customers.slice(0, options.customerCount || 3)) {
        const customer = await this.createCustomer(customerData);
        scenario.customers.push(customer);

        // Step 2: Create projects for each customer
        const projectCount = options.projectsPerCustomer || 2;
        for (let i = 0; i < projectCount; i++) {
          const projectTemplate = template.projectTemplates[i % template.projectTemplates.length];
          const project = await this.createProject(customer.id, projectTemplate);
          scenario.projects.push(project);

          // Step 3: Generate time entries
          const timeEntries = await this.generateTimeEntries(
            project.id, 
            template.resourceAllocation,
            options.timeEntriesPerProject || 20
          );
          scenario.timeEntries.push(...timeEntries);
        }
      }

      scenario.status = 'completed';
      scenario.summary = {
        customersCreated: scenario.customers.length,
        projectsCreated: scenario.projects.length,
        timeEntriesCreated: scenario.timeEntries.length,
        totalBudget: scenario.projects.reduce((sum, p) => sum + (p.budget || 0), 0)
      };

      this.scenarios.set(scenarioId, scenario);
      return scenario;

    } catch (error) {
      scenario.status = 'failed';
      scenario.error = error.message;
      throw error;
    }
  }

  /**
   * Create a customer record
   */
  async createCustomer(customerData) {
    // This would integrate with the NetSuite service
    // For now, return mock data
    return {
      id: `CUST_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      ...customerData,
      createdAt: new Date()
    };
  }

  /**
   * Create a project record
   */
  async createProject(customerId, projectTemplate) {
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (projectTemplate.duration * 24 * 60 * 60 * 1000));

    return {
      id: `PROJ_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      customerId: customerId,
      entityid: `${projectTemplate.name.replace(/\s+/g, '-').toUpperCase()}`,
      companyname: projectTemplate.name,
      description: projectTemplate.description,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      budget: projectTemplate.budget,
      status: 'In Progress',
      createdAt: new Date()
    };
  }

  /**
   * Generate time entries for a project
   */
  async generateTimeEntries(projectId, resourceAllocation, count) {
    const entries = [];
    const startDate = new Date();
    
    // Generate entries for the specified count
    for (let i = 0; i < count; i++) {
      const entryDate = new Date(startDate.getTime() - (i * 24 * 60 * 60 * 1000));
      
      // Simulate different types of resources
      const resourceTypes = ['consultant', 'developer', 'manager'];
      const resourceType = resourceTypes[i % resourceTypes.length];
      
      const hours = Math.floor(Math.random() * 4) + 4; // 4-8 hours
      
      entries.push({
        id: `TIME_${Date.now()}_${i}`,
        projectId: projectId,
        employeeId: `EMP_${resourceType}_${(i % 10) + 1}`,
        date: entryDate.toISOString().split('T')[0],
        hours: hours,
        resourceType: resourceType,
        billableRate: this.getBillableRate(resourceType),
        description: `${resourceType} work on project activities`,
        billable: true,
        approved: Math.random() > 0.1 // 90% approved
      });
    }

    return entries;
  }

  /**
   * Get billable rate by resource type
   */
  getBillableRate(resourceType) {
    const rates = {
      consultant: 200,
      developer: 150,
      manager: 250
    };
    return rates[resourceType] || 150;
  }

  /**
   * Get scenario by ID
   */
  getScenario(scenarioId) {
    return this.scenarios.get(scenarioId);
  }

  /**
   * List all scenarios
   */
  listScenarios() {
    return Array.from(this.scenarios.values());
  }

  /**
   * Delete a scenario
   */
  deleteScenario(scenarioId) {
    return this.scenarios.delete(scenarioId);
  }

  /**
   * Export scenario data
   */
  exportScenario(scenarioId) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    return {
      ...scenario,
      exportedAt: new Date(),
      format: 'json'
    };
  }
}

export default ScenarioBuilder;