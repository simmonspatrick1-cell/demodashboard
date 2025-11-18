# NetSuite "Forbidden" Error - Troubleshooting Guide

**Status**: Getting 403 Forbidden errors on both GET and POST requests to NetSuite RESTlet

**Symptoms**:
- Backend server starts successfully on port 3004
- OAuth signatures are being generated correctly
- Both customer search (GET) and project sync (POST) return "Forbidden"
- This indicates TBA permissions or deployment configuration issues

---

## Checklist: Fix NetSuite Permissions

### ✅ Step 1: Verify RESTlet Script is Released

1. In NetSuite, go to: **Customization → Scripting → Scripts**
2. Search for your script (Script ID: **5148**)
3. Click on the script name
4. Go to the **Deployments** tab
5. Click on deployment ID: **2**
6. **Check these settings**:
   ```
   Status: Released (NOT "Testing")
   Log Level: Debug (for troubleshooting)
   Execute As Role: Administrator (recommended for testing)
   Audience: All Roles
   ```
7. **Save** if you made any changes

### ✅ Step 2: Check Integration Record

1. Go to: **Setup → Integration → Manage Integrations**
2. Search for your integration (Consumer Key starts with: `026fb1...`)
3. Click **Edit**
4. **Verify these settings**:
   ```
   State: ENABLED
   Token-Based Authentication: ☑ Checked
   TBA: Authorization Flow: ☑ Checked
   User Credentials: ☐ Unchecked (we're using TBA, not user credentials)
   ```
5. **Save**

### ✅ Step 3: Verify Access Token & Role

1. Go to: **Setup → Users/Roles → Access Tokens**
2. Find your token (Token ID starts with: `bfef16...`)
3. Click **Edit**
4. **Check**:
   ```
   Application: Should match your integration name
   User: Your NetSuite user
   Role: Note which role is selected (you'll need this for Step 4)
   ```

### ✅ Step 4: Verify Role Permissions

This is the **most common cause** of Forbidden errors!

1. Go to: **Setup → Users/Roles → Manage Roles**
2. Find the role used in your Access Token (from Step 3)
3. Click **Edit**
4. Go to the **Permissions** tab
5. **Required Permissions**:

   | Permission | Sublevel | Level |
   |------------|----------|-------|
   | **Setup** | | |
   | → SuiteScript | | Full |
   | **Lists** | | |
   | → Customers | | View or higher |
   | → Projects | | Create or higher |
   | → Tasks | | Create or higher |
   | **Transactions** | | |
   | → Find Transaction | | View or higher |

6. **Save** the role

### ✅ Step 5: Verify Script Deployment Audience

1. Back in **Customization → Scripting → Scripts** (Script 5148)
2. Click the **Deployments** tab
3. Edit deployment **2**
4. Scroll to **Audience** section
5. **Ensure**:
   - Either "All Roles" is selected
   - OR your specific TBA role is in the "Selected" list

### ✅ Step 6: Check for IP Restrictions

Some NetSuite accounts have IP restrictions:

1. Go to: **Setup → Company → Enable Features**
2. Click the **SuiteCloud** tab
3. Check if **"IP Address Rules"** is enabled
4. If yes, go to: **Setup → Company → IP Address Rules**
5. **Either**:
   - Add your server's IP to the allowlist
   - OR temporarily disable IP restrictions for testing

---

## Testing After Changes

After making changes in NetSuite, test the connection:

```bash
# Test customer search
curl "http://localhost:3004/api/customers/search?q=test"

# Should return customer data or specific error (not Forbidden)
```

---

## Common Issues & Solutions

### Issue: "INVALID_LOGIN_CREDENTIALS"
**Solution**:
- Double-check Consumer Key/Secret in .env
- Regenerate TBA credentials if needed
- Verify Token hasn't expired

### Issue: "Forbidden" (403)
**Solution**:
- Check role permissions (Step 4)
- Verify script deployment status is "Released" (Step 1)
- Check deployment audience includes your role (Step 5)

### Issue: "INVALID_RCRD_REF"
**Solution**:
- Customer ID doesn't exist in NetSuite
- Try with a real customer ID from your NetSuite account

### Issue: Script not found
**Solution**:
- Verify RESTlet is deployed to Script ID 5148
- Check the deployment URL matches .env NETSUITE_REST_URL

---

## Quick Role Permission Template

If you need to create a new role for TBA:

1. **Setup → Users/Roles → Manage Roles → New**
2. **Name**: "REST API Integration"
3. **Permissions Tab**:
   ```
   Setup:
     - SuiteScript: Full

   Lists:
     - Customers: View
     - Projects (Jobs): Create
     - Tasks: Create

   Transactions:
     - Find Transaction: View

   Reports:
     - SuiteAnalytics Workbook: None (optional)
   ```
4. **Save**
5. Go back to **Setup → Users/Roles → Access Tokens**
6. **Edit** your token to use this new role

---

## Enable Debug Logging

To see more details in NetSuite:

1. Go to your script deployment (Script 5148, Deploy 2)
2. Set **Log Level** to: **Debug**
3. Save
4. Make a test request
5. Check logs: **Customization → Scripting → Script Execution Log**
6. Filter by Script ID: **5148**
7. Look for error details

---

## Account-Specific Settings to Verify

Your NetSuite Account: **td3049589**

```
Script ID: 5148
Deployment ID: 2
RESTlet URL: https://td3049589.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=5148&deploy=2
```

If the URL doesn't work:
1. Go to the script deployment in NetSuite
2. Look for the **External URL** field
3. Copy that exact URL to your .env file

---

## Next Steps

1. **Go through Steps 1-6 above** in your NetSuite account
2. **Make note of any changes** you make
3. **Test the connection** after each change
4. **Check Script Execution Log** for specific errors

Once you've verified the settings, let me know and we can test the connection again!
