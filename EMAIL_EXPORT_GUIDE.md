# Email Export Integration Guide

## Overview

This guide explains how to use the **Email → SuiteScript Scheduled Script** integration path to bypass CORS restrictions and deploy your web app without direct API access.

## How It Works

1. **Web App** exports JSON data with hashtag formatting
2. **Email** is sent to a special inbox (e.g., `simmonspatrick1@gmail.com`)
3. **SuiteScript Scheduled Script** logs into Gmail via API
4. **Script parses emails** with hashtags/brackets
5. **NetSuite records are created**: Customer, Project, Tasks, Estimates, Checklists

---

## Architecture

```
┌─────────────────┐
│  Web Dashboard  │
│  (React App)    │
└────────┬────────┘
         │
         │ Exports JSON with hashtags
         │ Opens mailto: link
         ▼
┌─────────────────┐
│   Email Client  │
│  (User's Mail)  │
└────────┬────────┘
         │
         │ Sends email to
         │ simmonspatrick1@gmail.com
         ▼
┌─────────────────┐
│   Gmail Inbox   │
│ simmonspatrick..│
└────────┬────────┘
         │
         │ SuiteScript polls
         │ via Gmail API
         ▼
┌─────────────────┐
│  SuiteScript    │
│ Scheduled Script│
└────────┬────────┘
         │
         │ Creates records
         ▼
┌─────────────────┐
│    NetSuite     │
│   Records       │
└─────────────────┘
```

---

## Step 1: Using the Email Export Feature

### In the Dashboard

1. Select a customer from the **Customer Context** tab
2. Click the **"Export to Email"** button in the Quick Actions panel
3. Your email client will open with:
   - **To**: `simmonspatrick1@gmail.com`
   - **Subject**: Formatted based on the data
   - **Body**: Data formatted with hashtags

---

## Step 2: Setting Up Gmail API Access

To read emails from `simmonspatrick1@gmail.com`, we need to authorize the SuiteScript using OAuth 2.0.

### A. Create Credentials in Google Cloud

1. Go to the **[Google Cloud Console](https://console.cloud.google.com/)**.
2. **Create a New Project** (e.g., "NetSuite Email Processor").
3. **Enable Gmail API**:
   - Go to **APIs & Services > Library**.
   - Search for "Gmail API" and click **Enable**.
4. **Configure OAuth Consent Screen**:
   - Go to **APIs & Services > OAuth consent screen**.
   - Select **External** (since you're using a personal @gmail.com).
   - App Name: "NetSuite Script".
   - User Support Email: `simmonspatrick1@gmail.com`.
   - Developer Contact Email: `simmonspatrick1@gmail.com`.
   - Add `simmonspatrick1@gmail.com` as a **Test User**.
   - Save and continue.
5. **Create Credentials**:
   - Go to **APIs & Services > Credentials**.
   - Click **Create Credentials > OAuth client ID**.
   - Application type: **Web application**.
   - Name: "NetSuite Script".
   - **Authorized redirect URIs**: Add `http://localhost:3000/callback`.
   - Click **Create**.
6. **Copy Your Keys**:
   - Copy the **Client ID** and **Client Secret**.

### B. Generate the Refresh Token

We use a helper script to perform the one-time login flow to get a "Refresh Token". This token allows the script to access your inbox forever without logging in again.

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure the Helper Script**:
   - Open `scripts/setup-gmail-auth.js`
   - Paste your **Client ID** and **Client Secret** at the top:
     ```javascript
     const CLIENT_ID = 'YOUR_PASTED_CLIENT_ID';
     const CLIENT_SECRET = 'YOUR_PASTED_CLIENT_SECRET';
     ```

3. **Run the Script**:
   ```bash
   node scripts/setup-gmail-auth.js
   ```

4. **Authorize**:
   - Click the link shown in the terminal.
   - Log in with `simmonspatrick1@gmail.com`.
   - Click **Advanced > Go to NetSuite Script (unsafe)**.
   - Allow access to your Gmail.
   - The script will output your **Refresh Token**.

---

## Step 3: Deploying the SuiteScript

### File: `EmailProcessor.suite-script.js`

1. **Configure the Script File**:
   - Open `EmailProcessor.suite-script.js`.
   - Update `GMAIL_CONFIG` with your new credentials:
     ```javascript
     var GMAIL_CONFIG = {
         CLIENT_ID: 'YOUR_CLIENT_ID',
         CLIENT_SECRET: 'YOUR_CLIENT_SECRET',
         REFRESH_TOKEN: 'YOUR_NEW_REFRESH_TOKEN', // From Step 2B
         INBOX_EMAIL: 'simmonspatrick1@gmail.com',
         // ...
     };
     ```

2. **Upload to NetSuite**:
   - Go to **Customization > Scripting > Scripts > New**.
   - Script Type: **Scheduled Script**.
   - Upload `EmailProcessor.suite-script.js`.
   - Name: "Email Processor Script".

3. **Deploy the Script**:
   - Click **Deploy Script**.
   - Status: **Testing**.
   - Log Level: **Audit**.
   - Schedule: Run every **15 minutes**.
   - Roles: Execute as Administrator (to ensure record creation permissions).

---

## Step 4: Testing & Verification

### 1. Send a Test Export
   - Go to your Dashboard.
   - Click "Export to Email" on a customer.
   - Send the email to `simmonspatrick1@gmail.com`.

### 2. Run the Script Manually
   - In NetSuite, go to the Script Deployment page.
   - Click **Save & Execute** to trigger an immediate run.

### 3. Check Logs
   - Go to the **Execution Log** subtab on the deployment.
   - You should see:
     - "Starting email processing..."
     - "Auth: Access token refreshed successfully"
     - "Found 1 emails to process"
     - "Success: Processed email..."
     - "Customer Created..."

### 4. Verify Records
   - Search for the Customer/Project in NetSuite to confirm they were created.

---

## Step 5: Hashtag Format Reference

The script parses these hashtags from the email body:

### Customer Fields
```
#customerName: Company Name
#customerEntityId: COMPANY-001
#customerIndustry: Professional Services
#customerEmail: contact@company.com
#customerPhone: (555) 123-4567
#customerRevenue: $500K
#customerSize: 100-200 employees
```

### Project Fields
```
#projectName: NTI Implementation
#projectCode: PRJ-001
#projectStartDate: 2024-01-01
#projectBudget: $150000
#projectStatus: OPEN
```

### Estimate Fields
```
#estimateType: T&M
#estimateTotal: $50000
#estimateItems:
  - Professional Services: Qty=100, Rate=150
  - Software Licensing: Qty=12, Rate=500
```

### Modules & Tasks
```
#modules: SuiteProjects,FAM,FSM

#tasks:
  Task 1: Requirement Gathering
    Estimated Hours: 40
    Assignee: John Doe
    Due Date: 2024-01-15
```

---

## Troubleshooting

### "Failed to refresh access token"
- **Cause**: Invalid Client ID, Secret, or Refresh Token.
- **Fix**: Re-run `node scripts/setup-gmail-auth.js` to generate a new Refresh Token and update the script.

### "Gmail API Error: 403 Forbidden"
- **Cause**: The API is not enabled in Google Cloud.
- **Fix**: Go to Google Cloud Console > APIs & Services > Library > Enable **Gmail API**.

### "No emails found"
- **Cause**: Email query doesn't match or email is already read (if filtering by unread).
- **Fix**: Check `QUERY` in script configuration. Default is `subject:"NetSuite Export"`.

---

**Last Updated**: November 2025
**Version**: 2.0 (OAuth Refresh Token Flow)
