/**
 * NetSuite Customers Delta Sync
 * GET /api/netsuite/customers
 *
 * Query params:
 *   - updatedSince: ISO datetime string; returns customers with lastmodifieddate >= updatedSince
 *   - pageSize: number (default 100, max 200)
 *   - page: number (default 0)
 *   - q: optional free text applied to companyname LIKE '%q%'
 *
 * Response:
 * {
 *   items: [...],
 *   paging: { page, pageSize, returned, hasMore }
 * }
 */
import { runSuiteQL, escapeLiteral } from './_suiteql.js';

function parsePageNum(v, def = 0) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : def;
}
function parsePageSize(v, def = 100) {
  const n = parseInt(v, 10);
  const size = Number.isFinite(n) && n > 0 ? n : def;
  return Math.min(Math.max(size, 1), 200);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { updatedSince, pageSize, page, q } = req.query || {};
    const limit = parsePageSize(pageSize);
    const pageNum = parsePageNum(page);
    const offset = pageNum * limit;

    const where = ["isinactive = 'F'"];
    if (updatedSince) {
      // NetSuite SuiteQL expects timestamp; accept ISO string here
      // For safety, we escape plus wrap in TIMESTAMP literal-friendly format
      const ts = escapeLiteral(updatedSince);
      // NetSuite supports e.g. TO_TIMESTAMP('2024-01-01T00:00:00Z')
      where.push(`lastmodifieddate >= TO_TIMESTAMP('${ts}')`);
    }
    if (q) {
      const text = escapeLiteral(q);
      where.push(`companyname LIKE '%${text}%'`);
    }

    // Avoid full scans if no filters and caller requests page 0; still allowed but explicit
    const baseQuery = `
      SELECT id, entityid, companyname, email, phone,
             custentity_esc_industry,
             custentity_esc_annual_revenue,
             custentity_esc_no_of_employees,
             custentity_esc_ai_summary,
             lastmodifieddate
      FROM customer
      WHERE ${where.join(' AND ')}
      ORDER BY lastmodifieddate DESC
    `.trim();

    const data = await runSuiteQL(baseQuery, { limit, offset, preferTransient: true });
    const items = data.items || data.rows || [];

    return res.json({
      items,
      paging: {
        page: pageNum,
        pageSize: limit,
        returned: items.length,
        hasMore: items.length === limit
      }
    });
  } catch (error) {
    const status = error.status || 500;
    console.error('NetSuite customers delta error:', status, error.details || error.message);
    return res.status(status).json({
      error: 'Failed to fetch customers',
      status,
      details: error.details || error.message
    });
  }
}
