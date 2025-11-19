📌 Start here: [START_HERE.md](START_HERE.md) • Quick start: [QUICK_START.md](QUICK_START.md)

# Demo Dashboard - Complete NetSuite Integration

Your fully-wired dashboard is ready to sync **real data** from your NetSuite account.

---

## 📦 What You're Getting

### Core Files

| File | Purpose | Status |
|------|---------|--------|
| **DemoDashboard.jsx** | React component with UI | ✅ Ready to use |
| **backend-server.js** | Express API server | ✅ Ready to deploy |
| **email-export-utils.js** | Email export functionality | ✅ Ready to use |
| **EmailProcessor.suite-script.js** | SuiteScript for importing emails | ✅ Ready to deploy |
| **package.json** | Backend dependencies | ✅ Ready to install |

### Documentation

| File | What It Covers |
|------|---|
| **QUICK_START.md** | Get running in 5 minutes (start here!) |
| **INTEGRATION_GUIDE.md** | Deep dive into architecture & API setup |
| **EMAIL_EXPORT_GUIDE.md** | How to use the CORS-free Email Integration |
| **README.md** | This file |

---

## 🚀 Get Started (Choose Your Path)

### Path 1: Try It Now (Demo Mode - 2 minutes)
Perfect for exploring the UI without backend setup.

1. Copy `DemoDashboard.jsx` into your React app
2. Open http://localhost:3000
3. Select a customer → click "Sync NetSuite Data"
4. Watch mock data populate
5. Try copying prompts to clipboard

**What works:** UI, customer context, quick action prompt copies
**What doesn't:** Real NetSuite data syncing

### Path 2: Email Integration (Bypass CORS - 5 minutes)
Use email to push data to NetSuite without setting up a backend server.

1. Read **EMAIL_EXPORT_GUIDE.md**
2. Deploy `EmailProcessor.suite-script.js` to NetSuite
3. Use "Export to Email" button in dashboard
4. Emails are processed automatically by NetSuite

**What works:** Pushing data TO NetSuite (Customers, Projects, Estimates)
**What doesn't:** Pulling data FROM NetSuite (requires Path 3)

### Path 3: Full Setup (Real Data - 10 minutes)
Get live NetSuite data flowing to your dashboard.

1. Follow **QUICK_START.md** → Option 2 (Full Setup)
2. Set up backend server
3. Connect dashboard to backend API
4. See real customer data from NetSuite
5. Create actual demo projects

**What works:** Everything, including real data sync and project creation

---

## 🎯 Key Features Wired Up

### ✅ Account Switcher
- Flip between 3 demo accounts (Services, Software, SaaS)
- Pre-configured with your instance URLs
- Syncs selected account throughout dashboard

### ✅ Customer Context Panel
- Search/filter across 270+ customers
- View customer details from NetSuite
- Status indicators (Hot, Active, Qualified, Proposal)
- Quick notes field (saves per customer)
- Links to actual NetSuite records

### ✅ Custom Fields Sync
Pulls these fields from NetSuite:
- `custentity13` - AI Generated Summary
- `custentity16` - Industry Type
- `custentity15` - Opportunity Summary
- `custentity_esc_industry` - Industry
- `custentity_esc_annual_revenue` - Revenue
- `custentity_esc_no_of_employees` - Employee count

### ✅ Quick Action Buttons
One-click prompts for:
- **Create Demo Project** - Pre-formatted project creation prompt
- **Add Sample Time Entries** - 10 billable hours setup
- **Generate Estimate** - Quote from project data
- **Resource Allocation** - 12-week forecast builder
- **Sync NetSuite Data** - Pulls custom fields (real API call)
- **Export to Email** - Push data to NetSuite via email integration

### ✅ Demo Prompts Library
Pre-built SuiteQL prompts organized by:
- Customer Setup
- Project & PSA
- Billing & Revenue
- Industry Scenarios
- One-click copy + favorites system

---

## 🔌 Architecture

```
Frontend (React)
    ↓ (REST API calls)
Backend (Express)
    ↓ (MCP tool calls)
Claude API
    ↓ (executes tools)
NetSuite MCP Tools
    ↓ (API calls)
Your NetSuite Account
    ↓ (returns data)
Dashboard (shows results)
```

