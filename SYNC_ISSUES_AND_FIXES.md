# NetSuite Project Sync - Issues & Fixes

## Critical Issues Found

### 🔴 Issue 1: Customer ID Type Mismatch

**Location**: `api/projects.js:119-130`, `netsuite-restlet.js:142-144`

**Problem**:
- Frontend/API sends `customerId` as **number** (e.g., `1001`)
- NetSuite expects **string** for customer internal ID
- This will cause: `INVALID_RCRD_REF: Invalid customer reference key`

**Current Code**:
```javascript
// api/projects.js
const payload = {
  customerId,  // Could be number or string
  // ...
};

// netsuite-restlet.js
projectRecord.setValue({
  fieldId: 'parent',
  value: context.customerId  // Might be wrong type
});
```

**Fix**:
Ensure customerId is always converted to number in NetSuite:
```javascript
// In netsuite-restlet.js
projectRecord.setValue({
  fieldId: 'parent',
  value: parseInt(context.customerId, 10)  // ✓ Convert to number
});
```

---

### 🔴 Issue 2: Missing Error Response Handling

**Location**: `api/projects.js:69-77`

**Problem**:
- Response parsing assumes JSON, but NetSuite might return HTML on auth errors
- Will cause: `Unexpected token < in JSON at position 0`

**Current Code**:
```javascript
const response = await fetchFn(process.env.NETSUITE_REST_URL, fetchOptions);
const data = await response.json();  // ❌ Assumes JSON
```

**Fix**:
```javascript
const response = await fetchFn(process.env.NETSUITE_REST_URL, fetchOptions);

// Check content type before parsing
const contentType = response.headers.get('content-type');
if (!contentType || !contentType.includes('application/json')) {
  const text = await response.text();
  throw new Error(`NetSuite returned non-JSON response: ${text.substring(0, 200)}`);
}

const data = await response.json();
```

---

### 🟡 Issue 3: Task Status Mapping Not Configured

**Location**: `netsuite-restlet.js:201-209`

**Problem**:
- Task status mapping is commented out
- NetSuite will use default status instead of intended status
- Tasks will all be created with same status

**Current Code**:
```javascript
// Status mapping is commented out
/*
var statusMap = {
    'Pending': 'NOTSTART',
    'Scheduled': 'PROGRESS',
    'Ready': 'PROGRESS',
    'Complete': 'COMPLETE'
};
*/
```

**Fix**:
Uncomment and configure based on your NetSuite setup:
```javascript
// Check your NetSuite task statuses first:
// Setup > Customization > Lists, Records, & Fields > Task Status

var statusMap = {
    'Pending': 'NOTSTART',
    'Scheduled': 'PROGRESS',
    'Ready': 'PROGRESS',
    'Complete': 'COMPLETE'
};

if (taskData.status && statusMap[taskData.status]) {
    taskRecord.setValue({
        fieldId: 'status',
        value: statusMap[taskData.status]
    });
}
```

---

### 🟡 Issue 4: Project ID String Might Be Invalid

**Location**: `api/projects.js:92-95`

**Problem**:
- Generated projectId is just an identifier string, not NetSuite internal ID
- NetSuite RESTlet tries to use it but always creates new project anyway
- Confusing logic that doesn't do what it claims

**Current Code**:
```javascript
const projectId = `PRJ-${String(account).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6)}-${timestamp
  .getTime()
  .toString()
  .slice(-4)}`;
```

**Fix**:
Either:
1. Remove projectId generation (not needed for new projects)
2. Use it as a custom field value instead
3. Or clarify it's just an external reference ID

**Recommended**:
```javascript
// Use as external reference, not internal ID
const externalProjectRef = `PRJ-${String(account)...}`;

const payload = {
  customerId,
  account,
  externalRef: externalProjectRef,  // ✓ Clarify purpose
  projectName: offlineRecord.projectName,
  // ...
};
```

---

### 🟡 Issue 5: No Retry Logic for Network Failures

**Location**: `api/projects.js:55-78`

**Problem**:
- Single attempt to sync with NetSuite
- Network hiccups will fail the entire sync
- No automatic retry mechanism

**Fix**:
```javascript
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

      const response = await fetchFn(process.env.NETSUITE_REST_URL, fetchOptions);

      // Check content type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        throw new Error(`NetSuite returned non-JSON: ${text.substring(0, 200)}`);
      }

      const data = await response.json();

      if (!response.ok || data?.success === false) {
        throw new Error(data?.error || response.statusText);
      }

      return { success: true, data: data.data || data };

    } catch (error) {
      console.error(`NetSuite sync attempt ${attempt}/${maxRetries} failed:`, error.message);

      // Don't retry on auth errors (they won't resolve with retry)
      if (error.message.includes('INVALID_LOGIN') || error.message.includes('AUTH')) {
        return { success: false, error: error.message };
      }

      // Retry on network/timeout errors
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
        continue;
      }

      return { success: false, error: error.message };
    }
  }
}
```

---

### 🟡 Issue 6: Custom Fields Are Commented Out

**Location**: `netsuite-restlet.js:152-175`

**Problem**:
- Important fields (industry, website, notes) are not saved
- Data loss - information sent but not stored
- User expectations not met

**Fix**:
1. Check which custom fields exist in your NetSuite account
2. Uncomment and update field IDs
3. Or use standard fields if available

**How to find field IDs**:
```
NetSuite → Setup → Customization → Lists, Records, & Fields → Entity Fields
Look for: custentity_industry, custentity_website, etc.
```

