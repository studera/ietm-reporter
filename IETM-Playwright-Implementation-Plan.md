# Implementation Plan: IBM Engineering Test Management (IETM) Playwright Client

## Detailed Prompts for Project Implementation

## ✅ Completed Phases

### **Phase 1: Project Setup & Architecture** ✅

#### ✅ Prompt 1: Initialize Project Structure (COMPLETED)
**Status:** Complete
**Completed:** 2026-03-24

Created complete project structure with:
- ✅ Package.json with all dependencies
- ✅ TypeScript configuration with strict mode
- ✅ Folder structure: `/src`, `/config`, `/tests`, `/docs`, `/examples`
- ✅ ESLint and Prettier configuration
- ✅ Git repository with .gitignore

#### ✅ Prompt 2: Define Configuration Schema (COMPLETED)
**Status:** Complete - Updated to Basic Authentication
**Completed:** 2026-03-24

Configuration system supports:
- ✅ IETM server connection (baseUrl, jtsUrl, projectName)
- ✅ **Basic Authentication** (username, password) - Changed from OAuth
- ✅ Auto-discovery of project IDs
- ✅ Test plan and test case mapping configuration
- ✅ Retry policies with exponential backoff
- ✅ Logging levels and output preferences
- ✅ Multiple environments via .env files
- ✅ JSON configuration with validation

