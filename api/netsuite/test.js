/**
 * Test endpoint to diagnose NetSuite API connection
 * GET /api/netsuite/test
 */

import crypto from 'crypto';

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBaseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams)
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(signatureBaseString)
    .digest('base64');

  return signature;
}

function generateAuthHeader(method, url, consumerKey, consumerSecret, tokenId, tokenSecret, realm) {
  const oauthParams = {
    oauth_consumer_key: consumerKey,
    oauth_token: tokenId,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_version: '1.0'
  };

  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret, tokenSecret);
  oauthParams.oauth_signature = signature;

  const authParams = Object.keys(oauthParams)
    .sort()
    .map(key => `${key}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth realm="${realm}", ${authParams}`;
}

export default async function handler(req, res) {
  const accountId = process.env.NETSUITE_ACCOUNT_ID?.toLowerCase().replace(/_/g, '-');
  const realm = process.env.NETSUITE_ACCOUNT_ID?.toUpperCase();

  const diagnostics = {
    timestamp: new Date().toISOString(),
    environment: {
      hasAccountId: !!process.env.NETSUITE_ACCOUNT_ID,
      hasConsumerKey: !!process.env.NETSUITE_CONSUMER_KEY,
      hasConsumerSecret: !!process.env.NETSUITE_CONSUMER_SECRET,
      hasTokenId: !!process.env.NETSUITE_TOKEN_ID,
      hasTokenSecret: !!process.env.NETSUITE_TOKEN_SECRET,
      accountId: accountId || 'MISSING',
      realm: realm || 'MISSING'
    }
  };

  if (!accountId) {
    return res.json({
      ...diagnostics,
      error: 'NETSUITE_ACCOUNT_ID not configured'
    });
  }

  const baseUrl = `https://${accountId}.suitetalk.api.netsuite.com`;
  const endpoint = `/services/rest/record/v1/customer/3161`;
  const url = `${baseUrl}${endpoint}`;

  diagnostics.request = {
    method: 'GET',
    url: url,
    baseUrl: baseUrl,
    endpoint: endpoint
  };

  try {
    const authHeader = generateAuthHeader(
      'GET',
      url,
      process.env.NETSUITE_CONSUMER_KEY,
      process.env.NETSUITE_CONSUMER_SECRET,
      process.env.NETSUITE_TOKEN_ID,
      process.env.NETSUITE_TOKEN_SECRET,
      realm
    );

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const responseText = await response.text();
    
    diagnostics.response = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    };

    if (!response.ok) {
      try {
        diagnostics.response.parsedBody = JSON.parse(responseText);
      } catch (e) {
        // Body is not JSON
      }
    }

    res.json(diagnostics);

  } catch (error) {
    diagnostics.error = {
      message: error.message,
      stack: error.stack
    };
    res.json(diagnostics);
  }
}

