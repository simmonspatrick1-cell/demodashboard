# NetSuite Deployment Checklist

Follow these steps to deploy your customer search integration to NetSuite.

## 📋 Pre-Deployment Checklist

- [x] Backend API running (port 3004)
- [x] Frontend app running (port 3000)
- [x] Customer search tested in mock mode
- [ ] NetSuite account access
- [ ] Administrator or Developer role in NetSuite
- [ ] RESTlet script uploaded
- [ ] Token-Based Authentication configured
- [ ] Environment variables updated

---

## Step 1: Deploy the RESTlet to NetSuite

### 1.1 Upload the Script File

1. **Log into NetSuite**
   - Use your NetSuite account: `td3049589`

2. **Navigate to Scripts**
   - Go to: **Customization > Scripting > Scripts > New**

3. **Upload the File**
   - Click **SuiteScript 2.x**
   - Click **Upload File**
   - Select: `netsuite-restlet.js` from your project folder
   - Or copy/paste the contents from the file

4. **Create Script Record**
   - Click **Create Script Record**
   - Script Type: **RESTlet**

### 1.2 Configure the Script

1. **Script Details**:
   ```
   Name: Demo Dashboard Integration RESTlet
   ID: customscript_demo_dashboard_restlet (auto-generated)
   Owner: [Your User]
   ```

2. **Save** the script

3. **Note the Script ID** (will be something like `5147` or similar)

### 1.3 Create Deployment

1. Go to **Deployments** subtab
2. Click **New Deployment**
3. Configure:
   ```
   Title: Demo Dashboard Production
   ID: customdeploy_demo_dashboard_prod (auto-generated)
   Status: RELEASED ✓
   Log Level: DEBUG (change to ERROR after testing)
   Execute As Role: Administrator
   ```

4. **Audience**:
   - Select **All Roles** OR
   - Select specific roles that need access

5. **Save** the deployment

6. **Copy the External URL** - it will look like:
   ```
   https://td3049589.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=XXXX&deploy=X
   ```

7. **Note the Script and Deploy IDs** from the URL:
   - Script ID: the number after `script=`
   - Deploy ID: the number after `deploy=`

---

## Step 2: Set Up Token-Based Authentication (TBA)

### 2.1 Create Integration Record

1. **Navigate to Integrations**
   - Go to: **Setup > Integration > Manage Integrations > New**

2. **Configure Integration**:
   ```
   Name: Demo Dashboard Integration
   Description: Customer search and project sync integration
   State: ENABLED ✓
   ```

