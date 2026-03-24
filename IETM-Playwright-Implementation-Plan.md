# Implementation Plan: IBM Engineering Test Management (IETM) Playwright Client

## Detailed Prompts for Project Implementation

### **Phase 1: Project Setup & Architecture**

#### Prompt 1: Initialize Project Structure
"Create a Node.js/TypeScript project structure for an IETM Playwright client with the following:
- Package.json with dependencies (playwright, axios, dotenv, winston for logging)
- TypeScript configuration with strict mode
- Folder structure: `/src`, `/config`, `/tests`, `/docs`, `/examples`
- ESLint and Prettier configuration
- Git repository with appropriate .gitignore"

#### Prompt 2: Define Configuration Schema
"Design a configuration system that supports:
- IETM server connection details (base URL, project ID, context ID)
- OAuth 1.0a credentials (consumer key, consumer secret, access token, access token secret)
- Test plan and test case mapping configuration
- Retry policies and timeout settings
- Logging levels and output preferences
- Support for multiple environments (dev, staging, production)
- Configuration file format: JSON or YAML with schema validation"

---

### **Phase 2: IETM API Client Implementation**

#### Prompt 3: Implement OAuth 1.0a Authentication
"Create an OAuth 1.0a authentication module for IETM that:
- Generates OAuth signatures for API requests
- Handles the three-legged OAuth flow (request token, authorization, access token)
- Stores and manages access tokens securely
- Implements token refresh logic
- Provides helper methods for authenticated API calls
- Includes error handling for authentication failures"

#### Prompt 4: Build IETM API Client Core
"Implement a TypeScript class `IETMClient` that provides methods for:
- Connecting to IETM server and validating credentials
- Fetching test plans by ID or query
- Fetching test cases by ID or query
- Creating test execution records
- Creating/updating test results (AutomationResult)
- Uploading attachments (screenshots, videos, logs)
- Querying resource shapes for validation
- Implementing proper error handling and retry logic"

#### Prompt 5: Create Resource Builders
"Develop builder classes for IETM resources:
- `TestExecutionRecordBuilder` - for creating execution records
- `AutomationResultBuilder` - for creating test results with proper RDF/XML structure
- `AttachmentBuilder` - for handling file attachments
- Each builder should validate required fields and generate proper OSLC-compliant XML"

---

### **Phase 3: Playwright Integration**

#### Prompt 6: Create Playwright Reporter
"Implement a custom Playwright reporter that:
- Extends Playwright's Reporter interface
- Captures test start, end, and result events
- Collects test metadata (title, file, duration, status)
- Captures screenshots on failure
- Captures video recordings if enabled
- Stores test artifacts in a structured format
- Provides hooks for custom data collection"

#### Prompt 7: Implement Test Case Mapping
"Create a mapping system that:
- Links Playwright test cases to IETM test cases using annotations or configuration
- Supports multiple mapping strategies (by test title, by custom ID, by tags)
- Allows one-to-one and one-to-many mappings
- Validates that mapped IETM test cases exist
- Provides clear error messages for unmapped tests
- Example: `test.describe('Login Tests', { ietmTestCase: 'TC-2218' })`"

#### Prompt 8: Build Result Transformer
"Develop a transformer that converts Playwright test results to IETM format:
- Maps Playwright status (passed/failed/skipped/timedout) to OSLC verdict values
- Converts test duration to start/end times
- Formats error messages and stack traces
- Handles test retries and flaky tests
- Aggregates suite-level results
- Preserves test hierarchy and grouping"

---

### **Phase 4: Result Reporting & Synchronization**

#### Prompt 9: Implement Result Publisher
"Create a `ResultPublisher` class that:
- Batches test results for efficient API calls
- Creates test execution records in IETM
- Uploads test results with proper linking
- Attaches screenshots and videos to results
- Handles partial failures gracefully
- Provides progress feedback during upload
- Implements idempotency to prevent duplicate results"

#### Prompt 10: Add Attachment Handler
"Implement an attachment management system that:
- Compresses large files before upload
- Supports multiple file types (images, videos, logs, JSON)
- Generates proper MIME types
- Implements chunked upload for large files
- Provides upload progress tracking
- Cleans up temporary files after upload
- Handles attachment size limits"

---

### **Phase 5: Configuration & CLI**

#### Prompt 11: Create Configuration Manager
"Develop a configuration management system that:
- Loads configuration from multiple sources (file, environment variables, CLI args)
- Validates configuration against schema
- Provides sensible defaults
- Supports configuration profiles (dev, staging, prod)
- Encrypts sensitive data (tokens, passwords)
- Provides a configuration wizard for first-time setup
- Example config file: `ietm.config.json`"

