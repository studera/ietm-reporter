# Authentication Module

## Overview

The authentication module provides Basic Authentication with form-based login for IBM Engineering Test Management (IETM), following the pattern used in IBM's Java RQM client.

## Features

- ✅ HTTP Basic Authentication with username/password
- ✅ Form-based authentication at `/jts/j_security_check`
- ✅ Automatic session management with cookies
- ✅ Automatic re-authentication on 401 responses
- ✅ Retry logic with exponential backoff (max 3 retries)
- ✅ Comprehensive error handling
- ✅ TypeScript support with full type definitions

## Architecture

### Authentication Flow

```
1. Initial Request with Basic Auth
   ↓
2. If 401 → Form-based Auth at /jts/j_security_check
   ↓
3. JSESSIONID cookie stored
   ↓
4. Retry original request with cookie
   ↓
5. Subsequent requests use cookie automatically
```

### Components

- **AuthManager**: Main authentication manager class
- **AuthConfig**: Configuration interface
- **AuthState**: Authentication state tracking
- **AuthenticationError**: Custom error for auth failures
- **NetworkError**: Custom error for network issues

## Usage

### Basic Usage

```typescript
import { AuthManager, AuthConfig } from './auth';

const config: AuthConfig = {
  baseUrl: 'https://jazz.net/sandbox01-qm',
  jtsUrl: 'https://jazz.net/sandbox01-jts',
  username: 'your_username',
  password: 'your_password',
};

const authManager = new AuthManager(config);

// Authenticate
await authManager.authenticate();

// Make authenticated requests
const response = await authManager.executeRequest({
  method: 'GET',
  url: 'https://jazz.net/sandbox01-qm/qm/rootservices',
});
```

### With Configuration Options

```typescript
const config: AuthConfig = {
  baseUrl: 'https://jazz.net/sandbox01-qm',
  jtsUrl: 'https://jazz.net/sandbox01-jts',
  username: 'your_username',
  password: 'your_password',
  maxRetries: 3,        // Maximum retry attempts
  retryDelay: 1000,     // Initial retry delay (ms)
  timeout: 30000,       // Request timeout (ms)
};

const authManager = new AuthManager(config);
```

### Error Handling

```typescript
import { AuthenticationError, NetworkError } from './auth';

try {
  await authManager.authenticate();
  const data = await authManager.executeRequest(config);
} catch (error) {
  if (error instanceof AuthenticationError) {
    console.error('Authentication failed:', error.message);
    console.error('Status code:', error.statusCode);
  } else if (error instanceof NetworkError) {
    console.error('Network error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

### Checking Authentication State

```typescript
const authState = authManager.getAuthState();

console.log('Authenticated:', authState.isAuthenticated);
console.log('Last auth time:', authState.lastAuthTime);
console.log('Auth attempts:', authState.authAttempts);
```

### Clearing Authentication

```typescript
// Clear session and cookies
await authManager.clearAuth();
```

## API Reference

### AuthManager

#### Constructor

```typescript
constructor(config: AuthConfig)
```

Creates a new AuthManager instance with the provided configuration.

#### Methods

##### authenticate()

```typescript
async authenticate(): Promise<void>
```

Performs initial form-based authentication to establish a session.

**Throws:**
- `AuthenticationError` - If authentication fails

##### executeRequest<T>()

```typescript
async executeRequest<T>(config: AxiosRequestConfig): Promise<T>
```

Executes an authenticated HTTP request with automatic retry logic.

**Parameters:**
- `config` - Axios request configuration

**Returns:**
- Response data of type T

**Throws:**
- `AuthenticationError` - If authentication fails
- `NetworkError` - If network request fails

##### getAuthState()

```typescript
getAuthState(): Readonly<AuthState>
```

Returns the current authentication state.

##### getAxiosInstance()

```typescript
getAxiosInstance(): AxiosInstance
```

Returns the underlying Axios instance for advanced usage.

##### getCookieJar()

```typescript
getCookieJar(): CookieJar
```

Returns the cookie jar for inspection/debugging.

##### clearAuth()

```typescript
async clearAuth(): Promise<void>
```

Clears authentication state and all cookies.

## Configuration

### AuthConfig Interface

```typescript
interface AuthConfig {
  baseUrl: string;      // IETM QM server URL
  jtsUrl: string;       // IETM JTS server URL
  username: string;     // Username for authentication
  password: string;     // Password for authentication
  maxRetries?: number;  // Max retry attempts (default: 3)
  retryDelay?: number;  // Initial retry delay in ms (default: 1000)
  timeout?: number;     // Request timeout in ms (default: 30000)
}
```

## Error Types

### AuthenticationError

Thrown when authentication fails.

**Properties:**
- `message: string` - Error message
- `statusCode?: number` - HTTP status code
- `response?: any` - Response data

### NetworkError

Thrown when network requests fail.

**Properties:**
- `message: string` - Error message
- `originalError?: Error` - Original error object

## Implementation Details

### Retry Logic

The AuthManager implements exponential backoff for retries:

1. **First retry**: Wait 1 second
2. **Second retry**: Wait 2 seconds
3. **Third retry**: Wait 3 seconds

Retries are attempted for:
- Server errors (5xx)
- Timeout errors (408)
- Rate limit errors (429)
- Network errors (no response)

### Cookie Management

- Cookies are automatically managed by `tough-cookie`
- Session cookies (JSESSIONID) are stored and sent with each request
- Cookies persist for the lifetime of the AuthManager instance
- Call `clearAuth()` to remove all cookies

### 401 Handling

When a 401 response is received:
1. Form-based authentication is triggered automatically
2. Original request is retried with new session cookie
3. If authentication fails, an error is thrown

## Testing

See `examples/auth-example.ts` for a complete working example.

To run the example:

```bash
npm run build
node dist/examples/auth-example.js
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never commit credentials** - Use environment variables
2. **Use HTTPS** - Always use secure connections
3. **Rotate passwords** - Change passwords regularly
4. **Secure storage** - Store credentials securely in production
5. **Sanitize logs** - Don't log passwords or sensitive data

## References

- [IBM Jazz Form-Based Authentication](https://jazz.net/wiki/bin/view/Main/JazzFormBasedAuthentication)
- [Java RQM Client Implementation](../../docs/java-implementation-analysis.md)
- [Authentication Setup Guide](../../docs/authentication-setup.md)

## License

MIT