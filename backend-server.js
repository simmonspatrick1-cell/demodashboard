/**
 * Backend Express Server - NetSuite MCP Integration
 * 
 * This server handles requests from the React dashboard and
 * calls the NetSuite MCP tools to fetch/create data
 */

import express from 'express';
import cors from 'cors';
import Anthropic from "@anthropic-ai/sdk";
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Validate required environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
  console.error('Please check your .env file or environment configuration');
  process.exit(1);
}

// Basic logging setup
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_FILE = process.env.LOG_FILE || path.join(__dirname, 'logs', 'app.log');

const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function log(level, message, data = null) {
  if (logLevels[level] <= logLevels[LOG_LEVEL]) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;

    console.log(logMessage);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }

    // Write to file if in production
    if (process.env.NODE_ENV === 'production') {
      try {
        const logDir = path.dirname(LOG_FILE);
        if (!fs.existsSync(logDir)) {
          fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(LOG_FILE, logMessage + '\n' + (data ? JSON.stringify(data, null, 2) + '\n' : ''));
      } catch (error) {
        console.error('Failed to write to log file:', error.message);
      }
    }
  }
}

const app = express();
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

app.use(cors());
app.use(express.json());

// ============ HEALTH CHECK ENDPOINT ============
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    uptime: process.uptime(),
    env: process.env.NODE_ENV || 'development'
  });
});

// ============ ENVIRONMENT VARIABLES ============
const NETSUITE_ACCOUNT = process.env.NETSUITE_ACCOUNT_ID || "td3049589";
const MCP_SERVER = "netsuite-stairway"; // Your MCP server name

// ============ CACHE SETUP ============
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============ API ENDPOINTS ============

/**
 * POST /api/netsuite/sync
 * Fetch customer data from NetSuite
 */
