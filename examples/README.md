# IETM Playwright Client - Examples

This directory contains working examples demonstrating how to use the IETM Playwright Client.

## Prerequisites

1. **Build the project first:**
   ```bash
   npm run build
   ```

2. **Configure your credentials:**
   - Copy `.env.example` to `.env`
   - Update with your IETM credentials:
     ```
     IETM_QM_SERVER_URL=https://jazz.net/sandbox01-qm
     IETM_JTS_SERVER_URL=https://jazz.net/sandbox01-jts
     IETM_USERNAME=your-username
     IETM_PASSWORD=your-password
     IETM_PROJECT_NAME=Your Project Name
     ```

## Available Examples

### 1. Authentication Example
Demonstrates basic authentication with IETM server.

**Run:**
```bash
npm run build
node dist/examples/auth-example.js
```

**What it does:**
- Authenticates with IETM using Basic Auth + form-based login
- Retrieves root services XML
- Displays authentication status
- Cleans up session

### 2. Service Discovery Example
Demonstrates OSLC service discovery pattern.

**Run:**
```bash
npm run build
node dist/examples/service-discovery-example.js
```

**What it does:**
- Authenticates with IETM
- Discovers service URLs through OSLC pattern:
  1. GET /rootservices → Extract catalog URL
  2. GET catalog → Find project service provider
  3. GET services → Extract query capabilities
- Displays all discovered URLs and capabilities
- Shows helper methods for building resource URLs

**Expected Output:**
```
=== IETM Service Discovery Example ===

1. Creating AuthManager...
2. Authenticating...
✓ Authentication successful

3. Creating ServiceDiscovery...
✓ ServiceDiscovery created

4. Discovering services...
Service discovery completed successfully!

=== Discovered Services ===

Root Services URL:
  https://jazz.net/sandbox01-qm/rootservices

Catalog URL:
  https://jazz.net/sandbox01-qm/oslc_qm/catalog

Context ID:
  _8_TkcFwFEfCGYIoRgUkqqw

Query Capabilities:
  TestCaseQuery: https://...
  TestResultQuery: https://...
  ...
```

### 3. Debug Root Services
Utility to inspect root services XML structure.

**Run:**
```bash
npm run build
node dist/examples/debug-rootservices.js
```

**What it does:**
- Fetches root services XML
- Displays raw XML
- Displays parsed JSON structure
- Saves to `rootservices.xml` and `rootservices.json`

## PowerShell vs Bash

### PowerShell (Windows)
```powershell
# Build and run
npm run build
node dist/examples/service-discovery-example.js

# Or in one line
npm run build; if ($?) { node dist/examples/service-discovery-example.js }
```

### Bash (Linux/Mac)
```bash
# Build and run
npm run build && node dist/examples/service-discovery-example.js
```

## Troubleshooting

### "Cannot find module" error
Make sure you've built the project first:
```bash
npm run build
```

### Authentication fails
1. Check your credentials in `.env`
2. Verify server URLs are correct
3. Ensure you have network access to the IETM server
4. Check if your account is not locked

### TypeScript errors
If you see TypeScript compilation errors:
```bash
# Clean and rebuild
rm -rf dist
npm run build
```

### Connection timeout
If the server is slow or unreachable:
1. Check your network connection
2. Verify the server URLs
3. Try increasing timeout in `config/ietm.config.json`

## Next Steps

After running these examples successfully, you can:
1. Integrate the client into your Playwright tests
2. Create custom reporters
3. Map test cases to IETM
4. Post test results automatically

See the main README.md for full integration guide.