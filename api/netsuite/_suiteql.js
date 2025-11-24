/**
 * NetSuite SuiteQL helpers (Token-Based Auth, OAuth 1.0)
 * ESM module
 */
import { generateAuthHeader } from './_oauth.js';

/**
 * Escape a literal for inclusion in SuiteQL single-quoted strings.
 * - Doubles single quotes to prevent injection
 * - Converts non-strings to string
 */
export function escapeLiteral(val) {
  if (val === null || val === undefined) return '';
  return String(val).replace(/'/g, "''");
}

/**
 * Build base URL and realm from environment.
 * Throws with a clear error if required vars are missing.
 */
export function getNetSuiteEnv() {
  const accountIdRaw = process.env.NETSUITE_ACCOUNT_ID;
  const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
  const tokenId = process.env.NETSUITE_TOKEN_ID;
  const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

  const missing = [];
  if (!accountIdRaw) missing.push('NETSUITE_ACCOUNT_ID');
  if (!consumerKey) missing.push('NETSUITE_CONSUMER_KEY');
  if (!consumerSecret) missing.push('NETSUITE_CONSUMER_SECRET');
  if (!tokenId) missing.push('NETSUITE_TOKEN_ID');
  if (!tokenSecret) missing.push('NETSUITE_TOKEN_SECRET');

  if (missing.length) {
    const err = new Error(`Missing environment variables: ${missing.join(', ')}`);
    err.code = 'ENV_MISSING';
    err.missing = missing;
    throw err;
  }

  const accountId = accountIdRaw.toLowerCase().replace(/_/g, '-');
  const realm = accountIdRaw.toUpperCase();
  const baseUrl = `https://${accountId}.suitetalk.api.netsuite.com`;

  return { baseUrl, realm, consumerKey, consumerSecret, tokenId, tokenSecret };
}

/**
 * Internal: do a fetch with OAuth header and retries/backoff.
 */
async function fetchWithRetry({ method, url, realm, consumerKey, consumerSecret, tokenId, tokenSecret, body, headers = {}, retries = 3, backoffBaseMs = 500 }) {
  const authHeader = generateAuthHeader(method, url, consumerKey, consumerSecret, tokenId, tokenSecret, realm);

  const finalHeaders = {
    'Authorization': authHeader,
    'Content-Type': 'application/json',
    ...headers
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const resp = await fetch(url, {
      method,
      headers: finalHeaders,
      body
    });

    if (resp.status === 429 || (resp.status >= 500 && resp.status < 600)) {
      if (attempt < retries) {
        const delay = backoffBaseMs * Math.pow(2, attempt);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }

    return resp;
  }

  // Should not reach here
  throw new Error('fetchWithRetry exhausted retries');
}

/**
 * Run a SuiteQL query with optional pagination and retry/backoff.
 * Returns parsed JSON: { count?, hasMore?, items? } depending on NetSuite response shape.
 */
export async function runSuiteQL(query, { limit = 100, offset = 0, preferTransient = true, retries = 3, backoffBaseMs = 500 } = {}) {
  const { baseUrl, realm, consumerKey, consumerSecret, tokenId, tokenSecret } = getNetSuiteEnv();

  // Append pagination if not already present
  let q = String(query).trim();
  const hasLimitOrFetch = /\b(LIMIT|FETCH)\b/i.test(q) || /\bOFFSET\b/i.test(q);
  if (!hasLimitOrFetch && limit != null) {
    // SuiteQL supports OFFSET .. FETCH NEXT .. ROWS ONLY
    q = `${q} OFFSET ${parseInt(offset || 0, 10)} FETCH NEXT ${parseInt(limit, 10)} ROWS ONLY`;
  }

  const url = `${baseUrl}/services/rest/query/v1/suiteql`;
  const body = JSON.stringify({ q });

  const headers = {};
  if (preferTransient) headers['Prefer'] = 'transient';

  const resp = await fetchWithRetry({
    method: 'POST',
    url,
    realm,
    consumerKey,
    consumerSecret,
    tokenId,
    tokenSecret,
    body,
    headers,
    retries,
    backoffBaseMs
  });

  const text = await resp.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (e) {
    const err = new Error(`SuiteQL response not JSON (HTTP ${resp.status}): ${text.slice(0, 500)}`);
    err.status = resp.status;
    throw err;
  }

  if (!resp.ok) {
    const err = new Error(`SuiteQL failed (HTTP ${resp.status})`);
    err.status = resp.status;
    err.details = data || text;
    throw err;
  }

  return data;
}

/**
 * Convenience: paged fetch until no more rows.
 * Calls onPage for each page of items; accumulates if accumulate=true.
 */
export async function runSuiteQLPaged(baseQuery, { pageSize = 100, maxPages = 50, startOffset = 0, onPage = null, accumulate = false } = {}) {
  let offset = startOffset;
  let page = 0;
  const all = [];

  // Stop after maxPages to avoid runaway
  while (page < maxPages) {
    const data = await runSuiteQL(baseQuery, { limit: pageSize, offset });
    const items = data.items || data.rows || [];
    if (onPage && typeof onPage === 'function') {
      await onPage(items, { page, offset, pageSize });
    }
    if (accumulate) {
      all.push(...items);
    }
    if (!items.length) break;
    // If fewer than pageSize returned, end as well
    if (items.length < pageSize) break;
    offset += pageSize;
    page += 1;
  }

  return accumulate ? all : undefined;
}
