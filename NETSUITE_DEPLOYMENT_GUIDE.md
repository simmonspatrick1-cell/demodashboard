# NetSuite EmailProcessor Script Deployment Guide

## Overview

The **EmailProcessor.suite-script.js** is ready for deployment to NetSuite. This guide covers all steps needed to upload and configure the script.

## ✅ Pre-Deployment Checklist

### Script Verification
- [x] **API Version**: 2.1 (Latest)
- [x] **Script Type**: ScheduledScript
- [x] **Module Scope**: SameAccount
- [x] **Syntax**: Valid JavaScript (SuiteScript 2.1)
- [x] **Dependencies**: All N/ modules declared in define()
- [x] **Export**: Proper return statement with execute function

### New Features Included
- [x] **Class/Department/Location Support**: Full lookup and assignment on estimates
- [x] **Reference Data Lookup Functions**:
  - `getClassIdByName()` - Search by name or displayname
  - `getDepartmentIdByName()` - Search by name or displayname
  - `getLocationIdByName()` - Search by name or displayname
- [x] **Item Copy & Rename**: `copyAndRenameItem()` for custom item names
- [x] **Field Optimization**: Only required fields + specified optional fields
- [x] **Search Optimization**: Minimal columns for governance efficiency

### Gmail API Configuration Required
- [x] Client ID configured (lines 89)
- [x] Client Secret configured (line 90)
- [x] Refresh Token configured (line 91)
- [x] Inbox email set to: `simmonspatrick1@gmail.com`
- [x] Query filter: `subject:"NetSuite Export" has:nouserlabels`

## 📋 Deployment Steps

### Step 1: Upload Script to NetSuite

1. **Login to NetSuite**
   - Navigate to: Customization → Scripting → Scripts → New

2. **Upload Script File**
   - Click **+** next to Script File
   - Select: **EmailProcessor.suite-script.js**
   - Name: "Email Processor Script"
   - ID: `customscript_email_processor`

3. **Set Script Parameters**
   - **API Version**: 2.1
   - **Script Type**: Scheduled Script
   - **Module Scope**: Same Account

### Step 2: Create Script Deployment

1. **Navigate to Deployments Tab**
   - Click **Create Script Deployment**

2. **Configure Deployment Settings**
   ```
   Title: Email Processor - Production
   ID: customdeploy_email_processor_prod
   Status: Testing (change to Released after testing)
   Log Level: DEBUG (for initial testing, change to ERROR in production)
   ```

3. **Set Schedule**
   ```
   Frequency: Every 15 Minutes
   or
   Frequency: Every 30 Minutes (recommended for production)

   Start Time: Immediate
   Repeat: Every N Minutes
   ```

4. **Audience**
   ```
   Audience: All Roles
   or
   Audience: Administrator (recommended)
   ```

### Step 3: Configure Script Parameters (Optional)

If you want to make Gmail configuration dynamic, create script parameters:

1. **Navigate to**: Parameters subtab
2. **Add Parameters**:
   - `GMAIL_CLIENT_ID` (Type: Text)
   - `GMAIL_CLIENT_SECRET` (Type: Password)
   - `GMAIL_REFRESH_TOKEN` (Type: Password)
   - `INBOX_EMAIL` (Type: Email)

3. **Update Script to Use Parameters**
   ```javascript
   var GMAIL_CONFIG = {
       CLIENT_ID: scriptContext.parameters.custscript_gmail_client_id || '267744217222-...',
       CLIENT_SECRET: scriptContext.parameters.custscript_gmail_client_secret || 'GOCSPX-...',
       // ... etc
   };
   ```

## 🔧 Required NetSuite Setup

### 1. Enable Features

Ensure these NetSuite features are enabled:

- **SuiteScript** (Required)
- **Client SuiteScript** (If using client-side scripts)
- **Server SuiteScript** (Required for scheduled scripts)
- **Advanced Bin / Numbered Inventory Management** (If using items with bins)

### 2. Permissions Required

The script execution role needs these permissions:

