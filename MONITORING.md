# 📊 Monitoring & Analytics Guide

## Overview

Your NetSuite Dashboard now includes comprehensive monitoring capabilities to track performance, errors, and system health in production.

## 🎯 What's Being Monitored

### Frontend Metrics
- **Page Views**: Track user sessions and page navigation
- **API Calls**: Monitor all backend API requests
- **Errors**: Capture runtime errors and unhandled rejections
- **Performance**: Track API response times and slow queries

### Backend Metrics
- **Server Uptime**: How long the backend has been running
- **Memory Usage**: RAM consumption and heap statistics
- **Cache Performance**: Number of cached entries
- **Error Logs**: Server-side errors and exceptions

## 🚀 Quick Start

### 1. View Monitoring Dashboard

Access the monitoring dashboard in your application (if integrated into UI) or check metrics programmatically:

```javascript
import { getMetrics } from './src/monitoring';

const metrics = getMetrics();
console.log(metrics);
// Output:
// {
//   pageViews: 42,
//   apiCalls: 156,
//   errors: 2,
//   avgResponseTime: 245,
//   errorRate: "1.28"
// }
```

### 2. Track Custom Events

```javascript
import { logEvent, trackInteraction } from './src/monitoring';

// Log custom events
logEvent('estimate_created', {
  customerId: 123,
  total: 50000
});

// Track user interactions
trackInteraction('button_click', {
  button: 'sync_netsuite',
  location: 'customer_panel'
});
```

### 3. Monitor API Performance

```javascript
import { wrapAsync } from './src/monitoring';

// Wrap async functions to auto-track performance
const data = await wrapAsync(
  () => fetch('/api/netsuite/sync').then(r => r.json()),
  'netsuite_sync'
);
```

## 📈 Accessing Metrics

### Frontend Client Metrics

The monitoring system automatically tracks:
- ✅ Unhandled JavaScript errors
- ✅ Promise rejections
- ✅ Page visibility changes
- ✅ API call duration and status

### Backend Server Metrics

**Endpoint**: `GET /api/monitoring/metrics`

```bash
curl https://demodashboard-production.up.railway.app/api/monitoring/metrics
```

**Response**:
```json
{
  "server": {
    "uptime": 3600,
    "memory": {
      "heapUsed": 45678912,
      "heapTotal": 67108864
    },
    "env": "production"
  },
  "cache": {
    "size": 42
  }
}
```

## 🔍 Built-in Monitoring Services

### 1. Vercel Analytics (Frontend)

Your frontend is automatically monitored by Vercel:

- **Web Analytics**: https://vercel.com/[your-project]/analytics
- **Real User Monitoring (RUM)**: Track Core Web Vitals
- **Deployment Analytics**: Monitor build times and errors

**To Enable**:
1. Go to your Vercel project dashboard
2. Navigate to "Analytics" tab
3. Enable Web Analytics (free tier available)

### 2. Railway Observability (Backend)

Your backend is monitored in Railway:

- **Logs**: https://railway.app/project/[id]/observability
- **Metrics**: CPU, Memory, Network usage
- **Deployment History**: Track deployments and rollbacks

**To Access**:
1. Go to Railway project dashboard
2. Click "Observability" tab
3. View real-time logs and metrics

## ⚠️ Error Tracking

### Automatic Error Capture

The monitoring system automatically captures:

```javascript
// Runtime errors
window.addEventListener('error', ...);  // ✅ Captured

// Unhandled promises
window.addEventListener('unhandledrejection', ...);  // ✅ Captured

// API errors
try {
  await fetch('/api/endpoint');
} catch (error) {
  // ✅ Automatically logged if using wrapAsync
}
```

### Manual Error Logging

```javascript
import { logError } from './src/monitoring';

try {
  // Your code
} catch (error) {
  logError({
    type: 'custom_error',
    message: error.message,
    stack: error.stack,
    context: { userId: 123, action: 'sync' }
  });
}
```

### Error Logs Location

- **Frontend**: Sent to `/api/monitoring/error` and logged on backend
- **Backend**: Written to `logs/app.log` in production
- **Railway**: Available in Railway dashboard under "Logs"

## 📊 Recommended External Services (Optional)

### For Advanced Monitoring

1. **Sentry** (Error Tracking)
   - Best for detailed error reporting and stack traces
   - Free tier: 5,000 errors/month
   - Setup: https://sentry.io