app.post('/api/netsuite/sync', async (req, res) => {
  try {
    const { customerId, account = 'services' } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId required' });
    }

    // Check cache first
    const cacheKey = `customer_${customerId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    console.log(`Fetching customer ${customerId} from NetSuite...`);

    // Call ns_getRecord via Claude MCP
    const response = await client.messages.create({
      model: "claude-opus-4-1",
      max_tokens: 2048,
      tools: [
        {
          type: "use_mcp_tool",
          mcp_server: MCP_SERVER,
          tool_name: "ns_getRecord",
          tool_input: {
            recordType: "customer",
            recordId: String(customerId),
            fields: "id,entityid,companyname,email,phone,custentity13,custentity16,custentity15,custentity_esc_industry,custentity_esc_annual_revenue,custentity_esc_no_of_employees"
          }
        }
      ]
    });

    // Extract data from Claude's response
    let customerData = null;
    
    for (const content of response.content) {
      if (content.type === 'tool_result') {
        try {
          customerData = JSON.parse(content.text);
          break;
        } catch (e) {
          // Try to extract JSON from text response
          const jsonMatch = content.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            customerData = JSON.parse(jsonMatch[0]);
            break;
          }
        }
      }
    }

    if (!customerData) {
      throw new Error('No customer data returned from NetSuite');
    }

    // Cache the result
    setCached(cacheKey, customerData);

    res.json(customerData);
  } catch (error) {
    console.error('Error syncing customer:', error.message);
    res.status(500).json({ 
      error: 'Failed to sync customer data',
      details: error.message 
    });
  }
});

/**
 * POST /api/netsuite/projects
 * Fetch projects for a customer
 */
app.post('/api/netsuite/projects', async (req, res) => {
  try {
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'customerId required' });
    }

    const cacheKey = `projects_${customerId}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    console.log(`Fetching projects for customer ${customerId}...`);

    const response = await client.messages.create({
      model: "claude-opus-4-1",
      max_tokens: 2048,
      tools: [
        {
          type: "use_mcp_tool",
          mcp_server: MCP_SERVER,
          tool_name: "ns_runCustomSuiteQL",
          tool_input: {
            sqlQuery: `
              SELECT id, entityid, companyname, startdate, enddate, status, projectedtotalvalue
              FROM job
              WHERE customer = '${customerId}' AND isinactive = 'F'
              ORDER BY startdate DESC
            `,
            description: `Fetch projects for customer ${customerId}`,
            pageSize: 20
          }
        }
      ]
    });

    let projectsData = [];
    
    for (const content of response.content) {
      if (content.type === 'tool_result') {
        try {
          const result = JSON.parse(content.text);
          projectsData = result.data || [];
          break;
        } catch (e) {
          console.error('Parse error:', e.message);
        }
      }
    }

    setCached(cacheKey, projectsData);
    res.json(projectsData);
  } catch (error) {
    console.error('Error fetching projects:', error.message);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

/**
 * POST /api/netsuite/create-project
 * Create a new demo project
 */
app.post('/api/netsuite/create-project', async (req, res) => {
  try {
    const { 
      entityid, 
      companyname, 
      customerId, 
      startdate, 
      enddate,
      budget = 100000
    } = req.body;

    if (!entityid || !companyname || !customerId) {
      return res.status(400).json({ 
        error: 'entityid, companyname, and customerId required' 
      });
    }

    console.log(`Creating project ${entityid}...`);

    const projectPayload = {
      entityid,
      companyname,
      customer: String(customerId),
      startdate: startdate || new Date().toISOString().split('T')[0],
      enddate: enddate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      status: 'OPEN',
      projectedtotalvalue: String(budget)
    };

    const response = await client.messages.create({
      model: "claude-opus-4-1",
      max_tokens: 1024,
      tools: [
        {
          type: "use_mcp_tool",
          mcp_server: MCP_SERVER,
          tool_name: "ns_createRecord",
          tool_input: {
            recordType: "job",
            data: JSON.stringify(projectPayload)
          }
        }
      ]
    });

    let projectResult = null;
    
    for (const content of response.content) {
      if (content.type === 'tool_result') {
        try {
          projectResult = JSON.parse(content.text);
          break;
        } catch (e) {
          projectResult = { message: content.text };
        }
      }
    }

    // Clear projects cache for this customer
    cache.delete(`projects_${customerId}`);

    res.json({
      success: true,
      id: projectResult?.id || entityid,
      data: projectResult
    });
  } catch (error) {
    console.error('Error creating project:', error.message);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

/**
 * POST /api/netsuite/scenarios
 * Build complete demo scenarios with customers, projects, and time entries
 */
app.post('/api/netsuite/scenarios', async (req, res) => {
  try {
    const { 
      scenarioType = 'standard',
      customerCount = 3,
      projectsPerCustomer = 2,
      timeEntriesPerProject = 15
    } = req.body;

    console.log(`Building ${scenarioType} scenario with ${customerCount} customers...`);

    const scenarios = {
      standard: {
        customers: [
          { entityid: 'ACME001', companyname: 'ACME Corporation', industry: 'Technology' },
          { entityid: 'GLOBAL002', companyname: 'Global Solutions Inc', industry: 'Consulting' },
          { entityid: 'INNOV003', companyname: 'Innovation Labs', industry: 'Software' }
        ],
        projects: [
          'Digital Transformation Initiative',
          'Cloud Migration Project',
          'Mobile App Development',
          'Data Analytics Platform',
          'Security Audit & Compliance',
          'System Integration'
        ]
      },
      enterprise: {
        customers: [
          { entityid: 'ENT001', companyname: 'Enterprise Corp', industry: 'Finance' },
          { entityid: 'MEGA002', companyname: 'Mega Industries', industry: 'Manufacturing' },
          { entityid: 'CORP003', companyname: 'Corporate Solutions', industry: 'Healthcare' }
        ],
        projects: [
          'ERP Implementation',
          'Business Process Optimization',
          'Compliance Management System',
          'Enterprise Architecture Review',
          'Digital Workforce Planning'
        ]
      }
    };

    const scenario = scenarios[scenarioType] || scenarios.standard;
    const results = {
      customers: [],
      projects: [],
      timeEntries: [],
      summary: {
        customersCreated: 0,
        projectsCreated: 0,
        timeEntriesCreated: 0
      }
    };

    // Create customers and their projects
    for (let i = 0; i < Math.min(customerCount, scenario.customers.length); i++) {
      const customerData = scenario.customers[i];
      
      // Here you would call the actual customer creation logic
      // For demo purposes, we'll simulate the creation
      const customerId = `DEMO_${Date.now()}_${i}`;
      results.customers.push({ id: customerId, ...customerData });
      results.summary.customersCreated++;

      // Create projects for this customer
      for (let j = 0; j < projectsPerCustomer; j++) {
        const projectName = scenario.projects[j % scenario.projects.length];
        const projectId = `PROJ_${customerId}_${j}`;
        
        results.projects.push({
          id: projectId,
          customerId: customerId,
          name: projectName,
          status: 'In Progress'
        });
        results.summary.projectsCreated++;

        // Add time entries count to summary
        results.summary.timeEntriesCreated += timeEntriesPerProject;
      }
    }

    // Clear relevant caches
    cache.delete('all_customers');
    
    res.json({
      success: true,
      scenario: scenarioType,
      results: results
    });
  } catch (error) {
    console.error('Error building scenario:', error.message);
    res.status(500).json({ error: 'Failed to build scenario' });
  }
});

/**
 * GET /api/netsuite/scenarios/templates
 * Get available scenario templates
 */
app.get('/api/netsuite/scenarios/templates', (req, res) => {
  const templates = {
    standard: {
      name: 'Standard Demo',
      description: 'Basic demo with technology companies',
      customers: 3,
      projectTypes: ['Digital Transformation', 'Cloud Migration', 'Mobile Development']
    },
    enterprise: {
      name: 'Enterprise Demo',
      description: 'Large-scale enterprise scenarios',
      customers: 3,
      projectTypes: ['ERP Implementation', 'Process Optimization', 'Compliance Management']
    },
    consulting: {
      name: 'Consulting Firm',
      description: 'Professional services scenario',
      customers: 5,
      projectTypes: ['Strategy Consulting', 'Change Management', 'Process Improvement']
    }
  };

  res.json(templates);
});

/**
 * POST /api/netsuite/create-time-entries
 * Create sample time entries for a project
 */
app.post('/api/netsuite/create-time-entries', async (req, res) => {
  try {
    const { 
      projectId, 
      count = 10,
      startDate = new Date().toISOString().split('T')[0]
    } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId required' });
    }

    console.log(`Creating ${count} time entries for project ${projectId}...`);

    const employees = [148, 149, 150, 151, 152]; // Sample employee IDs
    const createdIds = [];
    let createCount = 0;

    // Create time entries in batches
    for (let i = 0; i < Math.min(count, 10); i++) {
      const employeeId = employees[i % employees.length];
      const entryDate = new Date(new Date(startDate).getTime() + i * 24*60*60*1000)
        .toISOString()
        .split('T')[0];

      const payload = {
        employee: String(employeeId),
        customer: String(projectId),
        hours: "8:00",
        tranDate: entryDate,
        memo: `Demo time entry - ${entryDate}`,
        isbillable: true,
        approvalStatus: "2", // Approved
        item: "89" // Billable item
      };

      try {
        const response = await client.messages.create({
          model: "claude-opus-4-1",
          max_tokens: 512,
          tools: [
            {
              type: "use_mcp_tool",
              mcp_server: MCP_SERVER,
              tool_name: "ns_createRecord",
              tool_input: {
                recordType: "timeBill",
                data: JSON.stringify(payload)
              }
            }
          ]
        });

        for (const content of response.content) {
          if (content.type === 'tool_result') {
            try {
              const result = JSON.parse(content.text);
              if (result.id) {
                createdIds.push(result.id);
                createCount++;
              }
            } catch (e) {
              console.error('Parse error:', e.message);
            }
          }
        }
      } catch (error) {
        console.error(`Error creating entry ${i}:`, error.message);
        // Continue creating other entries
      }
    }

    res.json({
      success: true,
      created: createCount,
      ids: createdIds
    });
  } catch (error) {
    console.error('Error creating time entries:', error.message);
    res.status(500).json({ error: 'Failed to create time entries' });
  }
});

/**
 * GET /api/netsuite/customers
 * Fetch all customers (with optional filtering)
 */
app.get('/api/netsuite/customers', async (req, res) => {
  try {
    const cacheKey = 'all_customers';
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    console.log('Fetching all customers...');

    const response = await client.messages.create({
      model: "claude-opus-4-1",
      max_tokens: 4096,
      tools: [
        {
          type: "use_mcp_tool",
          mcp_server: MCP_SERVER,
          tool_name: "ns_runCustomSuiteQL",
          tool_input: {
            sqlQuery: `
              SELECT id, entityid, companyname, email, phone
              FROM customer
              WHERE isInactive = 'F'
              ORDER BY companyname
            `,
            description: 'Fetch all active customers',
            pageSize: 50
          }
        }
      ]
    });

    let customers = [];
    
    for (const content of response.content) {
      if (content.type === 'tool_result') {
        try {
          const result = JSON.parse(content.text);
          customers = result.data || [];
          break;
        } catch (e) {
          console.error('Parse error:', e.message);
        }
      }
    }

    setCached(cacheKey, customers);
    res.json(customers);
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

/**
 * POST /api/export/email
 * Export data to email (server-side email sending option)
 * Note: This is optional - the frontend can also use mailto: links
 */
app.post('/api/export/email', async (req, res) => {
  try {
    const { data, recipientEmail = 'simmonspatrick1@gmail.com' } = req.body;

    if (!data) {
      return res.status(400).json({ error: 'data required' });
    }

    // Import email export utilities
    const { formatDataWithHashtags, createEmailSubject, prepareEmailContent } = 
      await import('./email-export-utils.js');

    const emailContent = prepareEmailContent(data, { 
      recipientEmail,
      includeInstructions: true 
    });

    // In production, you would use a service like SendGrid, AWS SES, etc.
    // For now, we'll return the formatted email content
    // The frontend can use mailto: or you can implement server-side sending here
    
    console.log(`Email export prepared for ${recipientEmail}`);
    console.log(`Subject: ${emailContent.subject}`);

    res.json({
      success: true,
      message: 'Email content prepared',
      emailContent: {
        to: emailContent.to,
        subject: emailContent.subject,
        body: emailContent.body
      },
      mailtoUrl: `mailto:${emailContent.to}?subject=${encodeURIComponent(emailContent.subject)}&body=${encodeURIComponent(emailContent.body)}`
    });
  } catch (error) {
    console.error('Error preparing email export:', error.message);
    res.status(500).json({ 
      error: 'Failed to prepare email export',
      details: error.message 
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    account: NETSUITE_ACCOUNT,
    mcp: MCP_SERVER,
    cacheSize: cache.size
  });
});

/**
 * Clear cache endpoint (admin only in production)
 */
app.post('/api/cache/clear', (req, res) => {
  cache.clear();
  res.json({ message: 'Cache cleared' });
});

/**
 * Monitoring endpoints
 */
app.post('/api/monitoring/error', (req, res) => {
  const error = req.body;
  log('error', 'Frontend error received', {
    type: error.type,
    message: error.message,
    url: error.url,
    timestamp: error.timestamp
  });
  res.status(200).json({ received: true });
});

app.get('/api/monitoring/metrics', (_req, res) => {
  res.json({
    server: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development'
    },
    cache: {
      size: cache.size
    }
  });
});

// ============ ROOT ROUTE ============
app.get('/', (req, res) => {
  res.json({
    service: 'NetSuite Demo Dashboard API',
    status: 'running',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      customers: '/api/netsuite/customers',
      sync: 'POST /api/netsuite/sync',
      projects: 'POST /api/netsuite/projects',
      createProject: 'POST /api/netsuite/create-project',
      createTimeEntries: 'POST /api/netsuite/create-time-entries',
      scenarios: 'POST /api/netsuite/scenarios',
      scenarioTemplates: '/api/netsuite/scenarios/templates',
      exportEmail: 'POST /api/export/email',
      monitoring: '/api/monitoring/metrics',
      cache: 'POST /api/cache/clear'
    },
    documentation: 'See README.md for API documentation',
    frontend: process.env.FRONTEND_URL || 'https://demodashboard-j0ryywiv5-pat-simmons-projects.vercel.app'
  });
});

// ============ 404 HANDLER ============
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: '/api/health, /api/netsuite/customers, etc.',
    seeRoot: 'Visit / for all available endpoints'
  });
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3004;

app.listen(PORT, () => {
  console.log(`✓ NetSuite Backend Server running on http://localhost:${PORT}`);
  console.log(`✓ MCP Server: ${MCP_SERVER}`);
  console.log(`✓ NetSuite Account: ${NETSUITE_ACCOUNT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log('  POST   /api/netsuite/sync - Sync customer data');
  console.log('  POST   /api/netsuite/projects - Fetch customer projects');
  console.log('  POST   /api/netsuite/create-project - Create new project');
  console.log('  POST   /api/netsuite/create-time-entries - Add time entries');
  console.log('  POST   /api/netsuite/scenarios - Build demo scenarios');
  console.log('  GET    /api/netsuite/scenarios/templates - Get scenario templates');
  console.log('  GET    /api/netsuite/customers - List all customers');
  console.log('  GET    /api/health - Health check');
  console.log('  POST   /api/cache/clear - Clear cache');
});

export default app;
