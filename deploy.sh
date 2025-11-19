#!/bin/bash

# NetSuite Dashboard Deployment Script (Non-Docker Version)
# This script provides an alternative deployment method without Docker

set -e

echo "🚀 NetSuite Dashboard - Local Deployment"
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm --version)"

# Install dependencies
echo "📦 Installing dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Create production build
echo "🔨 Building React application..."
npm run build
echo "✅ React build completed"

# Clean up any existing processes
echo "🧹 Cleaning up any existing processes..."
lsof -ti :3001 | xargs -r kill -9 2>/dev/null || true
lsof -ti :3004 | xargs -r kill -9 2>/dev/null || true
sleep 1

# Start the backend server in the background
echo "🖥️  Starting backend server on port 3001..."
PORT=3001 NODE_ENV=production node backend-server.js &
BACKEND_PID=$!
echo "✅ Backend server started (PID: $BACKEND_PID)"

# Wait a moment for backend to start
sleep 3

# Serve the frontend
echo "🌐 Starting frontend server on port 3004..."
echo "   Frontend: http://localhost:3004"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📋 Application URLs:"
echo "   • Dashboard:     http://localhost:3004"
echo "   • Backend API:   http://localhost:3001/api"
echo "   • Health Check:  http://localhost:3001/api/health"
echo ""
echo "🛑 Press Ctrl+C to stop both servers"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    kill $BACKEND_PID 2>/dev/null || true
    echo "✅ Servers stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

# Start the frontend server
npx serve -s build -l 3004

# If we get here, serve exited
cleanup