2. **LogRocket** (Session Replay)
   - Record user sessions to debug issues
   - See exactly what users experienced
   - Free tier: 1,000 sessions/month

3. **UptimeRobot** (Uptime Monitoring)
   - Monitor if your site is accessible
   - Free tier: 50 monitors, 5-minute intervals
   - Setup: Create HTTP(s) monitor for https://demodashboard-mu.vercel.app

4. **Better Stack** (formerly Logtail)
   - Centralized log management
   - Search and filter logs
   - Free tier available

## 🎯 Setting Up External Monitoring (Optional)

### UptimeRobot Setup (5 minutes)

1. Go to https://uptimerobot.com
2. Sign up for free account
3. Click "Add New Monitor"
4. Configure:
   - **Monitor Type**: HTTP(s)
   - **Friendly Name**: NetSuite Dashboard Frontend
   - **URL**: https://demodashboard-mu.vercel.app
   - **Monitoring Interval**: 5 minutes
5. Add email alerts
6. Repeat for backend: https://demodashboard-production.up.railway.app/api/health

### Sentry Setup (10 minutes)

1. Create account at https://sentry.io
2. Create new project (React)
3. Install Sentry SDK:
   ```bash
   npm install @sentry/react
   ```
4. Initialize in your app:
   ```javascript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: "your-sentry-dsn",
     environment: import.meta.env.MODE,
     tracesSampleRate: 1.0,
   });
   ```

## 📱 Monitoring Dashboard

### Built-in Monitoring Component

Import and use the MonitoringDashboard component:

```jsx
import MonitoringDashboard from './src/MonitoringDashboard';

// Add to your settings or admin panel
<MonitoringDashboard />
```

This displays:
- Real-time page views and API calls
- Error count and rate
- Average API response time
- Server uptime and memory usage
- System health status

## 🚨 Alerts & Notifications

### Set Up Alerts

1. **Vercel Deployment Alerts**
   - Project Settings → Notifications
   - Enable "Failed Deployments" email alerts

2. **Railway Deployment Alerts**
   - Project Settings → Notifications
   - Enable deployment notifications

3. **UptimeRobot Alerts** (if set up)
   - Automatic email/SMS when site goes down
   - Configurable alert contacts

## 📈 Key Metrics to Watch

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Error Rate | < 0.1% | 0.1-1% | > 1% |
| Avg Response Time | < 500ms | 500ms-2s | > 2s |
| Uptime | > 99.9% | 99-99.9% | < 99% |
| Memory Usage | < 80% | 80-95% | > 95% |

## 🔧 Troubleshooting

### High Error Rate
1. Check Railway logs for backend errors
2. Check Vercel logs for frontend issues
3. Review error details in monitoring dashboard
4. Check NetSuite API connectivity

### Slow Response Times
1. Check Railway metrics for CPU/Memory spikes
2. Review cache hit rate
3. Check NetSuite API latency
4. Consider adding more caching

### High Memory Usage
1. Check cache size (`/api/monitoring/metrics`)
2. Clear cache if needed (`POST /api/cache/clear`)
3. Review memory leaks in Railway dashboard
4. Consider restarting the service

## 🎓 Best Practices

1. **Check Metrics Regularly**
   - Review monitoring dashboard weekly
   - Set up automated alerts
   - Monitor trends over time

2. **Investigate All Errors**
   - Don't ignore small error counts
   - Fix errors before they become widespread
   - Track error patterns

3. **Optimize Performance**
   - Keep avg response time < 500ms
   - Use caching effectively
   - Optimize heavy API calls

4. **Plan for Scale**
   - Monitor memory trends
   - Watch API call volumes
   - Plan upgrades before hitting limits

## 📞 Support Resources

- **Vercel Docs**: https://vercel.com/docs/analytics
- **Railway Docs**: https://docs.railway.app/reference/observability
- **Monitoring Issues**: Check logs first, then contact platform support

---

## 🎉 You're All Set!

Your NetSuite Dashboard now has comprehensive monitoring capabilities. The system will:
- ✅ Automatically track errors and performance
- ✅ Send errors to backend for logging
- ✅ Provide real-time metrics via API
- ✅ Enable you to debug issues quickly

**Next Steps**:
1. Test the monitoring system in production
2. Set up external uptime monitoring (optional)
3. Configure alert notifications
4. Review metrics weekly

Happy monitoring! 📊
