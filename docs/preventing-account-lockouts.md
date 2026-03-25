# Preventing Account Lockouts - Best Practices

## Issue
The IETM account was locked due to multiple failed authentication attempts during development and testing.

## Root Causes
1. **Multiple concurrent authentication attempts** - Running examples and tests simultaneously
2. **Retry logic** - AuthManager retries failed authentications up to 3 times
3. **Development iterations** - Frequent code changes and testing cycles
4. **Incorrect credentials** - Testing with wrong passwords during development

## Solutions Implemented

### 1. Credentials Management
✅ Credentials stored securely in `.env` file only
✅ All examples and config files use environment variables
✅ No hardcoded credentials in source code

### 2. Existing Safeguards
The AuthManager already includes several protections:
- **Exponential backoff**: 1s, 2s, 3s delays between retries
- **Maximum 3 retries**: Prevents infinite retry loops
- **Session caching**: Reuses authenticated sessions
- **Clear error messages**: Helps identify authentication issues quickly

## Best Practices for Development

### 1. Limit Concurrent Executions
```bash
# ❌ DON'T run multiple examples simultaneously
node dist/examples/auth-example.js &
node dist/examples/service-discovery-example.js &
node dist/examples/ietm-client-example.js &

# ✅ DO run one at a time
node dist/examples/auth-example.js
# Wait for completion, then run next
node dist/examples/service-discovery-example.js
```

### 2. Use Environment Variables
Always use `.env` file for credentials:
```bash
# ✅ Correct - uses .env
npm run build
node dist/examples/auth-example.js

# ❌ Wrong - hardcoded credentials
// ❌ DON'T hardcode credentials
const config = {
  username: 'myuser',
  password: 'hardcoded-password'  // This will cause lockouts!
}

// ✅ DO use environment variables
const config = {
  username: process.env.IETM_USERNAME,
  password: process.env.IETM_PASSWORD
}
```

### 3. Verify Credentials Before Testing
```bash
# Test authentication once before running multiple tests
node dist/examples/auth-example.js

# If successful, proceed with other examples
```

### 4. Use Session Caching
The AuthManager caches authenticated sessions. Reuse the same client instance:

```typescript
// ✅ GOOD - Single client instance
const client = new IETMClient(config);
await client.initialize(); // Authenticates once

await client.getTestCase('123');
await client.getTestCase('456');
await client.createExecutionResult(result);
// All use the same authenticated session

// ❌ BAD - Multiple authentications
const client1 = new IETMClient(config);
await client1.initialize(); // Auth attempt 1

const client2 = new IETMClient(config);
await client2.initialize(); // Auth attempt 2

const client3 = new IETMClient(config);
await client3.initialize(); // Auth attempt 3
// This could trigger account lockout!
```

### 5. Handle Authentication Errors Gracefully
```typescript
try {
  await client.initialize();
} catch (error) {
  if (error.message.includes('Failed to authenticate')) {
    console.error('Authentication failed. Check credentials in .env file.');
    console.error('DO NOT retry immediately to avoid account lockout!');
    process.exit(1);
  }
}
```

### 6. Development vs Production
```typescript
// Development: Use longer delays between retries
const devConfig = {
  ...config,
  maxRetries: 2,        // Fewer retries
  retryDelay: 5000,     // Longer delay (5 seconds)
};

// Production: Use default settings
const prodConfig = {
  ...config,
  maxRetries: 3,
  retryDelay: 1000,
};
```

### 7. Testing Strategy
```bash
# 1. Test authentication first
npm run build
node dist/examples/auth-example.js

# 2. If successful, test service discovery
node dist/examples/service-discovery-example.js

# 3. Finally, test full client
node dist/examples/ietm-client-example.js

# 4. Run unit tests (these don't authenticate)
npm test
```

### 8. Monitor Authentication Attempts
Add logging to track authentication:
```typescript
console.log(`[${new Date().toISOString()}] Authenticating as ${username}...`);
await authManager.authenticate();
console.log(`[${new Date().toISOString()}] Authentication successful`);
```

## What to Do If Account Gets Locked

### 1. Stop All Running Processes
```bash
# Kill all node processes
taskkill /F /IM node.exe  # Windows
killall node              # Linux/Mac
```

### 2. Wait Before Retrying
- Wait at least 15-30 minutes before attempting to authenticate again
- IBM Jazz servers typically have a lockout period

### 3. Contact Administrator
If the account remains locked:
- Contact your IETM administrator
- Request password reset
- Explain the situation (development/testing)

### 4. Update Credentials
After password reset:
```bash
# Update .env file
IETM_PASSWORD=new-password-here

# Update config file
# Edit config/ietm.config.json

# Verify the change
grep IETM_PASSWORD .env
```

### 5. Test Carefully
```bash
# Single authentication test
node dist/examples/auth-example.js

# If successful, you're good to go
```

## Automated Testing Considerations

### CI/CD Pipeline
```yaml
# .github/workflows/test.yml
jobs:
  test:
    steps:
      - name: Run unit tests (no authentication)
        run: npm test
      
      # Skip integration tests in CI to avoid lockouts
      # - name: Run integration tests
      #   run: npm run test:integration
```

### Integration Tests
- Run integration tests manually, not in CI/CD
- Use a dedicated test account
- Implement rate limiting between test runs
- Consider using mock servers for most tests

## Summary

### ✅ DO
- Use environment variables for credentials
- Run one example at a time
- Reuse authenticated client instances
- Test authentication before running multiple operations
- Monitor authentication attempts
- Use longer retry delays in development

### ❌ DON'T
- Run multiple examples simultaneously
- Hardcode credentials in code
- Create multiple client instances unnecessarily
- Retry authentication immediately after failure
- Run integration tests in CI/CD pipelines
- Test with incorrect credentials repeatedly

## Current Configuration

**Retry Settings:**
- Max Retries: 3
- Initial Delay: 1000ms (1 second)
- Backoff Multiplier: 2 (1s, 2s, 3s)

**Credentials Location:**
- `.env` - **ONLY** location for credentials (not committed to git)
- `config/ietm.config.json` - Uses environment variable placeholders
- All examples - Load from environment variables

**Security:**
- ✅ Credentials stored only in `.env` file
- ✅ `.env` file is in `.gitignore`
- ✅ No hardcoded credentials in source code
- ✅ Config files use `${IETM_USERNAME}` and `${IETM_PASSWORD}` placeholders

---

**Last Updated:** 2026-03-25
**Server:** https://jazz.net/sandbox01-qm