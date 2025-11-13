import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from "@anthropic-ai/sdk";

// Load environment variables
dotenv.config();

// Initialize Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const NETSUITE_ACCOUNT = process.env.NETSUITE_ACCOUNT_ID || "td3049589";

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
    id: 3,
    name: "Marketing Agency",
    description: "Creative agency managing campaigns across different clients", 
    industry: "Marketing",
    complexity: "Medium",
    projects: 12,
    resources: 20
  }
];

// Generate scenario using Claude AI
async function generateScenarioWithAI(template, options = {}) {
  const { companyName, industry, customization } = options;
  
  const prompt = `Generate realistic NetSuite demo data for a ${industry || template.industry} company.
  
  Company: ${companyName || template.name}
  Description: ${template.description}
  ${customization ? `Special Requirements: ${customization}` : ''}
  Expected Projects: ${template.projects}
  Expected Resources: ${template.resources}
  
  Please provide realistic data in this exact JSON structure:
  {
    "companyOverview": {
      "name": "string",
      "industry": "string", 
      "employeeCount": number,
      "annualRevenue": "string",
      "description": "string"
    },
    "keyFeatures": ["feature1", "feature2", "feature3"],
    "projects": [
      {
        "id": number,
        "name": "string",
        "status": "string",
        "startDate": "YYYY-MM-DD",
        "endDate": "YYYY-MM-DD", 
        "budget": number,
        "allocatedResources": number,
        "priority": "High|Medium|Low",
        "client": "string"
      }
    ],
    "resources": [
      {
        "id": number,
        "name": "string",
        "role": "string",
        "skillLevel": "Senior|Mid|Junior",
        "hourlyRate": number,
        "availability": number,
        "currentUtilization": number,
        "department": "string"
      }
    ]
  }
  
  Make the data realistic and varied. Ensure projects have different statuses, priorities, and time ranges.`;

  try {
    const response = await client.messages.create({
      model: "claude-3-sonnet-20240229",
      max_tokens: 2000,
      temperature: 0.7,
      messages: [{
        role: "user",
        content: prompt
      }]
    });
    
    const content = response.content[0].text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in AI response');
    }
  } catch (error) {
    console.error('AI generation failed, using fallback:', error.message);
    return generateFallbackScenario(template);
  }
}

// Fallback scenario generation
function generateFallbackScenario(template) {
  const projects = [];
  const resources = [];
  
  // Generate projects
  for (let i = 1; i <= template.projects; i++) {
    projects.push({
      id: i,
      name: `${template.name} Project ${i}`,
      status: ['Planning', 'Active', 'On Hold', 'Completed'][Math.floor(Math.random() * 4)],
      startDate: new Date(2024, Math.floor(Math.random() * 12), 1).toISOString().split('T')[0],
      endDate: new Date(2024, Math.floor(Math.random() * 12) + 6, 28).toISOString().split('T')[0],
      budget: Math.floor(Math.random() * 500000) + 50000,
      allocatedResources: Math.floor(Math.random() * 8) + 2,
      priority: ['High', 'Medium', 'Low'][Math.floor(Math.random() * 3)],
      client: `Client ${String.fromCharCode(65 + i)}`
    });
  }
  
  // Generate resources
  for (let i = 1; i <= template.resources; i++) {
    resources.push({
      id: i,
      name: `Resource ${i}`,
      role: ['Developer', 'Designer', 'Manager', 'Analyst'][Math.floor(Math.random() * 4)],
      skillLevel: ['Senior', 'Mid', 'Junior'][Math.floor(Math.random() * 3)],
      hourlyRate: Math.floor(Math.random() * 100) + 50,
      availability: Math.floor(Math.random() * 40) + 20,
      currentUtilization: Math.floor(Math.random() * 100),
      department: template.industry
    });
  }
  
  return {
    company_info: {
      name: template.name,
      industry: template.industry,
      size: `${template.resources} employees`,
      description: template.description
    },
    projects,
    resources
  };
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET /api/scenarios - return templates
  if (req.method === 'GET') {
    return res.status(200).json({
      templates: SCENARIO_TEMPLATES,
      netsuite_account: NETSUITE_ACCOUNT
    });
  }

  // POST /api/scenarios - generate scenario  
  if (req.method === 'POST') {
    try {
      const { template, templateId, companyName, industry, customization } = req.body || {};
      
      // Support both 'template' and 'templateId' field names
      const requestedTemplateId = template || templateId;
      
      if (!requestedTemplateId) {
        return res.status(400).json({ error: 'Template ID is required' });
      }
      
      // Find template by string ID (new format) or fallback to integer (old format)
      const foundTemplate = SCENARIO_TEMPLATES.find(t => 
        t.id === requestedTemplateId || t.id === parseInt(requestedTemplateId)
      );
      
      if (!foundTemplate) {
        return res.status(404).json({ 
          error: 'Template not found',
          available_templates: SCENARIO_TEMPLATES.map(t => t.id)
        });
      }
      
      console.log(`Generating scenario for template: ${foundTemplate.name}`);
      
      let scenarioData;
      if (process.env.ANTHROPIC_API_KEY) {
        scenarioData = await generateScenarioWithAI(foundTemplate, { companyName, industry, customization });
      } else {
        scenarioData = generateFallbackScenario(foundTemplate);
      }
      
      const response = {
        success: true,
        template: foundTemplate,
        scenario: scenarioData,
        generated_at: new Date().toISOString(),
        netsuite_account: NETSUITE_ACCOUNT,
        method: process.env.ANTHROPIC_API_KEY ? 'ai' : 'fallback'
      };
      
      console.log('Scenario generated successfully');
      return res.status(200).json(response);
      
    } catch (error) {
      console.error('Scenario generation error:', error);
      return res.status(500).json({ 
        error: 'Failed to generate scenario',
        details: error.message
      });
    }
  }

  return res.status(404).json({ error: 'Not found' });
}