# NetSuite Dashboard - Deployment Guide

This guide provides multiple deployment options for the NetSuite Dashboard, from quick development to production-ready containerized deployment.

## 🚀 Quick Start Options

### Option 1: Development Mode (Fastest)
Perfect for development with hot reload and debugging.

```bash
./dev.sh
```

**What it does:**
- Installs dependencies automatically
- Cleans up any conflicting processes
- Starts backend server on port 3001
- Starts React dev server on port 3004 with hot reload
- Provides cleanup on Ctrl+C

**URLs:**
- Frontend: http://localhost:3004
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/api/health

### Option 2: Production Build (Optimized)
Production-ready deployment with optimized builds.

```bash
./deploy.sh
```

**What it does:**
- Creates optimized React production build
- Starts backend in production mode
- Serves frontend with optimized static files
- Single command deployment

**URLs:**
- Frontend: http://localhost:3004
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/api/health

### Option 3: Docker Deployment (If Available)
Containerized deployment for consistent environments.

```bash
docker-compose up --build
```

**What it includes:**
- Multi-stage Docker builds for optimization
- Nginx reverse proxy for frontend
- Health checks for both services
- Automatic service dependencies
- Network isolation

**URLs:**
- Frontend: http://localhost:80
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/api/health

## 🐳 Docker Configuration Details

### Frontend Container
- **Base**: Node.js 18 Alpine + Nginx
- **Build**: Multi-stage optimization
- **Features**: Gzip compression, security headers, caching
- **Health Check**: HTTP endpoint monitoring

### Backend Container
- **Base**: Node.js 18 Alpine
- **Security**: Non-root user execution
- **Features**: Health checks, proper logging permissions
- **Monitoring**: Automatic restart on failures

### Docker Compose Services
```yaml
services:
  backend:
    ports: ["3001:3001"]
    healthcheck: curl -f http://localhost:3001/api/health
    
  frontend:
    ports: ["80:80"]
    depends_on: backend
    healthcheck: curl -f http://localhost:80
```

## 📋 Available API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/health` | Service health status |
| `POST` | `/api/netsuite/sync` | Sync customer data |
| `POST` | `/api/netsuite/projects` | Fetch customer projects |
| `POST` | `/api/netsuite/create-project` | Create new project |
| `GET` | `/api/netsuite/customers` | List all customers |
| `POST` | `/api/netsuite/scenarios` | Build demo scenarios |
| `GET` | `/api/netsuite/scenarios/templates` | Get scenario templates |
| `POST` | `/api/cache/clear` | Clear API cache |

## 🛠️ Manual Setup (Advanced)

If you prefer manual control over the setup process:

### Development Setup
```bash
# 1. Install dependencies
npm install

# 2. Start backend server
PORT=3001 NODE_ENV=development node backend-server.js &

# 3. Start React development server
PORT=3004 npm start
```

### Production Setup
```bash
# 1. Install dependencies
npm install

# 2. Build React app
npm run build

# 3. Start backend server
PORT=3001 NODE_ENV=production node backend-server.js &

# 4. Serve frontend
npx serve -s build -l 3004
```

## ⚙️ Configuration Files

### Core Configuration
- **`config/config.ts`** - Centralized app configuration
- **`docker-compose.yml`** - Container orchestration
- **`Dockerfile`** - Backend container definition
- **`Dockerfile.frontend`** - Frontend container definition
- **`nginx.conf`** - Nginx reverse proxy configuration

### Environment Variables
```bash
# Required for backend
ANTHROPIC_API_KEY=your_api_key_here
NETSUITE_ACCOUNT_ID=your_account_id

# Optional
NODE_ENV=development|production
PORT=3001
```

## 🔒 Security Features

### Container Security
- Non-root user execution
- Minimal Alpine Linux base images
- Health check monitoring
- Network isolation between services

### Application Security
- CORS configuration for API access
- Input validation on all endpoints
- Rate limiting protection
- Security headers in Nginx

### Production Hardening
- Nginx security headers
- Gzip compression
- Static file caching
- Error page customization

## 📊 Monitoring & Health Checks

### Health Check Response
```json
{
  "status": "OK",
  "timestamp": "2024-11-13T20:45:00.000Z",
  "version": "1.0.0",
  "uptime": 123.45,
  "env": "production"
}
```

### Service Monitoring
- Backend: HTTP health checks every 30s
- Frontend: Root endpoint availability
- Auto-restart on health check failures
- Structured JSON logging

## 🚨 Troubleshooting

### Port Conflicts
```bash
# Clean up conflicting processes
lsof -ti :3001 | xargs kill -9  # Backend
lsof -ti :3004 | xargs kill -9  # Frontend
lsof -ti :80 | xargs kill -9    # Nginx (Docker)
```

### Docker Issues
```bash
# Clean slate Docker restart
docker-compose down --volumes --rmi all
docker system prune -f
docker-compose up --build --force-recreate
```

### Permission Issues
```bash
# Fix script permissions
chmod +x dev.sh deploy.sh

# Fix node_modules
sudo chown -R $(whoami) node_modules
```

### Common Error Solutions

**Error: "Port already in use"**
- Solution: Use the built-in cleanup in `dev.sh` or `deploy.sh`
- Manual: Kill processes using the ports (see Port Conflicts above)

**Error: "Docker command not found"**
- Solution: Use non-Docker deployment options (`dev.sh` or `deploy.sh`)
- Alternative: Install Docker Desktop if corporate policies allow

**Error: "Module not found"**
- Solution: Run `npm install` to install dependencies
- Check: Ensure you're in the correct directory

## 🎯 Recommended Usage

### For Development
Use `./dev.sh` for the best development experience with hot reload and debugging.

### For Testing/Demo
Use `./deploy.sh` for production-like testing with optimized builds.

### For Production
Use Docker deployment (`docker-compose up`) if available, or manual production setup for maximum control.

### For CI/CD
Docker configuration provides consistent builds across environments and easy integration with deployment pipelines.

This deployment setup ensures you can run the NetSuite Dashboard in any environment, from local development to production deployment, with appropriate optimizations for each scenario.