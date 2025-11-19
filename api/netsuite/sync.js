/**
 * Vercel Serverless Function for NetSuite Sync
 * POST /api/netsuite/sync
 * 
 * Uses NetSuite REST API with OAuth 1.0 Token-Based Authentication
 */

import crypto from 'crypto';

/**
 * Generate OAuth 1.0 signature for NetSuite REST API
 */
function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  // Sort parameters alphabetically
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  // Create signature base string
  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  // Generate signature
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  return signature;
}

/**
 * Generate OAuth 1.0 Authorization header
 */
function generateAuthHeader(method, url, consumerKey, consumerSecret, tokenId, tokenSecret, realm) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: tokenId,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0'
  };

  // Generate signature
  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret, tokenSecret);
  oauthParams.oauth_signature = signature;

  // Build Authorization header
  const authParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth realm="${realm}", ${authParams}`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerId, account = 'services' } = req.body;

  if (!customerId) {
    return res.status(400).json({ error: 'customerId required' });
  }

  // Check required environment variables
  const requiredEnvVars = [
    'NETSUITE_ACCOUNT_ID',
    'NETSUITE_CONSUMER_KEY',
    'NETSUITE_CONSUMER_SECRET',
    'NETSUITE_TOKEN_ID',
    'NETSUITE_TOKEN_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    return res.status(500).json({ 
      error: 'Missing environment variables',
      missing: missingVars
    });
  }

  const accountId = process.env.NETSUITE_ACCOUNT_ID.toLowerCase().replace(/_/g, '-');
  const realm = process.env.NETSUITE_ACCOUNT_ID.toUpperCase();

  // Build NetSuite REST API URL
  const baseUrl = `https://${accountId}.suitetalk.api.netsuite.com`;
  const endpoint = `/services/rest/record/v1/customer/${customerId}`;
  const url = `${baseUrl}${endpoint}`;

  try {
    // Generate OAuth Authorization header
    const authHeader = generateAuthHeader(
      'GET',
      url,
      process.env.NETSUITE_CONSUMER_KEY,
      process.env.NETSUITE_CONSUMER_SECRET,
      process.env.NETSUITE_TOKEN_ID,
      process.env.NETSUITE_TOKEN_SECRET,
      realm
    );

    // Make request to NetSuite REST API
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NetSuite API error:', response.status, errorText);
      return res.status(response.status).json({ 
        error: 'NetSuite API request failed',
        status: response.status,
        details: errorText
      });
    }

    const customerData = await response.json();

    // Return the customer data
    res.json(customerData);

  } catch (error) {
    console.error('Error syncing customer:', error.message);
    res.status(500).json({ 
      error: 'Failed to sync customer data',
      details: error.message 
    });
  }
}