### Alternative Architecture (Email Integration)

```
Frontend (React)
    ↓ (mailto link)
User's Email Client
    ↓ (sends email)
Gmail Inbox
    ↓ (fetched by script)
NetSuite Scheduled Script
    ↓ (creates records)
NetSuite Database
```

---

## 📋 Your Demo Prospects (Pre-loaded)

Ready to demo with:

1. **AdvisorHR** - PEO Services ($200K-500K budget, Oct 30 demo)
2. **GSB Group** - Consulting ($100K-200K budget, Nov 5 demo)
3. **Innovatia Technical** - Tech Consulting ($150K-300K budget, Nov 8 demo)
4. **Marabou Midstream** - Energy/Midstream ($250K+ budget, Nov 12 demo)
5. **Lovse Surveys** - Professional Services ($100K-150K budget, Nov 15 demo)
6. **nFront Consulting** - Energy Consulting ($5.2M budget, pending demo)
7. **Formative Group** - Salesforce Consulting ($200K-400K budget, Nov 20 demo)

Each prospect has:
- ✓ NetSuite customer ID (syncs with backend)
- ✓ Industry vertical
- ✓ Company size
- ✓ Demo focus areas
- ✓ Budget range
- ✓ Status (Hot/Active/Proposal)

---

## 🛠️ Setup Instructions

### Demo Mode (No Backend)
```bash
# Copy file to your React app
cp DemoDashboard.jsx src/App.jsx

# Run React
npm start

# Open http://localhost:3000
# Click "Sync NetSuite Data" button - it works immediately!
```

### Email Integration
See **EMAIL_EXPORT_GUIDE.md** for setup instructions.

### Full Mode (With Backend)
```bash
# Terminal 1 - Backend
cd demo-backend
npm install
npm start
# Runs on http://localhost:3001

# Terminal 2 - Frontend
npm start
# Runs on http://localhost:3000
```

See **QUICK_START.md** for detailed step-by-step instructions.

---

## 📡 API Endpoints (Backend)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/netsuite/sync` | Fetch customer + custom fields |
| GET | `/api/netsuite/customers` | List all customers |
| POST | `/api/netsuite/projects` | Get customer's projects |
| POST | `/api/netsuite/create-project` | Create demo project |
| POST | `/api/netsuite/create-time-entries` | Add sample time entries |
| GET | `/api/health` | Health check |
| POST | `/api/cache/clear` | Clear data cache |
| POST | `/api/export/email` | Prepare email content (optional) |

---

## ⚙️ Configuration

### Environment Variables (.env)

```env
# Backend
PORT=3001
NETSUITE_ACCOUNT_ID=td3049589
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Frontend (in dashboard)
REACT_APP_API_URL=http://localhost:3001
```

### NetSuite Account Details

Your account configuration:
- **Account ID:** td3049589
- **Vertical:** High-Tech & Services
- **Multiple demo instances:** Services Stairway, Software Stairway, SaaS variant

---

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3001/api/health
```

### Sync Customer Data
```bash
curl -X POST http://localhost:3001/api/netsuite/sync \
  -H "Content-Type: application/json" \
  -d '{"customerId": 3161, "account": "services"}'
```

### Test in Browser Console
```javascript
// Check backend connection
fetch('http://localhost:3001/api/health')
  .then(r => r.json())
  .then(console.log)

// Manually sync a customer
fetch('http://localhost:3001/api/netsuite/sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ customerId: 3161 })
})
.then(r => r.json())
.then(console.log)
```

---

## 📚 Documentation Reference

### For Quick Setup
→ Read **QUICK_START.md** first

### For Email Integration (CORS-free)
→ Read **EMAIL_EXPORT_GUIDE.md**

### For Deep Understanding
→ Read **INTEGRATION_GUIDE.md**

### For Architecture Details
→ Check comments in `backend-server.js`

### For Data Mapping
→ See "Custom Fields Sync" section in INTEGRATION_GUIDE.md

---

## 🎓 Use Cases Already Configured

### AdvisorHR PEO Demo (Oct 30)
- Multi-entity structure (Staffing, Payroll, HR)
- Resource allocation across 250+ employees
- Time tracking and billing
- Sample data for realistic demo

### Marabou Midstream Demo (Nov 12)
- Pipeline project scenarios
- Multi-entity cost allocation
- Environmental compliance tracking
- Resource crew forecasting

### Formative Group Demo (Nov 20)
- Acquisition integration scenarios
- Scaling operations setup
- Resource management templates

---

## 🚨 Common Issues

### Backend won't start
```bash
# Missing dependencies?
npm install express cors @anthropic-sdk/sdk dotenv open

