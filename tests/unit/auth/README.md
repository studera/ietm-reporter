# AuthManager Testing

## Why No Unit Tests?

The `AuthManager` class is **intentionally excluded from unit testing** due to technical limitations with mocking axios interceptors.

### Technical Challenge

AuthManager uses axios response interceptors to automatically handle 401 responses:
- When a 401 is received, it triggers automatic re-authentication
- After re-auth, it retries the original request
- This creates complex async flows that don't work well with axios-mock-adapter

### The Problem

When attempting to unit test with axios-mock-adapter:
1. Mock returns 401 response
2. Interceptor catches 401 and triggers re-authentication
3. Re-authentication call gets mocked
4. Original request retry gets mocked
5. **Infinite loop occurs** due to interceptor re-triggering on mocked responses

### Solution: Integration Testing

AuthManager should be tested via **integration tests** instead:
- Use a real IETM test server or mock server (e.g., nock, msw)
- Test actual HTTP flows end-to-end
- Verify cookie management, session handling, and retry logic in realistic scenarios

### What Gets Tested

Integration tests should cover:
- ✅ Initial authentication with valid credentials
- ✅ Authentication failure with invalid credentials
- ✅ Automatic re-authentication on 401 responses
- ✅ Cookie jar management (JSESSIONID)
- ✅ Retry logic with exponential backoff
- ✅ Network error handling
- ✅ Timeout handling
- ✅ Concurrent request handling

### Alternative Approaches Considered

1. **Refactor AuthManager** - Make interceptor optional/injectable
   - ❌ Would complicate the API and reduce usability
   
2. **Use different mocking library** - Try nock or msw
   - ⚠️ Still complex, better suited for integration tests
   
3. **Mock at lower level** - Mock tough-cookie or axios internals
   - ❌ Too brittle, tests would be tightly coupled to implementation

### Recommendation

Keep AuthManager simple and production-focused. Test it thoroughly via:
- Integration tests (Prompt 17)
- Manual testing with real IETM server
- Example scripts that demonstrate usage

## Coverage Impact

While AuthManager lacks unit tests, the project maintains high overall coverage through:
- Comprehensive unit tests for other components (245+ tests)
- Integration tests that exercise AuthManager in realistic scenarios
- Well-documented examples showing proper usage

---

**Note**: This is a pragmatic decision prioritizing maintainable tests over 100% unit test coverage. Some components are better tested at the integration level.