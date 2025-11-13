# Demo Dashboard NetSuite Integration Guide

## Overview
Your dashboard is now ready to pull **real data** from your NetSuite account. This guide shows you how to wire it up to make live API calls to sync customer data, projects, and resource allocation.

---

## Architecture

```
React Dashboard (DemoDashboard.jsx)
    ↓
API Endpoint (your backend)
    ↓
MCP Tools (ns_getRecord, ns_runCustomSuiteQL)
    ↓
NetSuite API
    ↓
Your Customer Data
```

---

## Step 1: Backend API Setup

You'll need a simple backend endpoint that can call the MCP tools. Here's how:

### Option A: Use Claude's MCP Connector (Recommended)

If you have Claude API access, you can create a backend that uses the MCP tools directly:

```javascript
// backend/api/netsuite.js
import Anthropic from "@anthropic-sdk/sdk";

const client = new Anthropic();

export async function syncCustomerData(customerId, account = "services") {
  const response = await client.messages.create({
    model: "claude-opus-4-1",
    max_tokens: 1024,
    tools: [
      {
        type: "use_mcp_tool",
        mcp_server: "netsuite-stairway",
        tool_name: "ns_getRecord",
        tool_input: {
          recordType: "customer",
          recordId: String(customerId),
          fields: "id,entityid,companyname,email,phone,custentity13,custentity16,custentity15"
        }
      }
    ]
  });

  // Extract the customer data from Claude's response
  return response.content[0].text;
}
```

### Option B: Direct REST API to NetSuite

If your NetSuite instance has REST API enabled, you can call it directly:

```javascript
// backend/api/netsuite-rest.js
const NETSUITE_ACCOUNT = "td3049589";
const CONSUMER_KEY = process.env.NETSUITE_CONSUMER_KEY;
const CONSUMER_SECRET = process.env.NETSUITE_CONSUMER_SECRET;

async function getCustomer(customerId) {
  const url = `https://${NETSUITE_ACCOUNT}.suiteapis.com/services/rest/record/v1/customer/${customerId}`;
  
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${await getAccessToken()}`,
      "Content-Type": "application/json"
    }
  });

  return response.json();
}
```

---

## Step 2: Connect Dashboard to Backend

### Update the sync function in DemoDashboard.jsx:

```javascript
const syncNetsuiteFieFds = async () => {
  if (!selectedCustData) return;
  setSyncLoading(true);
  setActionStatus('Syncing from NetSuite...');
  
  try {
    // Call your backend API
    const response = await fetch('/api/netsuite/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: selectedCustData.nsId,
        account: selectedAccount
      })
    });

    if (!response.ok) throw new Error('Sync failed');
    
    const data = await response.json();
    
    // Store the synced data
    setCustomFieldsData(prev => ({
      ...prev,
      [selectedCustData.id]: {
        'AI Generated Summary': data.custentity13 || 'Not populated',
        'Industry Type': data.custentity16 || 'Not specified',
        'Annual Revenue': data.custentity_esc_annual_revenue || 'Not specified',
        'Employee Count': data.custentity_esc_no_of_employees || 'Not specified',
        'Opportunity Summary': data.custentity15 || 'Not specified',
        'Email': data.email || 'Not available',
        'Phone': data.phone || 'Not available'
      }
    }));

    setNsData(prev => ({ ...prev, [selectedCustData.id]: data }));
    setActionStatus('✓ Synced successfully');
  } catch (error) {
    console.error('Sync error:', error);
    setActionStatus('⚠ Sync failed');
  } finally {
    setSyncLoading(false);
    setLastSyncTime(new Date());
    setTimeout(() => setActionStatus(null), 3000);
  }
};
```

---

## Step 3: NetSuite Custom Fields Mapping

Your customer records have these custom fields that the dashboard syncs:

| Custom Field | Field ID | Description | Dashboard Use |
|---|---|---|---|
| AI Generated Summary | `custentity13` | Your notes about the prospect | Overview section |
| Industry Type | `custentity16` | Categorizes by vertical | Industry display |
| Opp Summary List | `custentity15` | Key opportunities | Demo focus areas |
| ESC Industry | `custentity_esc_industry` | Industry classification | Filter/display |
| ESC Annual Revenue | `custentity_esc_annual_revenue` | Company revenue range | Budget planning |
| ESC No. of Employees | `custentity_esc_no_of_employees` | Company size | Company size display |

### To Add More Fields:

1. Go to Customization → Lists, Records, & Fields → Customer → Fields
2. Note the ID (e.g., custentity_xyz)
3. Add to the fields list in `syncNetsuiteFieFds()` function
4. Add to the display panel in `CustomFieldsPanel()` component

---

## Step 4: Quick Action Buttons - Full Implementation

The quick action buttons can be enhanced to actually create data:

### Create Demo Project Button

