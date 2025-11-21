# 🚀 NetSuite Dashboard - Quick Reference

## 📍 Your Deployment URLs

| Service | URL | Status |
|---------|-----|--------|
| **Frontend** | https://demodashboard-mu.vercel.app | ✅ Live |
| **Backend** | https://demodashboard-production.up.railway.app | ✅ Live |
| **Health Check** | https://demodashboard-production.up.railway.app/api/health | ✅ Active |

---

## 🔑 Quick Commands

### Test Backend Health
```bash
curl https://demodashboard-production.up.railway.app/api/health
```

### View Server Metrics
```bash
curl https://demodashboard-production.up.railway.app/api/monitoring/metrics
```

### Build Locally
```bash
npm run build
```

### Run Development Server
```bash
npm run dev
```

---

## 🎛️ Monitoring & Metrics

### Access Monitoring
- **Vercel Dashboard**: https://vercel.com/dashboard
- **Railway Dashboard**: https://railway.app/dashboard
- **Vercel Analytics**: Your Project → Analytics tab
- **Railway Logs**: Your Project → Observability tab

### Key Endpoints
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Check backend health |
| `/api/monitoring/metrics` | GET | Server performance metrics |
| `/api/monitoring/error` | POST | Log frontend errors |
| `/api/cache/clear` | POST | Clear server cache |

---

## 🔧 Environment Variables

### Railway (Backend)
```bash
ANTHROPIC_API_KEY=sk-ant-...
NETSUITE_ACCOUNT_ID=td3049589
NETSUITE_CONSUMER_KEY=...
NETSUITE_CONSUMER_SECRET=...
NETSUITE_TOKEN_ID=...
NETSUITE_TOKEN_SECRET=...
NETSUITE_REST_URL=https://...
CORS_ORIGIN=*
NODE_ENV=production
```

### Vercel (Frontend)
```bash
VITE_API_URL=https://demodashboard-production.up.railway.app
```

---

## 🚨 Troubleshooting

### Frontend Not Loading
1. Check Vercel deployment status
2. Check browser console for errors
3. Verify API proxy configuration in vercel.json

### Backend Errors
1. Check Railway logs
2. Verify environment variables are set
3. Test health endpoint
4. Check NetSuite credentials

### API Not Responding
1. Verify Railway backend is running
2. Check CORS configuration
3. Test backend health endpoint directly
4. Review Railway deployment logs

### Build Failures
1. Check build logs in Vercel/Railway
2. Verify all dependencies in package.json
3. Test build locally: `npm run build`
4. Check Node version (>=18.0.0)

---

## 📊 Monitoring Metrics

### What to Watch
- **Error Rate**: Should be < 0.1%
- **Response Time**: Should be < 500ms average
- **Uptime**: Should be > 99.9%
- **Memory**: Should be < 80% usage

### Where to Check
- **Vercel**: Analytics tab in project dashboard
- **Railway**: Observability tab for logs and metrics
- **Custom**: `/api/monitoring/metrics` endpoint

---

## 🔄 Deployment Workflow

### Automatic Deployments
```bash
git add .
git commit -m "your message"
git push
# ✅ Auto-deploys to both Vercel and Railway
```

### Manual Vercel Deployment
```bash
vercel --prod
```

### Manual Railway Deployment
```bash
railway up
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `DemoDashboard.jsx` | Main dashboard component |
| `backend-server.js` | Express backend server |
| `vercel.json` | Vercel deployment config |
| `package.json` | Dependencies and scripts |
| `src/monitoring.js` | Monitoring utility |
| `MONITORING.md` | Monitoring documentation |
| `PRODUCTION_DEPLOYMENT.md` | Full deployment guide |

---

## 🎯 Common Tasks

### Add New Prospect
1. Open https://demodashboard-mu.vercel.app
2. Click "+ Add Prospect"
3. Fill in required fields (Name, Entity ID)
4. Click "Add Prospect"

### Sync to NetSuite
1. Select a prospect
2. Click "Sync to NetSuite"
3. Check Railway logs for sync status

### Clear Backend Cache
```bash
curl -X POST https://demodashboard-production.up.railway.app/api/cache/clear
```

### View Logs
- **Vercel**: Project → Deployments → [Select deployment] → Logs
- **Railway**: Project → Observability → View logs

---

## 🆘 Support Resources

### Documentation
- [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md)
- [Monitoring Guide](MONITORING.md)
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)

### Dashboards
- **Vercel**: https://vercel.com/dashboard
- **Railway**: https://railway.app/dashboard
- **GitHub**: https://github.com/simmonspatrick1-cell/demodashboard

### Status Pages
- **Vercel Status**: https://www.vercel-status.com
- **Railway Status**: https://railway.statuspage.io

---

## ✅ Health Checklist

Run this checklist weekly:

- [ ] Check Vercel deployment status
- [ ] Check Railway deployment status
- [ ] Test frontend loads: https://demodashboard-mu.vercel.app
- [ ] Test backend health: `/api/health`
- [ ] Review error rates in monitoring
- [ ] Check server metrics: `/api/monitoring/metrics`
- [ ] Review Railway logs for issues
- [ ] Verify NetSuite sync is working
- [ ] Test API response times

---

## 🎉 Quick Wins

### Enable Vercel Analytics (2 minutes)
1. Go to Vercel project dashboard
2. Click "Analytics" tab
3. Click "Enable Web Analytics"
4. Done! Track visitors and performance

### Set Up Uptime Monitoring (5 minutes)
1. Go to https://uptimerobot.com
2. Create free account
3. Add monitor for: https://demodashboard-mu.vercel.app
4. Add email alert
5. Done! Get notified if site goes down

### View Real-Time Logs (1 minute)
1. Go to Railway dashboard
2. Click your project
3. Click "Observability"
4. Watch logs in real-time

---

**Last Updated**: 2025-11-21
**Version**: 1.0.0
**Status**: ✅ Production Ready
