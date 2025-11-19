/**
 * Health check endpoint
 * GET /api/health
 */

export default function handler(req, res) {
  res.json({ 
    status: 'ok',
    account: process.env.NETSUITE_ACCOUNT_ID || 'td3049589',
    timestamp: new Date().toISOString()
  });
}

