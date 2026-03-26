#!/bin/bash

# Integration Test Runner for IETM Playwright Client
# This script safely runs integration tests with proper checks

set -e  # Exit on error

echo "======================================"
echo "IETM Integration Test Runner"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo -e "${RED}ERROR: .env file not found${NC}"
    echo "Please create .env file with IETM credentials"
    exit 1
fi

# Check if credentials are set
if ! grep -q "IETM_USERNAME" .env || ! grep -q "IETM_PASSWORD" .env; then
    echo -e "${RED}ERROR: IETM credentials not found in .env${NC}"
    echo "Please set IETM_USERNAME and IETM_PASSWORD in .env file"
    exit 1
fi

echo -e "${GREEN}✓ Environment configuration found${NC}"
echo ""

# Check if project is built
if [ ! -d "dist" ]; then
    echo -e "${YELLOW}⚠ Project not built. Building now...${NC}"
    npm run build
    echo -e "${GREEN}✓ Build complete${NC}"
    echo ""
fi

# Warning about account lockout
echo -e "${YELLOW}⚠ WARNING: These tests make real API calls to IETM sandbox${NC}"
echo -e "${YELLOW}  - Multiple failed auth attempts can lock your account${NC}"
echo -e "${YELLOW}  - Tests create actual execution results in IETM${NC}"
echo -e "${YELLOW}  - Wait at least 5 minutes between test runs${NC}"
echo ""

# Prompt for confirmation
read -p "Do you want to continue? (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Integration tests cancelled"
    exit 0
fi

# Test authentication first
echo "======================================"
echo "Step 1: Testing Authentication"
echo "======================================"
echo ""

if [ -f "examples/test-auth-only.ts" ]; then
    echo "Running authentication test..."
    if npx ts-node examples/test-auth-only.ts; then
        echo -e "${GREEN}✓ Authentication successful${NC}"
        echo ""
    else
        echo -e "${RED}✗ Authentication failed${NC}"
        echo "Please check your credentials and try again"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Authentication test script not found, skipping...${NC}"
    echo ""
fi

# Run integration tests
echo "======================================"
echo "Step 2: Running Integration Tests"
echo "======================================"
echo ""

# Run with Playwright
npx playwright test --config=tests/integration/playwright.config.ts

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}======================================"
    echo "✓ Integration Tests Passed"
    echo "======================================${NC}"
    echo ""
    echo "Results locations:"
    echo "  - HTML Report: test-results/html/index.html"
    echo "  - IETM Results: examples/basic-example/ietm-results/"
    echo ""
    echo "To view HTML report:"
    echo "  npx playwright show-report test-results/html"
    echo ""
else
    echo ""
    echo -e "${RED}======================================"
    echo "✗ Integration Tests Failed"
    echo "======================================${NC}"
    echo ""
    echo "Check the output above for errors"
    echo "Common issues:"
    echo "  - Authentication failures (check credentials)"
    echo "  - Network connectivity (check VPN/firewall)"
    echo "  - Test case not found (verify test cases exist in IETM)"
    echo ""
    exit 1
fi

# Made with Bob