**Records:**
- Customer: Full (Create, Edit, View, Delete)
- Project (Job): Full
- Estimate: Full
- Service Item: Full (for copyAndRenameItem function)
- Classification: View (for class lookup)
- Department: View (for department lookup)
- Location: View (for location lookup)

**Setup:**
- Custom Records: View
- Scheduled Script: Full

### 3. Subsidiary Configuration

If using OneWorld/Multi-Subsidiary:
- Ensure subsidiary ID 1 exists (or update default in script)
- Update line 724 to use correct default subsidiary:
  ```javascript
  customerRecord.setValue({
      fieldId: 'subsidiary',
      value: 1  // Change to your default subsidiary ID
  });
  ```

## 📧 Email Format Reference

### Required Hashtags for Customer
```
#recordType: customer
#customerName: Company Name
#customerEntityId: COMPANY-001
```

### Required Hashtags for Estimate
```
#recordType: estimate (or leave blank, will be inferred)
#estimateCustomer: 1234  (or customer entity ID)
#estimateType: T&M
#estimateTotal: 50000
#estimateStatus: PENDING
```

### Optional Hashtags for Estimate
```
#estimateClass: Professional Services
#estimateDepartment: Sales
#estimateLocation: San Francisco HQ
#estimateDueDate: 2024-12-31
#estimateMemo: Q4 Implementation Project
```

### Estimate Items Format
```
#estimateItems:
  - PS - Post Go-Live Support: Qty=1, Rate=175
  - EXP_Travel Expenses: Qty=1, Rate=5000
```

### Reference Data Arrays (for Renaming Support)
```
#classes:
  - ID: 1, Name: Professional Services, DisplayName: PS - Consulting
  - ID: 2, Name: Software Sales, DisplayName: SaaS Sales

#departments:
  - ID: 1, Name: Sales, DisplayName: Sales Team
  - ID: 2, Name: Engineering, DisplayName: Engineering
```

## 🧪 Testing Procedure

### Test 1: Customer Creation
1. Send email with customer data:
   ```
   Subject: NetSuite Export
   Body:
   #recordType: customer
   #customerName: Test Company
   #customerEntityId: TEST-001
   #customerEmail: test@example.com
   #customerPhone: 555-1234
   ```

2. **Expected Result**:
   - Customer created in NetSuite
   - Script logs show: "Customer Created: [ID]"
   - No errors in execution log

### Test 2: Estimate with Class/Dept/Location
1. Send email with estimate data:
   ```
   Subject: NetSuite Export
   Body:
   #recordType: estimate
   #estimateCustomer: TEST-001
   #estimateClass: Professional Services
   #estimateDepartment: Sales
   #estimateLocation: San Francisco HQ
   #estimateTotal: 10000
   #estimateItems:
     - PS - Post Go-Live Support: Qty=1, Rate=175
   ```

2. **Expected Result**:
   - Estimate created with class, department, location set
   - Script logs show: "Set class: Professional Services (ID: X)"
   - Estimate record shows correct class/dept/location in NetSuite

### Test 3: Item Copy & Rename
1. Send email with renamed item:
   ```
   Subject: NetSuite Export
   Body:
   #recordType: estimate
   #estimateCustomer: TEST-001

   --- JSON DATA ---
   {
     "estimate": {
       "items": [
         {
           "name": "PS - Post Go-Live Support",
           "displayName": "Custom Implementation Services",
           "description": "Tailored implementation",
           "quantity": 1,
           "rate": 200
         }
       ]
     }
   }
   ```

2. **Expected Result**:
   - New service item created: "Custom Implementation Services"
   - Item copied from source item with same properties
   - Estimate line uses new item

## 📊 Monitoring & Logs

### Check Script Execution Logs
1. Navigate to: Customization → Scripting → Script Execution Log
2. Filter by: Script = Email Processor
3. Look for:
   - ✅ "Customer Created: [ID]"
   - ✅ "Estimate Created: [ID]"
   - ✅ "Set class: [Name] (ID: [X])"
   - ❌ Any ERROR level logs

