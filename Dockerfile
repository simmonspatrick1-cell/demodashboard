# Dockerfile for Node.js Backend (NetSuite API Server)
FROM node:18-alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY --chown=nodejs:nodejs . .

# Copy environment file (if it exists)
COPY --chown=nodejs:nodejs .env* ./

# Create necessary directories with proper permissions
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3001

# Environment variables with defaults
ENV PORT=3001
ENV NODE_ENV=production
ENV NETSUITE_ACCOUNT_ID=demo
ENV ANTHROPIC_API_KEY=""

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Start the application
CMD ["node", "backend-server.js"]
