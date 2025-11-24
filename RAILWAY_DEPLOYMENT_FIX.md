# Railway Deployment Fix

## Issues Found

### 1. **Missing Environment Variable**
The `backend-server.js` exits immediately if `ANTHROPIC_API_KEY` is not set (line 20-24). The Dockerfile was setting it to an empty string, which fails the validation.

### 2. **Dockerfile Issues Fixed**
- ✅ Removed `COPY .env* ./` line (env files are in .dockerignore anyway)
- ✅ Removed empty `ENV ANTHROPIC_API_KEY=""` that was causing validation to fail

## Required Railway Environment Variables

Make sure these are set in your Railway project settings:

1. **ANTHROPIC_API_KEY** (Required)
   - Your Anthropic/Claude API key
   - Without this, the server will exit on startup

2. **NETSUITE_ACCOUNT_ID** (Optional, defaults to "demo")
   - Your NetSuite account ID

3. **NETSUITE_CONSUMER_KEY** (Required for NetSuite sync)
   - OAuth consumer key

4. **NETSUITE_CONSUMER_SECRET** (Required for NetSuite sync)
   - OAuth consumer secret

5. **NETSUITE_TOKEN_ID** (Required for NetSuite sync)
   - OAuth token ID

6. **NETSUITE_TOKEN_SECRET** (Required for NetSuite sync)
   - OAuth token secret

7. **PORT** (Optional, defaults to 3001)
   - Railway will set this automatically, but you can override

## How to Fix in Railway

1. Go to your Railway project: https://railway.com/project/[your-project-id]/service/[service-id]

2. Click on **Settings** tab

3. Scroll to **Environment Variables** section

4. Add the required variables:
   - `ANTHROPIC_API_KEY` = Your API key
   - `NETSUITE_ACCOUNT_ID` = Your NetSuite account ID
   - `NETSUITE_CONSUMER_KEY` = Your OAuth consumer key
   - `NETSUITE_CONSUMER_SECRET` = Your OAuth consumer secret
   - `NETSUITE_TOKEN_ID` = Your OAuth token ID
   - `NETSUITE_TOKEN_SECRET` = Your OAuth token secret

5. Click **Deploy** or trigger a new deployment

## Testing the Fix

After setting environment variables, the deployment should:
1. ✅ Build successfully (Dockerfile is fixed)
2. ✅ Start the server (ANTHROPIC_API_KEY is set)
3. ✅ Pass health checks (server responds on /api/health)

## Verification

Once deployed, test the health endpoint:
```bash
curl https://demodashboard-production.up.railway.app/api/health
```

Expected response:
```json
{"status":"ok","timestamp":"..."}
```

