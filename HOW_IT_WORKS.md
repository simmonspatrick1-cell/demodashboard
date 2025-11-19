# How Your Website Updates and Generates Info

## 🔄 How Data Updates Work

Your website can **update and generate NetSuite records** in two ways:

### Method 1: Email Export → NetSuite (Currently Active) ✅

This is the **CORS-free** method that's working right now:

```
Dashboard → Click Button → Gmail Compose → Email Sent → SuiteScript → NetSuite Records Created
```

**How it works:**
1. Click a button in the dashboard (e.g., "Create Prospect", "Create Project")
2. Dashboard formats data with hashtags (`#customerName: ABC`, etc.)
3. Opens Gmail compose window with pre-filled email
4. You click "Send" in Gmail
5. Email arrives at `simmonspatrick1@gmail.com`
6. NetSuite scheduled script runs every 15 minutes
7. Script reads email, parses hashtags, creates NetSuite records
8. Records appear in NetSuite (Customers, Projects, Estimates, etc.)

**Buttons that create records:**
- ✅ **"Create Prospect"** - Creates new Customer in NetSuite
- ✅ **"Create Project"** - Creates new Project (Job) for selected customer
- ✅ **"Create Estimate"** - Creates new Estimate for selected customer
- ✅ **"Export to Email"** - Exports current customer data

**Speed:** Records created within 15 minutes (or instantly if you trigger script manually)

---

### Method 2: Direct API Calls (Requires Backend Setup)

If you set up the backend server with NetSuite MCP tools:

```
Dashboard → API Call → Backend Server → Claude MCP → NetSuite API → Data Returns → Dashboard Updates
```

**How it works:**
1. Dashboard calls `/api/netsuite/sync` endpoint
2. Backend uses Anthropic API with MCP tools
3. MCP tools call NetSuite REST API directly
4. Data returns to dashboard instantly
5. Dashboard displays updated information

**Buttons that sync data:**
- **"Sync NetSuite Data"** - Pulls customer data from NetSuite (custom fields, etc.)

**Speed:** Instant (1-3 seconds)

---

## 📊 Current Status

### What's Working Now ✅

1. **Email Export System** - Fully functional
   - Create Prospect button → Creates Customer in NetSuite
   - Create Project button → Creates Project in NetSuite
   - Create Estimate button → Creates Estimate in NetSuite
   - Export to Email button → Exports any data to Gmail

2. **NetSuite Script** - Processing emails successfully
   - Reads emails from Gmail API
   - Parses hashtag format
   - Creates/finds customers
   - Creates projects, estimates, tasks

3. **Website Deployment** - Live on Vercel
   - Dashboard accessible at your Vercel URL
   - All buttons functional
   - Gmail integration working

### What Needs Backend Setup 🔧

1. **"Sync NetSuite Data" Button** - Currently uses mock data
   - Requires backend server running
   - Needs `ANTHROPIC_API_KEY` configured (✅ already set in Vercel)
   - Needs MCP tools configured on backend

---

## 🎯 Quick Reference

### To CREATE Records (Works Now):

1. **Create New Prospect:**
   - Click **"Create Prospect"** button (works even without selecting a customer)
   - Gmail opens with pre-filled data
   - Click Send
   - Customer created in NetSuite within 15 minutes

2. **Create Project:**
   - Select a customer first
   - Click **"Create Project"** button
   - Gmail opens with project data
   - Click Send
   - Project created in NetSuite within 15 minutes

3. **Create Estimate:**
   - Select a customer first
   - Click **"Create Estimate"** button
   - Gmail opens with estimate data
   - Click Send
   - Estimate created in NetSuite within 15 minutes

### To UPDATE/READ Data (Needs Backend):

1. **Sync from NetSuite:**
   - Click **"Sync NetSuite Data"** button
   - Currently shows mock data (for demo)
   - To enable real sync: Set up backend server with MCP tools

---

## 🔍 Where Did "Create Prospect" Button Go?

**It's back!** I just added it:

✅ **"Create Prospect"** - First button in the Quick Actions panel
- Works without selecting a customer
- Creates a new customer/prospect in NetSuite via email

**All Available Buttons:**
1. Create Prospect ⭐ (NEW - actually creates in NetSuite)
2. Create Project (creates in NetSuite)
3. Create Estimate (creates in NetSuite)
4. Add Sample Time Entries (copies prompt - use for reference)
5. Resource Allocation (copies prompt - use for reference)
6. Sync NetSuite Data (pulls data - needs backend for real sync)
7. Export to Email (exports current data)

---

## 📝 Summary

**Your website generates/updates info by:**

1. **Creating Records:** Email Export → NetSuite (✅ Working)
2. **Reading Records:** Direct API → NetSuite (⚠️ Needs backend setup)

**For now, use the email export buttons** - they're fully functional and create real records in NetSuite!

---

**Last Updated:** November 2025

