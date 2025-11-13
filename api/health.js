import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from "@anthropic-ai/sdk";

// Load environment variables
dotenv.config();

// Validate required environment variables
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY environment variable is required');
  process.exit(1);
}

// Initialize Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Demo data generation module
const NETSUITE_ACCOUNT = process.env.NETSUITE_ACCOUNT_ID || "td3049589";

// Generate demo customer data
function generateDemoCustomers() {
  const companies = ['Acme Corp', 'TechStart Inc', 'Global Solutions', 'Innovation Labs', 'Future Systems'];
  const statuses = ['Active', 'On Hold', 'Pending', 'Completed'];
  const projectTypes = ['Implementation', 'Consultation', 'Support', 'Training'];
  
  return companies.map((company, index) => ({
    id: index + 1,
    name: company,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    projectType: projectTypes[Math.floor(Math.random() * projectTypes.length)],
    startDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
    budget: Math.floor(Math.random() * 500000) + 50000,
    utilization: Math.floor(Math.random() * 100) + 1
  }));
}

// Vercel serverless function handler
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'healthy',
      message: 'NetSuite Demo Dashboard API is running',
      netsuite_account: NETSUITE_ACCOUNT,
      timestamp: new Date().toISOString(),
      anthropic_configured: !!process.env.ANTHROPIC_API_KEY
    });
  }

  return res.status(404).json({ error: 'Not found' });
}