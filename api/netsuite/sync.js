/**
 * Vercel Serverless Function for NetSuite Sync
 * POST /api/netsuite/sync
 *
 * Improvements:
 * - Shared OAuth helpers for correctness and reuse
 * - Safe SuiteQL (escape literals) to avoid injection
 * - Retry/backoff for transient/429 errors
 * - Optional pagination for SuiteQL search
 * - Consistent error handling and diagnostics
 *
 * Body:
 * {
 *   customerId?: number,         // if present, fetch via Record API
 *   entityId?: string,           // search by exact entityid or by companyName pattern
 *   companyName?: string,        // search via LIKE '%companyName%'
 *   pageSize?: number,           // default 50
 *   page?: number                // default 0 (offset = page * pageSize)
 * }
 */
import { generateAuthHeader } from './_oauth.js';
import { getNetSuiteEnv, runSuiteQL, escapeLiteral } from './_suiteql.js';

async function fetchCustomerById(customerId) {
  const { baseUrl, realm, consumerKey, consumerSecret, tokenId, tokenSecret } = getNetSuiteEnv();
  const endpoint = `/services/rest/record/v1/customer/${encodeURIComponent(customerId)}`;
  const url = `${baseUrl}${endpoint}`;

  const authHeader = generateAuthHeader('GET', url, consumerKey, consumerSecret, tokenId, tokenSecret, realm);

  const resp = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  });

  const text = await resp.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    // leave as text
  }

  if (!resp.ok) {
    const err = new Error('NetSuite Record API request failed');
    err.status = resp.status;
    err.details = data || text;
    throw err;
  }
  return data;
}

async function searchCustomers({ entityId, companyName, limit = 50, offset = 0 }) {
  // Safe literals
  const ent = entityId ? escapeLiteral(entityId) : null;
  const comp = companyName ? escapeLiteral(companyName) : null;

  // Compose WHERE clause safely
  const wheres = ["isinactive = 'F'"];
  if (ent) {
    wheres.push(`entityid = '${ent}'`);
  }
  if (comp) {
    // LIKE match on companyname
    wheres.push(`companyname LIKE '%${comp}%'`);
  }
  // If neither provided, prevent full-scan by enforcing a false predicate
  if (!ent && !comp) {
    wheres.push(`1 = 0`);
  }

  const baseQuery = `
    SELECT id, entityid, companyname, email, phone,
           custentity_esc_industry,
           custentity_esc_annual_revenue,
           custentity_esc_no_of_employees,
           custentity_esc_ai_summary,
           lastmodifieddate
    FROM customer
    WHERE ${wheres.join(' AND ')}
    ORDER BY lastmodifieddate DESC
  `.trim();

  const data = await runSuiteQL(baseQuery, { limit, offset, preferTransient: true });
  return data.items || data.rows || [];
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      customerId,
      entityId,
      companyName,
      pageSize = 50,
      page = 0
    } = req.body || {};

    if (!customerId && !entityId && !companyName) {
      return res.status(400).json({ error: 'customerId, entityId, or companyName required' });
    }

    // Route: exact fetch by ID
    if (customerId) {
      const data = await fetchCustomerById(customerId);
      return res.json(data);
    }

    // Route: search via SuiteQL with pagination
    const limit = Math.max(1, Math.min(parseInt(pageSize, 10) || 50, 200));
    const offset = Math.max(0, (parseInt(page, 10) || 0) * limit);

    const items = await searchCustomers({ entityId, companyName, limit, offset });

    // Shape response with paging hints
    return res.json({
      items,
      paging: {
        page,
        pageSize: limit,
        returned: items.length,
        // hasMore heuristic: if we got a full page, caller can request next page
        hasMore: items.length === limit
      }
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('NetSuite sync error:', status, error.details || error.message);
    return res.status(status).json({
      error: 'Failed to sync customer data',
      status,
      details: error.details || error.message
    });
  }
}