**Updated Code**:
```javascript
// Standard NetSuite fields (should work)
if (context.website) {
    try {
        projectRecord.setValue({
            fieldId: 'url',
            value: context.website
        });
    } catch (e) {
        log.debug('URL field not available', e.message);
    }
}

if (context.notes) {
    try {
        projectRecord.setValue({
            fieldId: 'comments',
            value: context.notes
        });
    } catch (e) {
        log.debug('Comments field not available', e.message);
    }
}

// Custom fields (verify these exist first!)
if (context.industry) {
    try {
        projectRecord.setValue({
            fieldId: 'custentity_industry',  // ⚠️ Verify this field exists!
            value: context.industry
        });
    } catch (e) {
        log.debug('Industry field not available', e.message);
    }
}
```

---

### 🟡 Issue 7: No Validation of Array Data

**Location**: `api/projects.js:83-88`

**Problem**:
- Validates `prompts` is an array and has items
- But doesn't validate `tasks` array structure
- Malformed task data could break NetSuite record creation

**Fix**:
```javascript
// Validate tasks structure if provided
if (context.tasks && Array.isArray(context.tasks)) {
    context.tasks.forEach(function(taskData, index) {
        // Validate task data before creating
        if (!taskData || typeof taskData !== 'object') {
            log.error('Invalid task data', 'Task ' + index + ' is not an object');
            return; // Skip this task
        }

        if (!taskData.name || typeof taskData.name !== 'string') {
            log.error('Invalid task name', 'Task ' + index + ' has invalid name');
            return; // Skip this task
        }

        // ... rest of task creation
    });
}
```

---

### 🟠 Issue 8: OAuth Signature Timing Issues

**Location**: `api/netsuite-headers.js:12-13`

**Problem**:
- Timestamp is generated once
- If request takes time to build, timestamp might be stale
- NetSuite rejects requests with timestamps >5 minutes old

**Fix**:
```javascript
// Generate timestamp right before creating signature
function buildOAuthHeader({
  account,
  consumerKey,
  consumerSecret,
  tokenId,
  tokenSecret,
  url,
  method = 'POST'
}) {
  // Move timestamp generation here, closer to when it's used
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000).toString();  // ✓ Current time

  // ... rest of function
}
```

---

### 🟠 Issue 9: No Concurrent Request Handling

**Location**: `api/projects.js:80-151`

**Problem**:
- If multiple users sync projects simultaneously
- Race conditions could occur
- No request queuing or throttling

**Recommendation**:
- NetSuite has concurrency limits (usually 10 concurrent requests)
- Consider adding request queue for high-traffic scenarios

---

### 🟢 Issue 10: Error Messages Not User-Friendly

**Location**: Multiple locations

**Problem**:
- Technical error messages shown to users
- Example: "INVALID_RCRD_REF" means nothing to end users
- Should translate to friendly messages

**Fix**:
```javascript
function translateNetSuiteError(error) {
  const errorMap = {
    'INVALID_LOGIN_CREDENTIALS': 'Authentication failed. Please check your NetSuite credentials.',
    'INVALID_RCRD_REF': 'Invalid customer reference. Please select a valid customer.',
    'SSS_MISSING_REQD_ARGUMENT': 'Required information is missing. Please fill in all required fields.',
    'USER_ERROR': 'You do not have permission to perform this action.',
    'UNEXPECTED_ERROR': 'An unexpected error occurred. Please try again.',
  };

  for (const [nsError, friendlyMessage] of Object.entries(errorMap)) {
    if (error.includes(nsError)) {
      return friendlyMessage;
    }
  }

  return 'Failed to sync with NetSuite. Please try again or contact support.';
}

// Usage in error handler:
catch (error) {
  console.error('NetSuite project sync failed:', error);
  const userMessage = translateNetSuiteError(error.message);
  return res.status(502).json({
    success: false,
    error: userMessage,
    technicalError: error.message  // For debugging
  });
}
```

---

## Priority Fixes

### Must Fix Before Production:
1. ✅ Issue 1 - Customer ID type conversion
2. ✅ Issue 2 - JSON response validation
3. ✅ Issue 6 - Enable custom fields (verify field IDs first)

### Should Fix:
4. ✅ Issue 3 - Task status mapping
5. ✅ Issue 5 - Retry logic
6. ✅ Issue 7 - Array validation

### Nice to Have:
7. ✅ Issue 4 - Clarify project ID usage
8. ✅ Issue 10 - User-friendly errors
9. ⚠️ Issue 8 - OAuth timing (already pretty good)
10. ⚠️ Issue 9 - Concurrency (only if high traffic)

---

## Testing Checklist

After applying fixes, test these scenarios:

- [ ] Create project with valid customer ID
- [ ] Create project with invalid customer ID (should fail gracefully)
- [ ] Create project with missing required fields
- [ ] Create project with network interruption (test retry)
- [ ] Create project with all custom fields populated
- [ ] Create project with tasks in different statuses
- [ ] Create multiple projects in quick succession
- [ ] Check NetSuite execution logs for errors
- [ ] Verify all fields are saved in NetSuite
- [ ] Verify tasks are linked to project correctly

---

## Recommended Next Steps

1. **Apply Critical Fixes** (Issues 1, 2, 6)
2. **Test in NetSuite Sandbox** first
3. **Check Custom Field IDs** in your NetSuite account
4. **Apply Remaining Fixes** based on priority
5. **Monitor NetSuite Execution Logs** after deployment
6. **Set up Error Tracking** (e.g., Sentry, LogRocket)

