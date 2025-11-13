// Vercel serverless function for scenario templates
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Available scenario templates
const SCENARIO_TEMPLATES = [
  {
    id: "professional-services",
    name: "Professional Services Firm",
    description: "Multi-project consulting firm with resource allocation challenges",
    industry: "Professional Services",
    complexity: "High",
    projects: 8,
    resources: 25
  },
  {
    id: "software-development",
    name: "Software Development Agency", 
    description: "Agile development team with multiple client projects",
    industry: "Technology",
    complexity: "Medium",
    projects: 5,
    resources: 15
  },
  {
    id: "manufacturing",
    name: "Manufacturing Company",
    description: "Production facility with supply chain and inventory challenges",
    industry: "Manufacturing",
    complexity: "High",
    projects: 6,
    resources: 40
  },
  {
    id: "retail-chain",
    name: "Multi-Location Retail",
    description: "Retail chain with multiple stores and inventory management needs",
    industry: "Retail",
    complexity: "Medium", 
    projects: 4,
    resources: 30
  },
  {
    id: "nonprofit",
    name: "Non-Profit Organization",
    description: "Grant-funded organization with project tracking and compliance needs",
    industry: "Non-Profit",
    complexity: "Low",
    projects: 3,
    resources: 8
  }
];

export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint only supports GET requests'
    });
  }

  try {
    res.status(200).json({
      success: true,
      templates: SCENARIO_TEMPLATES,
      count: SCENARIO_TEMPLATES.length,
      netsuite_account: process.env.NETSUITE_ACCOUNT_ID || "td3049589",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Templates endpoint error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}