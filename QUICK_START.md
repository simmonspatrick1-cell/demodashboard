# Quick Start Guide - Demo Dashboard with NetSuite Integration

Get your dashboard running in **5 minutes**.

---

## What You Have

✅ **React Dashboard** - DemoDashboard.jsx (ready to run)
✅ **NetSuite Service Layer** - netsuite-service.js (utility functions)
✅ **Backend Server** - backend-server.js (handles API calls)
✅ **Integration Guide** - INTEGRATION_GUIDE.md (detailed docs)

---

## Option 1: Run Dashboard Without Backend (Demo Mode)

This works immediately—no backend setup needed. All data is mocked.

### Steps:

1. **Install dependencies:**
```bash
npm install react lucide-react
```

2. **Create React app or use existing:**
```bash
# If you don't have a React project
npx create-react-app demo-dashboard
cd demo-dashboard
```

3. **Copy DemoDashboard.jsx:**
```bash
cp DemoDashboard.jsx src/App.jsx
```

4. **Run:**
```bash
npm start
```

5. **Test in browser:**
   - Open http://localhost:3000
   - Click on any customer
   - Click "Sync NetSuite Data" button
   - Watch mock data load (it already does!)

**What works in Demo Mode:**
- ✓ Account switching
- ✓ Customer context panel
- ✓ Custom fields sync (simulated)
- ✓ Quick action button prompts (copied to clipboard)
- ✓ Favorites system
- ✓ Notes per prospect

---

## Option 2: Full Setup with Real NetSuite Integration

Takes ~10 minutes, gives you **live data**.

### Prerequisites:

- Node.js 18+
- NetSuite account with API access enabled
- Claude API key (for MCP tool access)
- npm or yarn

### Step 1: Setup Backend

```bash
# Create backend directory
mkdir demo-backend
cd demo-backend

# Initialize Node project
npm init -y

# Install dependencies
npm install express cors anthropic dotenv
npm install --save-dev @babel/node @babel/core @babel/preset-env
```

### Step 2: Create Backend Files

**backend-server.js** - Copy from outputs

**.env file:**
```env
NETSUITE_ACCOUNT_ID=td3049589
ANTHROPIC_API_KEY=your_claude_api_key_here
PORT=3001
```

**package.json** (update scripts):
```json
{
  "scripts": {
    "start": "node backend-server.js",
    "dev": "nodemon backend-server.js"
  }
}
```

### Step 3: Start Backend

```bash
npm start

# You should see:
# ✓ NetSuite Backend Server running on http://localhost:3001
```

### Step 4: Update Dashboard to Call Backend

In **DemoDashboard.jsx**, find this section and update it:

**OLD (Demo Mode):**
```javascript
const syncNetsuiteFieFds = async () => {
  // Mocked response
  await new Promise(resolve => setTimeout(resolve, 800));
  setCustomFieldsData(prev => ({...}));
}
```

**NEW (Real API):**
```javascript
const syncNetsuiteFieFds = async () => {
  if (!selectedCustData) return;
  setSyncLoading(true);
  setActionStatus('Syncing from NetSuite...');
  
  try {
    const response = await fetch('http://localhost:3001/api/netsuite/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: selectedCustData.nsId,
        account: selectedAccount
      })
    });

    if (!response.ok) throw new Error('Sync failed');
    
    const data = await response.json();
    
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
    setTimeout(() => setActionStatus(null), 3000);
  }
};
```

### Step 5: Test API Connection

In browser console:
```javascript
fetch('http://localhost:3001/api/health')
  .then(r => r.json())
  .then(console.log)

// Should see:
// { status: 'ok', account: 'td3049589', mcp: 'netsuite-stairway', cacheSize: 0 }
```

### Step 6: Test Sync

1. Select a customer (try AdvisorHR - ID 3161)
2. Click "Sync NetSuite Data"
3. Check backend terminal for logs
4. See custom fields populate in dashboard

---

## Quick Testing Checklist

### Demo Mode (No Backend)
- [ ] Dashboard loads
- [ ] Can select customers
- [ ] "Sync NetSuite Data" button shows mock data
- [ ] Copy buttons work for prompts

### Full Mode (With Backend)
- [ ] Backend server running on 3001
- [ ] `/api/health` endpoint responds
- [ ] Dashboard connects to backend
- [ ] Real customer data from NetSuite loads
- [ ] "Create Demo Project" button works

---

## Common Issues & Fixes

### "Cannot GET /api/netsuite/sync"
- Backend not running? Start it: `npm start`
- Wrong port? Check backend on 3001, dashboard calling it

### "CORS error"
- Backend is running but CORS not enabled
- Make sure `cors()` is first middleware in backend-server.js
- Clear browser cache and retry

### "No customer data returned"
- NetSuite credentials wrong in .env
- Customer ID doesn't exist (try: 3161 for AdvisorHR)
- Check NetSuite account access

### "Cannot find module 'express'"
- Run `npm install express cors`

### Slow sync?
- First sync slower (no cache). After 5 minutes cache expires.
- Check NetSuite API rate limits
- Look at backend logs for timing info

---

## What to Do Next

### Immediate (Try These First)
1. ✓ Get dashboard running in demo mode
2. ✓ Click "Sync NetSuite Data" and see mock data
3. ✓ Copy a prompt to clipboard
4. ✓ Test with your top prospects (AdvisorHR, Marabou)

### Next (Wire Up Real Data)
1. Setup backend server
2. Add your Claude API key
3. Update sync function to call backend
4. Test with real customer data

### Advanced (Build on It)
1. Add more quick action buttons
2. Create scenario presets
3. Add calendar integration
4. Export to PDF/email

---

## File Structure

```
your-project/
├── src/
│   ├── App.jsx (DemoDashboard.jsx)
│   └── netsuite-service.js
├── public/
└── package.json

demo-backend/
├── backend-server.js
├── .env
├── package.json
└── README.md
```

---

## API Documentation

### Available Endpoints

**GET /api/health**
```bash
curl http://localhost:3001/api/health
```

**POST /api/netsuite/sync**
```bash
curl -X POST http://localhost:3001/api/netsuite/sync \
  -H "Content-Type: application/json" \
  -d '{"customerId": 3161, "account": "services"}'
```

**POST /api/netsuite/create-project**
```bash
curl -X POST http://localhost:3001/api/netsuite/create-project \
  -H "Content-Type: application/json" \
  -d '{
    "entityid": "PRJ-DEMO-001",
    "companyname": "Demo Project",
    "customerId": 3161,
    "startdate": "2025-11-13",
    "enddate": "2025-12-13"
  }'
```

---

## Deployment

### Option A: Vercel (Frontend)
```bash
npm run build
vercel deploy
```

### Option B: Railway (Backend + Frontend)
```bash
railway link
railway up
```

### Option C: Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY . .
RUN npm install
CMD ["npm", "start"]
```

---

## Support

**Questions about:**
- Dashboard UI → Check DemoDashboard.jsx comments
- Backend API → See backend-server.js documentation  
- NetSuite → INTEGRATION_GUIDE.md has detailed info
- Troubleshooting → Check "Common Issues" section above

---

## Next: Try It Now

1. Copy DemoDashboard.jsx
2. Open in your React app
3. Click a customer
4. Click "Sync NetSuite Data"
5. Watch it work! 🚀

Questions? Check INTEGRATION_GUIDE.md for deeper details.
