/**
 * Test endpoint to diagnose NetSuite API connection
 * GET /api/netsuite/test?id=3161
 *
 * Improvements:
 * - Uses shared OAuth helpers
 * - Clear environment diagnostics
 * - Returns full request/response metadata for troubleshooting
 */
import { generateAuthHeader } from './_oauth.js';
import { getNetSuiteEnv } from './_suiteql.js';

export default async function handler(req, res) {
  try {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      environment: {
        hasAccountId: !!process.env.NETSUITE_ACCOUNT_ID,
        hasConsumerKey: !!process.env.NETSUITE_CONSUMER_KEY,
        hasConsumerSecret: !!process.env.NETSUITE_CONSUMER_SECRET,
        hasTokenId: !!process.env.NETSUITE_TOKEN_ID,
        hasTokenSecret: !!process.env.NETSUITE_TOKEN_SECRET,
        accountId: process.env.NETSUITE_ACCOUNT_ID || 'MISSING',
        realm: process.env.NETSUITE_ACCOUNT_ID ? process.env.NETSUITE_ACCOUNT_ID.toUpperCase() : 'MISSING'
      }
    };

    // Validate env and build base URL
    let env;
    try {
      env = getNetSuiteEnv();
    } catch (e) {
      diagnostics.error = {
        code: e.code || 'ENV_ERROR',
        message: e.message,
        missing: e.missing || []
      };
      return res.json(diagnostics);
    }

    const { baseUrl, realm, consumerKey, consumerSecret, tokenId, tokenSecret } = env;

    // Target record (customer) – allow override via query ?id=123
    const id = req.query?.id || '3161';
    const endpoint = `/services/rest/record/v1/customer/${encodeURIComponent(id)}`;
    const url = `${baseUrl}${endpoint}`;

    diagnostics.request = { method: 'GET', url, endpoint, baseUrl, id };

    const authHeader = generateAuthHeader('GET', url, consumerKey, consumerSecret, tokenId, tokenSecret, realm);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });

    const responseText = await response.text();
    const headersObj = {};
    try {
      for (const [k, v] of response.headers.entries()) headersObj[k] = v;
    } catch (_) {
      // ignore header iteration issues
    }

    diagnostics.response = {
      status: response.status,
      statusText: response.statusText,
      headers: headersObj,
      body: responseText
    };

    // Try to parse JSON body
    try {
      diagnostics.response.parsedBody = JSON.parse(responseText);
    } catch (_) {
      // not JSON
    }

    return res.json(diagnostics);
  } catch (error) {
    return res.json({
      timestamp: new Date().toISOString(),
      error: { message: error.message, stack: error.stack }
    });
  }
}
