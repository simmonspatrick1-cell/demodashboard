/**
 * Projects API Router - FIXED VERSION
 *
 * Fixes applied:
 * - Issue 2: JSON response validation
 * - Issue 5: Retry logic with exponential backoff
 * - Issue 10: User-friendly error messages
 */

const express = require('express');
const router = express.Router();

const fetchFn = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { buildOAuthHeader } = require('./netsuite-headers');

const buildNetSuiteHeaders = (url, method = 'POST') => {
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

const normalizeFocus = (focusAreas = []) =>
  Array.isArray(focusAreas)
    ? focusAreas
    : typeof focusAreas === 'string'
      ? focusAreas.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

const buildTasksFromPrompts = (prompts = [], focusAreas = []) => {
  const defaultOwners = ['Engagement Lead', 'Solution Architect', 'Project Manager', 'Consultant'];
  return prompts.slice(0, 5).map((prompt, idx, arr) => ({
    name: `Track ${idx + 1}: ${prompt.slice(0, 60)}${prompt.length > 60 ? '…' : ''}`,
    owner: defaultOwners[idx] || 'Project Team',
    status: idx === 0 ? 'Scheduled' : idx === arr.length - 1 ? 'Ready' : 'Pending',
    focus: focusAreas[idx] || focusAreas[idx % focusAreas.length] || 'Resource Planning'
  }));
};

/**
 * FIX 10: Translate technical NetSuite errors to user-friendly messages
 */
function translateNetSuiteError(error) {
  const errorString = String(error);

  const errorMap = {
    'INVALID_LOGIN_CREDENTIALS': 'Authentication failed. Please check your NetSuite credentials in the configuration.',
    'INVALID_RCRD_REF': 'The selected customer is invalid. Please choose a different customer.',
    'SSS_MISSING_REQD_ARGUMENT': 'Required information is missing. Please fill in all required fields.',
    'USER_ERROR': 'You do not have permission to perform this action in NetSuite.',
    'UNEXPECTED_ERROR': 'An unexpected error occurred in NetSuite. Please try again.',
    'ECONNREFUSED': 'Cannot connect to NetSuite. Please check your network connection.',
    'ETIMEDOUT': 'NetSuite request timed out. Please try again.',
    'non-JSON response': 'NetSuite returned an unexpected response. This may indicate an authentication issue.'
  };

  for (const [nsError, friendlyMessage] of Object.entries(errorMap)) {
    if (errorString.includes(nsError)) {
      return friendlyMessage;
    }
  }

  return 'Failed to sync with NetSuite. Please try again or contact support.';
}

/**
 * FIX 2 & 5: Sync with NetSuite with retry logic and JSON validation
 */
async function syncWithNetSuite(payload, maxRetries = 3) {
  if (!process.env.NETSUITE_REST_URL) {
    return { success: false, error: 'NETSUITE_REST_URL not configured' };
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const headers = buildNetSuiteHeaders(process.env.NETSUITE_REST_URL, 'POST');

      const fetchOptions = {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      };

      console.log(`NetSuite sync attempt ${attempt}/${maxRetries}...`);

      const response = await fetchFn(process.env.NETSUITE_REST_URL, fetchOptions);

      // FIX 2: Validate content type before parsing JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        const preview = text.substring(0, 200);
        console.error('NetSuite returned non-JSON response:', preview);
        throw new Error(
          `NetSuite returned non-JSON response. This usually indicates an authentication issue. ` +
          `Response preview: ${preview}`
        );
      }

      const data = await response.json();

      // Check for NetSuite error responses
      if (!response.ok || data?.success === false) {
        const errorMsg = data?.error || data?.message || response.statusText || 'Unknown error';
        throw new Error(errorMsg);
      }

      console.log('NetSuite sync successful');
      return { success: true, data: data.data || data };

    } catch (error) {
      console.error(`NetSuite sync attempt ${attempt}/${maxRetries} failed:`, error.message);

      // Don't retry on authentication errors (they won't resolve with retry)
      const errorString = String(error.message);
      const nonRetryableErrors = [
        'INVALID_LOGIN',
        'AUTH',
        'INVALID_RCRD_REF',
        'SSS_MISSING_REQD_ARGUMENT',
        'non-JSON response'
      ];

      const shouldNotRetry = nonRetryableErrors.some(err => errorString.includes(err));

      if (shouldNotRetry) {
        console.log('Non-retryable error detected, failing immediately');
        return { success: false, error: error.message };
      }

      // FIX 5: Retry with exponential backoff for network/timeout errors
      if (attempt < maxRetries) {
        const delayMs = 1000 * Math.pow(2, attempt - 1); // Exponential: 1s, 2s, 4s
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      return { success: false, error: error.message };
    }
  }

  return { success: false, error: 'Max retries exceeded' };
}

router.post('/sync', async (req, res) => {
  const { customerId, account, prompts, notes, website, prospectName, industry, focusAreas = [] } = req.body || {};

  // Validate required fields
  if (!customerId || !account || !prospectName || !Array.isArray(prompts) || prompts.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'customerId, account, prospectName, and at least one prompt are required.'
    });
  }

  const normalizedFocusAreas = normalizeFocus(focusAreas);
  const timestamp = new Date();

  // Generate external reference (not NetSuite internal ID)
  const externalRef = `PRJ-${String(account).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)}-${timestamp
    .getTime()
    .toString()
    .slice(-4)}`;

  const offlineRecord = {
    projectId: externalRef,
    projectName: `${prospectName} - Demo Build`,
    syncedAt: timestamp.toISOString(),
    prompts,
    notes: notes || '',
    website,
    source: 'Scenario Builder',
    tasks: buildTasksFromPrompts(prompts, normalizedFocusAreas)
  };

  const shouldMock = process.env.MOCK_NETSUITE_SYNC === 'true' || !process.env.NETSUITE_REST_URL;

  if (shouldMock) {
    console.log('Mock mode - returning simulated response');
    return res.json({
      success: true,
      data: { ...offlineRecord, source: 'Mock NetSuite API' },
      meta: { mocked: true }
    });
  }

  try {
    const payload = {
      customerId: Number(customerId), // Ensure it's a number
      account,
      externalRef, // Use as external reference, not internal ID
      projectName: offlineRecord.projectName,
      notes,
      website,
      prompts,
      focusAreas: normalizedFocusAreas,
      industry,
      tasks: offlineRecord.tasks
    };

    console.log('Syncing to NetSuite:', {
      customerId: payload.customerId,
      projectName: payload.projectName,
      taskCount: payload.tasks.length
    });

    const netSuiteResult = await syncWithNetSuite(payload);

    if (!netSuiteResult.success) {
      throw new Error(netSuiteResult.error || 'NetSuite sync failed');
    }

    const responseRecord = {
      ...offlineRecord,
      ...netSuiteResult.data,
      tasks:
        Array.isArray(netSuiteResult.data?.tasks) && netSuiteResult.data.tasks.length > 0
          ? netSuiteResult.data.tasks
          : offlineRecord.tasks
    };

    console.log('Project sync completed successfully:', responseRecord.projectId);

    return res.json({
      success: true,
      data: responseRecord,
      meta: { mocked: false }
    });

  } catch (error) {
    console.error('NetSuite project sync failed:', error);

    // FIX 10: Return user-friendly error message
    const userFriendlyError = translateNetSuiteError(error.message);

    return res.status(502).json({
      success: false,
      error: userFriendlyError,
      technicalError: error.message, // Keep for debugging
      data: offlineRecord // Return the data that would have been synced
    });
  }
});

module.exports = router;