```javascript
const createDemoProject = async () => {
  setActionStatus('Creating project...');
  
  const projectData = {
    entityid: `PRJ-${selectedCustData.entityid.substring(0, 3)}-DEMO-${Date.now()}`,
    companyname: `Demo Project - ${selectedCustData.name}`,
    customer: selectedCustData.nsId,
    startdate: new Date().toISOString().split('T')[0],
    enddate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
    status: 'OPEN'
  };

  try {
    const response = await fetch('/api/netsuite/create-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData)
    });

    if (response.ok) {
      const result = await response.json();
      setActionStatus(`✓ Project created: ${result.id}`);
      // Refresh data
      syncNetsuiteFieFds();
    }
  } catch (error) {
    setActionStatus('⚠ Failed to create project');
  }
  setTimeout(() => setActionStatus(null), 3000);
};
```

### Sample Time Entries Button

```javascript
const createSampleTimeEntries = async () => {
  setActionStatus('Adding time entries...');
  
  try {
    const response = await fetch('/api/netsuite/create-time-entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: selectedCustData.nsId,
        count: 10,
        startDate: new Date().toISOString().split('T')[0]
      })
    });

    if (response.ok) {
      const result = await response.json();
      setActionStatus(`✓ Added ${result.created} time entries`);
    }
  } catch (error) {
    setActionStatus('⚠ Failed to add entries');
  }
  setTimeout(() => setActionStatus(null), 3000);
};
```

---

## Step 5: Environment Setup

Create a `.env` file in your project root:

```env
# NetSuite Configuration
NETSUITE_ACCOUNT_ID=td3049589
NETSUITE_CONSUMER_KEY=your_consumer_key_here
NETSUITE_CONSUMER_SECRET=your_consumer_secret_here
NETSUITE_TOKEN_ID=your_token_id_here
NETSUITE_TOKEN_SECRET=your_token_secret_here

# API Configuration
API_BASE_URL=http://localhost:3000/api
```

---

## Step 6: Testing the Integration

### Test 1: Manual Sync

1. Select a customer (e.g., AdvisorHR)
2. Click "Sync NetSuite Data" button
3. Watch the loading spinner
4. Confirm custom fields populate

### Test 2: API Connectivity

```javascript
// In browser console
fetch('/api/netsuite/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ customerId: 3161, account: 'services' })
})
.then(r => r.json())
.then(console.log)
```

### Test 3: Quick Actions

1. Select AdvisorHR
2. Click "Create Demo Project"
3. Check NetSuite to verify project was created

---

## Step 7: Performance Optimization

### Add Caching

```javascript
const SYNC_CACHE = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedCustomerData = async (customerId) => {
  const cached = SYNC_CACHE[customerId];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await fetchFromNetSuite(customerId);
  SYNC_CACHE[customerId] = { data, timestamp: Date.now() };
  return data;
};
```

### Bulk Sync on Dashboard Load

```javascript
useEffect(() => {
  // Sync all key prospects when dashboard loads
  const bulkSync = async () => {
    for (const prospect of keyProspects.slice(0, 3)) {
      const data = await getCachedCustomerData(prospect.nsId);
      setCustomFieldsData(prev => ({
        ...prev,
        [prospect.id]: data
      }));
    }
  };
  
  bulkSync();
}, []);
```

---

## Step 8: Error Handling & Retry Logic

```javascript
const syncWithRetry = async (customerId, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/api/netsuite/sync', {
        method: 'POST',
        body: JSON.stringify({ customerId })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      // Exponential backoff
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
};
```

---

## Troubleshooting

### "Sync failed" Error

**Cause**: Backend API not responding
**Solution**: 
- Check if backend server is running
- Verify `/api/netsuite/sync` endpoint exists
- Check browser console for exact error

### Custom Fields Show "Not populated"

**Cause**: Fields haven't been filled in NetSuite
**Solution**:
- Go to each customer in NetSuite
- Fill in the custom fields
- Click "Sync NetSuite Data" again

### CORS Errors

**Cause**: API calls blocked by browser security
**Solution**: Configure CORS in your backend
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### Slow Performance

**Cause**: Too many API calls
**Solution**:
- Implement caching (see Step 7)
- Sync on demand, not on every action
- Use pagination for customer lists

---

## Next Steps

1. **Set up your backend** (use netsuite-service.js as reference)
2. **Configure NetSuite credentials** in environment
3. **Test one quick action** (e.g., Sync NetSuite Data)
4. **Enable more features** (Create Project, Time Entries, etc.)
5. **Monitor performance** and optimize as needed

---

## Support

For questions about:
- **Dashboard UI**: Check DemoDashboard.jsx comments
- **NetSuite API**: See netsuite-service.js
- **Integration**: Reference this guide
- **Errors**: Check browser console and backend logs

---

## Files Included

- `DemoDashboard.jsx` - Main React component
- `netsuite-service.js` - NetSuite API service layer
- `INTEGRATION_GUIDE.md` - This file

Let me know if you need help setting up any of these components!
