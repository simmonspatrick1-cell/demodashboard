#!/bin/bash

# NetSuite Connection Test Script
# Tests your NetSuite credentials before deploying

echo "========================================"
echo "NetSuite Connection Test"
echo "========================================"
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if credentials are set
echo "1. Checking environment configuration..."
echo ""

if [ -z "$NETSUITE_REST_URL" ]; then
  echo "❌ NETSUITE_REST_URL not set"
  echo "   Please add it to your .env file"
  exit 1
else
  echo "✅ NETSUITE_REST_URL: ${NETSUITE_REST_URL:0:50}..."
fi

if [ -z "$NETSUITE_CONSUMER_KEY" ]; then
  echo "❌ NETSUITE_CONSUMER_KEY not set"
  exit 1
else
  echo "✅ NETSUITE_CONSUMER_KEY: ${NETSUITE_CONSUMER_KEY:0:20}..."
fi

if [ -z "$NETSUITE_TOKEN_ID" ]; then
  echo "❌ NETSUITE_TOKEN_ID not set"
  exit 1
else
  echo "✅ NETSUITE_TOKEN_ID: ${NETSUITE_TOKEN_ID:0:20}..."
fi

echo ""
echo "2. Testing customer search endpoint..."
echo ""

# Test customer search
RESPONSE=$(curl -s "http://localhost:3004/api/customers/search?q=")

if echo "$RESPONSE" | grep -q "success.*false"; then
  echo "❌ Customer search failed"
  echo "Response: $RESPONSE"
  exit 1
elif echo "$RESPONSE" | grep -q "mocked.*true"; then
  echo "⚠️  Mock mode is still enabled"
  echo "   Set MOCK_NETSUITE_SYNC=false to use real NetSuite"
else
  echo "✅ Customer search working"
fi

echo ""
echo "3. Checking MOCK_NETSUITE_SYNC setting..."
echo ""

if [ "$MOCK_NETSUITE_SYNC" = "false" ]; then
  echo "✅ Mock mode disabled - using real NetSuite"
else
  echo "⚠️  Mock mode enabled (MOCK_NETSUITE_SYNC=$MOCK_NETSUITE_SYNC)"
  echo "   Change to 'false' to connect to NetSuite"
fi

echo ""
echo "========================================"
echo "Configuration Summary"
echo "========================================"
echo "Account: ${NETSUITE_ACCOUNT_ID}"
echo "RESTlet URL: ${NETSUITE_REST_URL:0:80}..."
echo "Mock Mode: $MOCK_NETSUITE_SYNC"
echo ""
echo "Next steps:"
echo "1. If mock mode is enabled, update .env: MOCK_NETSUITE_SYNC=false"
echo "2. Make sure your RESTlet is deployed to NetSuite"
echo "3. Restart backend: npm run dev"
echo "4. Test customer search"
echo ""
