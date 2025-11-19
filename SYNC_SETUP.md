# Setting Up "Sync NetSuite Data" Button

The **"Sync NetSuite Data"** button pulls real customer data from your NetSuite account. Here's how to set it up:

---

## ✅ What's Already Done

1. ✅ **API Endpoint Created**: `/api/netsuite/sync.js` (Vercel serverless function)
2. ✅ **Dashboard Updated**: Now calls `/api/netsuite/sync` instead of mock data
3. ✅ **Anthropic API Key**: Already configured in Vercel (`ANTHROPIC_API_KEY`)
4. ✅ **Fallback Logic**: Shows demo data if API fails

---

## 🔧 What You Need to Configure

### Option 1: Using Anthropic MCP Tools (Recommended if you have MCP access)

The API endpoint uses **Anthropic's MCP (Model Context Protocol)** to access NetSuite. This requires:

1. **Anthropic Account** with MCP server configured
2. **MCP Server Name**: `netsuite-stairway` (already configured in code)
3. **MCP Server** must be running and accessible to Anthropic API

**How to verify:**
- Your MCP server should be configured in your Anthropic account
- The server name `netsuite-stairway` should match your MCP configuration
- NetSuite account `td3049589` should be accessible via MCP

**If this is set up:** The sync button should work immediately! Just click "Sync NetSuite Data" and it will fetch real data.

---

### Option 2: Direct NetSuite REST API (Alternative)

If you don't have MCP access, you can modify the API to use NetSuite REST API directly:

#### Step 1: Create NetSuite Integration

1. **Go to NetSuite**: Setup → Integration → Manage Integrations → New
2. **Create Integration**:
   - **Name**: Dashboard API Integration
   - **State**: Enabled
   - **Token-Based Authentication**: Enabled
   - **Save**

3. **Create Access Token**:
   - Go to **Setup → Users/Roles → Access Tokens → New**
   - **Application Name**: Select your integration
   - **User**: Select an admin user
   - **Role**: Administrator (or role with Customer access)
   - **Save**
   - **Copy the credentials**:
     - **Token ID**
     - **Token Secret**
     - **Consumer Key**
     - **Consumer Secret**

#### Step 2: Update API Endpoint

Replace `/api/netsuite/sync.js` with a direct REST API implementation.

#### Step 3: Set Environment Variables in Vercel

```bash
vercel env add NETSUITE_CONSUMER_KEY production
vercel env add NETSUITE_CONSUMER_SECRET production
vercel env add NETSUITE_TOKEN_ID production
vercel env add NETSUITE_TOKEN_SECRET production
```

---

## 🧪 Testing the Sync Button

### Test 1: Basic API Connection

1. **Visit your dashboard**: https://demodashboard-mu.vercel.app
2. **Select a customer** (e.g., AdvisorHR with ID 3161)
3. **Click "Sync NetSuite Data"**
4. **Check the status message**:
   - ✅ "✓ Synced successfully" = API is working!
   - ⚠️ "API unavailable - showing demo data" = API needs configuration

### Test 2: Check API Endpoint Directly

Test the API endpoint directly in your browser console or Postman:

```javascript
fetch('/api/netsuite/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ customerId: 3161, account: 'services' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

### Test 3: Check Vercel Logs

```bash
vercel logs --follow
```

Then click "Sync NetSuite Data" and watch for errors.

---

## 🔍 Troubleshooting

### Error: "ANTHROPIC_API_KEY not configured"

**Fix**: The API key is already set in Vercel. Check:
```bash
vercel env ls
```
Make sure `ANTHROPIC_API_KEY` shows for Production/Preview/Development.

### Error: "No customer data returned from NetSuite"

**Possible causes**:
1. **MCP server not configured**: The `netsuite-stairway` MCP server needs to be set up in your Anthropic account
2. **Wrong customer ID**: The `nsId` in the dashboard might not exist in NetSuite
3. **MCP server down**: The MCP server needs to be running and accessible

**Fix**: 
- Verify customer ID exists in NetSuite
- Check MCP server configuration
- Try a different customer ID (e.g., 3161 for AdvisorHR)

### Error: "Failed to sync customer data"

**Fix**: Check Vercel function logs:
```bash
vercel inspect [deployment-url] --logs
```

Look for specific error messages in the logs.

---

## 📊 Current Status

**Your Setup:**
- ✅ API endpoint: `/api/netsuite/sync.js` 
- ✅ Dashboard: Calls API endpoint
- ✅ Anthropic API Key: Set in Vercel
- ⚠️ MCP Server: Needs to be configured/accessible

**What Works Now:**
- ✅ Email export (creates records)
- ⚠️ Sync button (needs MCP server or REST API setup)

---

## 🎯 Quick Start

**Try it now:**

1. Go to your dashboard: https://demodashboard-mu.vercel.app
2. Select **AdvisorHR** (customer ID: 3161)
3. Click **"Sync NetSuite Data"**
4. Check the status message:
   - If it says "✓ Synced successfully" → **You're all set!**
   - If it says "API unavailable" → You need to set up MCP server or REST API

---

## 📝 Next Steps

1. **If MCP is configured**: Test the sync button - it should work!
2. **If MCP is NOT configured**: 
   - Option A: Set up MCP server with Anthropic
   - Option B: Switch to direct NetSuite REST API (requires integration setup)

Let me know what error you see and I can help troubleshoot!

---

**Last Updated**: November 2025

