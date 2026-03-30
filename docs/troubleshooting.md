# Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve common issues with the IETM Playwright Client.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Connection Problems](#connection-problems)
- [Configuration Errors](#configuration-errors)
- [Test Execution Issues](#test-execution-issues)
- [Reporter Problems](#reporter-problems)
- [Performance Issues](#performance-issues)
- [Common Error Messages](#common-error-messages)

---

## Authentication Issues

### Problem: Authentication Failed (401)

**Symptoms:**
```
Error: Authentication failed
AuthenticationError: Failed to authenticate with IETM server
```

**Possible Causes:**
1. Incorrect username or password
2. Account locked due to multiple failed attempts
3. Missing credentials in `.env` file
4. Credentials not loaded from environment

**Solutions:**

1. **Verify credentials:**
   ```bash
   # Check .env file
   cat .env | grep IETM_USERNAME
   cat .env | grep IETM_PASSWORD
   ```

2. **Test authentication manually:**
   ```bash
   npm run build
   node dist/examples/auth-example.js
   ```

3. **Check account status:**
   - Log in to IETM web UI with same credentials
   - If locked, contact IETM administrator

4. **Verify environment variables are loaded:**
   ```typescript
   console.log('Username:', process.env.IETM_USERNAME);
   console.log('Password set:', !!process.env.IETM_PASSWORD);
   ```

5. **For Playwright tests, ensure dotenv is configured:**
   ```typescript
   // playwright.config.ts
   import dotenv from 'dotenv';
   dotenv.config();
   ```

### Problem: Account Locked

**Symptoms:**
- Multiple authentication failures
- "Account locked" message in IETM
- Cannot log in to IETM web UI

**Solutions:**

1. **Stop all running processes:**
   ```bash
   # Windows
   taskkill /F /IM node.exe
   
   # Linux/Mac
   killall node
   ```

2. **Wait 15-30 minutes** before retrying

3. **Contact IETM administrator** to unlock account

4. **Prevent future lockouts:**
   - Run one test at a time
   - Don't run multiple examples simultaneously
   - Use correct credentials in `.env` file

---

## Connection Problems

### Problem: Connection Timeout

**Symptoms:**
```
Error: Request timeout after 30000ms
NetworkError: Connection timeout
```

**Solutions:**

1. **Check network connectivity:**
   ```bash
   ping jazz.net
   curl https://jazz.net/sandbox01-qm/rootservices
   ```

2. **Increase timeout:**
   ```typescript
   const client = new IETMClient({
     ...config,
     timeout: 60000 // 60 seconds
   });
   ```

3. **Check firewall/proxy settings:**
   - Ensure IETM server is accessible
   - Configure proxy if needed

4. **Verify server URL:**
   ```bash
   # Should return XML
   curl https://jazz.net/sandbox01-qm/rootservices
   ```

### Problem: SSL Certificate Error

**Symptoms:**
```
Error: self signed certificate
Error: unable to verify the first certificate
```

**Solutions:**

1. **For development only** (NOT production):
   ```typescript
   // Add to top of script
   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
   ```

2. **Proper solution:**
   - Install proper SSL certificates on IETM server
   - Add CA certificate to Node.js trust store

---

## Configuration Errors

### Problem: Missing Configuration

**Symptoms:**
```
ValidationError: Missing required configuration: baseUrl
Error: IETM_USERNAME is not defined
```

**Solutions:**

1. **Create `.env` file:**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. **Verify config file exists:**
   ```bash
   ls -la config/ietm.config.json
   ```

3. **Check config file syntax:**
   ```bash
   # Validate JSON
   cat config/ietm.config.json | jq .
   ```

4. **Ensure all required fields are present:**
   ```json
   {
     "server": {
       "baseUrl": "https://jazz.net/sandbox01-qm",
       "projectName": "Your Project"
     },
     "auth": {
       "type": "basic",
       "username": "${IETM_USERNAME}",
       "password": "${IETM_PASSWORD}"
     }
   }
   ```

### Problem: Invalid JSON in Config File

**Symptoms:**
```
SyntaxError: Unexpected token } in JSON
Error: Failed to parse config file
```

**Solutions:**

1. **Validate JSON syntax:**
   ```bash
   cat config/ietm.config.json | jq .
   ```

2. **Common JSON errors:**
   - Missing commas between properties
   - Trailing commas (not allowed in JSON)
   - Unquoted property names
   - Single quotes instead of double quotes

3. **Use a JSON validator:**
   - https://jsonlint.com/
   - VS Code JSON validation

---

## Test Execution Issues

### Problem: No Execution Results Created

**Symptoms:**
- Tests pass but no results in IETM
- Reporter runs but doesn't create results
- No error messages

**Solutions:**

1. **Check reporter is enabled:**
   ```typescript
   // playwright.config.ts
   reporter: [
     ['./dist/src/reporter/IETMReporter.js', {
       enabled: true  // Make sure this is true
     }]
   ]
   ```

2. **Verify test case mapping:**
   ```typescript
   test('My test', {
     annotation: { 
       type: 'ietm-test-case', 
       description: '2218'  // Valid test case ID
     }
   }, async ({ page }) => {
     // test code
   });
   ```

3. **Check reporter logs:**
   ```bash
   # Look for reporter output in test results
   npx playwright test --reporter=list
   ```

4. **Verify client initialization:**
   - Check for initialization errors in logs
   - Ensure credentials are correct
   - Verify network connectivity

### Problem: Test Output Not Visible in IETM

**Symptoms:**
- Execution result created
- But no test output in Result Details section

**Solutions:**

1. **Check execution result in IETM UI:**
   - Open execution result
   - Look in "Result Details" section
   - Test output should be embedded there

2. **Verify test output generation:**
   ```typescript
   // Reporter should log this
   console.log('Test output embedded in execution result');
   ```

3. **Check for XML errors:**
   - Invalid XHTML content
   - Character encoding issues
   - HTML entity escaping problems

---

## Reporter Problems

### Problem: Reporter Not Running

**Symptoms:**
- No reporter output in test results
- Tests run but reporter doesn't execute

**Solutions:**

1. **Verify reporter path:**
   ```typescript
   // playwright.config.ts
   reporter: [
     ['./dist/src/reporter/IETMReporter.js']  // Correct path
   ]
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Check reporter file exists:**
   ```bash
   ls -la dist/src/reporter/IETMReporter.js
   ```

4. **Verify reporter is imported correctly:**
   ```typescript
   // Should not throw error
   const { IETMReporter } = require('./dist/src/reporter/IETMReporter.js');
   ```

### Problem: Reporter Crashes

**Symptoms:**
```
Error: Reporter crashed
TypeError: Cannot read property 'xxx' of undefined
```

**Solutions:**

1. **Check reporter logs:**
   - Look for error stack traces
   - Identify which method failed

2. **Verify test result structure:**
   - Ensure Playwright test results are valid
   - Check for missing properties

3. **Update to latest version:**
   ```bash
   git pull
   npm install
   npm run build
   ```

---

## Performance Issues

### Problem: Slow Test Execution

**Symptoms:**
- Tests take much longer than expected
- Reporter adds significant overhead

**Solutions:**

1. **Disable reporter for local development:**
   ```typescript
   // playwright.config.ts
   reporter: [
     ['list'],
     ['./dist/src/reporter/IETMReporter.js', {
       enabled: process.env.CI === 'true'  // Only in CI
     }]
   ]
   ```

2. **Reduce timeout:**
   ```typescript
   const client = new IETMClient({
     ...config,
     timeout: 15000  // Shorter timeout
   });
   ```

3. **Run tests in parallel:**
   ```typescript
   // playwright.config.ts
   export default defineConfig({
     workers: 4  // Parallel execution
   });
   ```

### Problem: High Memory Usage

**Symptoms:**
- Node.js process uses excessive memory
- Out of memory errors

**Solutions:**

1. **Limit test output size:**
   - Reduce verbose logging
   - Limit screenshot/video capture

2. **Run fewer tests concurrently:**
   ```typescript
   // playwright.config.ts
   export default defineConfig({
     workers: 2  // Fewer workers
   });
   ```

3. **Increase Node.js memory:**
   ```bash
   NODE_OPTIONS="--max-old-space-size=4096" npx playwright test
   ```

---

## Common Error Messages

### "Cannot find module"

**Error:**
```
Error: Cannot find module './dist/src/reporter/IETMReporter.js'
```

**Solution:**
```bash
npm run build
```

### "ECONNREFUSED"

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:443
```

**Solution:**
- Check server URL is correct
- Verify network connectivity
- Check firewall settings

### "Invalid test case ID"

**Error:**
```
ValidationError: Invalid test case ID: undefined
```

**Solution:**
```typescript
// Add test case annotation
test('My test', {
  annotation: { type: 'ietm-test-case', description: '2218' }
}, async ({ page }) => {
  // test code
});
```

### "Execution result already exists"

**Error:**
```
Error: Execution result already exists for this test case
```

**Solution:**
- This is normal for idempotent operations
- IETM returns existing result (HTTP 303)
- Not an error, just informational

### "Failed to embed test output"

**Error:**
```
Error: Failed to embed test output in execution result
```

**Solution:**
1. Check XML structure is valid
2. Verify XHTML content is well-formed
3. Check for character encoding issues
4. Review AttachmentHandler logs

---

## Debug Mode

### Enable Debug Logging

```typescript
// Set environment variable
process.env.DEBUG = 'ietm:*';

// Or in .env file
DEBUG=ietm:*
```

### Verbose Reporter Output

```typescript
// playwright.config.ts
reporter: [
  ['./dist/src/reporter/IETMReporter.js', {
    verbose: true
  }]
]
```

### Log HTTP Requests

```typescript
// Enable axios logging
import axios from 'axios';
axios.interceptors.request.use(request => {
  console.log('Request:', request.method, request.url);
  return request;
});
```

---

## Getting Help

If you can't resolve the issue:

1. **Check documentation:**
   - [README.md](../README.md)
   - [Installation Guide](./installation.md)
   - [Authentication Setup](./authentication-setup.md)
   - [API Reference](./api-reference.md)

2. **Review examples:**
   - [examples/README.md](../examples/README.md)
   - Run example scripts to verify setup

3. **Check implementation plan:**
   - [IETM-Playwright-Implementation-Plan.md](./IETM-Playwright-Implementation-Plan.md)

4. **Enable debug logging** and review output

5. **Check for known issues** in documentation

---

## Diagnostic Checklist

Use this checklist to diagnose issues:

- [ ] Node.js version >= 16.0.0
- [ ] npm packages installed (`npm install`)
- [ ] Project built (`npm run build`)
- [ ] `.env` file exists with credentials
- [ ] Config file exists and is valid JSON
- [ ] IETM server is accessible
- [ ] Credentials are correct
- [ ] Account is not locked
- [ ] Reporter path is correct
- [ ] Test case IDs are valid
- [ ] Network connectivity is working
- [ ] Firewall allows IETM access

---

**Last Updated:** 2026-03-30
**Version:** 1.0.0