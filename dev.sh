#!/bin/bash

# NetSuite Dashboard Development Script
# This script starts both frontend and backend in development mode

set -e

echo "🚀 NetSuite Dashboard - Development Mode"
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
npm install
echo "✅ Dependencies installed"

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    jobs -p | xargs -r kill 2>/dev/null || true
    echo "✅ Development servers stopped"
    exit 0
}

# Set trap to cleanup on exit
trap cleanup SIGINT SIGTERM

echo ""
echo "🖥️  Starting development servers..."
echo "   Frontend: http://localhost:3004 (React Dev Server)"
echo "   Backend:  http://localhost:3001 (Node.js API)"
echo ""
echo "📋 Development URLs:"
echo "   • Dashboard:     http://localhost:3004"
echo "   • Backend API:   http://localhost:3001/api"
echo "   • Health Check:  http://localhost:3001/api/health"
echo ""
echo "🛑 Press Ctrl+C to stop both servers"
echo ""

# Kill any existing processes on our ports
echo "🧹 Cleaning up any existing processes..."
lsof -ti :3001 | xargs -r kill -9 2>/dev/null || true
lsof -ti :3004 | xargs -r kill -9 2>/dev/null || true
sleep 1

# Start backend server in development mode
echo "🖥️  Starting backend server..."
PORT=3001 NODE_ENV=development node backend-server.js &

# Wait a moment for backend to start
sleep 3

# Start React development server
echo "🌐 Starting React development server..."
PORT=3004 npm start

# If we get here, npm start exited
cleanup