**Key Change:** Migrated from OAuth 1.0a to Basic Authentication + form-based login (matching IBM's Java client pattern)

---

## 🚀 Current Phase

### **Phase 2: IETM API Client Implementation** (IN PROGRESS)

---

#### 🎯 Prompt 3: Implement Basic Authentication Module (NEXT)
**Status:** Ready to implement
**Priority:** HIGH
**Dependencies:** Prompts 1-2 completed

**Task:** Create a Basic Authentication module for IETM that:
- Implements HTTP Basic Authentication with username/password
- Implements form-based authentication at `/jts/j_security_check`
- Manages session cookies using tough-cookie and axios-cookiejar-support
- Handles 401 responses with automatic re-authentication
- Implements retry logic with exponential backoff (max 3 retries)
- Provides authenticated axios instance with cookie jar
- Includes comprehensive error handling for auth failures

**Reference Implementation:**
- See `docs/java-implementation-analysis.md` for IBM's Java client pattern
- See `docs/authentication-setup.md` for detailed auth flow

**Key Files to Create:**
- `src/auth/AuthManager.ts` - Main authentication manager
- `src/auth/CookieJar.ts` - Cookie management wrapper
- `src/auth/types.ts` - Authentication types

**Expected Output:**
```typescript
class AuthManager {
  async authenticate(): Promise<void>
  async executeRequest<T>(config: AxiosRequestConfig): Promise<T>
  private async formBasedAuth(): Promise<void>
}
```

#### Prompt 4: Implement Service Discovery
**Status:** Pending
**Priority:** HIGH
**Dependencies:** Prompt 3

**Task:** Implement IETM service discovery following OSLC pattern:
- Get root services from `/qm/rootservices`
- Get service provider catalog URL
- Get services URL for the project
- Extract resource query URLs (TestCase, TestExecutionRecord, TestSuite)
- Cache discovered URLs for session lifetime
- Parse XML responses using fast-xml-parser

**Reference:** See `docs/java-implementation-analysis.md` - Service Discovery section

**Key Files to Create:**
- `src/client/ServiceDiscovery.ts`
- `src/utils/XmlParser.ts`

#### Prompt 5: Build IETM API Client Core
**Status:** Pending
**Priority:** HIGH
**Dependencies:** Prompts 3-4

**Task:** Implement a TypeScript class `IETMClient` that provides methods for:
- Service discovery and initialization
- Fetching test cases by ID using OSLC queries
- Fetching test execution records (TER) by test case
- Creating execution results with XML payload
- Uploading attachments (screenshots, videos, logs)
- Proper error handling and retry logic via AuthManager

**Reference:** See `docs/java-implementation-analysis.md` - Key API Patterns section

**Key Files to Update:**
- `src/client/IETMClient.ts` (replace skeleton)

**Expected Methods:**
```typescript
class IETMClient {
  async initialize(): Promise<void>
  async getTestCase(testCaseId: string): Promise<TestCase>
  async getTestExecutionRecords(testCaseId: string): Promise<TestExecutionRecord[]>
  async createExecutionResult(result: ExecutionResult): Promise<string>
  async uploadAttachment(file: Buffer, filename: string): Promise<string>
}
```

#### Prompt 6: Create XML Templates and Builders
**Status:** Pending
**Priority:** HIGH
**Dependencies:** Prompt 5

**Task:** Develop XML builders for IETM resources:
- Load `ExecutionResultTemplate.xml` from resources
- `ExecutionResultBuilder` - builds execution result XML with proper RDF/XML structure
- `TestExecutionRecordBuilder` - for creating execution records (if needed)
- XML serialization and deserialization utilities
- Validate required fields and generate OSLC-compliant XML

**Reference:** See `docs/java-implementation-analysis.md` - Execution Result XML Structure

**Key Files to Create:**
- `src/builders/ExecutionResultBuilder.ts`
- `src/builders/XmlBuilder.ts`
- `src/resources/ExecutionResultTemplate.xml`
- `src/models/ExecutionResult.ts`
- `src/models/TestCase.ts`
- `src/models/TestExecutionRecord.ts`

---

### **Phase 3: Playwright Integration**

#### Prompt 7: Create Playwright Reporter
**Status:** Pending
**Priority:** MEDIUM
**Dependencies:** Prompts 3-6

**Task:** Implement a custom Playwright reporter that:
- Extends Playwright's Reporter interface
- Captures test start, end, and result events
- Collects test metadata (title, file, duration, status)
- Captures screenshots on failure
- Captures video recordings if enabled
- Stores test artifacts in a structured format
- Provides hooks for custom data collection

**Key Files to Update:**
- `src/reporter/IETMReporter.ts` (replace skeleton)

#### Prompt 8: Implement Test Case Mapping
**Status:** Pending
**Priority:** MEDIUM
**Dependencies:** Prompt 7

**Task:** Create a mapping system that:
- Links Playwright test cases to IETM test cases using annotations
- Supports mapping by test case ID in annotations
- Validates that mapped IETM test cases exist
- Provides clear error messages for unmapped tests
- Example: `test('Login', { annotation: { type: 'ietm-test-case', description: '2218' } })`

**Key Files to Create:**
- `src/mapper/TestCaseMapper.ts`

#### Prompt 9: Build Result Transformer
**Status:** Pending
**Priority:** MEDIUM
**Dependencies:** Prompts 7-8

**Task:** Develop a transformer that converts Playwright test results to IETM format:
- Maps Playwright status (passed/failed/skipped/timedout) to OSLC state values
- Converts test duration to start/end times (ISO 8601 UTC format)
- Formats error messages and stack traces
- Handles test retries and flaky tests
- Creates ExecutionResult objects with step results
- Preserves test hierarchy and grouping

**Key Files to Create:**
- `src/transformer/ResultTransformer.ts`

---

### **Phase 4: Result Reporting & Synchronization**

#### Prompt 10: Implement Result Publisher
**Status:** Pending
**Priority:** HIGH
**Dependencies:** Prompts 3-9

**Task:** Create a `ResultPublisher` class that:
- Batches test results for efficient API calls
- Gets or creates test execution records (TER) in IETM
- Creates execution results with proper linking to TER
- Attaches screenshots and videos to step results
- Handles partial failures gracefully
- Provides progress feedback during upload
- Implements idempotency to prevent duplicate results

**Key Files to Create:**
- `src/publisher/ResultPublisher.ts`

#### Prompt 11: Add Attachment Handler
**Status:** Pending
**Priority:** MEDIUM
**Dependencies:** Prompt 10

**Task:** Implement an attachment management system that:
- Uploads files using multipart/form-data
- Supports multiple file types (images, videos, logs, JSON)
- Generates proper MIME types
- Provides upload progress tracking
- Returns attachment URLs for linking in results
- Handles attachment size limits

**Key Files to Create:**
- `src/attachments/AttachmentHandler.ts`

---

### **Phase 5: Configuration & CLI** (OPTIONAL - Can be deferred)

#### Prompt 12: Create Configuration Manager
**Status:** Partially Complete (basic config exists)
**Priority:** LOW
**Dependencies:** None

**Task:** Enhance configuration management system:
- Already has: File and environment variable loading
- Add: CLI argument support
- Add: Configuration validation
- Add: Configuration wizard for first-time setup

**Key Files to Update:**
- `src/config/ConfigManager.ts`

#### Prompt 13: Build CLI Interface (OPTIONAL)
**Status:** Not started
**Priority:** LOW
**Dependencies:** All previous prompts

**Task:** Create a command-line interface that supports:
- `ietm init` - Initialize configuration
- `ietm test` - Run Playwright tests and report to IETM
- `ietm validate` - Validate configuration and connectivity
- Provide verbose and quiet modes

**Key Files to Create:**
- `src/cli/index.ts`

---

### **Phase 6: Error Handling & Resilience**

#### Prompt 14: Implement Error Handling
**Status:** Partially Complete (basic error handling exists)
**Priority:** HIGH
**Dependencies:** Prompt 3

**Task:** Enhance error handling:
- Define custom error types (AuthenticationError, NetworkError, ValidationError)
- Already has: Retry logic with exponential backoff in AuthManager
- Add: Rate limiting handling
- Add: Detailed error messages with troubleshooting hints
- Add: Circuit breaker pattern for API calls
- Add: Graceful degradation (continue testing even if reporting fails)

**Key Files to Create:**
- `src/errors/IETMError.ts`
- `src/errors/AuthenticationError.ts`
- `src/errors/NetworkError.ts`
- `src/errors/ValidationError.ts`

#### Prompt 15: Add Logging System
**Status:** Skeleton exists
**Priority:** MEDIUM
**Dependencies:** None

**Task:** Implement comprehensive logging using Winston:
- Logs to console and file simultaneously
- Supports multiple log levels (error, warn, info, debug, trace)
- Includes timestamps and context information
- Rotates log files to prevent disk space issues
- Sanitizes sensitive data (passwords) from logs
- Provides structured logging for easy parsing
- Includes request/response logging for debugging

**Key Files to Create:**
- `src/logging/Logger.ts`

---

### **Phase 7: Testing & Validation**

#### Prompt 16: Create Unit Tests
**Status:** Not started
**Priority:** HIGH
**Dependencies:** Prompts 3-15

**Task:** Develop comprehensive unit tests for:
- Basic Authentication module
- IETM API client methods
- XML builders and validators
- Result transformers
- Configuration manager
- Use Jest with 80%+ code coverage
- Mock IETM API responses
- Test error scenarios and edge cases

**Key Files to Create:**
- `tests/unit/auth/AuthManager.test.ts`
- `tests/unit/client/IETMClient.test.ts`
- `tests/unit/builders/ExecutionResultBuilder.test.ts`

#### Prompt 17: Create Integration Tests
**Status:** Not started
**Priority:** HIGH
**Dependencies:** Prompts 3-16

**Task:** Implement integration tests that:
- Test against the real IETM sandbox server
- Verify end-to-end workflow (test execution → result reporting)
- Test with various Playwright test scenarios
- Validate attachment uploads
- Test error recovery and retry logic
- Include performance benchmarks

**Key Files to Create:**
- `tests/integration/ietm-client.test.ts`
- `tests/integration/end-to-end.test.ts`

---

### **Phase 8: Documentation & Examples** (Partially Complete)

#### Prompt 18: Update Documentation
**Status:** Partially Complete
**Priority:** MEDIUM
**Dependencies:** All implementation prompts

**Task:** Update documentation with implementation details:
- ✅ README.md with quick start guide (exists)
- ✅ Installation instructions (exists)
- ✅ Authentication setup guide (exists)
- ✅ Java implementation analysis (exists)
- Add: API reference for programmatic usage
- Add: Troubleshooting guide with common issues
- Add: Architecture diagram showing component interactions

**Key Files to Update:**
- `docs/api-reference.md` (create)
- `docs/troubleshooting.md` (create)
- `docs/architecture.md` (create)

#### Prompt 19: Enhance Example Projects
**Status:** Basic example exists
**Priority:** LOW
**Dependencies:** All implementation prompts

**Task:** Enhance example projects:
- ✅ Basic Playwright test with IETM reporting (exists)
- Add: Advanced test suite with multiple test cases
- Add: CI/CD integration example (GitHub Actions)
- Add: Error handling examples

**Key Files to Update:**
- `examples/basic-example/` (enhance)
- `examples/advanced-example/` (create)
- `examples/ci-cd-example/` (create)

---

### **Phase 9: Advanced Features (Optional - Future)**

#### Prompt 20: CI/CD Integration Templates
**Status:** Not started
**Priority:** LOW
**Dependencies:** All core features complete

**Task:** Create CI/CD integration templates:
- GitHub Actions workflow template
- Jenkins pipeline example
- GitLab CI configuration
- Environment variable injection examples

---

## 📋 Updated Implementation Order

### ✅ Completed (Prompts 1-2)
1. Project setup and configuration
2. Configuration schema with Basic Authentication

### 🎯 Next Steps (Priority Order)
3. **Prompt 3** - Implement Basic Authentication Module (NEXT - HIGH PRIORITY)
4. **Prompt 4** - Implement Service Discovery
5. **Prompt 5** - Build IETM API Client Core
6. **Prompt 6** - Create XML Templates and Builders
7. **Prompt 7** - Create Playwright Reporter
8. **Prompt 8** - Implement Test Case Mapping
9. **Prompt 9** - Build Result Transformer
10. **Prompt 10** - Implement Result Publisher
11. **Prompt 11** - Add Attachment Handler
12. **Prompt 14** - Implement Error Handling
13. **Prompt 15** - Add Logging System
14. **Prompt 16** - Create Unit Tests
15. **Prompt 17** - Create Integration Tests

### 🔮 Optional/Future
- Prompt 12 - Configuration Manager enhancements
- Prompt 13 - CLI Interface
- Prompt 18 - Documentation updates
- Prompt 19 - Example enhancements
- Prompt 20 - CI/CD templates

## 🔧 Updated Key Technologies

- **Language:** TypeScript/Node.js
- **Testing Framework:** Playwright
- **HTTP Client:** Axios with cookie jar support
- **Authentication:** Basic Authentication + Form-based login
- **Session Management:** tough-cookie + axios-cookiejar-support
- **XML Processing:** fast-xml-parser
- **Logging:** Winston
- **Configuration:** dotenv, JSON
- **Testing:** Jest
- **API Standard:** OSLC (Open Services for Lifecycle Collaboration)

## Success Criteria

- ✅ Playwright tests execute and results are automatically reported to IETM
- ✅ Configuration is flexible and supports multiple environments
- ✅ Error handling is robust with clear error messages
- ✅ Attachments (screenshots, videos) are uploaded successfully
- ✅ Test case mapping is intuitive and maintainable
- ✅ Documentation is comprehensive and examples are working
- ✅ Unit and integration tests provide good coverage
- ✅ CLI provides good user experience

## Notes

Each prompt is designed to be a complete, actionable task that can be implemented independently while building toward the complete solution. The prompts can be used sequentially or adapted based on specific project needs and priorities.

---

## ✅ Success Criteria

- ✅ Playwright tests execute and results are automatically reported to IETM
- ✅ Configuration is flexible and supports multiple environments
- ✅ Error handling is robust with clear error messages
- ✅ Attachments (screenshots, videos) are uploaded successfully
- ✅ Test case mapping is intuitive and maintainable
- ✅ Documentation is comprehensive and examples are working
- ✅ Unit and integration tests provide good coverage
- ✅ Authentication works reliably with session management

## 📝 Implementation Notes

### Authentication Migration (2026-03-24)
- **Changed from OAuth 1.0a to Basic Authentication** following IBM's Java client pattern
- Analyzed `RQM_Query-1.0.3` Java implementation
- Created comprehensive documentation:
  - `docs/java-implementation-analysis.md` - Complete Java client analysis
  - `docs/authentication-setup.md` - Authentication guide
  - `docs/authentication-migration-summary.md` - Migration details
- Updated all configuration files and dependencies
- Ready to implement Prompt 3 (Basic Authentication Module)

### Key Decisions
1. **Basic Auth over OAuth**: Simpler, more reliable, native IETM support
2. **Cookie-based sessions**: Automatic session management with tough-cookie
3. **Form-based auth on 401**: Matches IBM's proven implementation
4. **Retry with backoff**: Max 3 retries with exponential backoff (1s, 2s, 3s)

### Reference Implementation
- Java Client: `C:\Users\RobertStudera\Documents\xxx\RQM_Query-1.0.3.jar.src`
- Server: `https://jazz.net/sandbox01-qm` (QM) and `https://jazz.net/sandbox01-jts` (JTS)
- Test Credentials: username=studera, password=Modus1odus123##

## 🎯 Next Prompt

**Prompt 3: Implement Basic Authentication Module**

This is the next task to implement. See the detailed requirements in the Phase 2 section above.

**Quick Start:**
```
"Implement the Basic Authentication module for IETM following the pattern from 
docs/java-implementation-analysis.md. Create AuthManager class that handles 
Basic Auth, form-based authentication at /jts/j_security_check, cookie 
management with tough-cookie, and automatic re-authentication on 401 responses. 
Include retry logic with exponential backoff (max 3 retries)."
```

## 📚 Additional Resources

- [IBM Jazz Form-Based Authentication](https://jazz.net/wiki/bin/view/Main/JazzFormBasedAuthentication)
- [OSLC Authentication](https://open-services.net/specifications/authentication/)
- [RQM API Documentation](https://jazz.net/wiki/bin/view/Main/RqmApi)

---

Each prompt is designed to be a complete, actionable task that can be implemented independently while building toward the complete solution. The prompts can be used sequentially or adapted based on specific project needs and priorities.