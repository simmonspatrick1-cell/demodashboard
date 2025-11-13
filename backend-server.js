/**
 * Backend Express Server - NetSuite MCP Integration
 * 
 * This server handles requests from the React dashboard and
 * calls the NetSuite MCP tools to fetch/create data
 */

import express from 'express';
import cors from 'cors';
import Anthropic from "@anthropic-sdk/sdk";

const app = express();
const client = new Anthropic();

app.use(cors());
app.use(express.json());

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

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: err.message 
  });
});

// ============ START SERVER ============
const PORT = process.env.PORT || 3001;

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
  console.log('  GET    /api/netsuite/customers - List all customers');
  console.log('  GET    /api/health - Health check');
  console.log('  POST   /api/cache/clear - Clear cache');
});

export default app;
