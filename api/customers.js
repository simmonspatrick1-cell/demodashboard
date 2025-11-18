const express = require('express');
const router = express.Router();

const fetchFn = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { buildOAuthHeader } = require('./netsuite-headers');

const buildNetSuiteHeaders = (url, method = 'GET') => {
  const account = process.env.NETSUITE_ACCOUNT_ID;
  const consumerKey = process.env.NETSUITE_CONSUMER_KEY;
  const consumerSecret = process.env.NETSUITE_CONSUMER_SECRET;
  const tokenId = process.env.NETSUITE_TOKEN_ID;
  const tokenSecret = process.env.NETSUITE_TOKEN_SECRET;

  if (account && consumerKey && consumerSecret && tokenId && tokenSecret) {
    return buildOAuthHeader({
      account,
      consumerKey,
      consumerSecret,
      tokenId,
      tokenSecret,
      url,
      method
    });
  }

  if (process.env.NETSUITE_TOKEN) {
    console.warn('Using bearer token fallback for NetSuite auth.');
    return {
      Authorization: `Bearer ${process.env.NETSUITE_TOKEN}`,
      'Content-Type': 'application/json'
    };
  }

  console.warn('NetSuite credentials missing. Requests will likely fail.');
  return { 'Content-Type': 'application/json' };
};

router.get('/search', async (req, res) => {
  const { q } = req.query;
  const searchTerm = q || '';

  // Mock mode for testing without NetSuite
  const shouldMock = process.env.MOCK_NETSUITE_SYNC === 'true' || !process.env.NETSUITE_REST_URL;

  if (shouldMock) {
    // Return mock customer data for development
    const mockCustomers = [
      { id: '1001', name: 'Ecotone Analytics', email: 'contact@ecotone.com' },
      { id: '1002', name: 'Acme Corporation', email: 'info@acme.com' },
      { id: '1003', name: 'TechStart Inc', email: 'hello@techstart.io' },
      { id: '1004', name: 'Global Dynamics', email: 'support@globaldynamics.com' },
      { id: '1005', name: 'Innovation Labs', email: 'team@innovationlabs.net' }
    ].filter(customer =>
      searchTerm === '' ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return res.json(mockCustomers);
  }

  // Real NetSuite integration
  try {
    const url = `${process.env.NETSUITE_REST_URL}&q=${encodeURIComponent(searchTerm)}`;
    const headers = buildNetSuiteHeaders(url, 'GET');

    const response = await fetchFn(url, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      throw new Error(`NetSuite API error: ${response.statusText}`);
    }

    const customers = await response.json();
    return res.json(customers);
  } catch (error) {
    console.error('Customer search error:', error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