### Common Log Messages

**Success:**
```
DEBUG: Found hashtag recordType = customer
DEBUG: Customer Search - No existing customer found
AUDIT: Customer Created: 12345
```

**Class Lookup Success:**
```
DEBUG: Get Class ID - Searching for class: Professional Services
DEBUG: Class Found - Class ID: 10 for name: Professional Services
DEBUG: Estimate - Set class: Professional Services (ID: 10)
```

**Item Copy Success:**
```
AUDIT: Copy Item - Copying item 100 with new name: Custom Services
DEBUG: Copy Item - Copied rate: 175
AUDIT: Item Copied - Created new item: 250 (Custom Services) based on source: 100
```

## 🚨 Troubleshooting

### Issue: "Class Not Found"
**Cause**: Class name doesn't match NetSuite record
**Solution**:
- Check spelling of class name
- Verify class is not inactive in NetSuite
- Check if using displayname vs name field

### Issue: "Subsidiary Error"
**Cause**: Default subsidiary ID (1) doesn't exist
**Solution**: Update line 724 with your subsidiary ID

### Issue: "Item Creation Failed"
**Cause**: Missing required fields for service item
**Solution**:
- Verify income account exists
- Check item permissions
- Review service item requirements in your NetSuite account

### Issue: Gmail API "Invalid Grant"
**Cause**: Refresh token expired
**Solution**:
- Regenerate OAuth tokens
- Update REFRESH_TOKEN in script (line 91)

### Issue: "Cannot Set Class on Estimate"
**Cause**: Class tracking not enabled or wrong field ID
**Solution**:
- Navigate to: Setup → Company → Enable Features
- Check: "Use Classes" under Classification tab
- Verify field ID is 'class' (not custbody_class)

## 🔄 Post-Deployment Updates

If you need to update the script after deployment:

1. **Upload New Version**
   - Scripts → Scripts → Email Processor Script
   - Click Edit next to script file
   - Upload new version

2. **Update Deployment**
   - No need to redeploy if only script content changed
   - Script automatically uses latest uploaded version

3. **Version Control**
   - Keep backup of each deployed version
   - Document changes in script header comments
   - Test in TESTING status before changing to RELEASED

## 📝 Script Maintenance

### Regular Checks
- **Weekly**: Review execution logs for errors
- **Monthly**: Check governance usage
- **Quarterly**: Review and optimize searches if needed

### Governance Monitoring
- Navigate to: Customization → Scripting → Governance Usage
- Target: < 1000 units per execution
- Current optimizations:
  - Customer search: Only pulls 'internalid' column
  - Class/dept/location search: Minimal columns
  - Item search: Only essential columns

## ✅ Deployment Checklist

Use this checklist for final verification:

- [ ] Script file uploaded to NetSuite
- [ ] Script deployment created
- [ ] Scheduled to run every 15-30 minutes
- [ ] Log level set to DEBUG for initial testing
- [ ] Gmail API credentials configured
- [ ] All required permissions granted
- [ ] Test customer creation successful
- [ ] Test estimate with class/dept/location successful
- [ ] Test item copy & rename successful
- [ ] Execution logs reviewed - no errors
- [ ] Governance usage acceptable (< 1000 units)
- [ ] Deployment status changed to RELEASED
- [ ] Log level changed to ERROR for production
- [ ] Documentation updated with deployment date

## 🎉 Ready for Production

Your EmailProcessor script is now ready to process emails and create NetSuite records with full support for:

✅ **Customer Creation** - Standard fields only, optimized searches
✅ **Estimate Creation** - With class, department, location support
✅ **Project Creation** - Full project/job record support
✅ **Item Management** - Copy & rename items automatically
✅ **Reference Data Lookup** - Smart lookup by name or displayname
✅ **Email Processing** - Gmail API integration with OAuth

**Questions or Issues?** Review the troubleshooting section or check NetSuite script execution logs for detailed error messages.
