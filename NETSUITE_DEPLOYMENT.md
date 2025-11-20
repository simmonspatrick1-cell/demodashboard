# NetSuite RESTlet Deployment Guide

This guide walks you through deploying the customer search and project sync functionality to NetSuite.

## Overview

The RESTlet provides two main endpoints:
- **GET**: Search for customers by name, email, or company name
- **POST**: Create projects and tasks in NetSuite

## Deployment Steps

### Step 1: Upload the RESTlet Script

1. Log into your NetSuite account
2. Navigate to **Customization > Scripting > Scripts > New**
3. Click **SuiteScript 2.x** (not 1.0)
4. Upload or paste the contents of `netsuite-restlet.js`
5. Click **Create Script Record**

### Step 2: Configure Script Record

1. **Script Name**: `Demo Dashboard Integration RESTlet`
2. **ID**: Will be auto-generated (e.g., `customscript_demo_dashboard_restlet`)
3. **Owner**: Select your user or admin
4. **Script File**: Should already be selected from upload
5. Click **Save**

### Step 3: Create Script Deployment

1. Go to the **Deployments** subtab
2. Click **New Deployment**
3. Configure deployment:
   - **Title**: `Demo Dashboard Production`
   - **ID**: Will be auto-generated (e.g., `customdeploy_demo_dashboard_prod`)
   - **Status**: **Released**
   - **Log Level**: **Debug** (for initial testing, change to Error in production)
   - **Execute As Role**: **Administrator** (or appropriate role)
   - **Audience**: Select who can access (usually All Roles or specific roles)

4. Note the **External URL** - it will look like:
   ```
   https://ACCOUNTID.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=SCRIPTID&deploy=DEPLOYID
   ```

5. Click **Save**

### Step 4: Get Script and Deploy IDs

After saving, note these values:
- **Script ID**: Usually shown on the script record page (e.g., `5147`)
- **Deploy ID**: Usually shown on the deployment page (e.g., `2`)

### Step 5: Update Your .env File

Update your local `.env` file with the NetSuite details:

```bash
# NetSuite Configuration
NETSUITE_ACCOUNT_ID=td3049589
NETSUITE_REST_URL=https://td3049589.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=5147&deploy=2

# TBA (Token-Based Authentication) Credentials
NETSUITE_CONSUMER_KEY=your_consumer_key_here
NETSUITE_CONSUMER_SECRET=your_consumer_secret_here
NETSUITE_TOKEN_ID=your_token_id_here
NETSUITE_TOKEN_SECRET=your_token_secret_here

# Disable mock mode to use real NetSuite
MOCK_NETSUITE_SYNC=false
```

### Step 6: Set Up Token-Based Authentication (TBA)

If you haven't already set up TBA credentials:

1. **Create Integration Record**:
   - Go to **Setup > Integration > Manage Integrations > New**
   - Name: `Demo Dashboard Integration`
   - State: **Enabled**
   - Token-Based Authentication: **Checked**
   - Save and note the **Consumer Key** and **Consumer Secret**

2. **Create Access Token**:
   - Go to **Setup > Users/Roles > Access Tokens > New**
   - Application Name: Select your integration
   - User: Select your user
   - Role: Select Administrator (or appropriate role)
   - Token Name: `Demo Dashboard Token`
   - Save and note the **Token ID** and **Token Secret**

⚠️ **Important**: Save these credentials immediately - you won't be able to see them again!

### Step 7: Test the Deployment

Run the test script:

```bash
# Make sure your backend is running
npm run dev

# In another terminal, run the test script
./test-customer-api.sh
```

Or test manually:

```bash
# Test customer search
curl "http://localhost:3004/api/customers/search?q=test"

# Test project sync
curl -X POST "http://localhost:3004/api/projects/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 123,
    "account": "TEST-001",
    "prospectName": "Test Company",
    "industry": "Technology",
    "prompts": ["Create demo scenario"],
    "notes": "Test project"
  }'
```

## Troubleshooting

### Error: "SSS_MISSING_REQD_ARGUMENT"
- **Cause**: Required field missing in request
- **Solution**: Check that customerId and projectName are provided

### Error: "INVALID_LOGIN_CREDENTIALS"
- **Cause**: TBA credentials are incorrect or expired
- **Solution**: Verify your Consumer Key/Secret and Token ID/Secret in `.env`

### Error: "USER_ERROR: Invalid customer reference"
- **Cause**: Customer ID doesn't exist in NetSuite
- **Solution**: Use the customer search to get valid customer IDs first

### Error: "UNEXPECTED_ERROR"
- **Cause**: Various - check NetSuite execution logs
- **Solution**:
  1. Go to **Customization > Scripting > Script Execution Log**
  2. Find your RESTlet executions
  3. Check the Details for error messages

### No Results from Customer Search
- **Cause**: Search filters too restrictive or no data
- **Solution**: Try searching with an empty query `?q=` to get all customers

## Field Customization

The RESTlet includes commented sections for custom fields. If you have custom fields in your NetSuite account, uncomment and modify these sections:

```javascript
// Example: Add custom industry field
if (context.industry) {
    projectRecord.setValue({
        fieldId: 'custentity_industry',  // Replace with your field ID
        value: context.industry
    });
}
```

To find your custom field IDs:
1. Go to **Customization > Lists, Records, & Fields > Entity Fields** (for customer/project fields)
2. Find your field and note the **ID** value

## Production Checklist

Before going to production:

- [ ] Change Log Level to **Error** on deployment
- [ ] Test with real customer IDs
- [ ] Verify task creation works
- [ ] Set up proper role restrictions
- [ ] Document which roles need access
- [ ] Test error handling
- [ ] Set `MOCK_NETSUITE_SYNC=false` in production `.env`
- [ ] Update CORS settings if deploying frontend to different domain

## Next Steps

1. **Test the CustomerSelector component** in your React app
2. **Integrate with project creation flow** using the example code
3. **Monitor NetSuite execution logs** for the first few days
4. **Set up error notifications** if needed

## Support

For NetSuite-specific issues:
- Check NetSuite Help Center
- Review SuiteScript 2.1 documentation
- Check Script Execution Logs in NetSuite

For integration issues:
- Check backend logs: `npm run dev` output
- Check browser console for frontend errors
- Run `./test-customer-api.sh` to isolate issues
