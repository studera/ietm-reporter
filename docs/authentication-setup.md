# IETM Authentication Setup Guide

## Overview

The IETM Playwright Client uses **Basic Authentication** with form-based login, similar to the IBM RQM Java client implementation. This is simpler and more reliable than OAuth 1.0a for IETM/RQM systems.

## Authentication Flow

### 1. Basic Authentication
The client uses HTTP Basic Authentication with your IETM username and password.

### 2. Form-Based Authentication (on 401)
When a request returns a 401 Unauthorized status, the client automatically performs form-based authentication:

```
POST https://jazz.net/sandbox01-jts/jts/j_security_check
Content-Type: application/x-www-form-urlencoded

j_username=your_username&j_password=your_password
```

This sets a `JSESSIONID` cookie that is used for subsequent requests.

### 3. Cookie Management
The client maintains cookies across requests using a cookie jar. Once authenticated, the session cookie is automatically included in all subsequent API calls.

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

### Session Expires
The client automatically handles session expiration by re-authenticating when it receives a 401 response.

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
  jtsUrl: 'https://jazz.net/sandbox01-jts',
  username: 'studera',
  password: 'your_password'
});
```

### 2. Axios Configuration
The client uses axios with:
- Cookie jar for session management
- Basic auth credentials
- Request interceptor for 401 handling
- Retry logic with exponential backoff

### 3. Request Flow
```
1. Make API request with Basic Auth
2. If 401 received:
   a. POST to /jts/j_security_check with credentials
   b. Store JSESSIONID cookie
   c. Retry original request
3. If success: Continue
4. If other error: Retry with backoff (max 3 times)
```

### 4. Cookie Persistence
Cookies are maintained in memory for the lifetime of the client instance. Each test run creates a new client instance with a fresh session.

## Comparison with OAuth 1.0a

| Feature | Basic Auth + Form Login | OAuth 1.0a |
|---------|------------------------|------------|
| Setup Complexity | Low | High |
| Credential Management | Username/Password | Consumer Key, Secret, Tokens |
| Session Management | Cookie-based | Token-based |
| Expiration Handling | Automatic re-auth | Token refresh required |
| IETM/RQM Support | Native | Requires configuration |
| Security | Good (with HTTPS) | Excellent |

For IETM/RQM systems, Basic Authentication with form-based login is the recommended approach as it's:
- Simpler to configure
- More reliable
- Natively supported by IBM Jazz products
- Used by IBM's own Java clients

## Additional Resources

- [IBM Jazz Authentication](https://jazz.net/wiki/bin/view/Main/JazzFormBasedAuthentication)
- [OSLC Authentication](https://open-services.net/specifications/authentication/)
- [RQM API Documentation](https://jazz.net/wiki/bin/view/Main/RqmApi)