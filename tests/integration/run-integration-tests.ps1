# Integration Test Runner for IETM Playwright Client (PowerShell)
# This script safely runs integration tests with proper checks

$ErrorActionPreference = "Stop"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "IETM Integration Test Runner" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-not (Test-Path ".env")) {
    Write-Host "ERROR: .env file not found" -ForegroundColor Red
    Write-Host "Please create .env file with IETM credentials"
    exit 1
}

# Check if credentials are set
$envContent = Get-Content ".env" -Raw
if (-not ($envContent -match "IETM_USERNAME") -or -not ($envContent -match "IETM_PASSWORD")) {
    Write-Host "ERROR: IETM credentials not found in .env" -ForegroundColor Red
    Write-Host "Please set IETM_USERNAME and IETM_PASSWORD in .env file"
    exit 1
}

Write-Host "✓ Environment configuration found" -ForegroundColor Green
Write-Host ""

# Check if project is built
if (-not (Test-Path "dist")) {
    Write-Host "⚠ Project not built. Building now..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "✗ Build failed" -ForegroundColor Red
        exit 1
    }
    Write-Host "✓ Build complete" -ForegroundColor Green
    Write-Host ""
}

# Warning about account lockout
Write-Host "⚠ WARNING: These tests make real API calls to IETM sandbox" -ForegroundColor Yellow
Write-Host "  - Multiple failed auth attempts can lock your account" -ForegroundColor Yellow
Write-Host "  - Tests create actual execution results in IETM" -ForegroundColor Yellow
Write-Host "  - Wait at least 5 minutes between test runs" -ForegroundColor Yellow
Write-Host ""

# Prompt for confirmation
$confirmation = Read-Host "Do you want to continue? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Integration tests cancelled"
    exit 0
}
Write-Host ""

# Test authentication first
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Step 1: Testing Authentication" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path "examples/test-auth-only.ts") {
    Write-Host "Running authentication test..."
    npx ts-node examples/test-auth-only.ts
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ Authentication successful" -ForegroundColor Green
        Write-Host ""
    } else {
        Write-Host "✗ Authentication failed" -ForegroundColor Red
        Write-Host "Please check your credentials and try again"
        exit 1
    }
} else {
    Write-Host "⚠ Authentication test script not found, skipping..." -ForegroundColor Yellow
    Write-Host ""
}

# Run integration tests
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Step 2: Running Integration Tests" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

# Run with Playwright
npx playwright test --config=tests/integration/playwright.config.ts

# Check exit code
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Green
    Write-Host "✓ Integration Tests Passed" -ForegroundColor Green
    Write-Host "======================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results locations:"
    Write-Host "  - HTML Report: test-results/html/index.html"
    Write-Host "  - IETM Results: examples/basic-example/ietm-results/"
    Write-Host ""
    Write-Host "To view HTML report:"
    Write-Host "  npx playwright show-report test-results/html"
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "======================================" -ForegroundColor Red
    Write-Host "✗ Integration Tests Failed" -ForegroundColor Red
    Write-Host "======================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Check the output above for errors"
    Write-Host "Common issues:"
    Write-Host "  - Authentication failures (check credentials)"
    Write-Host "  - Network connectivity (check VPN/firewall)"
    Write-Host "  - Test case not found (verify test cases exist in IETM)"
    Write-Host ""
    exit 1
}

# Made with Bob