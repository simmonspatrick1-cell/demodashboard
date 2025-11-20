#!/bin/bash

# Test script for Customer Search API
# This script tests both the local Express API and can be modified to test NetSuite directly

echo "==================================="
echo "Customer Search API Test Script"
echo "==================================="
echo ""

# Configuration
API_BASE_URL="http://localhost:3004/api"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${BLUE}Test 1: API Health Check${NC}"
echo "GET ${API_BASE_URL}/health"
echo "-----------------------------------"
curl -s "${API_BASE_URL}/health" | jq '.' || curl -s "${API_BASE_URL}/health"
echo ""
echo ""

# Test 2: Search all customers (empty query)
echo -e "${BLUE}Test 2: Get All Customers (no search term)${NC}"
echo "GET ${API_BASE_URL}/customers/search"
echo "-----------------------------------"
curl -s "${API_BASE_URL}/customers/search" | jq '.' || curl -s "${API_BASE_URL}/customers/search"
echo ""
echo ""

# Test 3: Search with term "eco"
echo -e "${BLUE}Test 3: Search Customers with term 'eco'${NC}"
echo "GET ${API_BASE_URL}/customers/search?q=eco"
echo "-----------------------------------"
curl -s "${API_BASE_URL}/customers/search?q=eco" | jq '.' || curl -s "${API_BASE_URL}/customers/search?q=eco"
echo ""
echo ""

# Test 4: Search with term "acme"
echo -e "${BLUE}Test 4: Search Customers with term 'acme'${NC}"
echo "GET ${API_BASE_URL}/customers/search?q=acme"
echo "-----------------------------------"
curl -s "${API_BASE_URL}/customers/search?q=acme" | jq '.' || curl -s "${API_BASE_URL}/customers/search?q=acme"
echo ""
echo ""

# Test 5: Test project sync with customer
echo -e "${BLUE}Test 5: Sync Project with Customer${NC}"
echo "POST ${API_BASE_URL}/projects/sync"
echo "-----------------------------------"
curl -s -X POST "${API_BASE_URL}/projects/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1001,
    "account": "ACCT-001",
    "prospectName": "Ecotone Analytics",
    "industry": "Professional Services",
    "prompts": [
      "Create PSA scenario with resource planning",
      "Add billing automation features",
      "Include utilization dashboards"
    ],
    "notes": "Test project created via API",
    "website": "https://ecotone.com",
    "focusAreas": ["Resource Planning", "Billing Automation"]
  }' | jq '.' || curl -s -X POST "${API_BASE_URL}/projects/sync" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": 1001,
    "account": "ACCT-001",
    "prospectName": "Ecotone Analytics",
    "industry": "Professional Services",
    "prompts": ["Create PSA scenario"],
    "notes": "Test project",
    "website": "https://ecotone.com"
  }'
echo ""
echo ""

echo -e "${GREEN}==================================="
echo "All tests completed!"
echo "===================================${NC}"
echo ""
echo "To test against NetSuite directly:"
echo "1. Update MOCK_NETSUITE_SYNC=false in .env"
echo "2. Ensure your NetSuite RESTlet is deployed"
echo "3. Run this script again"
echo ""
