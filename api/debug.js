/**
 * Debug endpoint to check environment variables
 */

export default function handler(req, res) {
  const envVars = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'SET' : 'NOT SET',
    NETSUITE_ACCOUNT_ID: process.env.NETSUITE_ACCOUNT_ID ? 'SET' : 'NOT SET',
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',
    timestamp: new Date().toISOString()
  };

  res.status(200).json({
    message: 'Environment Debug',
    environment: envVars,
    allEnvKeys: Object.keys(process.env).filter(key => 
      key.includes('ANTHROPIC') || key.includes('NETSUITE')
    )
  });
}