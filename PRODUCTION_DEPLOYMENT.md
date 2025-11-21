# 🚀 **NetSuite Dashboard - Production Deployment Guide**

## 📋 **Executive Summary**

This guide provides step-by-step instructions for deploying the NetSuite Dashboard to production. The system has been thoroughly tested and optimized for enterprise-scale deployment with robust error handling, monitoring, and security features.

## 🎯 **Pre-Deployment Checklist**

### ✅ **System Requirements Verified**
- [x] Node.js 18+ compatibility
- [x] Docker & Docker Compose support
- [x] Gmail API access for email processing
- [x] NetSuite account with SuiteScript access
- [x] SSL certificates for HTTPS

### ✅ **Code Quality Assured**
- [x] Comprehensive field validation
- [x] Error handling and fallbacks
- [x] Performance optimization
- [x] Security hardening
- [x] Monitoring and logging

---

## 🛠️ **Step 1: Environment Setup**

### **1.1 Clone and Prepare Repository**
```bash
# Clone the repository
git clone <your-repo-url>
cd netsuite-dashboard

# Create production environment file
cp .env.example .env.production

# Edit with your production values
nano .env.production
```

### **1.2 Production Environment Configuration**
```bash
# .env.production content:
# ==========================================
# BACKEND CONFIGURATION
# ==========================================
PORT=3001
NODE_ENV=production

# NetSuite Integration (REQUIRED)
NETSUITE_ACCOUNT_ID=your_production_account_id
ANTHROPIC_API_KEY=sk-ant-api03-your_production_key

# ==========================================
# FRONTEND CONFIGURATION
# ==========================================
REACT_APP_API_URL=https://api.yourdomain.com

# ==========================================
# DEPLOYMENT SPECIFIC
# ==========================================
COMPOSE_PROJECT_NAME=netsuite-dashboard-prod
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://dashboard.yourdomain.com

# ==========================================
# PRODUCTION MONITORING
# ==========================================
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=warn

# ==========================================
# SECURITY
# ==========================================
ALLOWED_ORIGINS=https://dashboard.yourdomain.com,https://admin.yourdomain.com
```

### **1.3 Domain and SSL Setup**
```bash
# Obtain SSL certificates (Let's Encrypt recommended)
certbot certonly --webroot -w /var/www/html -d yourdomain.com -d api.yourdomain.com

# Configure Nginx for SSL termination
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 🐳 **Step 2: Docker Production Deployment**

### **2.1 Production Docker Compose**
```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  # Production Backend
  backend:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: netsuite-backend-prod
    ports:
      - "3001:3001"
    env_file:
      - .env.production
    environment:
      - NODE_ENV=production
      - PORT=3001
    volumes:
      - ./logs:/app/logs
      - ./.env.production:/app/.env:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:3001/api/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - netsuite-prod
    depends_on:
      - redis

  # Production Frontend
  frontend:
    build:
      context: ./netsuite-dashboard
      dockerfile: Dockerfile
    container_name: netsuite-frontend-prod
    ports:
      - "80:80"
    environment:
      - REACT_APP_API_URL=https://api.yourdomain.com
    depends_on:
      backend:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - netsuite-prod

  # Redis for caching
  redis:
    image: redis:7-alpine
    container_name: netsuite-redis-prod
    ports:
      - "6379:6379"
    volumes:
      - redis_prod_data:/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 3s
      retries: 3
    networks:
      - netsuite-prod
    command: redis-server --appendonly yes --requirepass your_redis_password

  # Nginx Reverse Proxy
  nginx:
    image: nginx:alpine
    container_name: netsuite-nginx-prod
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/ssl/certs:ro
    depends_on:
      - frontend
      - backend
    restart: unless-stopped
    networks:
      - netsuite-prod

networks:
  netsuite-prod:
    driver: bridge

volumes:
  redis_prod_data:
    driver: local
```

### **2.2 Production Dockerfile Optimizations**
```dockerfile
# Dockerfile.prod (optimized for production)
FROM node:18-alpine

# Install security updates and curl for health checks
RUN apk update && apk upgrade && apk add --no-cache curl dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files first for better caching
COPY --chown=nodejs:nodejs package*.json ./

# Install production dependencies only
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . .

# Copy production environment file
COPY --chown=nodejs:nodejs .env.production .env

# Create logs directory
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend-server.js"]
```

### **2.3 Deploy to Production**
```bash
# Build and deploy
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 📧 **Step 3: NetSuite SuiteScript Deployment**