#### Prompt 12: Build CLI Interface
"Create a command-line interface that supports:
- `ietm init` - Initialize configuration
- `ietm test` - Run Playwright tests and report to IETM
- `ietm report` - Report existing test results to IETM
- `ietm validate` - Validate configuration and connectivity
- `ietm map` - Interactive test case mapping tool
- `ietm status` - Check status of reported results
- Provide verbose and quiet modes
- Support for dry-run mode"

---

### **Phase 6: Error Handling & Resilience**

#### Prompt 13: Implement Error Handling
"Create comprehensive error handling that:
- Defines custom error types (AuthenticationError, NetworkError, ValidationError)
- Implements retry logic with exponential backoff
- Handles rate limiting from IETM API
- Provides detailed error messages with troubleshooting hints
- Logs errors with appropriate severity levels
- Implements circuit breaker pattern for API calls
- Allows graceful degradation (continue testing even if reporting fails)"

#### Prompt 14: Add Logging System
"Implement a logging system using Winston that:
- Logs to console and file simultaneously
- Supports multiple log levels (error, warn, info, debug, trace)
- Includes timestamps and context information
- Rotates log files to prevent disk space issues
- Sanitizes sensitive data (tokens, passwords) from logs
- Provides structured logging for easy parsing
- Includes request/response logging for debugging"

---

### **Phase 7: Testing & Validation**

#### Prompt 15: Create Unit Tests
"Develop comprehensive unit tests for:
- OAuth authentication module
- IETM API client methods
- Resource builders and validators
- Result transformers
- Configuration manager
- Use Jest or Mocha with 80%+ code coverage
- Mock IETM API responses
- Test error scenarios and edge cases"

#### Prompt 16: Create Integration Tests
"Implement integration tests that:
- Test against a real or mock IETM server
- Verify end-to-end workflow (test execution → result reporting)
- Test with various Playwright test scenarios
- Validate attachment uploads
- Test error recovery and retry logic
- Use Docker for consistent test environment
- Include performance benchmarks"

---

### **Phase 8: Documentation & Examples**

#### Prompt 17: Write Comprehensive Documentation
"Create documentation including:
- README.md with quick start guide
- Installation instructions
- Configuration guide with all options explained
- API reference for programmatic usage
- Troubleshooting guide with common issues
- Architecture diagram showing component interactions
- Contributing guidelines
- Changelog and versioning strategy"

#### Prompt 18: Create Example Projects
"Develop example projects demonstrating:
- Basic Playwright test with IETM reporting
- Advanced test suite with custom mappings
- CI/CD integration (GitHub Actions, Jenkins)
- Multi-environment configuration
- Custom reporter with additional metadata
- Handling of flaky tests and retries
- Integration with existing test frameworks"

---

### **Phase 9: Advanced Features (Optional)**

#### Prompt 19: Implement Dashboard & Reporting
"Create a local dashboard that:
- Shows test execution history
- Displays sync status with IETM
- Provides test case mapping visualization
- Shows success/failure trends
- Allows manual result submission
- Provides export functionality (CSV, JSON)
- Uses a simple web interface (Express + React)"

#### Prompt 20: Add CI/CD Integration
"Develop CI/CD integration helpers:
- GitHub Actions workflow template
- Jenkins pipeline example
- GitLab CI configuration
- Azure DevOps pipeline
- Environment variable injection
- Artifact collection and upload
- Status reporting back to CI system
- Parallel execution support"

---

## Implementation Order Recommendation

1. **Start with:** Prompts 1-2 (Project setup and configuration)
2. **Then:** Prompts 3-5 (IETM API client)
3. **Next:** Prompts 6-8 (Playwright integration)
4. **Follow with:** Prompts 9-10 (Result reporting)
5. **Add:** Prompts 11-12 (Configuration and CLI)
6. **Strengthen:** Prompts 13-14 (Error handling)
7. **Validate:** Prompts 15-16 (Testing)
8. **Document:** Prompts 17-18 (Documentation)
9. **Enhance:** Prompts 19-20 (Advanced features - optional)

## Key Technologies

- **Language:** TypeScript/Node.js
- **Testing Framework:** Playwright
- **HTTP Client:** Axios
- **Authentication:** OAuth 1.0a
- **Logging:** Winston
- **Configuration:** dotenv, JSON/YAML
- **CLI:** Commander.js or Yargs
- **Testing:** Jest or Mocha
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