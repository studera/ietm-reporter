# IETM Authentication Setup Guide

## Overview

The IETM Playwright Client uses **Basic Authentication** - a simplified approach that sends credentials with every request. This is simpler and more reliable than OAuth 1.0a for IETM/RQM systems.

## Authentication Flow

### 1. Basic Authentication
The client uses HTTP Basic Authentication with your IETM username and password:

```
Authorization: Basic <base64-encoded-credentials>
```

The axios HTTP client is configured with basic auth credentials, which are automatically sent with every request.

### 2. Simplified Approach
**Important:** The current implementation does **NOT** use form-based authentication or session cookies. This simplification was made after discovering that:
- Basic auth credentials work for all IETM API calls
- Form-based auth added unnecessary complexity
- The 401 interceptor caused infinite authentication loops
- Basic auth is sufficient and more reliable

### 3. How It Works
```typescript
// Axios instance configured with basic auth
const axiosInstance = axios.create({
  auth: {
    username: config.username,
    password: config.password
  }
});

// Credentials automatically sent with every request
await axiosInstance.get('/qm/rootservices');
```

## Configuration

### Environment Variables (.env)

```env
# IETM Server URLs
IETM_BASE_URL=https://jazz.net/sandbox01-qm
IETM_JTS_URL=https://jazz.net/sandbox01-jts

# Basic Authentication Credentials
IETM_USERNAME=your_username
IETM_PASSWORD=your_password
```

### Configuration File (config/ietm.config.json)

```json
{
  "server": {
    "baseUrl": "https://jazz.net/sandbox01-qm",
    "jtsUrl": "https://jazz.net/sandbox01-jts",
    "projectName": "Your Project Name"
  },
  "auth": {
    "type": "basic",
    "username": "your_username",
    "password": "your_password"
  }
}
```

## Security Best Practices

### 1. Never Commit Credentials
- Add `.env` to `.gitignore` (already configured)
- Never commit `config/ietm.config.json` with real credentials
- Use environment variables in CI/CD pipelines

### 2. Use Environment Variables
Prefer environment variables over config files for sensitive data:

```typescript
const username = process.env.IETM_USERNAME || config.auth.username;
const password = process.env.IETM_PASSWORD || config.auth.password;
```

### 3. Secure Storage in CI/CD

#### GitHub Actions
```yaml
env:
  IETM_USERNAME: ${{ secrets.IETM_USERNAME }}
  IETM_PASSWORD: ${{ secrets.IETM_PASSWORD }}
```

#### GitLab CI
```yaml
variables:
  IETM_USERNAME: $IETM_USERNAME
  IETM_PASSWORD: $IETM_PASSWORD
```

#### Jenkins
Use Jenkins Credentials Plugin to store credentials securely.

### 4. Rotate Passwords Regularly
Change your IETM password periodically and update the configuration.

## Troubleshooting

### Authentication Fails (401)
1. **Verify credentials**: Check username and password are correct
2. **Check JTS URL**: Ensure `IETM_JTS_URL` points to the correct JTS server
3. **Network access**: Verify you can access the IETM server from your network
4. **Account status**: Ensure your IETM account is active and not locked

### Authentication Failures
If authentication fails, the client will retry up to 3 times with exponential backoff. After that, it will throw an error. Check your credentials and ensure your account is not locked.

### SSL/TLS Issues
If you encounter SSL certificate errors in development:

```typescript
// For development/testing only - DO NOT use in production
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
```

**Warning**: Only use this in controlled development environments. Never disable SSL verification in production.

## How It Works Internally

### 1. Client Initialization
```typescript
const client = new IETMClient({
  baseUrl: 'https://jazz.net/sandbox01-qm',
  username: process.env.IETM_USERNAME || '',
  password: process.env.IETM_PASSWORD || ''
});
```

### 2. Axios Configuration
The client uses axios with:
- Basic auth credentials configured in axios instance
- Retry logic with exponential backoff
- Timeout handling (30 seconds)

### 3. Request Flow
```
1. Make API request with Basic Auth header
2. If success: Continue
3. If error: Retry with backoff (max 3 times)
4. If timeout: Fail with clear error message
```

### 4. Authentication State
Authentication is configured once during client initialization. The same credentials are used for all subsequent requests throughout the client's lifetime.

## Comparison with OAuth 1.0a

| Feature | Basic Auth | OAuth 1.0a |
|---------|------------|------------|
| Setup Complexity | Very Low | High |
| Credential Management | Username/Password | Consumer Key, Secret, Tokens |
| Session Management | Stateless | Token-based |
| Expiration Handling | N/A (credentials sent each time) | Token refresh required |
| IETM/RQM Support | Native | Requires configuration |
| Security | Good (with HTTPS) | Excellent |

For IETM/RQM systems, Basic Authentication is the recommended approach as it's:
- Simplest to configure
- Most reliable
- Natively supported by IBM Jazz products
- No session management complexity
- No authentication loops

## Additional Resources

- [IBM Jazz Authentication](https://jazz.net/wiki/bin/view/Main/JazzFormBasedAuthentication)
- [OSLC Authentication](https://open-services.net/specifications/authentication/)
- [RQM API Documentation](https://jazz.net/wiki/bin/view/Main/RqmApi)