### **3.1 SuiteScript Upload**
1. **Login to NetSuite** as Administrator
2. **Navigate to**: Customization → Scripting → Scripts → New
3. **Upload Script**:
   - **Name**: Email Processor SuiteScript
   - **ID**: _email_processor_prod
   - **Type**: Scheduled Script
   - **File**: `EmailProcessor.suite-script.js`

### **3.2 Configure Script Parameters**
```
custscript_gmail_client_id: [Your Gmail OAuth Client ID]
custscript_gmail_client_secret: [Your Gmail OAuth Client Secret]
custscript_gmail_refresh_token: [Your Gmail OAuth Refresh Token]
custscript_inbox_email: monitoring@yourdomain.com
```

### **3.3 Create Scheduled Script Deployment**
1. **Navigate to**: Customization → Scripting → Script Deployments → New
2. **Configure**:
   - **Script**: Email Processor SuiteScript
   - **Title**: Email Processor - Production
   - **ID**: _email_processor_prod_deploy
   - **Status**: Released
   - **Schedule**: Every 15 minutes
   - **Owner**: System Administrator

### **3.4 Test SuiteScript Execution**
```javascript
// Test the script manually in NetSuite
// Go to: Customization → Scripting → Script Deployments
// Select your deployment and click "Save & Execute"

// Check execution log for any errors
```

---

## 📮 **Step 4: Gmail API Production Setup**

### **4.1 Create Production Gmail Account**
```bash
# Create dedicated Gmail account for production
# monitoring@yourdomain.com (recommended)

# Enable 2FA on the account
# Generate App Password for additional security
```

### **4.2 Gmail API OAuth Setup**
1. **Go to Google Cloud Console**
2. **Create/select project** for production
3. **Enable Gmail API**
4. **Create OAuth 2.0 credentials**:
   - **Application type**: Web application
   - **Authorized redirect URIs**: `https://yourdomain.com/oauth2callback`
   - **Authorized JavaScript origins**: `https://yourdomain.com`

### **4.3 Generate Refresh Token**
```bash
# Use OAuth 2.0 Playground or custom script
# https://developers.google.com/oauthplayground/

# Required scopes:
# https://www.googleapis.com/auth/gmail.readonly
# https://www.googleapis.com/auth/gmail.modify

# Store the refresh token securely in NetSuite script parameters
```

### **4.4 Email Monitoring Setup**
```javascript
// SuiteScript configuration for production email monitoring
var GMAIL_CONFIG = {
    CLIENT_ID: 'your_production_client_id',
    CLIENT_SECRET: 'your_production_client_secret',
    REFRESH_TOKEN: 'your_production_refresh_token',
    INBOX_EMAIL: 'monitoring@yourdomain.com',
    QUERY: 'subject:"NetSuite Export" has:nouserlabels',
    USER_ID: 'me'
};
```

---

## 🔍 **Step 5: Monitoring & Health Checks**

### **5.1 Backend Health Checks**
```bash
# Test backend API
curl -k https://api.yourdomain.com/api/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-01-21T...",
  "version": "1.0.0",
  "uptime": 3600,
  "env": "production"
}
```

### **5.2 Frontend Health Checks**
```bash
# Test frontend loading
curl -I https://dashboard.yourdomain.com

# Check for 200 OK response
# Verify assets load correctly
```

### **5.3 NetSuite Integration Tests**
```javascript
// Test SuiteScript execution
// 1. Send test email to monitoring@yourdomain.com
// 2. Check NetSuite for created records
// 3. Verify SuiteScript execution logs
```

### **5.4 Monitoring Setup**
```bash
# Install monitoring stack (optional but recommended)
docker run -d \
  --name prometheus \
  -p 9090:9090 \
  prom/prometheus

docker run -d \
  --name grafana \
  -p 3000:3000 \
  grafana/grafana
```

### **5.5 Log Aggregation**
```bash
# Configure log shipping to external service
# Options: ELK Stack, Splunk, CloudWatch, etc.

# Example: Send logs to external service
docker run -d \
  --name logstash \
  -v /path/to/logstash.conf:/usr/share/logstash/pipeline/logstash.conf \
  docker.elastic.co/logstash/logstash:8.5.0
```

---

## 🔒 **Step 6: Security Hardening**

