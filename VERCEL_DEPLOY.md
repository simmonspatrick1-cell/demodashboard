# Deploying to Vercel

## Quick Deploy

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Navigate to project directory**:
   ```bash
   cd "/Users/simmonspatrick1/Library/Mobile Documents/com~apple~CloudDocs/Cursor Files/demodashboard"
   ```

4. **Deploy**:
   ```bash
   vercel
   ```
   
   Follow the prompts:
   - Link to existing project? **No** (first time)
   - Project name: **demo-dashboard** (or your choice)
   - Directory: **.** (current directory)
   - Override settings? **No**

5. **Set Environment Variables**:
   ```bash
   vercel env add ANTHROPIC_API_KEY
   # Paste your API key when prompted
   
   vercel env add NETSUITE_ACCOUNT_ID
   # Enter: td3049589
   ```

6. **Deploy to Production**:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com)** and sign in

2. **Click "Add New" → "Project"**

3. **Import your Git repository**:
   - If using GitHub/GitLab: Connect your repo
   - If not using Git: Use Vercel CLI (Option 1 above)

4. **Configure Project**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Add Environment Variables**:
   - `ANTHROPIC_API_KEY` = Your Anthropic API key
   - `NETSUITE_ACCOUNT_ID` = `td3049589`

6. **Click "Deploy"**

## Environment Variables Required

Make sure to set these in Vercel Dashboard → Settings → Environment Variables:

- `ANTHROPIC_API_KEY` - Your Anthropic API key (starts with `sk-ant-...`)
- `NETSUITE_ACCOUNT_ID` - `td3049589` (already configured, but verify)

## After Deployment

Once deployed, your site will be live at:
- **Preview URL**: `https://demo-dashboard-[hash].vercel.app`
- **Production URL**: `https://demo-dashboard.vercel.app` (or your custom domain)

## Testing

1. **Health Check**: Visit `https://your-app.vercel.app/api/health`
2. **Test Email Export**: Use the dashboard's "Export to Email" button
3. **Check Logs**: Go to Vercel Dashboard → Deployments → Logs

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Ensure Node.js version is >= 18.0.0
- Check build logs in Vercel dashboard

### API Routes Not Working
- Verify environment variables are set
- Check that `/api` routes are in the `api/` folder
- Review function logs in Vercel dashboard

### CORS Errors
- API routes should work automatically with Vercel
- Check `vercel.json` headers configuration

## Notes

- The React app will be served as static files
- API routes in `/api` folder are serverless functions
- Email export uses client-side `mailto:` links (works in browser)
- NetSuite MCP integration requires your `ANTHROPIC_API_KEY` to be set