# Wrong port?
# Change PORT in .env file

# API key issue?
# Add ANTHROPIC_API_KEY to .env
```

### Dashboard can't connect to backend
```bash
# Check backend is running:
curl http://localhost:3001/api/health

# Check CORS is enabled in backend-server.js

# Check dashboard is calling correct URL (3001, not 3000)
```

### Sync returns "not populated"
```bash
# This is normal if NetSuite custom fields are empty
# They'll auto-fill when you populate them in NetSuite

# For demo, use the fallback values that auto-generate
```

See **QUICK_START.md** → "Common Issues & Fixes" for more.

---

## 📈 What's Happening Behind the Scenes

When you click "Sync NetSuite Data":

1. **Dashboard** sends customer ID to backend API
2. **Backend** receives request and calls Claude API
3. **Claude** executes `ns_getRecord` MCP tool
4. **NetSuite** returns customer data with custom fields
5. **Backend** caches result (5-minute TTL)
6. **Dashboard** receives data and displays it
7. **User** sees customer details instantly

**Total time:** ~1-2 seconds (cached) to 3-5 seconds (fresh)

---

## 🎯 Your Competitive Advantage

With this dashboard, you can:

✅ **Pre-demo:** Load all customer context in seconds
✅ **During demo:** Switch between accounts instantly
✅ **Quick actions:** Generate demo data with one click
✅ **Context:** Never forget prospect focus areas or budget
✅ **Efficiency:** 15+ minutes saved per demo prep
✅ **Professionalism:** Real-time synced data shows you're organized

---

## 🔮 What's Next?

### Phase 2 (Already Possible)
- [ ] Scenario presets (e.g., "Load AdvisorHR scenario")
- [ ] PDF export of demo prep checklist
- [ ] Calendar integration (see demo dates)
- [ ] Auto-email reports to prospect

### Phase 3 (Easy to Add)
- [ ] Notion integration (sync notes)
- [ ] Slack notifications (demo reminders)
- [ ] Google Drive attachment of prep materials
- [ ] Automated follow-up templates

---

## 📞 Support

**Having issues?**
1. Check **QUICK_START.md** → Common Issues section
2. Check **INTEGRATION_GUIDE.md** → Troubleshooting
3. Look at backend logs (terminal where you ran `npm start`)
4. Check browser console (F12 → Console tab)

**Questions about features?**
- Check component comments in DemoDashboard.jsx
- Check backend endpoint documentation in backend-server.js
- See INTEGRATION_GUIDE.md for architecture

---

## 📋 Quick Checklist

- [ ] Copy DemoDashboard.jsx to your React app
- [ ] Test demo mode (no backend needed)
- [ ] Set up backend (if you want real data)
- [ ] Create .env file with your keys
- [ ] Test API endpoints
- [ ] Connect dashboard to backend
- [ ] Try "Sync NetSuite Data" with AdvisorHR
- [ ] Test quick action buttons
- [ ] Try other prospects
- [ ] Bookmark QUICK_START.md for reference

---

## 🎉 You're Ready!

Everything is wired up. Start with **QUICK_START.md** and pick your path:

**Path 1 (Immediate):** Just use demo mode - works in 2 minutes
**Path 2 (Better):** Set up backend for real NetSuite data - 10 minutes

Either way, you'll have a working dashboard to accelerate your demo prep.

---

**Created for:** Pat, Senior Solution Consultant @ Oracle NetSuite
**Focus:** High-Tech & Services vertical, PSA/ERP demos
**Prospects:** AdvisorHR, Marabou Midstream, Formative Group, and more
**Status:** ✅ Ready to deploy and use

Questions? Check the docs. Feature request? Let me know!
# Deployment ready with environment variables
# Environment variables configured: Thu Nov 13 09:45:47 MST 2025