3. **Authentication**:
   - Check: **Token-Based Authentication** ✓
   - Uncheck: **TBA: Authorization Flow** (we don't need this)
   - Uncheck: **User Credentials** (we don't need this)

4. **Concurrency Limit**: Leave default or set to 10

5. **Save**

6. **IMPORTANT**: Copy these values immediately (you won't see them again):
   ```
   Consumer Key: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Consumer Secret: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   ```

### 2.2 Create Access Token

1. **Navigate to Access Tokens**
   - Go to: **Setup > Users/Roles > Access Tokens > New**

2. **Configure Token**:
   ```
   Application Name: Demo Dashboard Integration (select from dropdown)
   User: [Your User]
   Role: Administrator (or appropriate role)
   Token Name: Demo Dashboard Token
   ```

3. **Save**

4. **IMPORTANT**: Copy these values immediately:
   ```
   Token ID: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Token Secret: yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
   ```

---

## Step 3: Update Your .env File

Now update your `.env` file with all the credentials you collected:

```bash
# NetSuite Account
NETSUITE_ACCOUNT_ID=td3049589

# RESTlet URL (from Step 1.3)
NETSUITE_REST_URL=https://td3049589.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=XXXX&deploy=X

# TBA Credentials (from Step 2.1)
NETSUITE_CONSUMER_KEY=your_consumer_key_here
NETSUITE_CONSUMER_SECRET=your_consumer_secret_here

# Access Token (from Step 2.2)
NETSUITE_TOKEN_ID=your_token_id_here
NETSUITE_TOKEN_SECRET=your_token_secret_here

# Disable mock mode
MOCK_NETSUITE_SYNC=false

# Other settings
ANTHROPIC_API_KEY=your_existing_key
PORT=3004
CORS_ORIGIN=http://localhost:3000
```

---

## Step 4: Test the Connection

### 4.1 Restart the Backend

```bash
# Stop the current backend (Ctrl+C if running in terminal)
# Or kill the process
pkill -f "node backend-server.js"

# Start it again
npm run dev
```

### 4.2 Test Customer Search

```bash
# Test the customer search endpoint
curl "http://localhost:3004/api/customers/search?q=test"
```

**Expected**: You should see real customers from your NetSuite account instead of mock data.

### 4.3 Test in the Browser

1. Open: http://localhost:3000
2. Click **Customer Demo**
3. Try searching for a real customer
4. If you see real customer data, it's working! 🎉

### 4.4 Test Project Creation

1. Select a real customer
2. Fill in the form
3. Click "Create Project in NetSuite"
4. Check NetSuite to verify the project was created

---

## Troubleshooting

### Error: "INVALID_LOGIN_CREDENTIALS"

**Cause**: TBA credentials are incorrect

**Solution**:
1. Verify Consumer Key/Secret in `.env`
2. Verify Token ID/Secret in `.env`
3. Make sure the integration is ENABLED in NetSuite
4. Check that the token hasn't expired

### Error: "SSS_MISSING_REQD_ARGUMENT"

**Cause**: Required parameter missing in request

**Solution**: Check the request payload - make sure customerId and projectName are included

### Error: "INVALID_RCRD_REF: Invalid customer reference"

**Cause**: Customer ID doesn't exist in NetSuite

**Solution**: Use the customer search to get valid IDs first

### Error: "USER_ERROR: You do not have permissions..."

**Cause**: The role associated with the token doesn't have permissions

**Solution**:
1. Go to **Setup > Users/Roles > Manage Roles**
2. Find the role used in the access token
3. Add necessary permissions (Customers, Projects, Tasks)

### No Customers Returned

**Cause**: Search filters too restrictive or permissions issue

**Solution**:
1. Try searching with empty query to get all customers
2. Check that the role has "View" permission on Customers
3. Check NetSuite execution logs for errors

### Check NetSuite Execution Logs

1. Go to: **Customization > Scripting > Script Execution Log**
2. Filter by your RESTlet script
3. Check for errors in the Details column

---

## Success Criteria

✅ Backend starts without errors
✅ Customer search returns real NetSuite customers
✅ Can select and view customer details
✅ Project creation succeeds in NetSuite
✅ Tasks are created under the project
✅ No errors in backend logs
✅ No errors in NetSuite execution logs

---

## Security Notes

⚠️ **Never commit your .env file to version control**

The `.env` file contains sensitive credentials. Make sure it's in your `.gitignore`:

```bash
# Check if .env is ignored
cat .gitignore | grep .env

# If not, add it
echo ".env" >> .gitignore
```

⚠️ **Rotate credentials periodically**

Change your TBA credentials every 90 days as a security best practice.

---

## Next Steps After Deployment

1. **Set Log Level to ERROR** in the RESTlet deployment (reduce noise)
2. **Monitor Usage** for the first few days
3. **Set up Error Notifications** (optional)
4. **Document** which roles/users have access
5. **Test** with different user roles
6. **Backup** your custom templates and configurations

---

## Support

- **NetSuite Issues**: Check NetSuite Help Center or SuiteScript documentation
- **Integration Issues**: Check backend logs with `npm run dev`
- **Frontend Issues**: Check browser console (F12)
- **API Testing**: Use `./test-customer-api.sh` script

---

## Quick Reference

### Important URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3004
- **Health Check**: http://localhost:3004/api/health
- **Customer Search**: http://localhost:3004/api/customers/search
- **Project Sync**: http://localhost:3004/api/projects/sync

### Important Files

- `netsuite-restlet.js` - Upload this to NetSuite
- `.env` - Configure with NetSuite credentials
- `backend-server.js` - Backend API server
- `api/customers.js` - Customer search endpoint
- `api/projects.js` - Project sync endpoint

### Test Commands

```bash
# Test health
curl http://localhost:3004/api/health

# Test customer search
curl "http://localhost:3004/api/customers/search?q=test"

# Test project sync
curl -X POST http://localhost:3004/api/projects/sync \
  -H "Content-Type: application/json" \
  -d '{"customerId":123,"account":"TEST","prospectName":"Test","industry":"Tech","prompts":["test"]}'
```