### **6.1 Environment Security**
```bash
# Use strong, unique passwords
# Rotate API keys regularly
# Store secrets in secure parameter stores

# Example: AWS Systems Manager Parameter Store
aws ssm put-parameter \
  --name "/netsuite/prod/anthropic-key" \
  --value "sk-ant-api03-your_key" \
  --type "SecureString"
```

### **6.2 Network Security**
```bash
# Configure firewall rules
ufw allow 443/tcp
ufw allow 80/tcp
ufw --force enable

# Use security groups in cloud deployments
# Restrict access to necessary ports only
```

### **6.3 Application Security**
```bash
# Enable HTTPS only
# Configure security headers in Nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

# Rate limiting
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
limit_req zone=api burst=20 nodelay;
```

### **6.4 Data Protection**
```bash
# Encrypt sensitive data at rest
# Use secure communication protocols
# Implement proper access controls

# NetSuite security best practices:
# - Use secure script parameters
# - Implement proper error handling
# - Log security events
```

---

## ✅ **Step 7: Post-Deployment Verification**

### **7.1 Functional Testing**
```bash
# Test complete workflow
1. Access dashboard: https://dashboard.yourdomain.com
2. Create customer/project/estimate scenario
3. Export data via email
4. Verify SuiteScript processes email
5. Confirm NetSuite records created
```

### **7.2 Performance Testing**
```bash
# Load testing
ab -n 1000 -c 10 https://api.yourdomain.com/api/health

# Monitor response times
# Check resource utilization
# Verify scaling behavior
```

### **7.3 Backup & Recovery**
```bash
# Configure automated backups
# Test restore procedures
# Document disaster recovery plan

# Docker backup example
docker run --rm -v netsuite_prod_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/redis-backup.tar.gz -C /data .
```

### **7.4 Documentation Update**
```bash
# Update runbooks
# Document production procedures
# Create incident response plan

# Key contacts:
# - Development: dev@yourdomain.com
# - Infrastructure: infra@yourdomain.com
# - NetSuite Admin: netsuite@yourdomain.com
```

---

## 🚨 **Step 8: Go-Live Checklist**

### **Pre-Go-Live**
- [ ] All environments tested (dev → staging → prod)
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] Backup/restore tested
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented

### **Go-Live Day**
- [ ] Final production deployment
- [ ] DNS updates completed
- [ ] SSL certificates verified
- [ ] Monitoring dashboards active
- [ ] Support team on standby

### **Post-Go-Live**
- [ ] 24/7 monitoring for first week
- [ ] User acceptance testing
- [ ] Performance monitoring
- [ ] Documentation updates
- [ ] Lessons learned review

---

## 📞 **Support & Troubleshooting**

### **Common Issues**

#### **SuiteScript Not Processing Emails**
```bash
# Check Gmail API credentials
# Verify email format matches expectations
# Check SuiteScript execution logs in NetSuite
# Validate OAuth token refresh
```

#### **API Timeouts**
```bash
# Check network connectivity
# Verify NetSuite API limits
# Monitor Redis cache performance
# Scale backend instances if needed
```

#### **Data Import Failures**
```bash
# Review email parsing logs
# Check field validation errors
# Verify NetSuite permissions
# Examine SuiteScript error logs
```

### **Emergency Contacts**
- **Critical Issues**: Call emergency hotline
- **System Down**: Page on-call engineer
- **NetSuite Issues**: Contact NetSuite support
- **Gmail API Issues**: Check Google status dashboard

---

## 🎯 **Success Metrics**

### **Performance Targets**
- **API Response Time**: <500ms (95th percentile)
- **Email Processing**: <5 minutes from send to NetSuite record
- **Uptime**: 99.9% availability
- **Error Rate**: <0.1% of transactions

### **Business Metrics**
- **User Adoption**: Target user registration within 1 week
- **Process Efficiency**: 50% reduction in demo preparation time
- **Data Quality**: 100% accuracy in NetSuite record creation
- **Support Tickets**: <5 per month for technical issues

---

## 🎉 **Congratulations!**

Your NetSuite Dashboard is now **live in production** with enterprise-grade reliability, security, and monitoring. The system will automatically process email exports and create NetSuite records, streamlining your sales demo preparation workflow.

**Next Steps:**
1. Monitor system performance for the first 30 days
2. Gather user feedback for improvements
3. Plan for future enhancements based on usage patterns
4. Schedule regular maintenance and security updates

**Remember**: Regular monitoring, testing, and maintenance are key to long-term success!
